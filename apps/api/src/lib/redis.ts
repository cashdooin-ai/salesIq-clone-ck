import Redis from 'ioredis';
import { config } from '../config/index.js';

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  console.log('📦 Redis connected');
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
});

// Cache helpers
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  },

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const data = JSON.stringify(value);
    if (ttlSeconds) {
      await redis.setex(key, ttlSeconds, data);
    } else {
      await redis.set(key, data);
    }
  },

  async del(key: string): Promise<void> {
    await redis.del(key);
  },

  async delPattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },
};

// Pub/Sub helpers
export const pubsub = {
  subscriber: new Redis(config.redisUrl),
  publisher: redis,

  async publish(channel: string, message: unknown): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(message));
  },

  subscribe(channel: string, handler: (message: unknown) => void): void {
    this.subscriber.subscribe(channel);
    this.subscriber.on('message', (ch, msg) => {
      if (ch === channel) {
        handler(JSON.parse(msg));
      }
    });
  },
};
