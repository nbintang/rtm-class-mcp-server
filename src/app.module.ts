import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RtmMcpModule } from './mcp/mcp.module';
import { DatabaseModule } from './database/database.module';
import { AppConfigModule } from './config/config.module';

@Module({
  imports: [AppConfigModule, RtmMcpModule, DatabaseModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {} 
