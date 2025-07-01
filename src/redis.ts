import Redis from "ioredis";
import logger from "./logger";

export const redisConnection = new Redis(process.env.REDIS_DSN!, {
  maxRetriesPerRequest: null,
  retryStrategy: (times) => {
    if (times >= 3) {
      logger.error("Redis: Max connection attempts reached.");
      process.exit(1);
    }
    return Math.min(times * 500, 5000); // Интервал между попытками
  },
});

const shutdownRedis = async () => {
  await redisConnection.quit();
};

process.on("exit", shutdownRedis);
