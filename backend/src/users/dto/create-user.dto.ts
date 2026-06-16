import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: 'Alice', minLength: 1 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;
}
