import { ApiProperty } from '@nestjs/swagger';

export class ContractFileItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    enum: ['PENDING_CUSTOMER', 'APPROVED', 'REVISION_REQUESTED'],
  })
  status!: 'PENDING_CUSTOMER' | 'APPROVED' | 'REVISION_REQUESTED';

  @ApiProperty()
  originalName!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  sizeBytes!: number;

  @ApiProperty({ nullable: true, example: null })
  sha256?: string | null;

  @ApiProperty({ nullable: true, example: null })
  revisionMessage!: string | null;

  @ApiProperty({ format: 'date-time', nullable: true, example: null })
  decidedAt!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class ContractFilesUploadResponseDto {
  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: { id: { type: 'string', format: 'uuid' } },
      required: ['id'],
    },
  })
  created!: Array<{ id: string }>;
}

export class ContractBundleFileDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  originalName!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  sizeBytes!: number;

  @ApiProperty({ nullable: true, example: null })
  sha256?: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class ContractBundleItemDto {
  @ApiProperty({ format: 'uuid' })
  bundleId!: string;

  @ApiProperty({
    enum: ['PENDING_CUSTOMER', 'APPROVED', 'REVISION_REQUESTED'],
  })
  status!: 'PENDING_CUSTOMER' | 'APPROVED' | 'REVISION_REQUESTED';

  @ApiProperty({ nullable: true, example: null })
  revisionMessage!: string | null;

  @ApiProperty({ format: 'date-time', nullable: true, example: null })
  decidedAt!: string | null;

  @ApiProperty({ type: ContractBundleFileDto })
  document!: ContractBundleFileDto;

  @ApiProperty({ type: ContractBundleFileDto, nullable: true })
  signature!: ContractBundleFileDto | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

