import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { InternalAuthService } from '../auth/internal-auth.service';
import { RemindersService } from './reminders.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';

@Controller()
export class RemindersController {
  constructor(
    private readonly remindersService: RemindersService,
    private readonly internalAuthService: InternalAuthService,
  ) {}

  @Get('pro/reminders')
  listAll(@Req() request: Request) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.remindersService.listAll(userId);
  }

  @Get('pro/reminders/today')
  listToday(@Req() request: Request) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.remindersService.listToday(userId);
  }

  @Get('pro/reminders/workday')
  listWorkday(@Req() request: Request) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.remindersService.listWorkday(userId);
  }

  @Get('pro/requests/:requestId/reminders')
  listForRequest(
    @Req() request: Request,
    @Param('requestId') requestId: string,
  ) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.remindersService.listForRequest(userId, requestId);
  }

  @Post('pro/requests/:requestId/reminders')
  create(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Body() body: CreateReminderDto,
  ) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.remindersService.create(userId, requestId, body);
  }

  @Patch('pro/reminders/:id')
  update(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: UpdateReminderDto,
  ) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.remindersService.update(userId, id, body);
  }

  @Delete('pro/reminders/:id')
  delete(@Req() request: Request, @Param('id') id: string) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.remindersService.delete(userId, id);
  }
}
