import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { EmailService } from './email.service';

import {
  ApiTags,
  ApiQuery,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiBody,
  ApiOperation,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { SendEmailDto } from './dtos/send-email.dto';
import { LogService } from './log.service';

@ApiTags('email')
@Controller()
export class EmailController {
  constructor(
    private readonly emailService: EmailService,
    private readonly logService: LogService,
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // 5 requests per minute per IP
  @Post('send')
  @ApiOperation({
    summary: 'Queue an email for delivery',
    description:
      'Creates a PENDING email log and enqueues the job for sending via the configured queue. Supports both plain text and HTML bodies.',
  })
  @ApiBody({
    type: SendEmailDto,
    required: true,
    examples: {
      minimal: {
        summary: 'Minimal required fields',
        value: {
          to: 'xyz@example.com',
          body: 'hello there!',
          subject: 'Test',
        },
      },
      fullHtml: {
        summary: 'full email with subject and HTML body',
        value: {
          to: 'xyz@example.com',
          subject: 'Welcome to Task',
          body: '<p>Hi</p>',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Email log created and queued successfully.',
    schema: {
      example: {
        success: true,
        message: 'SUCCESS',
        data: {
          id: 'job_01J7X9Y2Z3ABCDEF',
          status: 'PENDING',
        },
        errors: null,
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'validation error has request body has invalid or missing fields.',
    schema: {
      example: {
        success: false,
        message: 'Validation Failed',
        data: null,
        errors: [
          { field: 'to', message: 'to must be an email' },
          { field: 'body', message: 'body should not be empty' },
        ],
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'log could not  created in the database.',
    schema: {
      example: {
        success: false,
        message: 'Logs Not Created',
        data: null,
        errors: null,
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected error occurred while queuing the email.',
    schema: {
      example: {
        success: false,
        message: 'Database connection failed',
        data: null,
        errors: null,
      },
    },
  })
  async send(@Body() dto: SendEmailDto) {
    console.log(`Make a request for sent a new email`);
    return this.emailService.enqueueEmail(dto);
  }

  @Get('logs')
  @ApiOperation({
    summary: 'List email logs (page/limit)',
    description:
      'Returns a paginated list of email logs ordered by newest first, plus a Dhaka-local "today" summary.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    minimum: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @ApiOkResponse({
    description: 'Paginated logs with today summary.',
    schema: {
      type: 'object',
      properties: {
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 3572 },
          },
          required: ['page', 'limit', 'total'],
        },
        today: {
          type: 'object',
          properties: {
            totalEmailsSentToday: {
              type: 'integer',
              example: 120,
              description: 'Count of logs created today (Dhaka time).',
            },
            successful: { type: 'integer', example: 110 },
            failed: { type: 'integer', example: 10 },
          },
          required: ['totalEmailsSentToday', 'successful', 'failed'],
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'clzn6w3t2001x0abcxyz' },
              to: { type: 'string', example: 'user@example.com' },
              subject: {
                type: 'string',
                nullable: true,
                example: 'Welcome 🎉',
              },
              status: {
                type: 'string',
                enum: ['PENDING', 'SENT', 'FAILED'],
                example: 'SENT',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                example: '2025-08-15T10:05:12.345Z',
              },
              sentAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
                example: '2025-08-15T10:05:13.120Z',
              },
              failedAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
                example: null,
              },
              attemptCount: { type: 'integer', example: 1 },
              errorMessage: { type: 'string', nullable: true, example: null },
            },
            required: ['id', 'to', 'status', 'createdAt', 'attemptCount'],
          },
        },
      },
      required: ['pagination', 'today', 'items'],
    },
  })
  async logs(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.logService.getLogs(+page, +limit);
  }
}
