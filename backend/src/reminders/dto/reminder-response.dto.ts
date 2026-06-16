import { ApiProperty } from '@nestjs/swagger';

export class ReminderServiceTitleDto {
  @ApiProperty()
  title!: string;
}

export class ReminderCategoryNameDto {
  @ApiProperty()
  name!: string;
}

export class ReminderRequestSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ nullable: true, example: null })
  message!: string | null;

  @ApiProperty({ nullable: true, example: null })
  location!: string | null;

  @ApiProperty({ type: ReminderServiceTitleDto, nullable: true })
  service!: ReminderServiceTitleDto | null;

  @ApiProperty({ type: ReminderCategoryNameDto, nullable: true })
  category!: ReminderCategoryNameDto | null;
}

export class ReminderDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  requestId!: string;

  @ApiProperty({ format: 'uuid' })
  providerId!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty({ format: 'date-time' })
  remindAt!: string;

  @ApiProperty()
  isDone!: boolean;

  @ApiProperty({ format: 'date-time', nullable: true, example: null })
  doneAt!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({ type: ReminderRequestSummaryDto })
  request!: ReminderRequestSummaryDto;
}

