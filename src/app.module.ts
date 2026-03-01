import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RtmMcpModule } from './mcp/mcp.module';

@Module({
  imports: [RtmMcpModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
