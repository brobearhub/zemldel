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
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { InternalAuthService } from '../auth/internal-auth.service';
import { ServiceCategoriesService } from './service-categories.service';
import {
  ServiceCategoryCreateDto,
  ServiceCategoryPatchDto,
} from './dto/service-category.dto';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class ServiceCategoriesController {
  constructor(
    private readonly serviceCategoriesService: ServiceCategoriesService,
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly internalAuthService: InternalAuthService,
  ) {}

  private async requirePlatformAdmin(request: Request) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    const ctx = await this.authService.getServiceManagementContext(
      userId,
      'read',
    );
    if (!ctx.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    return ctx;
  }

  @Get('service-categories')
  getPublicCategories(@Query('placement') placement?: 'HOME') {
    return this.serviceCategoriesService.list(
      placement ? { placement } : undefined,
    );
  }

  @Get('service-categories/:id')
  async getPublicCategoryById(@Param('id') id: string) {
    const category = await this.serviceCategoriesService.getById(id);
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  @Get('service-categories/:id/providers')
  async getProvidersForCategory(@Param('id') id: string) {
    const category = await this.serviceCategoriesService.getById(id);
    if (!category) throw new NotFoundException('Category not found');

    return this.prisma.service.findMany({
      where: { categoryId: id, status: 'PUBLISHED' },
      select: {
        id: true,
        title: true,
        image: true,
        stockBadge: true,
        price: true,
        provider: {
          select: {
            id: true,
            name: true,
            city: {
              select: {
                id: true,
                name: true,
                regionCode: true,
                regionName: true,
              },
            },
          },
        },
        rating: true,
        reviewCount: true,
        ctaText: true,
        ctaHref: true,
      },
      orderBy: [{ provider: { name: 'asc' } }, { title: 'asc' }],
    });
  }

  @Get('admin/service-categories')
  async getAdminCategories(@Req() request: Request) {
    await this.requirePlatformAdmin(request);
    return this.serviceCategoriesService.list();
  }

  @Post('admin/service-categories')
  async createAdminCategory(
    @Req() request: Request,
    @Body() body: ServiceCategoryCreateDto,
  ) {
    await this.requirePlatformAdmin(request);
    return this.serviceCategoriesService.create(body);
  }

  @Patch('admin/service-categories/:id')
  async patchAdminCategory(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: ServiceCategoryPatchDto,
  ) {
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
