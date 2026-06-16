import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProInboxSettingsDto {
  @ApiProperty({ enum: ['NEW', 'DISCUSSING'] })
  status!: 'NEW' | 'DISCUSSING';

  @ApiProperty({ format: 'uuid', nullable: true, example: null })
  categoryId!: string | null;

  @ApiProperty({ enum: ['ACTIVE', 'ARCHIVE'] })
  dialogScope!: 'ACTIVE' | 'ARCHIVE';
}

export class ProInboxSettingsUpdateDto {
  @ApiPropertyOptional({ enum: ['NEW', 'DISCUSSING'] })
  status?: 'NEW' | 'DISCUSSING';

  @ApiPropertyOptional({ format: 'uuid', nullable: true, example: null })
  categoryId?: string | null;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'ARCHIVE'] })
  dialogScope?: 'ACTIVE' | 'ARCHIVE';
}

export class ProEligibleCategoryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;
}

