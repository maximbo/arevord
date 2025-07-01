import {
  ARTICLES_STORE_QUEUE,
  ackMessage,
  createConsumer,
  initRedisStreams,
  enqueueArticleProcessingStatus,
} from "./queues";
import { redisConnection } from "./redis";
import { db } from "./db";
import { articlesTable } from "./db/schema";
import logger from "./logger";
import { ArticleProcessingStatus } from "./types";

async function storeArticle(article: ArticleProcessingStatus, messageId: string) {
  try {
    logger.info(`Storing parsed article ${article.url}`);
    await db.insert(articlesTable).values(article);
    await ackMessage(ARTICLES_STORE_QUEUE, messageId);
  } catch (err) {
    logger.error(`Cannot store article ${article.url}: ${err}`);
    throw err;
  }

  await enqueueArticleProcessingStatus(article);
}

export async function runStorer() {
  try {
    await redisConnection.ping();
    await initRedisStreams();

    logger.info(`Starting ${ARTICLES_STORE_QUEUE} worker`);
    await createConsumer(ARTICLES_STORE_QUEUE, "storer", storeArticle);
  } catch (err) {
    logger.error(`Storer initialization failed: ${err}`);
    process.exit(1);
  }
}
