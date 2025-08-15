import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { PrismaModule } from '../../global/prisma/prisma.module';
import redisConfig from '../../config/redis.config';
import emailConfig from '../../config/email.config';
import { EmailService } from './email.service';
import { EmailProcessor } from './queues/email.processor';
import { EmailController } from './email.controller';
import { LogService } from './log.service';
import { EQueueName } from './enum';

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forFeature(redisConfig),
    ConfigModule.forFeature(emailConfig),
    BullModule.forRootAsync({
      imports: [ConfigModule.forFeature(redisConfig)],
      useFactory: (cfg: ConfigType<typeof redisConfig>) => ({
        connection: {
          host: cfg.host,
          port: cfg.port,
          password: cfg.password,
        },
      }),
      inject: [redisConfig.KEY],
    }),
    BullModule.registerQueue({ name: EQueueName.EMAIL }),
  ],
  controllers: [EmailController],
  providers: [EmailService, EmailProcessor, LogService],
})
export class EmailModule {}
