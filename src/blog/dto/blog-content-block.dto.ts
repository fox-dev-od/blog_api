import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';
import { BlogBlockLayout } from '../enums/blog-block-layout.enum';

export class BlogContentBlockDto {
    @IsOptional()
    @IsUrl()
    imageUrl?: string;

    @IsOptional()
    @IsString()
    html?: string;

    @IsEnum(BlogBlockLayout)
    layout: BlogBlockLayout;
}