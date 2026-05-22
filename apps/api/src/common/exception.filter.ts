import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ApiErrorBody, ApiErrorCode } from '@refproj/types';

/**
 * Catches every thrown error and produces a response body that matches
 * @refproj/types ApiErrorBody. Clients get one consistent shape no
 * matter what failed.
 *
 * Errors thrown as HttpException with an already-shaped ApiErrorBody body
 * (e.g. from ZodValidationPipe) are passed through unchanged.
 * Plain HttpExceptions get mapped to a code based on status.
 * Anything else becomes INTERNAL_ERROR and is logged with full context.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      // Already-shaped body (e.g. from ZodValidationPipe): pass through.
      if (isApiErrorBody(body)) {
        res.status(status).json(body);
        return;
      }

      const message =
        typeof body === 'string'
          ? body
          : isObjectWithMessage(body)
            ? body.message
            : exception.message;

      const out: ApiErrorBody = {
        error: { code: codeForStatus(status), message },
      };
      res.status(status).json(out);
      return;
    }

    // Unknown error \u2014 log it with stack, return a generic 500.
    this.logger.error(
      exception instanceof Error ? exception.stack : String(exception),
    );
    const out: ApiErrorBody = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error.',
      },
    };
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(out);
  }
}

function codeForStatus(status: number): ApiErrorCode {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHENTICATED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 429:
      return 'RATE_LIMITED';
    default:
      return 'INTERNAL_ERROR';
  }
}

function isApiErrorBody(v: unknown): v is ApiErrorBody {
  return (
    typeof v === 'object' &&
    v !== null &&
    'error' in v &&
    typeof (v as { error: unknown }).error === 'object'
  );
}

function isObjectWithMessage(v: unknown): v is { message: string } {
  return (
    typeof v === 'object' &&
    v !== null &&
    'message' in v &&
    typeof (v as { message: unknown }).message === 'string'
  );
}
