import { redisSubscriber, connectRedisSubscriber } from '../shared/redis/client.js';
import { broadcastToUser }                         from './subscriptions.js';
import type { EventUpdateMessage }                  from '../shared/redis/publisher.js';

// PSUBSCRIBE pattern — matches all user channels.
// events:user:abc-123  → matched
// events:user:xyz-456  → matched
// events:other         → NOT matched
const CHANNEL_PATTERN = 'events:user:*';

// Called once when ws-server.ts starts.
// After this, the redisSubscriber connection is in listen-only mode
// for the lifetime of the process.
export async function startSubscriber(): Promise<void> {
  // Connect the subscriber Redis client
  await connectRedisSubscriber();

  // PSUBSCRIBE — pattern subscribe.
  // One command covers ALL current and future users.
  // No need to subscribe per-user as they connect.
  await redisSubscriber.psubscribe(CHANNEL_PATTERN);

  // 'pmessage' fires every time a message is published to a matching channel.
  //
  // Parameters:
  //   pattern  — the pattern that matched ('events:user:*')
  //   channel  — the actual channel ('events:user:abc-123')
  //   message  — the raw JSON string published by the worker
  redisSubscriber.on('pmessage', (
    _pattern: string,
    channel:  string,
    message:  string,
  ) => {
    // Extract userId from channel name.
    // 'events:user:abc-123' → 'abc-123'
    const userId = channel.replace('events:user:', '');

    let parsed: EventUpdateMessage;
    try {
      parsed = JSON.parse(message) as EventUpdateMessage;
    } catch {
      console.error('[subscriber] invalid JSON on channel', channel);
      return;
    }

    console.log(
      `[subscriber] received userId=${userId}`,
      `type=${parsed.type}`,
    );

    // Forward to all WebSocket connections for this user on THIS server.
    // If the user is connected to a different server, that server will
    // also receive this pub/sub message and handle it there.
    broadcastToUser(userId, parsed);
  });

  console.log(`[subscriber] listening on pattern: ${CHANNEL_PATTERN} ✓`);
}