import { IsEnum, IsOptional, IsString, IsArray, IsNumber } from 'class-validator';
import { BlogBlockLayout } from '../enums/blog-block-layout.enum';

export class BlogContentBlockDto {
    @IsOptional()
    @IsString()
    type?: string;

    @IsOptional()
    @IsString()
    heading?: string;

    @IsOptional()
    @IsString()
    text?: string;

    @IsOptional()
    @IsString()
    imageUrl?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    images?: string[];

    @IsOptional()
    @IsString()
    html?: string;

    @IsEnum(BlogBlockLayout)
    layout: BlogBlockLayout;

    @IsOptional()
    @IsNumber()
    order?: number;
}