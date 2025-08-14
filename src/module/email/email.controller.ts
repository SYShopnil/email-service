import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { EmailService } from './email.service';

import { ApiTags, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { SendEmailDto } from './dtos/send-email.dto';

@ApiTags('email')
@Controller()
export class EmailController {
  constructor(private readonly service: EmailService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // 5 requests per minute per IP
  @Post('send')
  @ApiResponse({ status: 201, description: 'Email queued.' })
  async send(@Body() dto: SendEmailDto) {
    return this.service.enqueue(dto);
  }

  @Get('logs/email')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async logs(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.service.getLogs(Number(page), Number(limit));
  }
}
