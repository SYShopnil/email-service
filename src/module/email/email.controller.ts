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
  @ApiQuery({ name: 'page', required: false, minimum: 1 })
  @ApiQuery({ name: 'limit', required: false })
  async logs(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.logService.getLogs(+page, +limit);
  }
}
