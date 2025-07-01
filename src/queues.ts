import { ArticleParsingJob, ArticleProcessingStatus } from "./types";
import { redisConnection, redisConnection } from "./redis";
import logger from "./logger";

export const ARTICLES_PARSER_QUEUE = "articles.parse";
export const ARTICLES_STORE_QUEUE = "articles.store";
export const ARTICLES_PROCESSING_STATUS_QUEUE = "articles.processing-status";

const QUEUES = [
  ARTICLES_PARSER_QUEUE,
  ARTICLES_STORE_QUEUE,
  ARTICLES_PROCESSING_STATUS_QUEUE,
];

export const Serializer = {
  encode: JSON.stringify,
  decode: JSON.parse,
};

export const enqueueArticleParsing = async (data: ArticleParsingJob) =>
  await enqueue(ARTICLES_PARSER_QUEUE, data);

export const enqueueParsedArticleStore = async (
  data: ArticleProcessingStatus,
) => await enqueue(ARTICLES_STORE_QUEUE, data);

export const enqueueArticleProcessingStatus = async (
  data: ArticleProcessingStatus,
) => await enqueue(ARTICLES_PROCESSING_STATUS_QUEUE, data);

export const purgeAllQueues = async () => {
  await Promise.all(QUEUES.map((stream) => purgeStream(stream)));
};

export const initRedisStreams = async () => {
  // Проверяем/создаем потоки без добавления сообщений
  await Promise.all(
    QUEUES.map(async (queue) => {
      try {
        // Пытаемся создать группу (поток создастся автоматически через MKSTREAM)
        await redisConnection.xgroup(
          "CREATE",
          queue,
          "workers",
          "$",
          "MKSTREAM",
        );
      } catch (e) {
        if (!e.message.includes("BUSYGROUP")) {
          // Если поток не существует (без MKSTREAM в старых версиях Redis)
          await redisConnection.xadd(queue, "*", "dummy", "dummy");
          await redisConnection.xtrim(queue, "MAXLEN", 0); // Немедленно очищаем
          await redisConnection.xgroup("CREATE", queue, "workers", "$");
        }
      }
    }),
  );
};

export const createConsumer = async (
  streamName: string,
  consumerName: string,
  handler: (data: any, messageId: string) => Promise<void>,
  abortSignal?: AbortSignal,
  timeout: number = 0,
) => {
  const shouldContinue = () => !abortSignal || !abortSignal.aborted;
  const redis = redisConnection.duplicate();

  while (shouldContinue()) {
    try {
      const result = await redis.xreadgroup(
        "GROUP",
        "workers",
        consumerName,
        "COUNT",
        "1",
        "BLOCK",
        timeout,
        "STREAMS",
        streamName,
        ">",
      );

      if (result) {
        const [, messages] = result[0];
        const [messageId, [, data]] = messages[0];
        await handler(Serializer.decode(data), messageId);
      }
    } catch (err) {
      logger.error(`Consumer ${consumerName} error:`, err);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
};

export const ackMessage = async (streamName: string, messageId: string) => {
  await redisConnection.xack(streamName, "workers", messageId);
};

const purgeStream = async (streamName: string) => {
  await redisConnection.del(streamName);
};

const enqueue = async (queue: string, data: any) => {
  await redisConnection.xadd(queue, "*", "data", Serializer.encode(data));
};
