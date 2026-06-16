import { ApiProperty } from '@nestjs/swagger';

export class CategoryProviderCityDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  regionCode!: string;

  @ApiProperty()
  regionName!: string;
}

export class CategoryProviderRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: CategoryProviderCityDto, nullable: true })
  city!: CategoryProviderCityDto | null;
}

export class CategoryProviderServiceDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ nullable: true, example: null })
  image!: string | null;

  @ApiProperty({ nullable: true, example: null })
  stockBadge!: string | null;

  @ApiProperty()
  price!: string;

  @ApiProperty({ nullable: true, example: null })
  rating!: number | null;

  @ApiProperty({ nullable: true, example: null })
  reviewCount!: number | null;

  @ApiProperty()
  ctaText!: string;

  @ApiProperty({ nullable: true, example: null })
  ctaHref!: string | null;

  @ApiProperty({ type: CategoryProviderRefDto })
  provider!: CategoryProviderRefDto;
}

