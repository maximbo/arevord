import { Command } from "commander";
import { runParser } from "./parser";
import { runStorer } from "./storer";
import { runFetcher } from "./fetcher";
import { purgeAllQueues } from "./queues";
import logger from "./logger";

const program = new Command();

program.command("parser").action(async (name, opts) => {
  await runParser().catch(logger.error);
});

program.command("storer").action(async (name, opts) => {
  await runStorer().catch(logger.error);
});

program.command("fetcher").action(async (name, opts) => {
  await runFetcher().catch(logger.error);
  process.exit(0);
});

program.command("all").action(async (name, opts) => {
  await Promise.all([runParser(), runStorer(), runFetcher()]).catch(
    logger.error,
  );
});

program.command("purge-queues").action(async (name, opts) => {
  await purgeAllQueues();
  process.exit(0);
});

const main = async () => {
  program.parse(Bun.argv);
};

await main().catch(logger.error);
