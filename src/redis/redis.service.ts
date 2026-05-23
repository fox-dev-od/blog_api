import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: RedisClientType;
  private readonly defaultTtlSeconds: number;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const port = Number(this.configService.get('REDIS_PORT') ?? 6379);
    const password =
      this.configService.get<string>('REDIS_PASSWORD') || undefined;
    const database = Number(this.configService.get('REDIS_DB') ?? 0);

    this.defaultTtlSeconds = Number(
      this.configService.get('REDIS_DEFAULT_TTL') ?? 14_400,
    );

    this.client = createClient({
      socket: {
        host,
        port,
        reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
      },
      password,
      database,
    });

    this.client.on('error', (error: unknown) => {
      this.logger.error(`Redis error: ${this.getErrorMessage(error)}`);
    });
  }

  onModuleInit() {
    void this.client.connect().catch((error: unknown) => {
      this.logger.error(
        `Failed to connect Redis: ${this.getErrorMessage(error)}`,
      );
    });
  }

  async onModuleDestroy() {
    try {
      if (this.client.isOpen) {
        await this.client.quit();
      }
    } catch (error) {
      this.logger.error(
        `Failed to close Redis: ${this.getErrorMessage(error)}`,
      );
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.client.isReady) {
        return null;
      }

      const value = await this.client.get(key);
      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(
        `Redis get failed for ${key}: ${this.getErrorMessage(error)}`,
      );
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      if (!this.client.isReady) {
        return;
      }

      await this.client.set(key, JSON.stringify(value), {
        EX: ttlSeconds ?? this.defaultTtlSeconds,
      });
    } catch (error) {
      this.logger.error(
        `Redis set failed for ${key}: ${this.getErrorMessage(error)}`,
      );
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (!this.client.isReady) {
        return;
      }

      await this.client.del(key);
    } catch (error) {
      this.logger.error(
        `Redis del failed for ${key}: ${this.getErrorMessage(error)}`,
      );
    }
  }

  async delMany(keys: string[]): Promise<void> {
    const uniqueKeys = [...new Set(keys.filter(Boolean))];
    if (!uniqueKeys.length) {
      return;
    }

    try {
      if (!this.client.isReady) {
        return;
      }

      await this.client.del(uniqueKeys);
    } catch (error) {
      this.logger.error(`Redis delMany failed: ${this.getErrorMessage(error)}`);
    }
  }

  async delByPattern(pattern: string): Promise<void> {
    try {
      if (!this.client.isReady) {
        return;
      }

      const keys: string[] = [];
      for await (const key of this.client.scanIterator({
        MATCH: pattern,
        COUNT: 100,
      })) {
        keys.push(...(Array.isArray(key) ? key : [key]));

        if (keys.length >= 100) {
          await this.client.del(keys);
          keys.length = 0;
        }
      }

      if (keys.length) {
        await this.client.del(keys);
      }
    } catch (error) {
      this.logger.error(
        `Redis delByPattern failed for ${pattern}: ${this.getErrorMessage(error)}`,
      );
    }
  }

  buildKey(...parts: string[]): string {
    return parts
      .map((part) => String(part).trim())
      .filter(Boolean)
      .join(':');
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}
