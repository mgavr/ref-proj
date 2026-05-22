import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { User as DbUser } from '@prisma/client';
import type { ApiErrorBody, UpdateUserRequest, User } from '@refproj/types';
import { PrismaService } from '../database/prisma.service';
import { toUserDto } from './user.mapper';

@Injectable()
export class UsersService {
  constructor(private readonly db: PrismaService) {}

  toDto(row: DbUser): User {
    return toUserDto(row);
  }

  async updateMe(id: string, dto: UpdateUserRequest): Promise<User> {
    try {
      const updated = await this.db.user.update({
        where: { id },
        data: { displayName: dto.displayName },
      });
      return toUserDto(updated);
    } catch {
      throw new NotFoundException({
        error: { code: 'NOT_FOUND', message: 'User not found.' },
      } satisfies ApiErrorBody);
    }
  }

  async deleteMe(id: string): Promise<void> {
    try {
      await this.db.user.delete({ where: { id } });
    } catch {
      const body: ApiErrorBody = {
        error: { code: 'NOT_FOUND', message: 'User not found.' },
      };
      throw new HttpException(body, HttpStatus.NOT_FOUND);
    }
  }
}
