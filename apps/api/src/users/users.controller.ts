import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
} from '@nestjs/common';
import type { User as DbUser } from '@prisma/client';
import { UpdateUserRequest, type User } from '@refproj/types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodBody } from '../common/zod.decorators';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: DbUser): User {
    return this.users.toDto(user);
  }

  @Patch('me')
  updateMe(
    @CurrentUser() user: DbUser,
    @ZodBody(UpdateUserRequest) dto: UpdateUserRequest,
  ): Promise<User> {
    return this.users.updateMe(user.id, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMe(@CurrentUser() user: DbUser): Promise<void> {
    await this.users.deleteMe(user.id);
  }
}
