import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { JOB_TITLE_MAX_LENGTH, normalizeJobTitle } from '../provider-job-title';

export class UpdateProviderMemberDto {
  @ApiProperty({
    example: 'Кадастровый инженер',
    maxLength: JOB_TITLE_MAX_LENGTH,
  })
  @Transform(({ value }) => normalizeJobTitle(value))
  @IsString()
  @MinLength(1)
  @MaxLength(JOB_TITLE_MAX_LENGTH)
  jobTitle!: string;
}

export class InviteProviderMemberDto extends UpdateProviderMemberDto {
  @ApiProperty({ enum: ['MANAGER', 'EMPLOYEE'], default: 'EMPLOYEE' })
  @IsIn(['MANAGER', 'EMPLOYEE'])
  role!: 'MANAGER' | 'EMPLOYEE';

  @ApiProperty({ example: 'specialist@example.com' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

export class AcceptProviderInvitationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;
}
