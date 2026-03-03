import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import Redis, { type Redis as RedisClient } from 'ioredis';
import { AppConfigService } from '../config/config.service';

type SetNxttlResult = 'OK' | null;

@Injectable()
export class RedisService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(RedisService.name);
  private client?: RedisClient;
  private enabled = false;

  constructor(
    @Inject(AppConfigService) private readonly config: AppConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.config.redisEnabled) {
      this.logger.log('Redis disabled via REDIS_ENABLED=false');
      return;
    }

    const client = new Redis({
      host: this.config.redisHost,
      port: this.config.redisPort,
      username: this.config.redisUser || undefined,
      password: this.config.redisPass || undefined,
      db: this.config.redisDb,
      keyPrefix: this.config.redisKeyPrefix,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
    });

    client.on('error', (error) => {
      this.logger.warn(`Redis error: ${error.message}`);
    });

    try {
      await client.connect();
      this.client = client;
      this.enabled = true;
      this.logger.log(
        `Redis connected host=${this.config.redisHost} port=${this.config.redisPort} db=${this.config.redisDb}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Redis unavailable, fallback to DB-only mode: ${message}`,
      );
      await client.quit().catch(() => undefined);
    }
  }

  async onApplicationShutdown(): Promise<void> {
    if (!this.client) {
      return;
    }

    await this.client.quit().catch(() => undefined);
    this.client = undefined;
    this.enabled = false;
  }

  isEnabled(): boolean {
    return this.enabled && !!this.client;
  }

  async acquireLock(key: string, ttlMs: number): Promise<string | null> {
    if (!this.client || !this.enabled) {
      return null;
    }

    const token = randomUUID();
    const result = (await this.client.set(
      key,
      token,
      'PX',
      ttlMs,
      'NX',
    )) as SetNxttlResult;

    if (result !== 'OK') {
      return null;
    }

    return token;
  }

  async releaseLock(key: string, token: string): Promise<void> {
    if (!this.client || !this.enabled) {
      return;
    }

    const releaseScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      end
      return 0
    `;

    await this.client.eval(releaseScript, 1, key, token);
  }
}
