import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsUUID } from 'class-validator';
import { CitySuggestItemDto } from './city.dto';

export class AddRegionalCapitalDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  cityId!: string;
}

export class UpdateRegionalCapitalFeaturedDto {
  @ApiProperty()
  @IsBoolean()
  featured!: boolean;
}

export class MoveRegionalCapitalDto {
  @ApiProperty({ enum: ['up', 'down'] })
  @IsIn(['up', 'down'])
  direction!: 'up' | 'down';
}

export class RegionalCapitalItemDto extends CitySuggestItemDto {
  @ApiProperty()
  featured!: boolean;
}

export class RegionalCapitalAdminItemDto extends RegionalCapitalItemDto {
  @ApiProperty()
  sortOrder!: number;
}
