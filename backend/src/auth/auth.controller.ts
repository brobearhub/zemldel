import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { EmailVerificationService } from './email-verification.service';
import {
  StartRegistrationDto,
  VerificationCodeDto,
  VerificationEmailDto,
} from './dto/email-verification.dto';
import { AuthService } from './auth.service';
import type { RequestWithChanges } from '../requests/request-realtime.interceptor';
import { InternalAuthService } from './internal-auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { AuthorizedUserDto } from './dto/authorized-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PasswordResetMessageDto } from './dto/password-reset-message.dto';
import { PasswordResetService } from './password-reset.service';
import { ApiValidationErrorResponseDto } from '../common/dto/api-error-response.dto';
import { ApiStandardErrors } from '../common/swagger/api-standard-errors.decorator';

@ApiTags('auth')
@ApiStandardErrors()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly internalAuthService: InternalAuthService,
    private readonly verification: EmailVerificationService,
    private readonly passwordReset: PasswordResetService,
  ) {}

  @Post('signin/email')
  @HttpCode(200)
  @ApiOkResponse({
    description: 'Следующий шаг входа: пароль или код подтверждения почты.',
  })
  signinEmail(@Body() body: VerificationEmailDto) {
    return this.verification.request(body.email, 'signin');
  }

  @Post('signup/start')
  @HttpCode(200)
  @ApiOkResponse({
    description: 'Подтверждение почты и время следующей отправки кода.',
  })
  startSignup(@Body() body: StartRegistrationDto) {
    return this.verification.request(body.email, 'signup', body.accountKind);
  }

  @Post('signup/verify')
  @HttpCode(200)
  @ApiOkResponse({
    description:
      'После проверки кода существующий пользователь вводит пароль, новый получает токен регистрации.',
  })
  verifyEmail(@Body() body: VerificationCodeDto) {
    return this.verification.verify(body.email, body.code);
  }

  @Post('login')
  @ApiOkResponse({ type: AuthorizedUserDto })
  @ApiUnprocessableEntityResponse({
    type: ApiValidationErrorResponseDto,
    description: 'Validation failed',
  })
  async login(@Body() body: LoginDto, @Req() request: RequestWithChanges) {
    const { changedRequestIds, ...user } =
      await this.authService.validateCredentials(body.email, body.password);
    request.changedRequestIds = changedRequestIds;
    return user;
  }

  @Post('signup')
  @ApiOkResponse({ type: AuthorizedUserDto })
  @ApiUnprocessableEntityResponse({
    type: ApiValidationErrorResponseDto,
    description: 'Validation failed',
  })
  async signup(@Body() body: SignupDto, @Req() request: RequestWithChanges) {
    const { changedRequestIds, ...user } = await this.authService.signup(body);
    request.changedRequestIds = changedRequestIds;
    return user;
  }

  @Post('password/forgot')
  @ApiOkResponse({ type: PasswordResetMessageDto })
  @ApiUnprocessableEntityResponse({
    type: ApiValidationErrorResponseDto,
    description: 'Validation failed',
  })
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.passwordReset.requestReset(body.email);
  }

  @Post('password/reset')
  @ApiOkResponse({ type: PasswordResetMessageDto })
  @ApiUnprocessableEntityResponse({
    type: ApiValidationErrorResponseDto,
    description: 'Validation failed',
  })
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.passwordReset.resetPassword(body.token, body.password);
  }

  @Get('context')
  @ApiOkResponse({ type: AuthorizedUserDto })
  async getContext(@Req() request: Request) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.authService.getUserAuthContext(userId);
  }
}
