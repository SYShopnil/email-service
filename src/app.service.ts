import { Injectable } from '@nestjs/common';
import { SuccessResponse } from './common/responses/success.response';

@Injectable()
export class AppService {
  getHello(): SuccessResponse<string> {
    return new SuccessResponse('Hello Task Server');
  }
}
