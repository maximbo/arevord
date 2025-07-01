export type ArticleProcessingStatus = {
  url: string;
  title: string | "";
  content: string | "";
  published: Date | null;

  loadTime: number;
  parsingTime: number;
  fetchingStatus: "success" | "error";
  parsingStatus: "success" | "error" | "unknown";
};

export type ArticleParsingJob = {
  url: string;
  page: string;
  loadTime: number;
};
