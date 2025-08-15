import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SuccessResponse } from '../responses/success.response';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, SuccessResponse<T>>
{
  intercept(
    _: ExecutionContext,
    next: CallHandler,
  ): Observable<SuccessResponse<T>> {
    return next
      .handle()
      .pipe(
        map((data: T) =>
          data instanceof SuccessResponse
            ? data
            : new SuccessResponse(data, 'Request successful'),
        ),
      );
  }
}
