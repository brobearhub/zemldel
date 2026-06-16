import { ApiProperty } from '@nestjs/swagger';
import { AuthorizedUserDto } from '../../auth/dto/authorized-user.dto';
import { AuthCityDto } from '../../auth/dto/authorized-user.dto';

export class ProviderDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ enum: ['SELF_EMPLOYED', 'COMPANY'] })
  type!: 'SELF_EMPLOYED' | 'COMPANY';

  @ApiProperty({ format: 'uuid' })
  ownerUserId!: string;

  @ApiProperty({ format: 'uuid', nullable: true, example: null })
  cityId!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class ProviderSlugCheckDto {
  @ApiProperty()
  available!: boolean;
}

export class ProviderMembershipListItemDto {
  @ApiProperty({ enum: ['OWNER', 'MANAGER'] })
  role!: 'OWNER' | 'MANAGER';

  @ApiProperty({ enum: ['INVITED', 'ACTIVE', 'SUSPENDED'] })
  status!: 'INVITED' | 'ACTIVE' | 'SUSPENDED';

  @ApiProperty({ type: ProviderDto })
  provider!: ProviderDto;
}

export class ProviderActivateResponseDto extends AuthorizedUserDto {}

export class ProviderSlugUpdateResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  slug!: string;
}

export class ProviderCityUpdateResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid', nullable: true, example: null })
  cityId!: string | null;

  @ApiProperty({ type: AuthCityDto, nullable: true })
  city!: AuthCityDto | null;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class ProviderMemberUserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ nullable: true, example: null })
  name!: string | null;

  @ApiProperty({ nullable: true, example: null })
  image!: string | null;
}

export class ProviderMemberDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['OWNER', 'MANAGER'] })
  role!: 'OWNER' | 'MANAGER';

  @ApiProperty({ enum: ['INVITED', 'ACTIVE', 'SUSPENDED'] })
  status!: 'INVITED' | 'ACTIVE' | 'SUSPENDED';

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({ type: ProviderMemberUserDto })
  user!: ProviderMemberUserDto;
}

export class ProviderMembersResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ enum: ['SELF_EMPLOYED', 'COMPANY'] })
  type!: 'SELF_EMPLOYED' | 'COMPANY';

  @ApiProperty({ type: [ProviderMemberDto] })
  members!: ProviderMemberDto[];
}

