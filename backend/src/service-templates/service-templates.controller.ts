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
import { AuthService } from '../auth/auth.service';
import { InternalAuthService } from '../auth/internal-auth.service';
import { ServiceTemplatesService } from './service-templates.service';
import { ServiceTemplateCreateDto, ServiceTemplatePatchDto } from './dto/service-template.dto';

@Controller()
export class ServiceTemplatesController {
  constructor(
    private readonly serviceTemplatesService: ServiceTemplatesService,
    private readonly authService: AuthService,
    private readonly internalAuthService: InternalAuthService,
  ) {}

  private async requirePlatformAdmin(request: Request) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    const ctx = await this.authService.getServiceManagementContext(userId, 'read');
    if (!ctx.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    return ctx;
  }

  private async requireProviderContext(request: Request) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    const ctx = await this.authService.getServiceManagementContext(userId, 'read');
    if (ctx.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    if (!ctx.providerId) {
      throw new NotFoundException('Active provider is required');
    }
    return { ...ctx, providerId: ctx.providerId };
  }

  @Get('service-templates')
  getPublicTemplates() {
    return this.serviceTemplatesService.listPublic();
  }

  @Get('service-templates/:id')
  async getPublicTemplateById(@Param('id') id: string) {
    const tpl = await this.serviceTemplatesService.getPublicById(id);
    if (!tpl) throw new NotFoundException('Template not found');
    return tpl;
  }

  @Get('service-templates/:id/providers')
  getProvidersForTemplate(@Param('id') id: string) {
    return this.serviceTemplatesService.listProvidersForTemplate(id);
  }

  @Get('pro/service-templates')
  async getProTemplates(@Req() request: Request) {
    const ctx = await this.requireProviderContext(request);
    return this.serviceTemplatesService.listForProvider(ctx.providerId);
  }

  @Get('admin/service-templates')
  async getAdminTemplates(@Req() request: Request) {
    await this.requirePlatformAdmin(request);
    return this.serviceTemplatesService.listPublic();
  }

  @Post('admin/service-templates')
  async createAdminTemplate(@Req() request: Request, @Body() body: ServiceTemplateCreateDto) {
    await this.requirePlatformAdmin(request);
    return this.serviceTemplatesService.createAdmin(body);
  }

  @Patch('admin/service-templates/:id')
  async patchAdminTemplate(@Req() request: Request, @Param('id') id: string, @Body() body: ServiceTemplatePatchDto) {
    await this.requirePlatformAdmin(request);
    return this.serviceTemplatesService.patchAdmin(id, body);
  }

  @Delete('admin/service-templates/:id')
  async deleteAdminTemplate(@Req() request: Request, @Param('id') id: string) {
    await this.requirePlatformAdmin(request);
    await this.serviceTemplatesService.removeAdmin(id);
    return { ok: true };
  }
}

