import axios from "axios";

import {
  enqueueArticleParsing,
  enqueueParsedArticleStore,
  initRedisStreams,
  ackMessage,
  ARTICLES_PROCESSING_STATUS_QUEUE,
  createConsumer,
} from "./queues";
import { redisConnection } from "./redis";
import { ArticleProcessingStatus } from "./types";

const FETCH_TIMEOUT = 2000;
const MAX_CONCURRENT_REQUESTS = 20;

type ExecutionStats = {
  [key: string]: {
    success: boolean;
    processingTime: number;
  };
};

const URLS = [
  "https://www.rbc.ru/politics/25/06/2025/685bc3649a7947307aab13bf?from=from_main_8",
  "https://lenta.ru/news/2025/06/25/krym-voshel-v-ofis-genprokurora-ukrainy/",
  "https://www.kommersant.ru/doc/7834176?from=top_main_1",
  "https://ulpravda.ru/tv/novost_dnia/inzhenerov-smeniaiut-fermery-v-ulianovskikh-shkolakh-otkroiutsia-agroklassy",
  "https://gorod55.ru/news/2025-06-25/vitaliy-hotsenko-pozdravil-omskih-shkolnikov-s-uspeshnoy-sdachey-ekzamenov-5422040",
  "https://ngs.ru/text/religion/2025/06/23/75622907/",
  "https://ura.news/news/1052954335",
  "https://lenta.r/news/2025/06/25/krym-voshel-v-ofis-genprokurora-ukrain/",
  "https://www.kinopoisk.ru/film/256552/",
  "https://github.com/",
  "https://dzen.ru/news/story/a2cbe106-1ecf-52c5-b7d6-271a1e9fa823?lang=ru&fan=1&t=1751389971&tt=true&persistent_id=3185770506&cl4url=393af7674392e2a730437186e3465a8c&story=d996b1d4-3878-55ce-a790-d44ce75cfdfe",
];

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
];

const fetchWithRetry = async (url: string, retries = 3) => {
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

  const headers = {
    "User-Agent": ua,
  };

  try {
    return await axios.request({
      url,
      headers,
      method: "GET",
    });
  } catch (err) {
    if (retries > 0) {
      await new Promise((res) => setTimeout(res, FETCH_TIMEOUT));
      return fetchWithRetry(url, retries - 1);
    }
    throw err;
  }
};

const fetchURL = async (url: string) => {
  const startTime = performance.now();

  try {
    const response = await fetchWithRetry(url);
    const loadTime = performance.now() - startTime;

    await enqueueArticleParsing({
      url: url,
      page: response.data,
      loadTime: loadTime,
    });

    return { loadTime, success: true };
  } catch (err) {
    const loadTime = performance.now() - startTime;

    await enqueueParsedArticleStore({
      url,
      title: "",
      content: "",
      published: null,

      loadTime: Math.round(loadTime),
      parsingTime: 0,
      fetchingStatus: "error",
      parsingStatus: "error",
    });

    return { loadTime, success: false };
  }
};

const executeFetching = async (abort: AbortController): Promise<void> => {
  for (let i = 0; i < URLS.length; i += MAX_CONCURRENT_REQUESTS) {
    const chunk = URLS.slice(i, i + MAX_CONCURRENT_REQUESTS);
    await Promise.all(chunk.map(fetchURL));
  }
  abort.abort();
};

async function processParsedArticle(
  stats: ExecutionStats,
  article: ArticleProcessingStatus,
  messageId: string,
) {
  try {
    console.log(JSON.stringify(article));

    stats[article.url] = {
      success:
        article.fetchingStatus === "success" &&
        article["parsingStatus"] === "success",
      processingTime: article.loadTime + article.parsingTime,
    };
    await ackMessage(ARTICLES_PROCESSING_STATUS_QUEUE, messageId);
  } catch (err) {
    throw err;
  }
}

const displayStats = (stats: ExecutionStats) => {
  const entries = Object.values(stats);
  const total = entries.length;
  const success = entries.filter((entry) => entry.success).length;
  const failed = total - success;
  const totalTime = entries.reduce(
    (sum, entry) => sum + entry.processingTime,
    0,
  );
  const meanTime = total > 0 ? Math.round(totalTime / total) : 0;

  const processingTimes = entries
    .map((entry) => entry.processingTime)
    .sort((a, b) => a - b);
  let medianTime = 0;

  if (processingTimes.length > 0) {
    const mid = Math.floor(processingTimes.length / 2);
    medianTime =
      processingTimes.length % 2 !== 0
        ? processingTimes[mid]
        : Math.round((processingTimes[mid - 1] + processingTimes[mid]) / 2);
  }

  console.log(
    `total: ${total}  success: ${success}  failed: ${failed}  mean_time_ms: ${meanTime}  median_time_ms: ${medianTime}`,
  );
};

export const runFetcher = async () => {
  const stats: ExecutionStats = {};

  try {
    await redisConnection.ping();
    await initRedisStreams();

    const abortController = new AbortController();

    await Promise.all([
      createConsumer(
        ARTICLES_PROCESSING_STATUS_QUEUE,
        "displayer",
        async (
          article: ArticleProcessingStatus,
          messageId: string,
        ): Promise<void> => {
          processParsedArticle(stats, article, messageId);
        },
        abortController.signal,
        300,
      ),
      executeFetching(abortController),
    ]);

    displayStats(stats);
  } catch (err) {
    process.exit(1);
  }
};
