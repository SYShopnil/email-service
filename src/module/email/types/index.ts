import { EmailLog } from '@prisma/client';

export type TSentEmailResponse = Pick<EmailLog, 'id' | 'status'>;
