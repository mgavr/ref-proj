import {
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ApiErrorBody } from '@refproj/types';
import { ENV } from '../config/config.module';
import type { Env } from '../config/env';
import { AuthService } from './auth.service';
import {
  COOKIE_OAUTH_STATE,
  COOKIE_REFRESH,
  clearOAuthStateCookie,
  clearSessionCookies,
  setOAuthStateCookie,
  setSessionCookies,
} from './cookies';
import { GoogleOAuthService } from './google-oauth.service';
import { TokenService } from './token.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly auth: AuthService,
    private readonly google: GoogleOAuthService,
    private readonly tokens: TokenService,
  ) {}

  // ---- Google web OAuth --------------------------------------------

  @Get('google/start')
  startGoogle(
    @Req() req: Request,
    @Res({ passthrough: false }) res: Response,
  ): void {
    const state = this.tokens.randomString(16);
    const codeVerifier = this.tokens.randomString(32);

    // Stash state+verifier in a single short-lived cookie. We avoid a
    // server-side session store for this small piece of cross-redirect
    // state — the cookie is httpOnly, scoped to /api/v1/auth, and
    // expires in 10 minutes.
    setOAuthStateCookie({
      req,
      res,
      env: this.env,
      value: `${state}.${codeVerifier}`,
    });

    const url = this.google.buildAuthUrl({ state, codeVerifier });
    res.redirect(302, url);
  }

  @Get('google/callback')
  async googleCallback(
    @Req() req: Request,
    @Res({ passthrough: false }) res: Response,
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Query('error') error?: string,
  ): Promise<void> {
    // Always clear the state cookie, success or failure.
    const stateCookie = (req as Request & { cookies?: Record<string, string> })
      .cookies?.[COOKIE_OAUTH_STATE];
    clearOAuthStateCookie(req, res, this.env);

    if (error) {
      this.logger.warn(`[google/callback] provider returned error: ${error}`);
      this.redirectWithError(res, 'oauth_provider_error');
      return;
    }
    if (!code || !state) {
      this.redirectWithError(res, 'missing_code_or_state');
      return;
    }
    if (!stateCookie) {
      this.redirectWithError(res, 'missing_state_cookie');
      return;
    }
    const parts = stateCookie.split('.');
    if (parts.length !== 2) {
      this.redirectWithError(res, 'malformed_state_cookie');
      return;
    }
    const [savedState, codeVerifier] = parts;
    if (savedState !== state) {
      this.redirectWithError(res, 'state_mismatch');
      return;
    }

    // Now we can trust the code and exchange it.
    let session;
    try {
      const info = await this.google.exchangeCode({ code, codeVerifier: codeVerifier! });
      session = await this.auth.loginWithGoogle(info);
    } catch (err) {
      this.logger.error(
        `[google/callback] login failed: ${err instanceof Error ? err.message : 'unknown'}`,
      );
      this.redirectWithError(res, 'login_failed');
      return;
    }

    setSessionCookies({
      req,
      res,
      env: this.env,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    });

    res.redirect(302, this.env.WEB_ORIGIN);
  }

  // ---- Refresh -----------------------------------------------------

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const cookie = (req as Request & { cookies?: Record<string, string> })
      .cookies?.[COOKIE_REFRESH];
    if (!cookie) {
      const body: ApiErrorBody = {
        error: { code: 'UNAUTHENTICATED', message: 'No refresh cookie.' },
      };
      throw new HttpException(body, HttpStatus.UNAUTHORIZED);
    }

    const session = await this.auth.rotateRefreshToken(cookie);
    setSessionCookies({
      req,
      res,
      env: this.env,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    });
    res.status(HttpStatus.OK).json({ user: session.user });
  }

  // ---- Logout ------------------------------------------------------

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const cookie = (req as Request & { cookies?: Record<string, string> })
      .cookies?.[COOKIE_REFRESH];
    await this.auth.logout(cookie);
    clearSessionCookies(req, res, this.env);
    res.status(HttpStatus.NO_CONTENT).send();
  }

  // ---- Helpers -----------------------------------------------------

  private redirectWithError(res: Response, code: string): void {
    const url = new URL(this.env.WEB_ORIGIN);
    url.searchParams.set('auth_error', code);
    res.redirect(302, url.toString());
  }
}
