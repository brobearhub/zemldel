import { ApiProperty } from '@nestjs/swagger';
import { AuthCityDto } from '../../auth/dto/authorized-user.dto';

export class UserListItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ nullable: true, example: null })
  name!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class UserCustomerRatingDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ nullable: true, example: null })
  customerRating!: number | null;

  @ApiProperty({ example: 0 })
  customerReviewCount!: number;
}

export class UserMeProfileDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ nullable: true, example: '+7 900 000-00-00' })
  phone!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true, example: null })
  customerCityId!: string | null;

  @ApiProperty({ type: AuthCityDto, nullable: true })
  customerCity!: AuthCityDto | null;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class UserImageDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ nullable: true, example: null })
  image!: string | null;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

