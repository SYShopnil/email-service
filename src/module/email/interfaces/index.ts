import { EEmailStatus, EmailLog, Prisma } from '@prisma/client';
import { SendEmailDto } from '../dtos/send-email.dto';

export interface ICreateLogs
  extends Pick<SendEmailDto, 'to' | 'subject' | 'body'> {
  status: EEmailStatus;
}

export interface ISendEmailJobData {
  to: string;
  subject: string;
  body: string;
  logId?: string;
}

export interface IEmailJob
  extends Pick<SendEmailDto, 'to' | 'subject' | 'body'> {
  logId: string;
}

export type TLogUpdate = Pick<
  EmailLog,
  'id' | 'status' | 'sentAt' | 'failedAt' | 'attemptCount'
>;

export interface IUpdateOptions {
  to?: string;
  subject?: string;
  body?: string;
  error?: Error | { message?: string } | string | null;
  // Extra fields to merge into the update (type-safe Prisma input)
  extraData?: Prisma.EmailLogUpdateInput;
}
