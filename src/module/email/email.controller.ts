import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { EmailService } from './email.service';

import {
  ApiTags,
  ApiQuery,
  ApiTooManyRequestsResponse,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiBody,
  ApiOperation,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { SendEmailDto } from './dtos/send-email.dto';
import { EnqueueEmailResponseDto } from './dtos/enqueue-email-response.dto';
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
      'Enqueues an email to be sent via SMTP (Brevo). Rate limited to **5 requests/minute per IP**.',
  })
  @ApiBody({
    type: SendEmailDto,
    required: true,
    examples: {
      minimal: {
        summary: 'Minimal',
        value: { to: 'user@example.com', body: 'Hello there!' },
      },
      fullHtml: {
        summary: 'With subject + HTML body',
        value: {
          to: 'user@example.com',
          subject: 'Welcome to Ghapfy',
          body: '<p>Hi 👋 — thanks for joining!</p>',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Email queued.',
    type: EnqueueEmailResponseDto,
    schema: {
      example: {
        id: 'job_01J7X9Y2Z3ABCDEF',
        status: 'queued',
        to: 'user@example.com',
        subject: 'Welcome to Ghapfy',
        queuedAt: '2025-08-14T17:22:54.123Z',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Validation error',
    schema: {
      example: {
        statusCode: 400,
        message: ['to must be an email', 'body should not be empty'],
        error: 'Bad Request',
      },
    },
  })
  @ApiTooManyRequestsResponse({
    description: 'Rate limit exceeded',
    schema: {
      example: { statusCode: 429, message: 'Too Many Requests' },
    },
  })
  async send(@Body() dto: SendEmailDto) {
    return this.emailService.enqueueEmail(dto);
  }

  @Get('logs/email')
  @ApiQuery({ name: 'page', required: false, minimum: 1 })
  @ApiQuery({ name: 'limit', required: false })
  async logs(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.logService.getLogs(+page, +limit);
  }
}
