import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { ErrorResponse } from '../responses/error.response';
import { IApiErrorField } from '../types/api-error-field.type';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let errors: IApiErrorField[] = [];
    let message = 'Unexpected error occurred';

    if (
      exception instanceof BadRequestException &&
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse &&
      Array.isArray((exceptionResponse as Record<string, unknown>).message)
    ) {
      const messages = (exceptionResponse as Record<string, unknown>)
        .message as string[];

      errors = messages.map((msg) => {
        const [field] = msg.split(' ');
        return { field: field ?? 'general', error: msg };
      });

      message = 'Validation failed';
    } else if (
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
    ) {
      message = String((exceptionResponse as Record<string, unknown>).message);
    }

    const errorResponse = new ErrorResponse(message, errors);
    response.status(status).json(errorResponse);
  }
}
