import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../global/prisma/prisma.service';

import { EEmailStatus, EmailLog, Prisma } from '@prisma/client';
import { ICreateLogs, IUpdateOptions } from './interfaces';
import { EUpdateResult } from './enum';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

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

  async updateLogs(
    logId: string,
    outcome: EUpdateResult,
    opts: IUpdateOptions = {},
  ): Promise<boolean> {
    const baseData: Prisma.EmailLogUpdateInput = {
      attemptCount: { increment: 1 },
    };
    console.log(`Update the status to SENT/FAILED is starting`);
    const data: Prisma.EmailLogUpdateInput =
      outcome === EUpdateResult.SENT
        ? { ...baseData, status: EEmailStatus.SENT, sentAt: new Date() }
        : {
            ...baseData,
            status: EEmailStatus.FAILED,
            failedAt: new Date(),
            errorMessage: this.toErrorMessage(opts.error ?? null),
          };

    if (opts.extraData) Object.assign(data, opts.extraData);

    try {
      // Single-row, atomic update guarded by composite unique (id, status=PENDING)
      const updated = await this.prisma.emailLog.update({
        where: { id_status: { id: logId, status: EEmailStatus.PENDING } },
        data,
      });
      console.log(`Successfully status has been updated to ${updated.status}`);

      return true;
    } catch (err) {
      console.log(err);
      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        return false;
      }
      throw new InternalServerErrorException(err);
    }
  }
}
