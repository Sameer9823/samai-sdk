import type { Message } from "../types.js";
import type { SessionStore } from "../session.js";

export interface RedisSessionStoreOptions {
  /** Reuse an existing ioredis client instance instead of creating a new one. */
  client?: unknown;
  /** Connection string, used only if `client` isn't provided. Default: `process.env.REDIS_URL` or "redis://localhost:6379". */
  url?: string;
  /** Prefix applied to every key this store touches, so sessions don't collide with other data in the same Redis instance. Default: "samai:session:". */
  keyPrefix?: string;
  /** If set, sessions expire after this many seconds of inactivity (reset on every append). */
  ttlSeconds?: number;
}

interface MinimalRedisClient {
  rpush(key: string, ...values: string[]): Promise<unknown>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
  expire(key: string, seconds: number): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

/**
 * Persists sessions in Redis — survives process restarts and is shareable across multiple
 * server instances, unlike `InMemorySessionStore`. Requires the optional `ioredis` peer
 * dependency (`npm install ioredis`); it's imported dynamically so the rest of the SDK works
 * fine without it installed.
 *
 * Usage:
 *   const store = new RedisSessionStore({ url: process.env.REDIS_URL, ttlSeconds: 60 * 60 * 24 });
 *   const session = createSession(userId, store);
 */
export class RedisSessionStore implements SessionStore {
  private clientPromise: Promise<MinimalRedisClient>;
  private keyPrefix: string;
  private ttlSeconds?: number;

  constructor(options: RedisSessionStoreOptions = {}) {
    this.keyPrefix = options.keyPrefix ?? "samai:session:";
    this.ttlSeconds = options.ttlSeconds;

    this.clientPromise = options.client
      ? Promise.resolve(options.client as MinimalRedisClient)
      : this.connect(options.url);
  }

  private async connect(url?: string): Promise<MinimalRedisClient> {
    let IORedis: new (connectionString: string) => MinimalRedisClient;
    try {
      ({ default: IORedis } = await import("ioredis"));
    } catch (err) {
      throw new Error(
        "RedisSessionStore requires the optional `ioredis` package. Install it with `npm install ioredis`.",
        { cause: err }
      );
    }
    return new IORedis(url ?? process.env.REDIS_URL ?? "redis://localhost:6379");
  }

  private key(sessionId: string): string {
    return `${this.keyPrefix}${sessionId}`;
  }

  async getMessages(sessionId: string): Promise<Message[]> {
    const client = await this.clientPromise;
    const raw = await client.lrange(this.key(sessionId), 0, -1);
    return raw.map((entry) => JSON.parse(entry) as Message);
  }

  async appendMessages(sessionId: string, messages: Message[]): Promise<void> {
    if (messages.length === 0) return;
    const client = await this.clientPromise;
    const key = this.key(sessionId);
    // RPUSH each message as its own list element — atomic per message, so
    // overlapping appends never lose each other's writes (no read-modify-write).
    await client.rpush(key, ...messages.map((m) => JSON.stringify(m)));
    if (this.ttlSeconds) await client.expire(key, this.ttlSeconds);
  }

  async clear(sessionId: string): Promise<void> {
    const client = await this.clientPromise;
    await client.del(this.key(sessionId));
  }
}
