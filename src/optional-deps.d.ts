// These packages are optional peer dependencies (see package.json `peerDependenciesMeta`).
// They're only imported dynamically (`await import(...)`) by RedisSessionStore /
// SqliteSessionStore, and only if a consumer actually constructs one of those stores.
// Declaring them ambiently here means the SDK itself builds and typechecks whether or
// not a consumer has `ioredis` / `better-sqlite3` installed — the real, richer types
// from `@types/ioredis` / `better-sqlite3`'s own types are used automatically instead
// of these if the consumer's `node_modules` has them.

declare module "ioredis" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export default class IORedis {
    constructor(...args: any[]);
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ...args: any[]): Promise<unknown>;
    del(key: string): Promise<unknown>;
  }
}

declare module "better-sqlite3" {
  interface Statement {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    run(...params: any[]): unknown;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get(...params: any[]): any;
  }
  export default class Database {
    constructor(path: string, options?: unknown);
    exec(sql: string): void;
    prepare(sql: string): Statement;
  }
}

// Only imported dynamically (`await import(...)`) by `schemaToJsonSchema()` in schema-adapter.ts,
// and only when a valibot schema is actually passed to `generateObject()`/`streamObject()`. The
// real, richer types from `@valibot/to-json-schema` itself are used automatically instead of this
// if the consumer's `node_modules` has it.
declare module "@valibot/to-json-schema" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function toJsonSchema(schema: any, config?: any): unknown;
}

// Deliberately no ambient declaration for "ws" here, unlike the packages above: `ws` ships no
// types of its own, and the separate `@types/ws` package (already a devDependency of this repo,
// for exactly this reason) would conflict with a minimal ambient stub rather than cleanly merge
// with it. That's fine — `createRealtimeSession()`'s public exports (`RealtimeSession`,
// `RealtimeSessionOptions`, `RealtimeEvent`) never reference `ws`'s types, so a consumer without
// `ws`/`@types/ws` installed never needs them: they only see the compiled `dist/*.d.ts`, not
// `voice.ts`'s internal `await import("ws")`.
