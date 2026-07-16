import os from "node:os";
import prismaClient, { OutboxStatus } from "db/client";
import { publish } from "@devmatch/kafka";

const POLL_INTERVAL_MS = 1_000;
const LEASE_MS = 30_000;
const BATCH_SIZE = 50;
const dispatcherId = `${os.hostname()}:${process.pid}`;

let timer: ReturnType<typeof setInterval> | null = null;
let dispatching = false;

async function claimDueEvents() {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - LEASE_MS);
  const candidates = await prismaClient.outboxEvent.findMany({
    where: {
      nextAttemptAt: { lte: now },
      OR: [
        { status: OutboxStatus.PENDING },
        {
          status: OutboxStatus.PROCESSING,
          OR: [{ lockedAt: null }, { lockedAt: { lt: staleBefore } }],
        },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: BATCH_SIZE,
  });

  const claimed = [];
  for (const event of candidates) {
    const result = await prismaClient.outboxEvent.updateMany({
      where: {
        id: event.id,
        nextAttemptAt: { lte: now },
        OR: [
          { status: OutboxStatus.PENDING },
          {
            status: OutboxStatus.PROCESSING,
            OR: [{ lockedAt: null }, { lockedAt: { lt: staleBefore } }],
          },
        ],
      },
      data: {
        status: OutboxStatus.PROCESSING,
        lockedAt: now,
        lockedBy: dispatcherId,
      },
    });
    if (result.count === 1) claimed.push(event);
  }
  return claimed;
}

export async function dispatchOutboxBatch() {
  if (dispatching) return;
  dispatching = true;
  try {
    const events = await claimDueEvents();
    for (const event of events) {
      try {
        await publish(event.topic, event.payload);
        await prismaClient.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: OutboxStatus.PUBLISHED,
            publishedAt: new Date(),
            lockedAt: null,
            lockedBy: null,
          },
        });
      } catch (error) {
        const attempts = event.attempts + 1;
        const retrySeconds = Math.min(2 ** attempts, 300);
        await prismaClient.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: OutboxStatus.PENDING,
            attempts,
            nextAttemptAt: new Date(Date.now() + retrySeconds * 1_000),
            lockedAt: null,
            lockedBy: null,
          },
        });
        console.error(`[Outbox] Failed to publish ${event.id}; retrying in ${retrySeconds}s`, error);
      }
    }
  } finally {
    dispatching = false;
  }
}

export function startOutboxDispatcher() {
  if (timer) return;
  void dispatchOutboxBatch();
  timer = setInterval(() => void dispatchOutboxBatch(), POLL_INTERVAL_MS);
  timer.unref?.();
  console.log(`[Outbox] Dispatcher started as ${dispatcherId}`);
}
