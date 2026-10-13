import { ApiProperty } from '@nestjs/swagger';

export class PasswordResetMessageDto {
  @ApiProperty()
  message!: string;
}
