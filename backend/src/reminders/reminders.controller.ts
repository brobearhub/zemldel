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
import {
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { InternalAuthService } from '../auth/internal-auth.service';
import { RemindersService } from './reminders.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { OkResponseDto } from '../common/dto/ok-response.dto';
import { ReminderDto } from './dto/reminder-response.dto';
import { ApiStandardErrors } from '../common/swagger/api-standard-errors.decorator';

@ApiTags('reminders')
@ApiStandardErrors()
@Controller()
export class RemindersController {
  constructor(
    private readonly remindersService: RemindersService,
    private readonly internalAuthService: InternalAuthService,
  ) {}

  @Get('pro/reminders')
  @ApiOkResponse({ type: [ReminderDto] })
  listAll(@Req() request: Request) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.remindersService.listAll(userId);
  }

  @Get('pro/reminders/today')
  @ApiOkResponse({ type: [ReminderDto] })
  listToday(@Req() request: Request) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.remindersService.listToday(userId);
  }

  @Get('pro/reminders/workday')
  @ApiOkResponse({ type: [ReminderDto] })
  listWorkday(@Req() request: Request) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.remindersService.listWorkday(userId);
  }

  @Get('pro/requests/:requestId/reminders')
  @ApiParam({ name: 'requestId', type: String })
  @ApiOkResponse({ type: [ReminderDto] })
  listForRequest(
    @Req() request: Request,
    @Param('requestId') requestId: string,
  ) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.remindersService.listForRequest(userId, requestId);
  }

  @Post('pro/requests/:requestId/reminders')
  @ApiParam({ name: 'requestId', type: String })
  @ApiOkResponse({ type: ReminderDto })
  create(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Body() body: CreateReminderDto,
  ) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.remindersService.create(userId, requestId, body);
  }

  @Patch('pro/reminders/:id')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: ReminderDto })
  update(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: UpdateReminderDto,
  ) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.remindersService.update(userId, id, body);
  }

  @Delete('pro/reminders/:id')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: OkResponseDto })
  async delete(@Req() request: Request, @Param('id') id: string) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    await this.remindersService.delete(userId, id);
    return { ok: true };
  }
}
