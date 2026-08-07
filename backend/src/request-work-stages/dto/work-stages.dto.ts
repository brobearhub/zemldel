import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class WorkStageFileDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  originalName!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  sizeBytes!: number;

  @ApiProperty()
  sha256!: string;

  @ApiProperty()
  createdAt!: string;
}

export class WorkStageDocSlotDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: ['REQUESTED', 'UPLOADED'] })
  status!: 'REQUESTED' | 'UPLOADED';

  @ApiPropertyOptional({ nullable: true, type: String })
  originalName!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  mimeType!: string | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  sizeBytes!: number | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  sha256!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  uploadedAt!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class WorkStageDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  requestId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  statusKey!: string;

  @ApiProperty()
  statusLabel!: string;

  @ApiProperty({ enum: ['DRAFT', 'PUBLISHED'] })
  lifecycle!: 'DRAFT' | 'PUBLISHED';

  @ApiPropertyOptional({ nullable: true, type: String })
  publishedAt!: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty({ type: [WorkStageFileDto] })
  files!: WorkStageFileDto[];

  @ApiProperty({ type: [WorkStageDocSlotDto] })
  docSlots!: WorkStageDocSlotDto[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class CreateWorkStageDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  statusKey!: string;
}

export class UpdateWorkStageDraftDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  statusKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateWorkStageStatusDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  statusKey!: string;
}

export class CreateWorkStageDocSlotDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;
}

export class WorkStageStatusOptionDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  key!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label!: string;
}

export class WorkStageStatusesResponseDto {
  @ApiProperty({ type: [WorkStageStatusOptionDto] })
  system!: WorkStageStatusOptionDto[];

  @ApiProperty({ type: [WorkStageStatusOptionDto] })
  custom!: WorkStageStatusOptionDto[];
}

export class ReplaceCustomWorkStageStatusesDto {
  @ApiProperty({ type: [WorkStageStatusOptionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkStageStatusOptionDto)
  custom!: WorkStageStatusOptionDto[];
}
