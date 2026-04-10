import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Req,
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
