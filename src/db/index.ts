import { drizzle } from "drizzle-orm/bun-sqlite";

export const initDB = () => {
  return drizzle(process.env.DB_DSN!);
};

export const db = initDB();
