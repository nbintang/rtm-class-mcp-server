import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';
import { AppConfigService } from './config/config.service';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  const config = app.get(AppConfigService);
  await app.listen({ port: config.port, host: '0.0.0.0' });
}
void bootstrap();
