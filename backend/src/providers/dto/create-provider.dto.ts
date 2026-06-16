import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateProviderDto {
  @ApiProperty({ minLength: 2, example: 'ACME Services' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({
    minLength: 2,
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
    example: 'acme-services',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @MinLength(2)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @ApiProperty({ enum: ['SELF_EMPLOYED', 'COMPANY'] })
  @IsEnum(['SELF_EMPLOYED', 'COMPANY'])
  type!: 'SELF_EMPLOYED' | 'COMPANY';

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  cityId?: string;
}
