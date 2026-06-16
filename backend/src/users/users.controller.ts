import type { Request } from 'express';
import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Req,
  UnprocessableEntityException,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { InternalAuthService } from '../auth/internal-auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserImageDto, UserListItemDto, UserMeProfileDto } from './dto/user-responses.dto';
import { UsersService } from './users.service';
import { ApiValidationErrorResponseDto } from '../common/dto/api-error-response.dto';
import { ApiStandardErrors } from '../common/swagger/api-standard-errors.decorator';

@ApiTags('users')
@ApiStandardErrors()
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly internalAuthService: InternalAuthService,
  ) {}

  @Get()
  @ApiOkResponse({ type: [UserListItemDto] })
  getUsers() {
    return this.usersService.getUsers();
  }

  @Post()
  @ApiCreatedResponse({ type: UserListItemDto })
  createUser(@Body() body: CreateUserDto) {
    return this.usersService.createUser(body);
  }

  @Patch('me')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        customerCityId: { type: 'string', format: 'uuid', nullable: true },
      },
    },
  })
  @ApiOkResponse({ type: UserMeProfileDto })
  updateMe(@Req() request: Request, @Body() body: unknown) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    const payload = body as { customerCityId?: string | null } | null;
    return this.usersService.updateMe(userId, {
      customerCityId: payload?.customerCityId,
    });
  }

  @Post('me/image')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiOkResponse({ type: UserImageDto })
  @ApiUnprocessableEntityResponse({
    type: ApiValidationErrorResponseDto,
    description: 'Validation failed',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
          cb(new Error('Unsupported file type'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadMyImage(@Req() request: Request) {
    const actorUserId = this.internalAuthService.getUserIdFromRequest(request);
    const file = (request as any).file as Express.Multer.File | undefined;
    if (!file) {
      throw new UnprocessableEntityException({
        error: 'Validation failed',
        issues: [{ path: ['file'], message: 'file is required' }],
      });
    }

    try {
      return await this.usersService.uploadMyImage({ actorUserId, file });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      throw new UnprocessableEntityException({ error: msg });
    }
  }

  @Delete('me/image')
  @ApiOkResponse({ type: UserImageDto })
  deleteMyImage(@Req() request: Request) {
    const actorUserId = this.internalAuthService.getUserIdFromRequest(request);
    return this.usersService.deleteMyImage({ actorUserId });
  }
}
