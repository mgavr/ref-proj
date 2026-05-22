import { Body, Param, Query } from '@nestjs/common';
import type { ZodSchema } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

/**
 * Validate the request body against a Zod schema.
 *
 * Usage:
 *   @Patch('me')
 *   updateMe(@ZodBody(UpdateUserRequest) dto: UpdateUserRequest) { ... }
 */
export const ZodBody = <T>(schema: ZodSchema<T>): ParameterDecorator =>
  Body(new ZodValidationPipe(schema));

export const ZodQuery = <T>(schema: ZodSchema<T>): ParameterDecorator =>
  Query(new ZodValidationPipe(schema));

export const ZodParams = <T>(schema: ZodSchema<T>): ParameterDecorator =>
  Param(new ZodValidationPipe(schema));
