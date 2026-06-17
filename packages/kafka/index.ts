import { Kafka, Partitioners, type Producer } from '@nemesisas/kafkajs-bun';

// Define your topics here so there are no typos across services
export const TOPICS = {
  PROFILE_UPDATED: 'profile.updated',
} as const;

let producer: Producer;

export async function getProducer(): Promise<Producer> {
  if (producer) return producer;

  // Connects to the Docker container we just spun up
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