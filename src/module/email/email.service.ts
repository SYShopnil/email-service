import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { EEmailStatus } from '@prisma/client';
import { PrismaService } from '../../global/prisma/prisma.service';
import { SendEmailDto } from './dtos/send-email.dto';
import { LogService } from './log.service';
import { ISendEmailJobData } from './interfaces';
import { EJobName, EQueueName } from './enum';
import nodemailer, { type Transporter } from 'nodemailer';
import { ConfigType } from '@nestjs/config';
import emailConfig from '../../config/email.config';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import type Mail from 'nodemailer/lib/mailer';

@Injectable()
export class EmailService {
  private readonly transporter: Transporter<
    SMTPTransport.SentMessageInfo,
    SMTPTransport.Options
  >;
  constructor(
    @InjectQueue(EQueueName.EMAIL)
    private readonly emailQueue: Queue<ISendEmailJobData>,

    private readonly prisma: PrismaService,
    private readonly logsService: LogService,
    @Inject(emailConfig.KEY)
    private readonly cfg: ConfigType<typeof emailConfig>,
  ) {
    const options: SMTPTransport.Options = {
      host: this.cfg.smtp.host,
      port: this.cfg.smtp.port,
      secure: this.cfg.smtp.secure, // false for 587 (STARTTLS)
      auth: { user: this.cfg.smtp.user, pass: this.cfg.smtp.pass },
      requireTLS: true,
    };
    this.transporter = nodemailer.createTransport(options);
  }

  async enqueueEmail(dto: SendEmailDto) {
    try {
      const log = await this.logsService.createLogs({
        to: dto.to,
        subject: dto.subject,
        body: dto.body,
        status: EEmailStatus.PENDING,
      });
      if (!log) {
        //!!TODO: error will thrown
      }
      // enqueue job with the logId
      await this.emailQueue.add(
        EJobName.SEND,
        { to: dto.to, subject: dto.subject, body: dto.body },
        { attempts: 3, backoff: { type: 'exponential', delay: 3000 } },
      );
      return { id: log.id, status: log.status };
    } catch (err) {
      //!!TODO: error will thrown
      console.log(err);
    }
  }

  // async getLogs(page = 1, limit = 10) {
  //   const skip = (page - 1) * limit;
  //   const [items, total] = await this.prisma.$transaction([
  //     this.prisma.emailLog.findMany({
  //       orderBy: { createdAt: 'desc' },
  //       skip,
  //       take: limit,
  //     }),
  //     this.prisma.emailLog.count(),
  //   ]);

  //   // Today’s summary (counts by sent/failed timestamps)
  //   const start = new Date();
  //   start.setHours(0, 0, 0, 0);
  //   const end = new Date();
  //   end.setHours(23, 59, 59, 999);

  //   const [sentToday, failedToday, totalCreatedToday] =
  //     await this.prisma.$transaction([
  //       this.prisma.emailLog.count({
  //         where: { sentAt: { gte: start, lte: end } },
  //       }),
  //       this.prisma.emailLog.count({
  //         where: { failedAt: { gte: start, lte: end } },
  //       }),
  //       this.prisma.emailLog.count({
  //         where: { createdAt: { gte: start, lte: end } },
  //       }),
  //     ]);

  //   return {
  //     pagination: { page, limit, total },
  //     today: {
  //       totalEmailsSentToday: totalCreatedToday,
  //       successful: sentToday,
  //       failed: failedToday,
  //     },
  //     items,
  //   };
  // }

  async sendEmail({
    to,
    subject,
    body,
  }: ISendEmailJobData): Promise<SMTPTransport.SentMessageInfo> {
    try {
      const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(body);

      const mail: Mail.Options = {
        from: this.cfg.smtp.user, // ensure this matches the authenticated user for Zoho
        to,
        subject,
        ...(looksLikeHtml ? { html: body } : { text: body }),
      };

      return this.transporter.sendMail(mail);
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException(err);
    }
  }
}
