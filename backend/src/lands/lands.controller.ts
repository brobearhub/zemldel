import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Request, Response } from 'express';
import { InternalAuthService } from '../auth/internal-auth.service';
import { ChatService } from '../chat/chat.service';
import { GeocodingService } from '../geocoding/geocoding.service';
import { legacyPoint } from './legacy-geocoding';
import { LandsService } from './lands.service';
import { LandMediaService } from './land-media.service';
import { object, requireVersion } from './land-input';

@ApiTags('lands')
@Controller('lands')
export class LandsController {
  constructor(
    private readonly lands: LandsService,
    private readonly auth: InternalAuthService,
    private readonly media: LandMediaService,
    private readonly chat: ChatService,
    private readonly geocoding: GeocodingService,
  ) {}
  private actor(req: Request) {
    return this.lands.actor(this.auth.getUserIdFromRequest(req));
  }
  private optional(req: Request) {
    const id = this.auth.getOptionalUserIdFromRequest(req);
    return id ? this.lands.actor(id) : undefined;
  }
  @Get()
  async catalog(@Req() req: Request, @Query() query: Record<string, unknown>) {
    if (Object.values(query).some((v) => typeof v !== 'string'))
      throw new BadRequestException('Некорректные фильтры');
    return this.lands.catalog(
      query as Record<string, string>,
      await this.optional(req),
    );
  }
  @Get('mine')
  async mine(@Req() req: Request) {
    return this.lands.mine(await this.actor(req));
  }
  @Get('sitemap')
  sitemap() {
    return this.lands.sitemap();
  }
  @Get('moderation')
  async moderation(@Req() req: Request) {
    return this.lands.moderation(await this.actor(req));
  }
  @Get('city-center')
  async cityCenter(
    @Req() req: Request,
    @Query('cityId', ParseUUIDPipe) cityId: string,
  ) {
    this.auth.getUserIdFromRequest(req);
    const point = await this.geocoding.findCityCenter(cityId);
    return {
      point: point && { latitude: point.latitude, longitude: point.longitude },
    };
  }
  @Post('cadastral-location')
  @HttpCode(HttpStatus.OK)
  async cadastralLocation(
    @Req() req: Request,
    @Body('cadastralNumber') cadastralNumber: unknown,
  ) {
    this.auth.getUserIdFromRequest(req);
    const result = await this.geocoding.findCadastralLocation(cadastralNumber);
    if (result.status !== 'found') return result;
    return {
      status: result.status,
      kind: result.kind,
      address:
        result.kind === 'unit'
          ? (result.buildingAddress ?? result.address)
          : result.address,
      city: result.city,
      point: legacyPoint(result.point),
    };
  }
  @Post('address-suggestions')
  @HttpCode(HttpStatus.OK)
  async addressSuggestions(
    @Req() req: Request,
    @Body('query') query: unknown,
    @Body('mode') mode?: unknown,
    @Body('fiasId') fiasId?: unknown,
  ) {
    this.auth.getUserIdFromRequest(req);
    if (mode !== undefined && mode !== 'suggest' && mode !== 'resolve')
      throw new BadRequestException('Неизвестный режим адресных подсказок');
    if (mode === 'resolve') {
      const point = await this.geocoding.resolveAddress({
        source: this.geocoding.suggestionsSource.id,
        text: query,
        fiasId,
      });
      return { point: legacyPoint(point) };
    }
    if (mode === undefined) return this.geocoding.suggestAddressLabels(query);
    const { items } = await this.geocoding.suggestAddresses(query);
    return items.map(({ label, reference, point }) => ({
      value: label,
      unrestrictedValue: reference.text,
      fiasId: reference.fiasId ?? null,
      point: legacyPoint(point),
    }));
  }
  @Post()
  async create(@Req() req: Request, @Body() body: unknown) {
    return this.lands.create(await this.actor(req), body);
  }
  @Get('media/:id')
  async getMedia(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { media, body } = await this.media.get(id, await this.optional(req));
    res.setHeader('Content-Type', media.mimeType);
    res.setHeader('Content-Length', body.length);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Content-Disposition',
      `${media.kind === 'DOCUMENT' ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(media.filename)}`,
    );
    res.send(Buffer.from(body));
  }
  @Delete('media/:id')
  async deleteMedia(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    return this.media.change(
      await this.actor(req),
      id,
      requireVersion(body),
      false,
    );
  }
  @Patch('media/:id')
  async cover(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    return this.media.change(
      await this.actor(req),
      id,
      requireVersion(body),
      true,
    );
  }
  @Get(':id')
  async detail(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('published') published?: string,
  ) {
    return this.lands.detail(id, await this.optional(req), published === '1');
  }
  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    return this.lands.update(await this.actor(req), id, body);
  }
  @Delete(':id')
  async remove(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    return this.lands.delete(await this.actor(req), id, requireVersion(body));
  }
  @Post(':id/action')
  async action(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    return this.lands.action(await this.actor(req), id, body);
  }
  @Post(':id/review')
  async review(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    return this.lands.review(await this.actor(req), id, body);
  }
  @Post(':id/favorite')
  async favorite(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const enabled = object(body).enabled;
    if (typeof enabled !== 'boolean')
      throw new BadRequestException('Укажите состояние избранного');
    return this.lands.favorite(await this.actor(req), id, enabled);
  }
  @Post(':id/conversation')
  async conversation(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chat.startLand(this.auth.getUserIdFromRequest(req), id);
  }
  @Post(':id/media')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024, files: 1, fields: 2 },
    }),
  )
  async upload(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.media.upload(
      await this.actor(req),
      id,
      String(body.kind),
      requireVersion({ version: Number(body.version) }),
      req.file,
    );
  }
}
