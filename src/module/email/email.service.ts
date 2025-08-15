import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { EEmailStatus } from '@prisma/client';
import { SendEmailDto } from './dtos/send-email.dto';
import { LogService } from './log.service';
import { ISendEmailJobData } from './interfaces';
import { EJobName, EQueueName, EUpdateResult } from './enum';
import nodemailer, { type Transporter } from 'nodemailer';
import { ConfigType } from '@nestjs/config';
import emailConfig from '../../config/email.config';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import type Mail from 'nodemailer/lib/mailer';
import { SuccessResponse } from '../../common/responses/success.response';
import { TSentEmailResponse } from './types';

@Injectable()
export class EmailService {
  private readonly transporter: Transporter<
    SMTPTransport.SentMessageInfo,
    SMTPTransport.Options
  >;

  constructor(
    @InjectQueue(EQueueName.EMAIL)
    private readonly emailQueue: Queue<ISendEmailJobData>,
    @Inject(emailConfig.KEY)
    private readonly cfg: ConfigType<typeof emailConfig>,

    private readonly logsService: LogService,
  ) {
    const options: SMTPTransport.Options = {
      host: this.cfg.smtp.host,
      port: this.cfg.smtp.port,
      secure: this.cfg.smtp.secure,
      auth: { user: this.cfg.smtp.user, pass: this.cfg.smtp.pass },
      requireTLS: true,
    };
    this.transporter = nodemailer.createTransport(options);
  }

  async enqueueEmail(
    dto: SendEmailDto,
  ): Promise<SuccessResponse<TSentEmailResponse>> {
    try {
      const log = await this.logsService.createLogs({
        to: dto.to,
        subject: dto.subject,
        body: dto.body,
        status: EEmailStatus.PENDING,
      });
      if (!log) {
        console.log(`Log failed to create`);
        throw new NotFoundException('Logs Not Created');
      }
      // enqueue job with the logId
      try {
        await this.emailQueue.add(
          EJobName.SEND,
          { to: dto.to, subject: dto.subject, body: dto.body, logId: log.id },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 3000 },
            jobId: log.id,
            removeOnComplete: { age: 3600, count: 1000 },
            removeOnFail: { age: 86400, count: 1000 },
          },
        );
        console.log(`Email is sent to queue for process to delivery`);
      } catch (err) {
        console.log(`Email failed to queue for process to delivery`);
        console.log(err);
        await this.logsService.updateLogs(log.id, EUpdateResult.FAILED, {
          error: err instanceof Error ? err.message : String(err),
        });
        throw new InternalServerErrorException(
          err instanceof Error ? err.message : String(err),
        );
      }

      return new SuccessResponse({ id: log.id, status: log.status });
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException(
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async sendEmail({ to, subject, body }: ISendEmailJobData): Promise<{
    status: boolean;
    result?: SMTPTransport.SentMessageInfo;
    error?: unknown;
  }> {
    try {
      console.log(`Make request for Send Email`);
      const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(body);

      const mail: Mail.Options = {
        from: this.cfg.smtp.user,
        to,
        subject,
        ...(looksLikeHtml ? { html: body } : { text: body }),
      };
      const result: SMTPTransport.SentMessageInfo =
        await this.transporter.sendMail(mail);

      return {
        status: true,
        result,
      };
    } catch (err) {
      console.log(err);
      return {
        status: false,
        error: err,
      };
    }
  }
}
