import { Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddProviderManagerDto {
  @ApiProperty({ example: 'manager@example.com' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;
}
