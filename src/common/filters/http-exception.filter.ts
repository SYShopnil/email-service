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
    } else if (status === 429) {
      // Force a clean, consistent message
      message = 'Too Many Requests';

      // Some versions of @nestjs/throttler include ttl/limit/etc in the response payload
      // If present, set Retry-After header in seconds
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const r = exceptionResponse as Record<string, unknown>;
        // ttl might be ms or seconds depending on version; take a best guess:
        const rawTtl = Number(r['ttl']);
        if (!Number.isNaN(rawTtl) && rawTtl > 0) {
          const retryAfterSeconds =
            rawTtl > 1000 ? Math.ceil(rawTtl / 1000) : Math.ceil(rawTtl);
          response.setHeader('Retry-After', String(retryAfterSeconds));
        }
      }
    }

    const errorResponse = new ErrorResponse(message, errors);
    response.status(status).json(errorResponse);
  }
}
