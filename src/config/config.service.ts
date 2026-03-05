import { Inject, Injectable } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
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

  get dbSync(): boolean {
    return this.config.db.sync;
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

  getTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: this.dbHost,
      port: this.dbPort,
      username: this.dbUser,
      password: this.dbPass,
      database: this.dbName,
      synchronize: false,
      migrationsRun: false, // <- penting
      autoLoadEntities: true,
      logging: true,
    };
  }
}
