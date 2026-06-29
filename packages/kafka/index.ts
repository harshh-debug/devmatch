import { Kafka, Partitioners, type Producer, type Consumer, type EachMessagePayload } from '@nemesisas/kafkajs-bun';

// 1. Updated TOPICS Registry
export const TOPICS = {
  PROFILE_UPDATED: 'profile.updated',
  USER_UPDATED: 'user.updated',
  MATCH_ACCEPTED: 'match.accepted',
  MATCH_REJECTED: 'match.rejected',
} as const;

let producer: Producer;

export async function getProducer(): Promise<Producer> {
  if (producer) return producer;

  const kafka = new Kafka({ 
    clientId: 'devmatch',
    brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'] 
  });

  producer = kafka.producer({
    createPartitioner: Partitioners.LegacyPartitioner
  });
  
  await producer.connect();
  return producer;
}

export async function publish(topic: string, payload: any): Promise<void> {
  const p = await getProducer();
  await p.send({
    topic,
    messages: [{ value: JSON.stringify(payload) }],
  });
  console.log(`[Kafka] Published to ${topic}`);
}

export async function subscribe(
  topic: string,
  groupId: string, // Required so Kafka knows how to load-balance messages
  messageHandler: (message: any) => Promise<void>
): Promise<Consumer> {
  
  const kafka = new Kafka({
    clientId: 'devmatch',
    brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'],
  });

  const consumer = kafka.consumer({ groupId });
  await consumer.connect();
  
  await consumer.subscribe({ topic, fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }: EachMessagePayload) => {
      if (!message.value) return;
      await messageHandler(message);
    },
  });

  console.log(`[Kafka] Subscribed to ${topic} (Group: ${groupId})`);
  return consumer;
}
export async function createTopicsIfNotExist(): Promise<void> {
  const kafka = new Kafka({
    clientId: 'devmatch-admin',
    brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'],
  });

  const admin = kafka.admin();
  
  try {
    await admin.connect();
    const existingTopics = await admin.listTopics();
    
    // Find which topics from our TOPICS registry are missing in Kafka
    const missingTopics = Object.values(TOPICS)
      .filter((topic) => !existingTopics.includes(topic))
      .map((topic) => ({ topic }));

    if (missingTopics.length > 0) {
      console.log(`[Kafka Admin] Creating missing topics: ${missingTopics.map(t => t.topic).join(', ')}`);
      await admin.createTopics({
        topics: missingTopics,
        waitForLeaders: true,
      });
    } else {
      console.log(`[Kafka Admin] All required topics already exist.`);
    }
  } catch (error) {
    console.error("[Kafka Admin] Failed to verify/create topics:", error);
  } finally {
    await admin.disconnect();
  }
}