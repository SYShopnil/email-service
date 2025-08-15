import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { SuccessResponse } from './common/responses/success.response';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): SuccessResponse<string> {
    return this.appService.getHello();
  }
}
