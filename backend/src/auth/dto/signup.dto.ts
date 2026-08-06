import { Type } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const VERSION_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class AcceptedLegalVersionsDto {
  @ApiProperty({ example: '2026-08-04' })
  @IsString()
  @Matches(VERSION_PATTERN)
  terms!: string;

  @ApiProperty({ example: '2026-08-04' })
  @IsString()
  @Matches(VERSION_PATTERN)
  privacy!: string;

  @ApiProperty({ example: '2026-08-04' })
  @IsString()
  @Matches(VERSION_PATTERN)
  consent!: string;
}

export class SignupDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'correct horse battery staple', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({ example: 'Alice' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  customerCityId?: string;

  @ApiProperty({ type: AcceptedLegalVersionsDto })
  @ValidateNested()
  @Type(() => AcceptedLegalVersionsDto)
  acceptedLegal!: AcceptedLegalVersionsDto;
}
