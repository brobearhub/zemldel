import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
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
    private readonly passwordReset: PasswordResetService,
  ) {}

  @Post('login')
  @ApiOkResponse({ type: AuthorizedUserDto })
  @ApiUnprocessableEntityResponse({
    type: ApiValidationErrorResponseDto,
    description: 'Validation failed',
  })
  login(@Body() body: LoginDto) {
    return this.authService.validateCredentials(body.email, body.password);
  }

  @Post('signup')
  @ApiOkResponse({ type: AuthorizedUserDto })
  @ApiUnprocessableEntityResponse({
    type: ApiValidationErrorResponseDto,
    description: 'Validation failed',
  })
  signup(@Body() body: SignupDto) {
    return this.authService.signup(body);
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
