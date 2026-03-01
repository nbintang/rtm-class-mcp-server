import { Global, Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { AppConfigModule } from '../config/config.module';
import { AppConfigService } from '../config/config.service';

@Global()
@Module({
  imports: [
    WinstonModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => {
        const isProduction = config.nodeEnv === 'production';

        return {
          level: isProduction ? 'info' : 'debug',
          transports: [
            new winston.transports.Console({
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.ms(),
                winston.format.errors({ stack: true }),
                winston.format.json(),
                winston.format.prettyPrint({ colorize: true }),
              ),
            }),
          ],
        };
      },
    }),
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}
