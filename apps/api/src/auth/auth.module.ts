import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FakeAuthGuard } from './fake-auth.guard';
import { GoogleOAuthService } from './google-oauth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { TokenService } from './token.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleOAuthService,
    JwtAuthGuard,
    TokenService,
    // Kept around as a debugging tool; no route uses it after step 4a.
    FakeAuthGuard,
  ],
  exports: [JwtAuthGuard, FakeAuthGuard, AuthService, TokenService],
})
export class AuthModule {}
