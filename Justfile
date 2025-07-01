fetcher: build
  bun run fetcher

parser: build
  bun run parser

storer: build
  bun run storer

all: build
  bun run all

purge-queues: build
  bun run purge-queues

migrate:
  bun run migrate

build:
  bun run build
