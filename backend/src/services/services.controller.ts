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
} from '@nestjs/common';
import type { Request } from 'express';
import { ServiceCreateDto, ServicePatchDto } from './dto/service.dto';
import { ServicesService } from './services.service';

@Controller()
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get('services')
  getPublicServices() {
    return this.servicesService.getServices();
  }

  @Get('services/:id')
  async getPublicServiceById(@Param('id') id: string) {
    const service = await this.servicesService.getServiceById(id);
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    return service;
  }

  @Get('admin/services')
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

  @Delete('pro/services/:id')
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
