/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import nodemailer from 'nodemailer';

import { EEmailStatus } from '@prisma/client';
import { PrismaService } from '../../../../global/prisma/prisma.service';
import emailConfig from '../../../../config/email.config';

@Injectable()
@Processor('email')
export class EmailProcessor extends WorkerHost {
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(emailConfig.KEY)
    private readonly cfg: ConfigType<typeof emailConfig>,
  ) {
    super();

    this.transporter = nodemailer.createTransport({
      host: cfg.smtp.host,
      port: cfg.smtp.port,
      secure: cfg.smtp.secure,
      auth: { user: cfg.smtp.user, pass: cfg.smtp.pass },
    });
  }

  // BullMQ-style processor: handle all jobs here
  async process(
    job: Job<{ to: string; subject: string; body: string }>,
  ): Promise<void> {
    if (job.name !== 'send') return;

    const { to, subject, body } = job.data;

    try {
      await this.transporter.sendMail({
        from: this.cfg.smtp.user,
        to,
        subject,
        text: body,
      });

      await this.prisma.emailLog.updateMany({
        where: { to, subject, body, status: EEmailStatus.PENDING },
        data: {
          status: EEmailStatus.SENT,
          sentAt: new Date(),
          attemptCount: { increment: 1 },
        },
      });
    } catch (err: unknown) {
      await this.prisma.emailLog.updateMany({
        where: { to, subject, body, status: EEmailStatus.PENDING },
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
