import { ApiProperty } from '@nestjs/swagger';

export class UpcomingReminderCountDto {
  @ApiProperty({
    description: 'Unfinished reminders due in the next 60 minutes',
    minimum: 0,
  })
  count!: number;
}
