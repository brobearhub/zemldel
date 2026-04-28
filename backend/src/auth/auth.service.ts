import {
  ConflictException,
  ForbiddenException,
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AuthProviderKey as DbAuthProviderKey,
  type Prisma,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { isAllowedLocationRow } from '../cities/location';
import {
  type AuthMembership,
  type AuthCity,
  type AuthProviderKey,
  canManageOrders,
  type AuthorizedUser,
  type OrderManagementAction,
  canManageServices,
  type ServiceManagementAction,
} from './authorization';

const userAuthSelect = {
  id: true,
  email: true,
  name: true,
  image: true,
  systemRole: true,
  activeProviderId: true,
  authProviderLinks: {
    where: { revokedAt: null },
    select: {
      providerKey: true,
      linkedAt: true,
    },
  },
  stepUpVerifications: {
    select: {
      providerKey: true,
      verifiedAt: true,
    },
  },
  customerCity: {
    select: {
      id: true,
      name: true,
      regionCode: true,
      regionName: true,
    },
  },
  passwordHash: true,
  providerMemberships: {
    where: { status: 'ACTIVE' as const },
    select: {
      role: true,
      status: true,
      provider: {
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
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
    },
  },
};

type UserAuthRow = Prisma.UserGetPayload<{ select: typeof userAuthSelect }>;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private normalizeMemberships(
    memberships: Array<{
      role: AuthMembership['role'];
      status: AuthMembership['status'];
      provider: {
        id: string;
        name: string;
        slug: string;
        type: AuthMembership['providerType'];
        city: AuthCity | null;
      };
    }>,
  ): AuthMembership[] {
    return memberships.map((membership) => ({
      providerId: membership.provider.id,
      providerName: membership.provider.name,
      providerSlug: membership.provider.slug,
      providerType: membership.provider.type,
      providerCity: membership.provider.city,
      role: membership.role,
      status: membership.status,
    }));
  }

  private resolveActiveProviderId(
    activeProviderId: string | null,
    memberships: AuthMembership[],
  ) {
    if (
      activeProviderId &&
      memberships.some(
        (membership) => membership.providerId === activeProviderId,
      )
    ) {
      return activeProviderId;
    }

    return memberships[0]?.providerId ?? null;
  }

  private mapAuthorizedUser(user: UserAuthRow | null): AuthorizedUser | null {
    if (!user) return null;

    const memberships = this.normalizeMemberships(user.providerMemberships);
    const linkedAuthProviders = (user.authProviderLinks ?? []).map(
      (l) => l.providerKey as unknown as AuthProviderKey,
    );
    const stepUpVerifiedAt = (user.stepUpVerifications ?? []).reduce<
      Partial<Record<AuthProviderKey, string>>
    >((acc, row) => {
      const key = row.providerKey as unknown as AuthProviderKey;
      acc[key] = row.verifiedAt.toISOString();
      return acc;
    }, {});

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      systemRole: user.systemRole,
      activeProviderId: this.resolveActiveProviderId(
        user.activeProviderId,
        memberships,
      ),
      customerCity: user.customerCity,
      memberships,
      linkedAuthProviders,
      stepUpVerifiedAt,
    };
  }

  async getUserAuthContext(userId: string): Promise<AuthorizedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: userAuthSelect,
    });

    return this.mapAuthorizedUser(user);
  }

  async validateCredentials(emailInput: string, password: string) {
    const email = emailInput.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: userAuthSelect,
    });

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const authUser = this.mapAuthorizedUser(user);
    if (!authUser) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return authUser;
  }

  async signup(input: {
    email: string;
    password: string;
    name?: string;
    customerCityId?: string;
  }) {
    const email = input.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(input.password, 10);

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('user already exists');
    }

    const rawCustomerCityId = input.customerCityId?.trim();
    const customerCityId = rawCustomerCityId ? rawCustomerCityId : undefined;

    if (customerCityId !== undefined) {
      if (!this.isUuid(customerCityId)) {
        throw new BadRequestException('Invalid customerCityId');
      }

      const city = await this.prisma.city.findUnique({
        where: { id: customerCityId },
        select: { id: true, typeName: true, level: true },
      });
      if (!city) {
        throw new NotFoundException('City not found');
      }
      if (!isAllowedLocationRow(city)) {
        throw new BadRequestException('Invalid location');
      }
    }

    const created = await this.prisma.user.create({
      data: {
        email,
        name: input.name?.trim() || undefined,
        passwordHash,
        customerCityId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return created;
  }

  async listLinkedAuthProviders(userId: string): Promise<AuthProviderKey[]> {
    const rows = await this.prisma.userAuthProviderLink.findMany({
      where: { userId, revokedAt: null },
      select: { providerKey: true },
      take: 50,
    });
    return rows.map((r) => r.providerKey as unknown as AuthProviderKey);
  }

  async linkAuthProvider(input: {
    userId: string;
    providerKey: AuthProviderKey;
    externalSubject: string;
  }) {
    const externalSubject = input.externalSubject.trim();
    if (!externalSubject) {
      throw new BadRequestException('externalSubject is required');
    }

    const providerKey = input.providerKey as unknown as DbAuthProviderKey;

    await this.prisma.userAuthProviderLink.upsert({
      where: {
        userId_providerKey: {
          userId: input.userId,
          providerKey,
        },
      },
      create: {
        userId: input.userId,
        providerKey,
        externalSubject,
        linkedAt: new Date(),
        revokedAt: null,
      },
      update: {
        externalSubject,
        revokedAt: null,
      },
      select: { id: true },
    });

    return this.getUserAuthContext(input.userId);
  }

  async unlinkAuthProvider(input: {
    userId: string;
    providerKey: AuthProviderKey;
  }) {
    const providerKey = input.providerKey as unknown as DbAuthProviderKey;
    await this.prisma.userAuthProviderLink.deleteMany({
      where: { userId: input.userId, providerKey },
    });
    await this.prisma.userStepUpVerification.deleteMany({
      where: { userId: input.userId, providerKey },
    });
    return this.getUserAuthContext(input.userId);
  }

  async verifyStepUp(input: {
    userId: string;
    providerKey: AuthProviderKey;
    externalSubject?: string | null;
  }) {
    const providerKey = input.providerKey as unknown as DbAuthProviderKey;

    const link = await this.prisma.userAuthProviderLink.findUnique({
      where: { userId_providerKey: { userId: input.userId, providerKey } },
      select: { externalSubject: true },
    });
    if (!link) {
      throw new ForbiddenException('Auth provider is not linked');
    }
    if (
      input.externalSubject &&
      input.externalSubject.trim().length > 0 &&
      link.externalSubject !== input.externalSubject.trim()
    ) {
      throw new ForbiddenException('Auth provider mismatch');
    }

    const now = new Date();
    await this.prisma.userStepUpVerification.upsert({
      where: { userId_providerKey: { userId: input.userId, providerKey } },
      create: { userId: input.userId, providerKey, verifiedAt: now },
      update: { verifiedAt: now },
      select: { id: true },
    });

    return this.getUserAuthContext(input.userId);
  }

  async getServiceManagementContext(
    userId: string,
    action: ServiceManagementAction,
  ) {
    const user = await this.getUserAuthContext(userId);
    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }

    const context = canManageServices(user, action);
    if (!context) {
      throw new ForbiddenException('Forbidden');
    }

    return context;
  }

  async getOrderManagementContext(
    userId: string,
    action: OrderManagementAction,
  ) {
    const user = await this.getUserAuthContext(userId);
    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }

    const context = canManageOrders(user, action);
    if (!context) {
      throw new ForbiddenException('Forbidden');
    }

    return context;
  }
}
