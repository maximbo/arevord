import { build } from "bun";

await build({
  entrypoints: ["./src/main.ts"],
  outdir: "./dist",
  minify: true,
  target: "bun",
  sourcemap: "external",
});
