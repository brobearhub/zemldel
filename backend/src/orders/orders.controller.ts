import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Request } from 'express';
import { OrdersService } from './orders.service';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('orders/mine')
  async getCustomerOrders(@Req() request: Request) {
    const actorUserId = this.ordersService.getRequiredActorUserId(request);
    return this.ordersService.getCustomerOrders(actorUserId);
  }

  @Get('orders/mine/:id')
  async getCustomerOrderById(@Req() request: Request, @Param('id') id: string) {
    const actorUserId = this.ordersService.getRequiredActorUserId(request);
    return this.ordersService.getCustomerOrderById(actorUserId, id);
  }

  @Post('orders/mine/:id/accept-result')
  async acceptResult(@Req() request: Request, @Param('id') id: string) {
    const actorUserId = this.ordersService.getRequiredActorUserId(request);
    return this.ordersService.acceptResultByCustomer(actorUserId, id);
  }

  @Post('orders/mine/:id/send-remarks')
  async sendRemarks(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const actorUserId = this.ordersService.getRequiredActorUserId(request);
    const payload = body as { remarks?: unknown } | null | undefined;
    const remarks =
      payload && typeof payload === 'object' && typeof payload.remarks === 'string'
        ? payload.remarks
        : null;
    if (!remarks || remarks.trim().length < 3) {
      throw new UnprocessableEntityException({
        error: 'Validation failed',
        issues: [
          {
            path: ['remarks'],
            message: 'remarks is required',
          },
        ],
      });
    }
    return this.ordersService.sendRemarksByCustomer(actorUserId, id, { remarks });
  }

  @Get('pro/orders')
  async getProOrders(@Req() request: Request) {
    const context = await this.ordersService.getManagementContext(
      request,
      'read',
    );
    if (context.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    return this.ordersService.getOrders({ providerId: context.providerId });
  }

  @Get('pro/orders/:id')
  async getProOrderById(@Req() request: Request, @Param('id') id: string) {
    const context = await this.ordersService.getManagementContext(
      request,
      'read',
    );
    if (context.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    return this.ordersService.getOrderById(id, {
      providerId: context.providerId,
    });
  }

  @Post('pro/orders/:id/start-work')
  async proStartWork(@Req() request: Request, @Param('id') id: string) {
    const context = await this.ordersService.getManagementContext(request, 'read');
    if (context.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    if (!context.providerId) {
      throw new ForbiddenException('Active provider is required');
    }
    return this.ordersService.startWorkByProvider(context.providerId, id);
  }

  @Post('pro/orders/:id/mark-rendered')
  async proMarkRendered(@Req() request: Request, @Param('id') id: string) {
    const context = await this.ordersService.getManagementContext(request, 'read');
    if (context.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    if (!context.providerId) {
      throw new ForbiddenException('Active provider is required');
    }
    return this.ordersService.markServiceRenderedByProvider(context.providerId, id);
  }

  @Post('pro/orders/:id/request-acceptance')
  async proRequestAcceptance(@Req() request: Request, @Param('id') id: string) {
    const context = await this.ordersService.getManagementContext(request, 'read');
    if (context.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    if (!context.providerId) {
      throw new ForbiddenException('Active provider is required');
    }
    return this.ordersService.requestAcceptanceByProvider(context.providerId, id);
  }

  @Post('pro/orders/:id/payout')
  async proPayout(@Req() request: Request, @Param('id') id: string) {
    const context = await this.ordersService.getManagementContext(request, 'read');
    if (context.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    if (!context.providerId) {
      throw new ForbiddenException('Active provider is required');
    }
    return this.ordersService.payoutByProvider(context.providerId, id);
  }

  @Post('pro/orders/:id/complete')
  async proComplete(@Req() request: Request, @Param('id') id: string) {
    const context = await this.ordersService.getManagementContext(request, 'read');
    if (context.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    if (!context.providerId) {
      throw new ForbiddenException('Active provider is required');
    }
    return this.ordersService.completeByProvider(context.providerId, id);
  }

  @Get('admin/orders')
  async getAdminOrders(@Req() request: Request) {
    const context = await this.ordersService.getManagementContext(
      request,
      'read',
    );
    if (!context.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    return this.ordersService.getOrders();
  }
}
