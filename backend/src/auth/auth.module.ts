import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { InternalAuthService } from './internal-auth.service';
import { PasswordResetService } from './password-reset.service';
import {
  createMailSender,
  readPasswordResetConfig,
} from './mail/create-mail-sender';
import { MAIL_SENDER, type MailSender } from './mail/mail-sender';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    InternalAuthService,
    {
      provide: MAIL_SENDER,
      useFactory: createMailSender,
    },
    {
      provide: PasswordResetService,
      useFactory: (prisma: PrismaService, mail: MailSender) =>
        new PasswordResetService(prisma, mail, readPasswordResetConfig()),
      inject: [PrismaService, MAIL_SENDER],
    },
  ],
  exports: [AuthService, InternalAuthService, MAIL_SENDER],
})
export class AuthModule {}
