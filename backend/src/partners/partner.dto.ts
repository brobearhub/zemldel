import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class PartnerDirectoryQuery {
  @IsOptional() @IsUUID() cityId?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsUUID() subcategoryId?: string;
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(120)
  search?: string;
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(120)
  providerSearch?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page = 1;
}

export class InvitePartnerDto {
  @IsUUID() providerId!: string;
}

export class InvitePartnerEmailDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

export class RespondPartnerDto {
  @IsIn(['accept', 'decline', 'cancel']) action!:
    | 'accept'
    | 'decline'
    | 'cancel';
}

export class DelegatePartnerDto {
  @IsUUID() partnerProviderId!: string;
  @IsIn([true]) confirmed!: true;
}
