import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../global/prisma/prisma.service';

import { EmailLog } from '@prisma/client';
import { ICreateLogs } from './interfaces';

@Injectable()
export class LogService {
  constructor(private readonly prisma: PrismaService) {}

  async createLogs({
    body,
    status,
    subject,
    to,
  }: ICreateLogs): Promise<EmailLog> {
    try {
      return await this.prisma.emailLog.create({
        data: {
          to,
          subject,
          body,
          status,
        },
      });
    } catch (err) {
      console.log(err);
      //!!TODO need to make error handler
      throw new InternalServerErrorException(err);
    }
  }

  async getLogs(page = 1, limit = 10) {
    try {
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
    } catch (err) {
      //TODO:Error handling
      throw new InternalServerErrorException(err);
    }
  }
}
