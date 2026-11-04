import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { MessengerPlatform } from '@prisma/client';
import type { Request } from 'express';
import { InternalAuthService } from '../auth/internal-auth.service';
import {
  ConfirmMessengerDto,
  MessengerLinkDto,
  MessengerNotificationsDto,
  MessengerStatusDto,
} from './messenger.dto';
import { MessengerService } from './messenger.service';

@ApiTags('messengers')
@Controller('messengers')
export class MessengerController {
  constructor(
    private readonly service: MessengerService,
    private readonly auth: InternalAuthService,
  ) {}

  @Get()
  @ApiOkResponse({ type: [MessengerStatusDto] })
  status(@Req() req: Request) {
    return this.service.status(this.auth.getUserIdFromRequest(req));
  }

  @Post(':platform/link')
  @HttpCode(200)
  @ApiOkResponse({ type: MessengerLinkDto })
  link(
    @Req() req: Request,
    @Param('platform', new ParseEnumPipe(MessengerPlatform))
    platform: MessengerPlatform,
  ) {
    return this.service.createLink(
      this.auth.getUserIdFromRequest(req),
      platform,
    );
  }

  @Post(':platform/confirm')
  @HttpCode(204)
  async confirm(
    @Req() req: Request,
    @Param('platform', new ParseEnumPipe(MessengerPlatform))
    platform: MessengerPlatform,
    @Body() body: ConfirmMessengerDto,
  ) {
    await this.service.confirm(
      this.auth.getUserIdFromRequest(req),
      platform,
      body.tokenId,
    );
  }

  @Delete(':platform')
  @HttpCode(204)
  async disconnect(
    @Req() req: Request,
    @Param('platform', new ParseEnumPipe(MessengerPlatform))
    platform: MessengerPlatform,
  ) {
    await this.service.disconnect(
      this.auth.getUserIdFromRequest(req),
      platform,
    );
  }

  @Patch(':platform/notifications')
  @HttpCode(204)
  async notifications(
    @Req() req: Request,
    @Param('platform', new ParseEnumPipe(MessengerPlatform))
    platform: MessengerPlatform,
    @Body() body: MessengerNotificationsDto,
  ) {
    await this.service.notifications(
      this.auth.getUserIdFromRequest(req),
      platform,
      body.enabled,
    );
  }

  @Post(':platform/webhook')
  @ApiExcludeEndpoint()
  @HttpCode(200)
  async webhook(
    @Param('platform', new ParseEnumPipe(MessengerPlatform))
    platform: MessengerPlatform,
    @Headers('x-telegram-bot-api-secret-token')
    telegramSecret: string | undefined,
    @Headers('x-max-bot-api-secret') maxSecret: string | undefined,
    @Body() body: unknown,
  ) {
    this.service.verifyWebhook(
      platform,
      platform === 'TELEGRAM' ? telegramSecret : maxSecret,
    );
    await this.service.receive(platform, body);
    return { ok: true };
  }
}
