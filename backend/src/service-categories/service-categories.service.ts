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
  placements: true,
} satisfies Prisma.ServiceCategorySelect;

@Injectable()
export class ServiceCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list(filter?: { placement?: 'HOME' }) {
    return this.prisma.serviceCategory.findMany({
      where: filter?.placement
        ? { placements: { has: filter.placement } }
        : undefined,
      select,
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  getById(id: string) {
    return this.prisma.serviceCategory.findUnique({ where: { id }, select });
  }

  create(input: ServiceCategoryCreateDto) {
    return this.prisma.serviceCategory.create({
      data: {
        name: input.name,
        slug: input.slug,
        parentId: input.parentId ?? null,
        sortOrder: input.sortOrder ?? null,
        placements: input.placements ?? [],
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
        ...(input.placements !== undefined
          ? { placements: input.placements }
          : null),
      },
      select,
    });
  }

  async remove(id: string) {
    await this.prisma.serviceCategory.delete({ where: { id } });
  }
}
