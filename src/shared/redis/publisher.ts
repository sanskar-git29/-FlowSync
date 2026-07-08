import { redisClient } from './client.js';

// The shape of every real-time update we push to clients.
// type tells the client what happened.
// event gives them the data they need to update their UI.
export interface EventUpdateMessage {
  type:  'event.completed' | 'event.failed' | 'event.processing';
  event: {
    id:     string;
    status: string;
    type:   string;
  };
}

// Channel naming convention: events:user:{userId}
// The WebSocket subscriber uses PSUBSCRIBE events:user:*
// to receive ALL of these with one subscription at startup.
export async function publishEventUpdate(
  userId:  string,
  message: EventUpdateMessage,
): Promise<void> {
  const channel = `events:user:${userId}`;

  // redis PUBLISH returns the number of subscribers that received the message.
  // If 0, no WebSocket server has anyone from this userId connected right now.
  // That is fine — the client will see the updated status on their next GET /events.
  const received = await redisClient.publish(channel, JSON.stringify(message));

  console.log(
    `[publisher] channel=${channel}`,
    `type=${message.type}`,
    `subscribers=${received}`,
  );
}