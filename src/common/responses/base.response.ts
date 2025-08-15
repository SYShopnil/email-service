import { IApiErrorField } from '../types/api-error-field.type';

export abstract class BaseResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors: IApiErrorField[] | null;

  protected constructor(
    success: boolean,
    message: string,
    data: T | null = null,
    errors: IApiErrorField[] | null = null,
  ) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.errors = errors;
  }
}
