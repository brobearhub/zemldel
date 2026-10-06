import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  ServiceCategoryCreateDto,
  ServiceCategoryPatchDto,
} from './dto/service-category.dto';

const select = {
  id: true,
  name: true,
  slug: true,
  parentId: true,
  sortOrder: true,
} satisfies Prisma.ServiceCategorySelect;

@Injectable()
export class ServiceCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  list() {
    return this.prisma.serviceCategory.findMany({
      select,
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Принимает UUID или slug.
   * Why: URL категории используется публично; slug удобнее для человеко-читаемых ссылок,
   * а попытка пробросить не-UUID в uuid-поле Prisma может привести к 500 вместо 404.
   */
  getById(idOrSlug: string) {
    const value = idOrSlug.trim();
    return this.prisma.serviceCategory.findUnique({
      where: this.isUuid(value) ? { id: value } : { slug: value },
      select,
    });
  }

  create(input: ServiceCategoryCreateDto) {
    return this.prisma.serviceCategory.create({
      data: {
        name: input.name,
        slug: input.slug,
        parentId: input.parentId ?? null,
        sortOrder: input.sortOrder ?? null,
      },
      select,
    });
  }

  patch(id: string, input: ServiceCategoryPatchDto) {
    return this.prisma.serviceCategory.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : null),
        ...(input.slug !== undefined ? { slug: input.slug } : null),
        ...(input.parentId !== undefined ? { parentId: input.parentId } : null),
        ...(input.sortOrder !== undefined
          ? { sortOrder: input.sortOrder }
          : null),
      },
      select,
    });
  }

  async remove(id: string) {
    await this.prisma.serviceCategory.delete({ where: { id } });
  }
}
