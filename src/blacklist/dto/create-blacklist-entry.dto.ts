import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';

import { BlacklistEntryType } from '../schemas/blacklist-entry.schema';

export class CreateBlacklistEntryDto {
  @IsEnum(BlacklistEntryType)
  type: BlacklistEntryType;

  @IsOptional()
  @IsString()
  ip?: string;

  @IsOptional()
  @IsMongoId()
  userId?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
