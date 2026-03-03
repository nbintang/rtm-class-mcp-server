import { registerAs } from '@nestjs/config';
import { envSchema } from './config.schema';

const appConfig = registerAs('app', () => {
  const env = envSchema.parse(process.env);

  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    db: {
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      pass: env.DB_PASS,
      name: env.DB_NAME,
      sync: env.DB_SYNC,
    },
    redis: {
      enabled: env.REDIS_ENABLED,
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      user: env.REDIS_USER,
      pass: env.REDIS_PASS,
      db: env.REDIS_DB,
      keyPrefix: env.REDIS_KEY_PREFIX,
      lockTtlMs: env.REDIS_LOCK_TTL_MS,
    },
  };
});

export default appConfig;
