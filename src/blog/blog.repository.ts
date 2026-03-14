import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model, UpdateQuery } from 'mongoose';

import { BlogPost, BlogPostDocument } from './schemas/blog-post.schema';
import { BlogPostStatus } from './enums/blog-post-status.enum';

type PublishedListParams = {
    search?: string;
    tag?: string;
    skip: number;
    limit: number;
};

@Injectable()
export class BlogRepository {
    constructor(
        @InjectModel(BlogPost.name)
        private readonly blogPostModel: Model<BlogPostDocument>,
    ) {}

    create(data: Partial<BlogPost>) {
        return this.blogPostModel.create(data);
    }

    findById(id: string) {
        return this.blogPostModel.findById(id).exec();
    }

    findBySlug(slug: string) {
        return this.blogPostModel.findOne({ slug }).exec();
    }

    findPublishedBySlug(slug: string) {
        return this.blogPostModel
            .findOne({
                slug,
                status: BlogPostStatus.PUBLISHED,
            })
            .exec();
    }

    findPublishedList(params: PublishedListParams) {
        const filter = this.buildPublishedFilter(params);

        return this.blogPostModel
            .find(filter)
            .sort({ publishedAt: -1, createdAt: -1 })
            .skip(params.skip)
            .limit(params.limit)
            .exec();
    }

    countPublished(params: Omit<PublishedListParams, 'skip' | 'limit'>) {
        const filter = this.buildPublishedFilter({
            ...params,
            skip: 0,
            limit: 0,
        });

        return this.blogPostModel.countDocuments(filter).exec();
    }

    update(id: string, data: UpdateQuery<BlogPost>) {
        return this.blogPostModel
            .findByIdAndUpdate(id, data, {
                returnDocument: 'after',
                runValidators: true,
            })
            .exec();
    }

    remove(id: string) {
        return this.blogPostModel.findByIdAndDelete(id).exec();
    }

    private buildPublishedFilter(
        params: PublishedListParams,
    ): QueryFilter<BlogPostDocument> {
        const filter: QueryFilter<BlogPostDocument> = {
            status: BlogPostStatus.PUBLISHED,
        };

        if (params.search?.trim()) {
            const searchRegex = new RegExp(this.escapeRegex(params.search.trim()), 'i');

            filter.$or = [
                { title: searchRegex },
                { subtitle: searchRegex },
                { tags: searchRegex },
            ];
        }

        if (params.tag?.trim()) {
            filter.tags = params.tag.trim().toLowerCase();
        }

        return filter;
    }

    private escapeRegex(value: string) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}