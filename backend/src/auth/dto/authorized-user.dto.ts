import { ApiProperty } from '@nestjs/swagger';
import { PROVIDER_TYPES, type ProviderType } from '../authorization';

export class AuthCityDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  regionCode!: string;

  @ApiProperty()
  regionName!: string;
}

export class AuthPersonDto {
  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty({ nullable: true, type: String })
  middleName!: string | null;
}

export class AuthMembershipDto {
  @ApiProperty({ format: 'uuid' })
  providerId!: string;

  @ApiProperty()
  providerName!: string;

  @ApiProperty()
  providerSlug!: string;

  @ApiProperty({ enum: PROVIDER_TYPES })
  providerType!: ProviderType;

  @ApiProperty({ type: AuthCityDto, nullable: true })
  providerCity!: AuthCityDto | null;

  @ApiProperty({ nullable: true, type: String })
  providerImage!: string | null;

  @ApiProperty({ type: () => AuthPersonDto, nullable: true })
  providerPerson!: AuthPersonDto | null;

  @ApiProperty({ enum: ['OWNER', 'MANAGER'] })
  role!: 'OWNER' | 'MANAGER';

  @ApiProperty({ enum: ['INVITED', 'ACTIVE', 'SUSPENDED'] })
  status!: 'INVITED' | 'ACTIVE' | 'SUSPENDED';
}

export class AuthorizedUserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ nullable: true, example: null })
  name!: string | null;

  @ApiProperty({ type: () => AuthPersonDto, nullable: true })
  person!: AuthPersonDto | null;

  @ApiProperty({ nullable: true, example: null })
  image!: string | null;

  @ApiProperty({ nullable: true, example: '+7 900 000-00-00' })
  phone!: string | null;

  @ApiProperty({ enum: ['PLATFORM_ADMIN', 'CUSTOMER'] })
  systemRole!: 'PLATFORM_ADMIN' | 'CUSTOMER';

  @ApiProperty({ enum: ['CUSTOMER', 'PROVIDER'] })
  accountKind!: 'CUSTOMER' | 'PROVIDER';

  @ApiProperty({ format: 'uuid', nullable: true, example: null })
  activeProviderId!: string | null;

  @ApiProperty({ type: AuthCityDto, nullable: true })
  customerCity!: AuthCityDto | null;

  @ApiProperty({ type: [AuthMembershipDto] })
  memberships!: AuthMembershipDto[];
}
