import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../global/prisma/prisma.service';

import { EEmailStatus, EmailLog, Prisma } from '@prisma/client';
import { ICreateLogs, IUpdateOptions } from './interfaces';
import { EUpdateResult } from './enum';
import { TodayAggRow } from './types';

@Injectable()
export class LogService {
  constructor(private readonly prisma: PrismaService) {}

  private toErrorMessage(err: IUpdateOptions['error']): string {
    if (!err) return '';
    if (typeof err === 'string') return err;
    if (err instanceof Error) return err.message;
    if (typeof err.message === 'string') return err.message;
    try {
      return JSON.stringify(err);
    } catch {
      return 'Unserializable error';
    }
  }

  async createLogs({
    body,
    status,
    subject,
    to,
  }: ICreateLogs): Promise<EmailLog> {
    try {
      console.log(`Store the log with PENDING status`);
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
      throw new InternalServerErrorException(
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  // async getLogs(page = 1, limit = 10) {
  //   try {
  //     const skip = (page - 1) * limit;
  //     const [items, total] = await this.prisma.$transaction([
  //       this.prisma.emailLog.findMany({
  //         orderBy: { createdAt: 'desc' },
  //         skip,
  //         take: limit,
  //       }),
  //       this.prisma.emailLog.count(),
  //     ]);

  //     const start = new Date();
  //     start.setHours(0, 0, 0, 0);
  //     const end = new Date();
  //     end.setHours(23, 59, 59, 999);

  //     const [sentToday, failedToday, totalCreatedToday] =
  //       await this.prisma.$transaction([
  //         this.prisma.emailLog.count({
  //           where: { sentAt: { gte: start, lte: end } },
  //         }),
  //         this.prisma.emailLog.count({
  //           where: { failedAt: { gte: start, lte: end } },
  //         }),
  //         this.prisma.emailLog.count({
  //           where: { createdAt: { gte: start, lte: end } },
  //         }),
  //       ]);

  //     return {
  //       pagination: { page, limit, total },
  //       today: {
  //         totalEmailsSentToday: totalCreatedToday,
  //         successful: sentToday,
  //         failed: failedToday,
  //       },
  //       items,
  //     };
  //   } catch (err) {
  //     throw new InternalServerErrorException(err);
  //   }
  // }

  private getDhakaDayBounds(nowUtc: Date = new Date()): {
    startUtc: Date;
    endUtc: Date;
  } {
    const offsetMs = 6 * 60 * 60 * 1000; // +06:00
    const dhakaNow = new Date(nowUtc.getTime() + offsetMs);
    const midnightDhakaUTCms = Date.UTC(
      dhakaNow.getUTCFullYear(),
      dhakaNow.getUTCMonth(),
      dhakaNow.getUTCDate(),
      0,
      0,
      0,
      0,
    );
    const startUtc = new Date(midnightDhakaUTCms - offsetMs);
    const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000 - 1);
    return { startUtc, endUtc };
  }

  async getLogs(page = 1, limit = 10) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const skip = (safePage - 1) * safeLimit;

    const select: Prisma.EmailLogSelect = {
      id: true,
      to: true,
      subject: true,
      status: true,
      createdAt: true,
      sentAt: true,
      failedAt: true,
      attemptCount: true,
      errorMessage: true,
    };

    const { startUtc, endUtc } = this.getDhakaDayBounds();

    try {
      // reads in parallel
      const [items, total, todayRows] = await Promise.all([
        this.prisma.emailLog.findMany({
          orderBy: { createdAt: 'desc' },
          skip,
          take: safeLimit,
          select,
        }),
        this.prisma.emailLog.count(),
        this.prisma.$queryRaw<TodayAggRow[]>`
        SELECT
          COUNT(*) FILTER (WHERE "createdAt" >= ${startUtc} AND "createdAt" <= ${endUtc}) AS created,
          COUNT(*) FILTER (WHERE "sentAt"    >= ${startUtc} AND "sentAt"    <= ${endUtc}) AS sent,
          COUNT(*) FILTER (WHERE "failedAt"  >= ${startUtc} AND "failedAt"  <= ${endUtc}) AS failed
        FROM "EmailLog";
      `,
      ]);

      const t = todayRows[0] ?? { created: 0n, sent: 0n, failed: 0n };

      return {
        pagination: { page: safePage, limit: safeLimit, total },
        today: {
          totalEmailsSentToday: Number(t.created),
          successful: Number(t.sent),
          failed: Number(t.failed),
        },
        items,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(message);
    }
  }
  async updateLogs(
    logId: string,
    outcome: EUpdateResult,
    opts: IUpdateOptions = {},
  ): Promise<boolean> {
    console.log('Update the status to SENT/FAILED is starting');

    const baseData: Prisma.EmailLogUpdateInput = {
      attemptCount: { increment: 1 },
    };

    const finalStatus: EEmailStatus =
      outcome === EUpdateResult.SENT ? EEmailStatus.SENT : EEmailStatus.FAILED;

    const coreData: Prisma.EmailLogUpdateInput =
      finalStatus === EEmailStatus.SENT
        ? { ...baseData, status: EEmailStatus.SENT, sentAt: new Date() }
        : {
            ...baseData,
            status: EEmailStatus.FAILED,
            failedAt: new Date(),
            errorMessage: this.toErrorMessage(opts.error ?? null),
          };

    const data: Prisma.EmailLogUpdateInput = opts.extraData
      ? { ...coreData, ...opts.extraData }
      : coreData;

    try {
      // Update only if still PENDING; does not throw if 0 rows match
      const { count } = await this.prisma.emailLog.updateMany({
        where: { id: logId, status: EEmailStatus.PENDING },
        data,
      });

      if (count === 0) {
        console.log(
          'No matching PENDING row to update (already finalized or id not found).',
        );
        return false;
      }

      console.log(`Successfully status has been updated to ${finalStatus}`);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(message);
      throw new InternalServerErrorException(message);
    }
  }
}
