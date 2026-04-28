import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { InternalAuthService } from './internal-auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly internalAuthService: InternalAuthService,
  ) {}

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.validateCredentials(body.email, body.password);
  }

  @Post('signup')
  signup(@Body() body: SignupDto) {
    return this.authService.signup(body);
  }

  @Get('context')
  async getContext(@Req() request: Request) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.authService.getUserAuthContext(userId);
  }

  @Get('providers')
  async listLinkedProviders(@Req() request: Request) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return { linked: await this.authService.listLinkedAuthProviders(userId) };
  }

  @Post('providers/gosuslugi/link')
  async linkGosuslugi(@Req() request: Request, @Body() body: unknown) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    const payload = body as { externalSubject?: unknown } | null | undefined;
    const externalSubject =
      payload &&
      typeof payload === 'object' &&
      typeof payload.externalSubject === 'string'
        ? payload.externalSubject
        : '';
    return this.authService.linkAuthProvider({
      userId,
      providerKey: 'GOSUSLUGI',
      externalSubject,
    });
  }

  @Post('providers/gosuslugi/unlink')
  async unlinkGosuslugi(@Req() request: Request) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.authService.unlinkAuthProvider({
      userId,
      providerKey: 'GOSUSLUGI',
    });
  }

  @Post('step-up/gosuslugi/verify')
  async verifyGosuslugiStepUp(@Req() request: Request, @Body() body: unknown) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    const payload = body as { externalSubject?: unknown } | null | undefined;
    const externalSubject =
      payload &&
      typeof payload === 'object' &&
      typeof payload.externalSubject === 'string'
        ? payload.externalSubject
        : null;
    return this.authService.verifyStepUp({
      userId,
      providerKey: 'GOSUSLUGI',
      externalSubject,
    });
  }
}
