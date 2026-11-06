import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import type { Request } from 'express';
import { InternalAuthService } from '../auth/internal-auth.service';
import { WorkspaceService } from './workspace.service';

class TemplateDto {
  @IsUUID('4') id!: string;
  @IsString() @MaxLength(120) title!: string;
  @IsString() @MaxLength(5000) body!: string;
  @IsBoolean() shared!: boolean;
  @IsOptional() @IsBoolean() remove?: boolean;
}
class TaskDto {
  @IsUUID('4') id!: string;
  @IsString() @MaxLength(200) title!: string;
  @IsString() @MaxLength(5000) note!: string;
  @IsOptional() @IsUUID('4') assigneeUserId?: string | null;
  @IsOptional() @IsUUID('4') requestId?: string | null;
  @IsOptional() @IsDateString() dueAt?: string | null;
  @IsBoolean() done!: boolean;
}
class ViewDto {
  @IsUUID('4') visitorId!: string;
}

@Controller('billing')
export class WorkspaceController {
  constructor(
    private readonly workspace: WorkspaceService,
    private readonly auth: InternalAuthService,
  ) {}
  @Get('providers/:providerId/workspace')
  read(
    @Req() req: Request,
    @Param('providerId', ParseUUIDPipe) providerId: string,
  ) {
    return this.workspace.read(this.auth.getUserIdFromRequest(req), providerId);
  }
  @Post('providers/:providerId/templates')
  template(
    @Req() req: Request,
    @Param('providerId', ParseUUIDPipe) providerId: string,
    @Body() body: TemplateDto,
  ) {
    return this.workspace.template(
      this.auth.getUserIdFromRequest(req),
      providerId,
      body,
    );
  }
  @Post('providers/:providerId/tasks')
  task(
    @Req() req: Request,
    @Param('providerId', ParseUUIDPipe) providerId: string,
    @Body() body: TaskDto,
  ) {
    return this.workspace.task(
      this.auth.getUserIdFromRequest(req),
      providerId,
      body,
    );
  }
  @Post('services/:serviceId/view')
  view(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body() body: ViewDto,
  ) {
    return this.workspace.view(serviceId, body.visitorId);
  }
}
