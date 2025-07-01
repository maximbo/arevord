import { Readability } from "@mozilla/readability";
import { stripHtml } from "string-strip-html";
import { JSDOM } from "jsdom";

export const parseArticleByReadability = (page: string) => {
  const dom = new JSDOM(page);
  const reader = new Readability(dom.window.document);
  const parsed = reader.parse();

  return {
    title: parsed?.title || "",
    content: stripHtml(parsed?.content || "")
      .result.replace(/\s+/g, " ")
      .trim(),
    published: parsed?.publishedTime ? new Date(parsed.publishedTime) : null,
  };
};
