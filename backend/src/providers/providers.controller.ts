import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnprocessableEntityException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { InternalAuthService } from '../auth/internal-auth.service';
import { ProvidersService } from './providers.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { AddProviderManagerDto } from './dto/add-provider-manager.dto';
import {
  ProviderActivateResponseDto,
  ProviderCityUpdateResponseDto,
  ProviderMemberDto,
  ProviderMembersResponseDto,
  ProviderMembershipListItemDto,
  PublicProviderProfileDto,
  ProviderSlugCheckDto,
  ProviderSlugUpdateResponseDto,
} from './dto/provider-responses.dto';
import { UpdateProviderPublicProfileDto } from './dto/update-provider-public-profile.dto';
import { ApiStandardErrors } from '../common/swagger/api-standard-errors.decorator';

@ApiTags('providers')
@ApiStandardErrors()
@Controller('providers')
export class ProvidersController {
  constructor(
    private readonly providersService: ProvidersService,
    private readonly internalAuthService: InternalAuthService,
  ) {}

  @Post()
  @ApiCreatedResponse({
    schema: {
      type: 'object',
      properties: {
        provider: { $ref: '#/components/schemas/ProviderDto' },
        authContext: { $ref: '#/components/schemas/AuthorizedUserDto' },
      },
      required: ['provider', 'authContext'],
    },
  })
  createProvider(@Req() request: Request, @Body() body: CreateProviderDto) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.providersService.createProvider(userId, body);
  }

  @Get('by-slug/:slug')
  @ApiParam({ name: 'slug', type: String })
  @ApiOkResponse({ type: PublicProviderProfileDto })
  getPublicProviderProfileBySlug(@Param('slug') slug: string) {
    return this.providersService.getPublicProviderProfileBySlug(slug);
  }

  @Get('slug-check')
  @ApiQuery({ name: 'slug', required: true, type: String })
  @ApiOkResponse({ type: ProviderSlugCheckDto })
  checkSlugAvailability(@Query('slug') slug: string) {
    return this.providersService.checkSlugAvailability(slug ?? '');
  }

  @Get('mine')
  @ApiOkResponse({ type: [ProviderMembershipListItemDto] })
  getMyProviders(@Req() request: Request) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.providersService.getMyProviders(userId);
  }

  @Get(':providerId/public')
  @ApiParam({ name: 'providerId', type: String })
  @ApiOkResponse({ type: PublicProviderProfileDto })
  getPublicProviderProfile(@Req() request: Request, @Param('providerId') providerId: string) {
    const actorUserId = this.internalAuthService.getOptionalUserIdFromRequest(request);
    return this.providersService.getPublicProviderProfile(providerId, actorUserId);
  }

  @Post(':providerId/activate')
  @ApiParam({ name: 'providerId', type: String })
  @ApiOkResponse({ type: ProviderActivateResponseDto })
  activateProvider(
    @Req() request: Request,
    @Param('providerId') providerId: string,
  ) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.providersService.activateProvider(userId, providerId);
  }

  @Get(':providerId/members')
  @ApiParam({ name: 'providerId', type: String })
  @ApiOkResponse({ type: ProviderMembersResponseDto })
  getProviderMembers(
    @Req() request: Request,
    @Param('providerId') providerId: string,
  ) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.providersService.getProviderMembers(userId, providerId);
  }

  @Post(':providerId/members')
  @ApiParam({ name: 'providerId', type: String })
  @ApiCreatedResponse({ type: ProviderMemberDto })
  addProviderManager(
    @Req() request: Request,
    @Param('providerId') providerId: string,
    @Body() body: AddProviderManagerDto,
  ) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.providersService.addProviderManager(userId, providerId, body);
  }

  @Patch(':providerId/slug')
  @ApiParam({ name: 'providerId', type: String })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { slug: { type: 'string' } },
      required: ['slug'],
    },
  })
  @ApiOkResponse({ type: ProviderSlugUpdateResponseDto })
  updateProviderSlug(
    @Req() request: Request,
    @Param('providerId') providerId: string,
    @Body() body: { slug: string },
  ) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.providersService.updateProviderSlug(
      userId,
      providerId,
      body.slug ?? '',
    );
  }

  @Patch(':providerId/city')
  @ApiParam({ name: 'providerId', type: String })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { cityId: { type: 'string', format: 'uuid', nullable: true } },
    },
  })
  @ApiOkResponse({ type: ProviderCityUpdateResponseDto })
  updateProviderCity(
    @Req() request: Request,
    @Param('providerId') providerId: string,
    @Body() body: unknown,
  ) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    const payload = body as { cityId?: string | null } | null;
    return this.providersService.updateProviderCity(userId, providerId, {
      cityId: payload?.cityId,
    });
  }

  @Patch(':providerId/public-profile')
  @ApiParam({ name: 'providerId', type: String })
  @ApiOkResponse({ type: PublicProviderProfileDto })
  updatePublicProviderProfile(
    @Req() request: Request,
    @Param('providerId') providerId: string,
    @Body() body: UpdateProviderPublicProfileDto,
  ) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.providersService.updatePublicProviderProfile(userId, providerId, body);
  }

  @Post(':providerId/image')
  @ApiParam({ name: 'providerId', type: String })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiOkResponse({ type: PublicProviderProfileDto })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
          cb(new Error('Unsupported file type'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadProviderImage(
    @Req() request: Request,
    @Param('providerId') providerId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    if (!file) {
      throw new UnprocessableEntityException({
        error: 'Validation failed',
        issues: [{ path: ['file'], message: 'file is required' }],
      });
    }
    return this.providersService.uploadProviderImage({
      actorUserId: userId,
      providerId,
      file,
    });
  }

  @Delete(':providerId/image')
  @ApiParam({ name: 'providerId', type: String })
  @ApiOkResponse({ type: PublicProviderProfileDto })
  deleteProviderImage(@Req() request: Request, @Param('providerId') providerId: string) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.providersService.deleteProviderImage({ actorUserId: userId, providerId });
  }
}
