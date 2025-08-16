import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../global/prisma/prisma.service';

import { EEmailStatus, EmailLog, Prisma } from '@prisma/client';
import { ICreateLogs, IUpdateOptions } from './interfaces';
import { EUpdateResult } from './enum';

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
      const result = await this.prisma.$transaction(
        async (tx) => {
          // run all reads within the same connection & snapshot (for  read time consistency)
          const [items, total, createdToday, sentToday, failedToday] =
            await Promise.all([
              tx.emailLog.findMany({
                orderBy: { createdAt: 'desc' },
                skip,
                take: safeLimit,
                select,
              }),
              tx.emailLog.count(),
              tx.emailLog.count({
                where: { createdAt: { gte: startUtc, lte: endUtc } },
              }),
              tx.emailLog.count({
                where: { sentAt: { gte: startUtc, lte: endUtc } },
              }),
              tx.emailLog.count({
                where: { failedAt: { gte: startUtc, lte: endUtc } },
              }),
            ]);

          return {
            pagination: { page: safePage, limit: safeLimit, total },
            today: {
              totalEmailsSentToday: createdToday,
              successful: sentToday,
              failed: failedToday,
            },
            items,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        },
      );

      return result;
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
      // update only if still PENDING; does not throw if 0 rows match
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
