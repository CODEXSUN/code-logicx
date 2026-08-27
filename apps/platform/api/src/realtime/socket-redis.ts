import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import type { Server as SocketServer } from "socket.io";

export async function configureSocketRedis(
  io: SocketServer,
  redisUrl: string,
  channelKey: string
) {
  if (!redisUrl) return async () => undefined;

  const publisher = new Redis(redisUrl, {
    connectTimeout: 5_000,
    lazyConnect: true,
    maxRetriesPerRequest: null,
    retryStrategy: limitedRetry
  });
  const subscriber = publisher.duplicate({ lazyConnect: true });
  publisher.on("error", () => undefined);
  subscriber.on("error", () => undefined);
  try {
    await Promise.all([publisher.connect(), subscriber.connect()]);
  } catch (error) {
    publisher.disconnect();
    subscriber.disconnect();
    console.warn(`[socket.redis.fallback] channel=${channelKey} reason=${errorMessage(error)}`);
    return async () => undefined;
  }
  io.adapter(
    createAdapter(publisher, subscriber, {
      key: channelKey,
      publishOnSpecificResponseChannel: true
    })
  );
  console.info(`[socket.redis.ready] channel=${channelKey}`);

  return async () => {
    await Promise.allSettled([publisher.quit(), subscriber.quit()]);
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Redis connection failed.";
}

function limitedRetry(attempt: number) {
  return attempt <= 3 ? Math.min(attempt * 250, 1_000) : null;
}
