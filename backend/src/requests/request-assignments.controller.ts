import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
} from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsUUID, ValidateIf } from 'class-validator';
import type { Request } from 'express';
import { InternalAuthService } from '../auth/internal-auth.service';
import { RequestAssignmentsService } from './request-assignments.service';

class AssignRequestDto {
  @ApiProperty({ nullable: true, format: 'uuid' })
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  memberId!: string | null;
}

@ApiTags('requests')
@Controller()
export class RequestAssignmentsController {
  constructor(
    private readonly assignments: RequestAssignmentsService,
    private readonly auth: InternalAuthService,
  ) {}

  @Patch('pro/requests/:id/assignee')
  assign(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AssignRequestDto,
  ) {
    return this.assignments.assign(
      this.auth.getUserIdFromRequest(req),
      id,
      body.memberId,
    );
  }

  @Get('employee/requests')
  list(@Req() req: Request) {
    return this.assignments.listAssigned(this.auth.getUserIdFromRequest(req));
  }

  @Get('employee/requests/:id')
  get(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    return this.assignments.listAssigned(
      this.auth.getUserIdFromRequest(req),
      id,
    );
  }
}
