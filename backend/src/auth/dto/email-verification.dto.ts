import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, Matches } from 'class-validator';

export class VerificationEmailDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;
}

export class StartRegistrationDto extends VerificationEmailDto {
  @ApiPropertyOptional({ enum: ['CUSTOMER', 'PROVIDER'] })
  @IsOptional()
  @IsIn(['CUSTOMER', 'PROVIDER'])
  accountKind?: 'CUSTOMER' | 'PROVIDER';
}

export class VerificationCodeDto extends VerificationEmailDto {
  @ApiProperty({ example: '0123' })
  @Matches(/^\d{4}$/)
  code!: string;
}
