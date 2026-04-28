import { IsDateString, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateReminderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  text!: string;

  @IsDateString()
  remindAt!: string;
}
