import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BlogPostStatus } from '../enums/blog-post-status.enum';
import { BlogBlockLayout } from '../enums/blog-block-layout.enum';

export type BlogPostDocument = HydratedDocument<BlogPost>;

@Schema({ _id: false })
export class BlogContentBlock {
    @Prop({
        type: String,
        default: null,
        trim: true,
    })
    imageUrl: string | null;

    @Prop({
        type: String,
        default: null,
    })
    html: string | null;

    @Prop({
        type: String,
        enum: Object.values(BlogBlockLayout),
        required: true,
    })
    layout: BlogBlockLayout;
}

export const BlogContentBlockSchema =
    SchemaFactory.createForClass(BlogContentBlock);

@Schema({
    timestamps: true,
    collection: 'blog_posts',
})
export class BlogPost {
    @Prop({
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
        index: true,
    })
    title: string;

    @Prop({
        type: String,
        default: null,
        trim: true,
        maxlength: 300,
    })
    subtitle: string | null;

    @Prop({
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        unique: true,
        index: true,
    })
    slug: string;

    @Prop({
        type: [String],
        default: [],
    })
    tags: string[];

    @Prop({
        type: String,
        enum: Object.values(BlogPostStatus),
        default: BlogPostStatus.DRAFT,
        index: true,
    })
    status: BlogPostStatus;

    @Prop({
        type: Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    })
    authorId: Types.ObjectId;

    @Prop({
        type: [BlogContentBlockSchema],
        default: [],
    })
    blocks: BlogContentBlock[];

    @Prop({
        type: Date,
        default: null,
    })
    publishedAt: Date | null;

    createdAt?: Date;
    updatedAt?: Date;
}

export const BlogPostSchema = SchemaFactory.createForClass(BlogPost);

BlogPostSchema.index({ title: 'text', subtitle: 'text', tags: 'text' });
BlogPostSchema.index({ status: 1, createdAt: -1 });
BlogPostSchema.index({ authorId: 1, createdAt: -1 });
BlogPostSchema.index({ tags: 1 });