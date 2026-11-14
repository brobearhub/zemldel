import { ApiProperty } from '@nestjs/swagger';
import { PROVIDER_TYPES, type ProviderType } from '../../auth/authorization';
import { AuthorizedUserDto } from '../../auth/dto/authorized-user.dto';
import { AuthCityDto } from '../../auth/dto/authorized-user.dto';
import { ServicePlaceDto } from '../../services/dto/service.dto';

export class ProviderDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ enum: PROVIDER_TYPES })
  type!: ProviderType;

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
  @ApiProperty({ enum: ['OWNER', 'MANAGER', 'EMPLOYEE'] })
  role!: 'OWNER' | 'MANAGER' | 'EMPLOYEE';

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
  @ApiProperty({ nullable: true })
  jobTitle!: string | null;
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['OWNER', 'MANAGER', 'EMPLOYEE'] })
  role!: 'OWNER' | 'MANAGER' | 'EMPLOYEE';

  @ApiProperty({ enum: ['INVITED', 'ACTIVE', 'SUSPENDED'] })
  status!: 'INVITED' | 'ACTIVE' | 'SUSPENDED';

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({ type: ProviderMemberUserDto })
  user!: ProviderMemberUserDto;
}

export class ProviderTeamInvitationDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  email!: string;
  @ApiProperty()
  jobTitle!: string;
  @ApiProperty({ enum: ['MANAGER', 'EMPLOYEE'] })
  role!: 'MANAGER' | 'EMPLOYEE';
  @ApiProperty()
  expiresAt!: string;
  @ApiProperty()
  sentAt!: string;
}

export class ProviderMembersResponseDto {
  @ApiProperty({ type: [ProviderTeamInvitationDto], required: false })
  teamInvitations?: ProviderTeamInvitationDto[];
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ enum: PROVIDER_TYPES })
  type!: ProviderType;

  @ApiProperty({ type: [ProviderMemberDto] })
  members!: ProviderMemberDto[];
}

export class PublicProviderStatDto {
  @ApiProperty({ example: '12 лет' })
  value!: string;

  @ApiProperty({ example: 'практики в недвижимости' })
  label!: string;
}

export class ProviderServiceGeographyDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ type: [ServicePlaceDto] })
  places!: ServicePlaceDto[];
}

export class PublicTeamMemberDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  name!: string;
  @ApiProperty({ nullable: true })
  image!: string | null;
  @ApiProperty({ nullable: true })
  jobTitle!: string | null;
}

export class PublicProviderProfileDto {
  @ApiProperty({ nullable: true })
  jobTitle!: string | null;

  @ApiProperty({ type: [PublicTeamMemberDto] })
  team!: PublicTeamMemberDto[];
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ enum: PROVIDER_TYPES })
  type!: ProviderType;

  @ApiProperty({ nullable: true, example: null })
  rating!: number | null;

  @ApiProperty({ example: 0 })
  reviewCount!: number;

  @ApiProperty({ type: AuthCityDto, nullable: true })
  city!: AuthCityDto | null;

  @ApiProperty({
    type: [ProviderServiceGeographyDto],
    description: 'География отдельно для каждой опубликованной услуги',
  })
  serviceGeography!: ProviderServiceGeographyDto[];

  @ApiProperty({ nullable: true, example: null })
  image!: string | null;

  @ApiProperty({ example: 'Эксперт сервиса' })
  subtitle!: string;

  @ApiProperty({ nullable: true, example: null })
  about!: string | null;

  @ApiProperty({ nullable: true, example: '+7 900 000-00-00' })
  phone!: string | null;

  @ApiProperty({ nullable: true, example: null })
  email!: string | null;

  @ApiProperty({ example: false })
  useOwnEmail!: boolean;

  @ApiProperty({ nullable: true, example: null, required: false })
  ownerEmail?: string | null;

  @ApiProperty({ example: false })
  verified!: boolean;

  @ApiProperty({ example: '' })
  availabilityLabel!: string;

  @ApiProperty({ type: [PublicProviderStatDto] })
  stats!: PublicProviderStatDto[];
}
