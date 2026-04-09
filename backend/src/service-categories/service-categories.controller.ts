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
import { ServiceCategoriesService } from './service-categories.service';
import { ServiceCategoryCreateDto, ServiceCategoryPatchDto } from './dto/service-category.dto';

@Controller()
export class ServiceCategoriesController {
  constructor(
    private readonly serviceCategoriesService: ServiceCategoriesService,
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

  @Get('service-categories')
  getPublicCategories() {
    return this.serviceCategoriesService.list();
  }

  @Get('admin/service-categories')
  async getAdminCategories(@Req() request: Request) {
    await this.requirePlatformAdmin(request);
    return this.serviceCategoriesService.list();
  }

  @Post('admin/service-categories')
  async createAdminCategory(@Req() request: Request, @Body() body: ServiceCategoryCreateDto) {
    await this.requirePlatformAdmin(request);
    return this.serviceCategoriesService.create(body);
  }

  @Patch('admin/service-categories/:id')
  async patchAdminCategory(@Req() request: Request, @Param('id') id: string, @Body() body: ServiceCategoryPatchDto) {
    await this.requirePlatformAdmin(request);
    const updated = await this.serviceCategoriesService.patch(id, body);
    if (!updated) {
      throw new NotFoundException('Category not found');
    }
    return updated;
  }

  @Delete('admin/service-categories/:id')
  async deleteAdminCategory(@Req() request: Request, @Param('id') id: string) {
    await this.requirePlatformAdmin(request);
    await this.serviceCategoriesService.remove(id);
    return { ok: true };
  }
}

