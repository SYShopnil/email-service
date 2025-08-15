import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { EQueueName, EUpdateResult } from '../../enum';
import { EJobName } from '../../enum';
import { IEmailJob, IUpdateOptions } from '../../interfaces';
import { EmailService } from '../../email.service';
import { LogService } from '../../log.service';

@Injectable()
@Processor(EQueueName.EMAIL)
export class EmailProcessor extends WorkerHost {
  constructor(
    private readonly emailService: EmailService,
    private readonly logService: LogService,
  ) {
    super();
  }

  async process(job: Job<IEmailJob>): Promise<void> {
    if ((job.name as EJobName) !== EJobName.SEND) return;

    const { to, subject, body, logId } = job.data;
    const isLastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);

    try {
      const res = await this.emailService.sendEmail({ to, subject, body });

      if (res.status) {
        await this.logService.updateLogs(logId, EUpdateResult.SENT, {});
        return;
      }
      throw new Error(
        (res.error as Error)?.message ?? res.error ?? 'send failed',
      );
    } catch (err) {
      if (isLastAttempt) {
        const errorPayload: IUpdateOptions = {
          error: String((err as Error)?.message ?? err),
        };
        await this.logService.updateLogs(
          logId,
          EUpdateResult.FAILED,
          errorPayload,
        );
      }
      throw err;
    }
  }
}
