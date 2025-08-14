import { EEmailStatus, EmailLog } from '@prisma/client';
import { SendEmailDto } from '../dtos/send-email.dto';

export interface ICreateLogs
  extends Pick<SendEmailDto, 'to' | 'subject' | 'body'> {
  status: EEmailStatus;
}

export interface ISendEmailJobData {
  to: string;
  subject: string;
  body: string;
}

export interface IEmailJob
  extends Pick<SendEmailDto, 'to' | 'subject' | 'body'> {
  logId: string;
}

export type TLogUpdate = Pick<
  EmailLog,
  'id' | 'status' | 'sentAt' | 'failedAt' | 'attemptCount'
>;
