import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RtmMcpModule } from './mcp/mcp.module';
import { AppConfigModule } from './config/config.module';
import { LoggerModule } from './logger/logger.module';
import { RedisModule } from './redis/redis.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    RedisModule,
    PrismaModule,
    RtmMcpModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
