import { WebSocketServer, WebSocket, type RawData } from 'ws';
import { env }                                         from './config/env.js';
import { connectRedis, disconnectRedis,
          disconnectRedisSubscriber }                   from './shared/redis/client.js';
import { verifyAccessToken }                           from './modules/auth/auth.service.js';
import { addConnection, removeConnection,
          getTotalConnections }                          from './websocket/subscriptions.js';
import { startSubscriber }                             from './websocket/subscriber.js';

// Extend the WebSocket type to carry our own properties.
// This is a type intersection — not declaration merging.
// isAlive: used by heartbeat to detect dead connections.
// userId:  set after successful auth — undefined until then.
type AuthenticatedWs = WebSocket & {
  isAlive: boolean;
  userId:  string | undefined;
};

// Connect Redis before starting the server.
// redisClient — for any cache operations (auth middleware uses it)
// redisSubscriber — connected inside startSubscriber()
await connectRedis();
await startSubscriber();