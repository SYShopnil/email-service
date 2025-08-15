import { BaseResponse } from './base.response';
import { IApiErrorField } from '../types/api-error-field.type';

export class ErrorResponse extends BaseResponse<null> {
  constructor(message: string, errors: IApiErrorField[] = []) {
    super(false, message, null, errors);
  }
}
