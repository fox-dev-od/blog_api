import {
    ArrayMaxSize,
    IsArray,
    IsEnum,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { BlogPostStatus } from '../enums/blog-post-status.enum';
import { BlogContentBlockDto } from './blog-content-block.dto';

export class CreateBlogPostDto {
    @IsString()
    @MaxLength(200)
    title: string;

    @IsOptional()
    @IsString()
    @MaxLength(300)
    subtitle?: string;

    @IsOptional()
    @IsString()
    coverImage?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsString()
    slug: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @IsOptional()
    @IsEnum(BlogPostStatus)
    status?: BlogPostStatus;

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(100)
    @ValidateNested({ each: true })
    @Type(() => BlogContentBlockDto)
    blocks?: BlogContentBlockDto[];
}