import type { Request } from 'express';
import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common';
import { InternalAuthService } from '../auth/internal-auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly internalAuthService: InternalAuthService,
  ) {}

  @Get()
  getUsers() {
    return this.usersService.getUsers();
  }

  @Post()
  createUser(@Body() body: CreateUserDto) {
    return this.usersService.createUser(body);
  }

  @Patch('me')
  updateMe(@Req() request: Request, @Body() body: unknown) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    const payload = body as { customerCityId?: string | null } | null;
    return this.usersService.updateMe(userId, {
      customerCityId: payload?.customerCityId,
    });
  }
}
