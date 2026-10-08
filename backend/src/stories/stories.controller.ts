import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnprocessableEntityException,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type { Request } from 'express';
import { InternalAuthService } from '../auth/internal-auth.service';
import { ApiStandardErrors } from '../common/swagger/api-standard-errors.decorator';
import {
  CreateStoryDto,
  StoryConversationListDto,
  StoryConversationMessageDto,
  StoryConversationMessagesDto,
  StoryDto,
  StoryListDto,
} from './dto/story.dto';
import { StoriesService } from './stories.service';
import { STORY_IMAGE_MAX_BYTES } from './story-rules';

@ApiStandardErrors()
@ApiTags('stories')
@Controller()
export class StoriesController {
  constructor(
    private readonly stories: StoriesService,
    private readonly internalAuth: InternalAuthService,
  ) {}

  @Get('stories')
  @ApiQuery({ name: 'cityId', required: false, type: String })
  @ApiQuery({ name: 'providerId', required: false, type: String })
  @ApiOkResponse({ type: StoryListDto })
  listPublic(
    @Req() request: Request,
    @Query('cityId') cityId?: string,
    @Query('providerId') providerId?: string,
  ) {
    return this.stories.listPublic(
      cityId?.trim() || null,
      this.internalAuth.getOptionalUserIdFromRequest(request),
      providerId?.trim() || null,
    );
  }

  @Get('stories/mine')
  @ApiQuery({ name: 'scope', required: false, enum: ['user', 'provider'] })
  @ApiOkResponse({ type: StoryListDto })
  listMine(@Req() request: Request, @Query('scope') scope?: string) {
    return this.stories.listMine({
      actorUserId: this.internalAuth.getUserIdFromRequest(request),
      scope: scope === 'provider' ? 'provider' : 'user',
    });
  }

  @Post('stories')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        durationDays: { type: 'number', enum: [1, 2, 3, 7] },
        scope: { type: 'string', enum: ['user', 'provider'] },
        file: { type: 'string', format: 'binary' },
      },
      required: ['text', 'durationDays'],
    },
  })
  @ApiOkResponse({ type: StoryDto })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: STORY_IMAGE_MAX_BYTES },
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
  create(@Req() request: Request, @Body() body: CreateStoryDto) {
    const file = (request as Request & { file?: Express.Multer.File }).file;
    return this.stories.create({
      actorUserId: this.internalAuth.getUserIdFromRequest(request),
      scope: body.scope === 'provider' ? 'provider' : 'user',
      text: body.text,
      durationDays: body.durationDays,
      file,
    });
  }

  @Get('stories/saved')
  @ApiOkResponse({ type: StoryListDto })
  listSaved(@Req() request: Request) {
    return this.stories.listSaved(this.internalAuth.getUserIdFromRequest(request));
  }

  @Get('stories/audience')
  @ApiQuery({ name: 'scope', required: false, enum: ['user', 'provider'] })
  listAudience(@Req() request: Request, @Query('scope') scope?: string) {
    return this.stories.listAudience({
      actorUserId: this.internalAuth.getUserIdFromRequest(request),
      scope: scope === 'provider' ? 'provider' : 'user',
    });
  }

  @Get('stories/conversations')
  @ApiQuery({ name: 'scope', required: false, enum: ['user', 'provider'] })
  @ApiOkResponse({ type: StoryConversationListDto })
  listConversations(@Req() request: Request, @Query('scope') scope?: string) {
    return this.stories.listConversations({
      actorUserId: this.internalAuth.getUserIdFromRequest(request),
      scope: scope === 'provider' ? 'provider' : 'user',
    });
  }

  @Get('stories/conversations/:id/messages')
  @ApiQuery({ name: 'scope', required: false, enum: ['user', 'provider'] })
  @ApiOkResponse({ type: StoryConversationMessagesDto })
  listConversationMessages(
    @Req() request: Request,
    @Param('id') id: string,
    @Query('scope') scope?: string,
  ) {
    return this.stories.listConversationMessages({
      actorUserId: this.internalAuth.getUserIdFromRequest(request),
      scope: scope === 'provider' ? 'provider' : 'user',
      conversationId: id,
    });
  }

  @Post('stories/conversations/:id/messages')
  @ApiQuery({ name: 'scope', required: false, enum: ['user', 'provider'] })
  @ApiOkResponse({ type: StoryConversationMessageDto })
  sendConversationMessage(
    @Req() request: Request,
    @Param('id') id: string,
    @Query('scope') scope?: string,
    @Body() body?: { text?: string },
  ) {
    return this.stories.sendConversationMessage({
      actorUserId: this.internalAuth.getUserIdFromRequest(request),
      scope: scope === 'provider' ? 'provider' : 'user',
      conversationId: id,
      text: body?.text ?? '',
    });
  }

  @Post('stories/:id/view')
  @ApiParam({ name: 'id', type: String })
  recordView(@Req() request: Request, @Param('id') id: string) {
    return this.stories.recordView({
      storyId: id,
      actorUserId: this.internalAuth.getOptionalUserIdFromRequest(request),
    });
  }

  @Post('stories/:id/save')
  save(@Req() request: Request, @Param('id') id: string) {
    return this.stories.saveStory({
      storyId: id,
      actorUserId: this.internalAuth.getUserIdFromRequest(request),
    });
  }

  @Delete('stories/:id/save')
  unsave(@Req() request: Request, @Param('id') id: string) {
    return this.stories.unsaveStory({
      storyId: id,
      actorUserId: this.internalAuth.getUserIdFromRequest(request),
    });
  }

  @Get('stories/:id/replies/:replyId/messages')
  listReplyMessages(
    @Req() request: Request,
    @Param('id') id: string,
    @Param('replyId') replyId: string,
  ) {
    return this.stories.listReplyMessages({
      storyId: id,
      replyId,
      actorUserId: this.internalAuth.getUserIdFromRequest(request),
    });
  }

  @Post('stories/:id/replies/:replyId/messages')
  sendReplyMessage(
    @Req() request: Request,
    @Param('id') id: string,
    @Param('replyId') replyId: string,
    @Body() body: { text?: string },
  ) {
    return this.stories.sendReplyMessage({
      storyId: id,
      replyId,
      actorUserId: this.internalAuth.getUserIdFromRequest(request),
      text: body?.text ?? '',
    });
  }

  @Post('stories/:id/reply')
  reply(@Req() request: Request, @Param('id') id: string, @Body() body: { text?: string }) {
    return this.stories.reply({
      storyId: id,
      actorUserId: this.internalAuth.getUserIdFromRequest(request),
      text: body?.text ?? '',
    });
  }

  @Post('stories/:id/repost')
  repost(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: { durationDays?: unknown },
  ) {
    return this.stories.repost({
      storyId: id,
      actorUserId: this.internalAuth.getUserIdFromRequest(request),
      durationDays: body?.durationDays,
    });
  }

  @Post('stories/:id/profile-open')
  profileOpen(@Req() request: Request, @Param('id') id: string) {
    return this.stories.recordProfileOpen({
      storyId: id,
      actorUserId: this.internalAuth.getOptionalUserIdFromRequest(request),
    });
  }

  @Post('stories/follow')
  follow(
    @Req() request: Request,
    @Body() body: { targetUserId?: string | null; targetProviderId?: string | null },
  ) {
    return this.stories.followAuthor({
      actorUserId: this.internalAuth.getUserIdFromRequest(request),
      targetUserId: body?.targetUserId,
      targetProviderId: body?.targetProviderId,
    });
  }

  @Post('stories/unfollow')
  unfollow(
    @Req() request: Request,
    @Body() body: { targetUserId?: string | null; targetProviderId?: string | null },
  ) {
    return this.stories.unfollowAuthor({
      actorUserId: this.internalAuth.getUserIdFromRequest(request),
      targetUserId: body?.targetUserId,
      targetProviderId: body?.targetProviderId,
    });
  }

  @Get('stories/:id/insights')
  @ApiQuery({ name: 'timeZone', required: false, type: String })
  insights(@Req() request: Request, @Param('id') id: string, @Query('timeZone') timeZone?: string) {
    return this.stories.insights({
      storyId: id,
      actorUserId: this.internalAuth.getUserIdFromRequest(request),
      timeZone,
    });
  }

  @Delete('stories/:id')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ schema: { type: 'object', properties: { ok: { type: 'boolean' } } } })
  remove(@Req() request: Request, @Param('id') id: string) {
    if (!id.trim()) {
      throw new UnprocessableEntityException({ error: 'id is required' });
    }
    return this.stories.remove({
      actorUserId: this.internalAuth.getUserIdFromRequest(request),
      storyId: id,
    });
  }
}
