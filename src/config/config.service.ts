import { Inject, Injectable } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import appConfig from './config';

@Injectable()
export class AppConfigService {
  constructor(
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {}

  get nodeEnv(): string {
    return this.config.nodeEnv;
  }

  get port(): number {
    return this.config.port;
  }

  get dbHost(): string {
    return this.config.db.host;
  }

  get dbPort(): number {
    return this.config.db.port;
  }

  get dbUser(): string {
    return this.config.db.user;
  }

  get dbPass(): string {
    return this.config.db.pass;
  }

  get dbName(): string {
    return this.config.db.name;
  }

  get dbUrl(): string | undefined {
    return this.config.db.url;
  }

  get redisEnabled(): boolean {
    return this.config.redis.enabled;
  }

  get redisHost(): string {
    return this.config.redis.host;
  }

  get redisPort(): number {
    return this.config.redis.port;
  }

  get redisUser(): string {
    return this.config.redis.user;
  }

  get redisPass(): string {
    return this.config.redis.pass;
  }

  get redisDb(): number {
    return this.config.redis.db;
  }

  get redisKeyPrefix(): string {
    return this.config.redis.keyPrefix;
  }

  get redisLockTtlMs(): number {
    return this.config.redis.lockTtlMs;
  }

  get databaseUrl(): string {
    if (this.dbUrl) {
      return this.dbUrl;
    }

    const username = encodeURIComponent(this.dbUser);
    const password = encodeURIComponent(this.dbPass ?? '');
    return `postgresql://${username}:${password}@${this.dbHost}:${this.dbPort}/${this.dbName}`;
  }
}
