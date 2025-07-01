import {
  ARTICLES_PARSER_QUEUE,
  enqueueParsedArticleStore,
  initRedisStreams,
  createConsumer,
  ackMessage,
} from "./queues";
import logger from "./logger";
import { ArticleParsingJob } from "./types";
import { redisConnection } from "./redis";
import { parseArticleByReadability } from "./parsers";

async function parseArticle(job: ArticleParsingJob, messageId: string) {
  const startTime = performance.now();

  try {
    logger.info(`Parsing ${job.url}`);
    const content = parseArticleByReadability(job.page);

    const parsingStatus = (
      content.content !== "" && content.title !== ""
    ) ? "success" : "error";

    const article = {
      url: job.url,
      title: content.title,
      content: content.content,
      published: content.published,
      loadTime: Math.round(job.loadTime),
      parsingTime: performance.now() - startTime,
      fetchingStatus: "success",
      parsingStatus: parsingStatus,
    }

    await enqueueParsedArticleStore(article);

    await ackMessage(ARTICLES_PARSER_QUEUE, messageId);
  } catch (err) {
    logger.error(`Failed to parse ${job.url}:`, err);

    await enqueueParsedArticleStore({
      url: job.url,
      title: "",
      content: "",
      published: null,

      loadTime: Math.round(job.loadTime),
      parsingTime: performance.now() - startTime,
      fetchingStatus: "success",
      parsingStatus: "error",
    });

    throw err;
  }
}

export async function runParser() {
  try {
    logger.info("Starting parser worker");

    await redisConnection.ping();
    await initRedisStreams();

    await createConsumer(ARTICLES_PARSER_QUEUE, "parser", parseArticle);
  } catch (err) {
    logger.error("Parser initialization failed:", err);
    process.exit(1);
  }
}
