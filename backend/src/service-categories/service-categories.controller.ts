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
import {
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { InternalAuthService } from '../auth/internal-auth.service';
import { ServiceCategoriesService } from './service-categories.service';
import {
  ServiceCategoryDto,
  ServiceCategoryCreateDto,
  ServiceCategoryPatchDto,
} from './dto/service-category.dto';
import { PrismaService } from '../prisma/prisma.service';
import { OkResponseDto } from '../common/dto/ok-response.dto';
import { CategoryProviderServiceDto } from './dto/category-provider-service.dto';
import { ApiForbiddenErrorDto, ApiNotFoundErrorDto } from '../common/dto/api-error-response.dto';
import { ApiStandardErrors } from '../common/swagger/api-standard-errors.decorator';

@ApiTags('service-categories')
@ApiStandardErrors()
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
  @ApiQuery({ name: 'placement', required: false, enum: ['HOME'] })
  @ApiOkResponse({ type: [ServiceCategoryDto] })
  getPublicCategories(@Query('placement') placement?: 'HOME') {
    return this.serviceCategoriesService.list(
      placement ? { placement } : undefined,
    );
  }

  @Get('service-categories/:id')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: ServiceCategoryDto })
  @ApiNotFoundResponse({ type: ApiNotFoundErrorDto, description: 'Category not found' })
  async getPublicCategoryById(@Param('id') id: string) {
    const category = await this.serviceCategoriesService.getById(id);
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  @Get('service-categories/:id/providers')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: [CategoryProviderServiceDto] })
  @ApiNotFoundResponse({ type: ApiNotFoundErrorDto, description: 'Category not found' })
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
  @ApiOkResponse({ type: [ServiceCategoryDto] })
  @ApiForbiddenResponse({ type: ApiForbiddenErrorDto, description: 'Forbidden' })
  async getAdminCategories(@Req() request: Request) {
    await this.requirePlatformAdmin(request);
    return this.serviceCategoriesService.list();
  }

  @Post('admin/service-categories')
  @ApiCreatedResponse({ type: ServiceCategoryDto })
  @ApiForbiddenResponse({ type: ApiForbiddenErrorDto, description: 'Forbidden' })
  async createAdminCategory(
    @Req() request: Request,
    @Body() body: ServiceCategoryCreateDto,
  ) {
    await this.requirePlatformAdmin(request);
    return this.serviceCategoriesService.create(body);
  }

  @Patch('admin/service-categories/:id')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: ServiceCategoryDto })
  @ApiNotFoundResponse({ type: ApiNotFoundErrorDto, description: 'Category not found' })
  @ApiForbiddenResponse({ type: ApiForbiddenErrorDto, description: 'Forbidden' })
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
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: OkResponseDto })
  @ApiForbiddenResponse({ type: ApiForbiddenErrorDto, description: 'Forbidden' })
  async deleteAdminCategory(@Req() request: Request, @Param('id') id: string) {
    await this.requirePlatformAdmin(request);
    await this.serviceCategoriesService.remove(id);
    return { ok: true };
  }
}
