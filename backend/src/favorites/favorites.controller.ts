import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  ValidationPipe,
} from '@nestjs/common';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { Request } from 'express';
import { InternalAuthService } from '../auth/internal-auth.service';
import { FavoritesService } from './favorites.service';

class PageQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10000) page = 0;
}
class InterestQuery extends PageQuery {
  @IsOptional() @IsIn(['1']) summary?: string;
  @IsOptional() @IsIn(['profile']) filter?: string;
  @IsOptional() @IsUUID() serviceId?: string;
  @IsOptional()
  @IsIn(['NONE', 'WAITING', 'ACTIVE', 'DECLINED', 'BLOCKED'])
  state?: string;
}
class StatesBody {
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  serviceIds: string[] = [];
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  providerIds: string[] = [];
}
const validation = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});
@Controller()
export class FavoritesController {
  constructor(
    private readonly favorites: FavoritesService,
    private readonly auth: InternalAuthService,
  ) {}
  @Post('favorites/states')
  states(@Req() req: Request, @Body(validation) body: StatesBody) {
    return this.favorites.states(
      this.auth.getUserIdFromRequest(req),
      body.serviceIds,
      body.providerIds,
    );
  }
  @Get('favorites/services')
  @Header('Cache-Control', 'private, no-store')
  services(@Req() req: Request, @Query(validation) query: PageQuery) {
    return this.favorites.list(
      this.auth.getUserIdFromRequest(req),
      'services',
      query.page,
    );
  }
  @Get('favorites/providers')
  @Header('Cache-Control', 'private, no-store')
  providers(@Req() req: Request, @Query(validation) query: PageQuery) {
    return this.favorites.list(
      this.auth.getUserIdFromRequest(req),
      'providers',
      query.page,
    );
  }
  @Post('favorites/services/:id')
  saveService(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    return this.favorites.set(
      this.auth.getUserIdFromRequest(req),
      'services',
      id,
      true,
    );
  }
  @Delete('favorites/services/:id')
  removeService(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    return this.favorites.set(
      this.auth.getUserIdFromRequest(req),
      'services',
      id,
      false,
    );
  }
  @Post('favorites/providers/:id')
  saveProvider(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    return this.favorites.set(
      this.auth.getUserIdFromRequest(req),
      'providers',
      id,
      true,
    );
  }
  @Delete('favorites/providers/:id')
  removeProvider(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    return this.favorites.set(
      this.auth.getUserIdFromRequest(req),
      'providers',
      id,
      false,
    );
  }
  @Get('pro/interest')
  @Header('Cache-Control', 'private, no-store')
  interest(@Req() req: Request, @Query(validation) query: InterestQuery) {
    return this.favorites.interest(this.auth.getUserIdFromRequest(req), query);
  }
}
