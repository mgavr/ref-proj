import {
  ArgumentMetadata,
  HttpException,
  HttpStatus,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import type { ApiErrorBody } from '@refproj/types';
import type { ZodSchema, ZodIssue } from 'zod';

/**
 * Parametrized pipe that runs a Zod schema over the incoming value
 * (body, query, params \u2014 NestJS dispatches based on the param decorator).
 *
 * Use via the @ZodBody/@ZodQuery/@ZodParams decorators in common/decorators.
 *
 * Failure throws an HttpException whose body matches @refproj/types
 * ApiErrorBody, so the global exception filter just passes it through.
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown, _meta: ArgumentMetadata): T {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;

    const body: ApiErrorBody = {
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Request validation failed.',
        details: { issues: result.error.issues.map(formatIssue) },
      },
    };
    throw new HttpException(body, HttpStatus.BAD_REQUEST);
  }
}

function formatIssue(issue: ZodIssue): { path: string; message: string } {
  return {
    path: issue.path.join('.'),
    message: issue.message,
  };
}
