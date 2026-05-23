import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import { CaseBlockLayout } from '../enums/case-block-layout.enum';
import { CaseBlockType } from '../enums/case-block-type.enum';

export class CaseInfoItemDto {
  @IsString()
  label: string;

  @IsString()
  value: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsNumber()
  iconSize?: number;

  @IsOptional()
  @IsNumber()
  order?: number;
}

export class CaseBlockDto {
  @IsEnum(CaseBlockType)
  type: CaseBlockType;

  @IsOptional()
  @IsString()
  heading?: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  html?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  images?: string[];

  @IsEnum(CaseBlockLayout)
  layout: CaseBlockLayout;

  @IsOptional()
  @IsNumber()
  order?: number;
}

export class CaseTabDto {
  @IsString()
  title: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CaseBlockDto)
  blocks?: CaseBlockDto[];

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateCaseDto {
  @IsString()
  title: string;

  @IsString()
  slug: string;

  @IsMongoId()
  categoryId: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CaseInfoItemDto)
  info?: CaseInfoItemDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CaseTabDto)
  tabs?: CaseTabDto[];
}
