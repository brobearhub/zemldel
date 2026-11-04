import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsUUID } from 'class-validator';

export class ConfirmMessengerDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  tokenId!: string;
}
export class MessengerNotificationsDto {
  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;
}
export class MessengerPendingDto {
  @ApiProperty() id!: string;
  @ApiProperty({ type: String, nullable: true }) displayName!: string | null;
  @ApiProperty() expiresAt!: string;
}
export class MessengerStatusDto {
  @ApiProperty({ enum: ['TELEGRAM', 'MAX'] }) platform!: 'TELEGRAM' | 'MAX';
  @ApiProperty() configured!: boolean;
  @ApiProperty() connected!: boolean;
  @ApiProperty({ type: String, nullable: true }) displayName!: string | null;
  @ApiProperty() notificationsEnabled!: boolean;
  @ApiProperty() blocked!: boolean;
  @ApiPropertyOptional({ type: MessengerPendingDto, nullable: true })
  pending!: MessengerPendingDto | null;
}
export class MessengerLinkDto {
  @ApiProperty() url!: string;
  @ApiProperty() expiresAt!: string;
}
