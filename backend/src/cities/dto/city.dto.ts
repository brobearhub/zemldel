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
