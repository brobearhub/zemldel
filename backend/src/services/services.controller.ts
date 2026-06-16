import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UnprocessableEntityException,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBody as ApiBodyDoc,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { ServiceCreateDto, ServiceDto, ServicePatchDto } from './dto/service.dto';
import { ServicesService } from './services.service';
import { OkResponseDto } from '../common/dto/ok-response.dto';
import {
  ApiForbiddenErrorDto,
  ApiNotFoundErrorDto,
  ApiValidationErrorResponseDto,
} from '../common/dto/api-error-response.dto';
import { ApiStandardErrors } from '../common/swagger/api-standard-errors.decorator';

@ApiTags('services')
@ApiStandardErrors()
@Controller()
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get('services')
  @ApiOkResponse({ type: [ServiceDto] })
  getPublicServices() {
    return this.servicesService.getServices();
  }

  @Get('services/:id')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: ServiceDto })
  @ApiNotFoundResponse({ type: ApiNotFoundErrorDto, description: 'Service not found' })
  async getPublicServiceById(@Param('id') id: string) {
    const service = await this.servicesService.getServiceById(id);
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    return service;
  }

  @Get('admin/services')
  @ApiOkResponse({ type: [ServiceDto] })
  @ApiForbiddenResponse({ type: ApiForbiddenErrorDto, description: 'Forbidden' })
  async getAdminServices(@Req() request: Request) {
    const context = await this.servicesService.getManagementContext(
      request,
      'read',
    );
    if (!context.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    return this.servicesService.getServices();
  }

  @Get('admin/services/:id')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: ServiceDto })
  @ApiNotFoundResponse({ type: ApiNotFoundErrorDto, description: 'Service not found' })
  @ApiForbiddenResponse({ type: ApiForbiddenErrorDto, description: 'Forbidden' })
  async getAdminServiceById(@Req() request: Request, @Param('id') id: string) {
    const context = await this.servicesService.getManagementContext(
      request,
      'read',
    );
    if (!context.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    const service = await this.servicesService.getServiceById(id);

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return service;
  }

  @Get('pro/services')
  @ApiOkResponse({ type: [ServiceDto] })
  @ApiForbiddenResponse({ type: ApiForbiddenErrorDto, description: 'Forbidden' })
  async getProServices(@Req() request: Request) {
    const context = await this.servicesService.getManagementContext(
      request,
      'read',
    );
    if (context.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    return this.servicesService.getServices({ providerId: context.providerId });
  }

  @Get('pro/services/:id')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: ServiceDto })
  @ApiNotFoundResponse({ type: ApiNotFoundErrorDto, description: 'Service not found' })
  @ApiForbiddenResponse({ type: ApiForbiddenErrorDto, description: 'Forbidden' })
  async getProServiceById(@Req() request: Request, @Param('id') id: string) {
    const context = await this.servicesService.getManagementContext(
      request,
      'read',
    );
    if (context.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    const service = await this.servicesService.getServiceById(id, {
      providerId: context.providerId,
    });
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    return service;
  }

  @Post('pro/services')
  @ApiCreatedResponse({ type: ServiceDto })
  @ApiForbiddenResponse({ type: ApiForbiddenErrorDto, description: 'Forbidden' })
  async createProService(
    @Req() request: Request,
    @Body() body: ServiceCreateDto,
  ) {
    const context = await this.servicesService.getManagementContext(
      request,
      'create',
    );
    if (context.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }

    if (!context.providerId) {
      throw new NotFoundException(
        'Active provider is required to create services',
      );
    }

    return this.servicesService.createService(body, {
      providerId: context.providerId,
      actorUserId: context.actorUserId,
    });
  }

  @Patch('pro/services/:id')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: ServiceDto })
  @ApiForbiddenResponse({ type: ApiForbiddenErrorDto, description: 'Forbidden' })
  async updateProService(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: ServicePatchDto,
  ) {
    const context = await this.servicesService.getManagementContext(
      request,
      'update',
    );
    if (context.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }

    return this.servicesService.updateService(id, body, {
      providerId: context.providerId,
      actorUserId: context.actorUserId,
      canPublish: context.canPublish,
      canArchive: context.canArchive,
    });
  }

  @Post('pro/services/:id/image')
  @ApiParam({ name: 'id', type: String })
  @ApiConsumes('multipart/form-data')
  @ApiBodyDoc({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiOkResponse({ type: ServiceDto })
  @ApiUnprocessableEntityResponse({
    type: ApiValidationErrorResponseDto,
    description: 'Validation failed',
  })
  @ApiForbiddenResponse({ type: ApiForbiddenErrorDto, description: 'Forbidden' })
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
  async uploadProServiceImage(
    @Req() request: Request,
    @Param('id') id: string,
  ) {
    const context = await this.servicesService.getManagementContext(
      request,
      'update',
    );
    if (context.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    if (!context.providerId) {
      throw new NotFoundException('Active provider is required');
    }

    const file = (request as any).file as Express.Multer.File | undefined;
    if (!file) {
      throw new UnprocessableEntityException({
        error: 'Validation failed',
        issues: [{ path: ['file'], message: 'file is required' }],
      });
    }

    try {
      return await this.servicesService.uploadServiceImage({
        actorUserId: context.actorUserId,
        providerId: context.providerId,
        serviceId: id,
        file,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      throw new UnprocessableEntityException({ error: msg });
    }
  }

  @Delete('pro/services/:id/image')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: ServiceDto })
  @ApiForbiddenResponse({ type: ApiForbiddenErrorDto, description: 'Forbidden' })
  async deleteProServiceImage(@Req() request: Request, @Param('id') id: string) {
    const context = await this.servicesService.getManagementContext(
      request,
      'update',
    );
    if (context.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    if (!context.providerId) {
      throw new NotFoundException('Active provider is required');
    }
    return this.servicesService.deleteServiceImage({
      actorUserId: context.actorUserId,
      providerId: context.providerId,
      serviceId: id,
    });
  }

  @Delete('pro/services/:id')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: OkResponseDto })
  @ApiForbiddenResponse({ type: ApiForbiddenErrorDto, description: 'Forbidden' })
  async deleteProService(@Req() request: Request, @Param('id') id: string) {
    const context = await this.servicesService.getManagementContext(
      request,
      'delete',
    );
    if (context.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }

    await this.servicesService.deleteService(id, {
      providerId: context.providerId,
    });

    return { ok: true };
  }

  @Post('admin/services')
  @ApiCreatedResponse({ type: ServiceDto })
  @ApiForbiddenResponse({ type: ApiForbiddenErrorDto, description: 'Forbidden' })
  async createAdminService(
    @Req() request: Request,
    @Body() body: ServiceCreateDto,
  ) {
    const context = await this.servicesService.getManagementContext(
      request,
      'create',
    );
    if (!context.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }

    if (!context.providerId) {
      throw new NotFoundException(
        'Active provider is required to create services',
      );
    }

    return this.servicesService.createService(body, {
      providerId: context.providerId,
      actorUserId: context.actorUserId,
    });
  }

  @Patch('admin/services/:id')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: ServiceDto })
  @ApiForbiddenResponse({ type: ApiForbiddenErrorDto, description: 'Forbidden' })
  async updateAdminService(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: ServicePatchDto,
  ) {
    const context = await this.servicesService.getManagementContext(
      request,
      'update',
    );
    if (!context.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }

    return this.servicesService.updateService(id, body, {
      providerId: undefined,
      actorUserId: context.actorUserId,
      canPublish: context.canPublish,
      canArchive: context.canArchive,
    });
  }

  @Delete('admin/services/:id')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: OkResponseDto })
  @ApiForbiddenResponse({ type: ApiForbiddenErrorDto, description: 'Forbidden' })
  async deleteAdminService(@Req() request: Request, @Param('id') id: string) {
    const context = await this.servicesService.getManagementContext(
      request,
      'delete',
    );
    if (!context.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }

    await this.servicesService.deleteService(id, { providerId: undefined });
    return { ok: true };
  }
}
