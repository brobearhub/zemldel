import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRequestDocumentRequestDto {
  @ApiProperty({ example: 'Паспорт (скан)' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;
}

export class RequestDocumentRequestItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Паспорт (скан)' })
  title!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  sortOrder!: number;

  @ApiProperty({ enum: ['REQUESTED', 'UPLOADED'] })
  status!: 'REQUESTED' | 'UPLOADED';

  @ApiProperty({ nullable: true, example: null })
  originalName!: string | null;

  @ApiProperty({ nullable: true, example: null })
  mimeType!: string | null;

  @ApiProperty({ nullable: true, example: null })
  sizeBytes!: number | null;

  @ApiProperty({ nullable: true, example: null })
  sha256!: string | null;

  @ApiProperty({ format: 'date-time', nullable: true, example: null })
  uploadedAt!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

