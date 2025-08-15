import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './global/prisma/prisma.module';
import { EmailModule } from './module/email/email.module';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation';
import appConfig from './config/app.config';
import dbConfig from './config/db.config';
import redisConfig from './config/redis.config';
import emailConfig from './config/email.config';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      expandVariables: true,
    }),
    ConfigModule.forFeature(appConfig),
    ConfigModule.forFeature(dbConfig),
    ConfigModule.forFeature(redisConfig),
    ConfigModule.forFeature(emailConfig),

    LoggerModule.forRoot({
      pinoHttp: {
        transport: { target: 'pino-pretty' },
        autoLogging: true,
      },
    }),

    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    PrismaModule,
    EmailModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
