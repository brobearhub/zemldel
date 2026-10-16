import { ApiProperty } from '@nestjs/swagger';

export class CitySuggestItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ example: '77' })
  regionCode!: string;

  @ApiProperty({ example: 'Moscow' })
  regionName!: string;

  @ApiProperty({ example: 'Moscow, 77' })
  displayName!: string;
}

export class PlaceSuggestItemDto {
  @ApiProperty({ enum: ['city', 'region'] })
  kind!: 'city' | 'region';

  @ApiProperty({ required: false })
  id?: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  regionCode!: string;

  @ApiProperty()
  regionName!: string;
}

export class PlaceSuggestPageDto {
  @ApiProperty({ type: () => [PlaceSuggestItemDto] })
  regions!: PlaceSuggestItemDto[];

  @ApiProperty({ type: () => [PlaceSuggestItemDto] })
  cities!: PlaceSuggestItemDto[];

  @ApiProperty()
  hasMore!: boolean;
}
