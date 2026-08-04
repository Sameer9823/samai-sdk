import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts", react: "src/react.ts", vue: "src/vue.ts", svelte: "src/svelte.ts", cli: "src/cli.ts" },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  minify: false,
  target: "es2022",
  external: ["react", "vue", "svelte", "svelte/store", "ioredis", "better-sqlite3", "@aws-sdk/client-bedrock-runtime", "@opentelemetry/api", "@valibot/to-json-schema", "@modelcontextprotocol/sdk", "ws"],
});
