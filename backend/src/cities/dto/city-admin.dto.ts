import { ApiProperty } from '@nestjs/swagger';

export class CityImportRunDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  mode!: string;

  @ApiProperty({ nullable: true })
  sourceLabel!: string | null;

  @ApiProperty()
  startedAt!: string;

  @ApiProperty({ nullable: true })
  finishedAt!: string | null;

  @ApiProperty()
  snapshotCount!: number;

  @ApiProperty()
  addedCount!: number;

  @ApiProperty()
  deactivatedCount!: number;

  @ApiProperty()
  reactivatedCount!: number;

  @ApiProperty()
  updatedCount!: number;
}

export class CityImportEventDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  runId!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  cityId!: string | null;

  @ApiProperty({ example: '1234567890' })
  garObjectId!: string;

  @ApiProperty({ enum: ['ADDED', 'DEACTIVATED', 'REACTIVATED', 'UPDATED'] })
  eventType!: 'ADDED' | 'DEACTIVATED' | 'REACTIVATED' | 'UPDATED';

  @ApiProperty()
  name!: string;

  @ApiProperty()
  regionCode!: string;

  @ApiProperty()
  regionName!: string;

  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'], nullable: true })
  previousStatus!: 'ACTIVE' | 'INACTIVE' | null;

  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'] })
  newStatus!: 'ACTIVE' | 'INACTIVE';
}
