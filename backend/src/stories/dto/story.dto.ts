import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { collapseStoryLineEndings, STORY_DURATION_DAYS, STORY_TEXT_MAX_LENGTH } from '../story-rules';

export class CreateStoryDto {
  @ApiProperty({ minLength: 1, maxLength: STORY_TEXT_MAX_LENGTH })
  @Transform(({ value }) => (typeof value === 'string' ? collapseStoryLineEndings(value).trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(STORY_TEXT_MAX_LENGTH)
  text!: string;

  @ApiProperty({ enum: STORY_DURATION_DAYS })
  @Transform(({ value }) => (typeof value === 'string' ? Number(value) : value))
  @IsIn([...STORY_DURATION_DAYS])
  durationDays!: number;

  @ApiPropertyOptional({ enum: ['user', 'provider'] })
  @IsOptional()
  @IsIn(['user', 'provider'])
  scope?: 'user' | 'provider';
}

export class StoryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['USER', 'PROVIDER'] })
  authorType!: 'USER' | 'PROVIDER';

  @ApiProperty({ format: 'uuid' })
  authorUserId!: string;

  @ApiProperty({ nullable: true, format: 'uuid' })
  providerId!: string | null;

  @ApiProperty()
  authorName!: string;

  @ApiProperty({ nullable: true })
  authorImageUrl!: string | null;

  @ApiProperty({ nullable: true })
  authorHref!: string | null;

  @ApiProperty({ nullable: true, format: 'uuid' })
  cityId!: string | null;

  @ApiProperty()
  text!: string;

  @ApiProperty({ nullable: true })
  imageUrl!: string | null;

  @ApiProperty({ enum: STORY_DURATION_DAYS })
  durationDays!: number;

  @ApiProperty({ format: 'date-time' })
  publishedAt!: string;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: string;

  @ApiProperty()
  expired!: boolean;
}

export class StoryListDto {
  @ApiProperty({ type: [StoryDto] })
  items!: StoryDto[];
}

export class StoryConversationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  imageUrl!: string | null;

  @ApiProperty({ nullable: true })
  cityName!: string | null;

  @ApiProperty({ type: [String] })
  storyTitles!: string[];

  @ApiProperty()
  preview!: string;

  @ApiProperty({ format: 'date-time' })
  lastMessageAt!: string;

  @ApiProperty()
  unreadCount!: number;
}

export class StoryConversationListDto {
  @ApiProperty({ nullable: true })
  selfImageUrl!: string | null;

  @ApiProperty({ type: [StoryConversationDto] })
  items!: StoryConversationDto[];
}

export class StoryConversationMessageDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty()
  mine!: boolean;

  @ApiProperty({ nullable: true })
  imageUrl!: string | null;

  @ApiProperty()
  storyId!: string;

  @ApiProperty()
  storyText!: string;
}

export class StoryConversationMessagesDto {
  @ApiProperty({ type: [StoryConversationMessageDto] })
  items!: StoryConversationMessageDto[];
}

export class StoryCommentDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiProperty()
  authorName!: string;

  @ApiProperty({ enum: ['USER', 'PROVIDER'] })
  authorType!: 'USER' | 'PROVIDER';

  @ApiProperty()
  mine!: boolean;

  @ApiProperty()
  likeCount!: number;

  @ApiProperty()
  liked!: boolean;
}

export class StoryCommentListDto {
  @ApiProperty({ type: [StoryCommentDto] })
  items!: StoryCommentDto[];

  @ApiProperty()
  truncated!: boolean;
}
