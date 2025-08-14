import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { EEmailStatus } from '@prisma/client';
import { PrismaService } from '../../global/prisma/prisma.service';
import { ISendEmailJobData, SendEmailDto } from './dtos/send-email.dto';

@Injectable()
export class EmailService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('email') private readonly emailQueue: Queue<ISendEmailJobData>,
  ) {}

  async enqueue(dto: SendEmailDto) {
    // create log record (PENDING)
    const log = await this.prisma.emailLog.create({
      data: {
        to: dto.to,
        subject: dto.subject,
        body: dto.body,
        status: EEmailStatus.PENDING,
      },
    });
    // enqueue job with the logId
    await this.emailQueue.add(
      'send',
      { to: dto.to, subject: dto.subject, body: dto.body },
      { attempts: 3, backoff: { type: 'exponential', delay: 3000 } },
    );
    return { id: log.id, status: log.status };
  }

  async getLogs(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.emailLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.emailLog.count(),
    ]);

    // Today’s summary (counts by sent/failed timestamps)
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const [sentToday, failedToday, totalCreatedToday] =
      await this.prisma.$transaction([
        this.prisma.emailLog.count({
          where: { sentAt: { gte: start, lte: end } },
        }),
        this.prisma.emailLog.count({
          where: { failedAt: { gte: start, lte: end } },
        }),
        this.prisma.emailLog.count({
          where: { createdAt: { gte: start, lte: end } },
        }),
      ]);

    return {
      pagination: { page, limit, total },
      today: {
        totalEmailsSentToday: totalCreatedToday,
        successful: sentToday,
        failed: failedToday,
      },
      items,
    };
  }
}
