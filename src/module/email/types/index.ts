import { EmailLog } from '@prisma/client';

import { EEmailStatus } from '@prisma/client';

export type TSentEmailResponse = Pick<EmailLog, 'id' | 'status'>;

export type TodayAggRow = { created: bigint; sent: bigint; failed: bigint };

export type LogListItem = {
  id: string;
  to: string;
  subject: string | null;
  status: EEmailStatus;
  createdAt: Date;
  sentAt: Date | null;
  failedAt: Date | null;
  attemptCount: number;
  errorMessage: string | null;
};

export type GetLogsResponse = {
  items: LogListItem[];
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
  today: {
    totalEmailSentToday: number;
    successful: number;
    failed: number;
  };
};
