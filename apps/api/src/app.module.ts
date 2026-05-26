import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { RootController } from './root.controller';
import { UsersModule } from './users/users.module';

@Module({
  imports: [ConfigModule, DatabaseModule, AuthModule, HealthModule, UsersModule],
  controllers: [RootController],
  providers: [],
})
export class AppModule {}
