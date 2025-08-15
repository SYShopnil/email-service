import { EDefaultResponse } from '../enum/default.response';
import { BaseResponse } from './base.response';

export class SuccessResponse<T> extends BaseResponse<T> {
  constructor(
    data: T,
    message: string | EDefaultResponse = EDefaultResponse.SUCCESS,
  ) {
    super(true, message, data, null);
  }
}
