import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { REVIEW_TEXT_MAX_LENGTH } from '../review-rating';

function emptyToNull(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export class CreateReviewDto {
  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ nullable: true, maxLength: REVIEW_TEXT_MAX_LENGTH })
  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @IsString()
  @MaxLength(REVIEW_TEXT_MAX_LENGTH)
  text?: string | null;
}

export class ReplyReviewDto {
  @ApiProperty({ maxLength: REVIEW_TEXT_MAX_LENGTH })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(REVIEW_TEXT_MAX_LENGTH)
  text!: string;
}

export class ReviewDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['CUSTOMER_TO_PROVIDER', 'PROVIDER_TO_CUSTOMER'] })
  direction!: 'CUSTOMER_TO_PROVIDER' | 'PROVIDER_TO_CUSTOMER';

  @ApiProperty({ minimum: 1, maximum: 5 })
  rating!: number;

  @ApiProperty({ nullable: true })
  text!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty()
  authorDisplayName!: string;

  @ApiProperty({ nullable: true })
  serviceTitle!: string | null;

  @ApiProperty({ nullable: true })
  replyText!: string | null;

  @ApiProperty({ nullable: true, format: 'date-time' })
  repliedAt!: string | null;
}

export class ReviewListDto {
  @ApiProperty({ type: [ReviewDto] })
  items!: ReviewDto[];

  @ApiProperty({ nullable: true })
  nextCursor!: string | null;
}
