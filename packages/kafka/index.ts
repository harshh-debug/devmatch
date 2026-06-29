import {
	Kafka,
	Partitioners,
	type Producer,
	type Consumer,
} from "@nemesisas/kafkajs-bun";

export const TOPICS = {
	PROFILE_UPDATED: "profile.updated",
	USER_UPDATED: "user.updated",
	MATCH_ACCEPTED: "match.accepted",
	MATCH_REJECTED: "match.rejected",
} as const;

const kafkaClient = new Kafka({
	clientId: process.env.KAFKA_CLIENT_ID || "devmatch-service",
	brokers: [process.env.KAFKA_BROKERS || "localhost:9092"],
});

const activeConsumers: Consumer[] = [];
let sharedProducer: Producer | null = null;
let producerPromise: Promise<Producer> | null = null;

export async function getProducer(): Promise<Producer> {
  // Already connected
  if (sharedProducer) {
    return sharedProducer;
  }

  // Connection already in progress
  if (producerPromise) {
    return producerPromise;
  }

  producerPromise = (async () => {
    try {
      const producer = kafkaClient.producer({
        createPartitioner: Partitioners.LegacyPartitioner,
      });

      await producer.connect();

      sharedProducer = producer;

      return producer;
    } catch (err) {
      // Allow future retries
      producerPromise = null;
      throw err;
    }
  })();

  return producerPromise;
}

export async function publish<T>(topic: string, payload: T): Promise<void> {
	const p = await getProducer();
	await p.send({
		topic,
		messages: [{ value: JSON.stringify(payload) }],
	});
	console.log(`[Kafka] Published to ${topic}`);
}

export async function subscribe<T>(
	topics: string[],
	groupId: string,
	messageHandler: (topic: string, payload: T) => Promise<void>,
): Promise<Consumer> {
	const consumer = kafkaClient.consumer({ groupId });
	await consumer.connect();
	await consumer.subscribe({ topics, fromBeginning: true });

	await consumer.run({
		eachMessage: async ({ topic, message }) => {
			if (!message.value) return;

			let payload: T;
			try {
				payload = JSON.parse(message.value.toString()) as T;
			} catch (error) {
				console.error(
					`[Kafka] 🛑 Poison Pill detected on topic ${topic}. Failed to parse JSON. Skipping message.`,
				);
				return;
			}

			try {
				await messageHandler(topic, payload);
			} catch (err) {
				console.error("Message handeler error: " + err);
			}
		},
	});

	activeConsumers.push(consumer);
	console.log(
		`[Kafka] Subscribed to topics: ${topics.join(", ")} (Group: ${groupId})`,
	);
	return consumer;
}

export async function createTopicsIfNotExist(): Promise<void> {
	const admin = kafkaClient.admin();

	try {
		await admin.connect();
		const existingTopics = await admin.listTopics();

		const missingTopics = Object.values(TOPICS)
			.filter((topic) => !existingTopics.includes(topic))
			.map((topic) => ({ topic }));

		if (missingTopics.length > 0) {
			console.log(
				`[Kafka Admin] Creating missing topics: ${missingTopics.map((t) => t.topic).join(", ")}`,
			);
			await admin.createTopics({ topics: missingTopics, waitForLeaders: true });
		} else {
			console.log(`[Kafka Admin] All required topics already exist.`);
		}
	} catch (error) {
		console.error("[Kafka Admin] Failed to verify/create topics:", error);
	} finally {
		await admin.disconnect();
	}
}

export async function disconnectAll(): Promise<void> {
  console.log("[Kafka] Disconnecting clients gracefully...");

  if (sharedProducer) {
    await sharedProducer.disconnect();
    sharedProducer = null;
    producerPromise = null;
  }

  for (const consumer of activeConsumers) {
    await consumer.disconnect();
  }

  activeConsumers.length = 0;
}