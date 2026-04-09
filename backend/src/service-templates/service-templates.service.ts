import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  ServiceTemplateCreateDto,
  ServiceTemplatePatchDto,
  ServiceTemplateWithIsAddedDto,
} from './dto/service-template.dto';

const select = {
  id: true,
  categoryId: true,
  title: true,
  description: true,
  paletteColor: true,
  icon: true,
} satisfies Prisma.ServiceTemplateSelect;

@Injectable()
export class ServiceTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  listPublic() {
    return this.prisma.serviceTemplate.findMany({
      select,
      orderBy: [{ title: 'asc' }],
    });
  }

  getPublicById(id: string) {
    return this.prisma.serviceTemplate.findUnique({ where: { id }, select });
  }

  async listForProvider(providerId: string): Promise<ServiceTemplateWithIsAddedDto[]> {
    const [templates, existing] = await Promise.all([
      this.prisma.serviceTemplate.findMany({ select, orderBy: [{ title: 'asc' }] }),
      this.prisma.service.findMany({
        where: { providerId, templateId: { not: null } },
        select: { templateId: true },
      }),
    ]);

    const existingIds = new Set(existing.map((r) => r.templateId).filter(Boolean) as string[]);
    return templates.map((t) => ({ ...t, isAdded: existingIds.has(t.id) }));
  }

  createAdmin(input: ServiceTemplateCreateDto) {
    return this.prisma.serviceTemplate.create({
      data: {
        categoryId: input.categoryId,
        title: input.title,
        description: input.description ?? null,
        paletteColor: input.paletteColor ?? null,
        icon: input.icon ?? null,
      },
      select,
    });
  }

  patchAdmin(id: string, input: ServiceTemplatePatchDto) {
    return this.prisma.serviceTemplate.update({
      where: { id },
      data: {
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : null),
        ...(input.title !== undefined ? { title: input.title } : null),
        ...(input.description !== undefined ? { description: input.description } : null),
        ...(input.paletteColor !== undefined ? { paletteColor: input.paletteColor } : null),
        ...(input.icon !== undefined ? { icon: input.icon } : null),
      },
      select,
    });
  }

  async removeAdmin(id: string) {
    await this.prisma.serviceTemplate.delete({ where: { id } });
  }

  listProvidersForTemplate(templateId: string) {
    return this.prisma.service.findMany({
      where: { templateId, status: 'PUBLISHED' },
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
}

