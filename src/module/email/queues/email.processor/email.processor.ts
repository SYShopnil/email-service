import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
// import nodemailer from 'nodemailer';

import { EEmailStatus } from '@prisma/client';
import { PrismaService } from '../../../../global/prisma/prisma.service';
import emailConfig from '../../../../config/email.config';
import { EQueueName } from '../../enum';
import { EJobName } from '../../enum';
import { IEmailJob } from '../../interfaces';
import { EmailService } from '../../email.service';

@Injectable()
@Processor(EQueueName.EMAIL)
export class EmailProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(emailConfig.KEY)
    private readonly cfg: ConfigType<typeof emailConfig>,
    private readonly emailService: EmailService,
  ) {
    super();
  }

  // BullMQ-style processor: handle all jobs here
  async process(job: Job<IEmailJob>): Promise<void> {
    if ((job.name as EJobName) !== EJobName.SEND) return;

    const { to, subject, body, logId } = job.data;

    try {
      await this.emailService.sendEmail({
        to,
        subject,
        body,
      });
      await this.prisma.emailLog.updateMany({
        where: { id: logId, to, subject, body, status: EEmailStatus.PENDING },
        data: {
          status: EEmailStatus.SENT,
          sentAt: new Date(),
          attemptCount: { increment: 1 },
        },
      });
    } catch (err: unknown) {
      await this.prisma.emailLog.updateMany({
        where: { id: logId, to, subject, body, status: EEmailStatus.PENDING },
        data: {
          status: EEmailStatus.FAILED,
          failedAt: new Date(),
          errorMessage: String((err as Error)?.message ?? err),
          attemptCount: { increment: 1 },
        },
      });
      throw err;
    }
  }
}
