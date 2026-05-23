import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { isValidObjectId, Types } from 'mongoose';

import { BlogRepository } from './blog.repository';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { GetBlogPostsQueryDto } from './dto/get-blog-posts-query.dto';
import { BlogPostStatus } from './enums/blog-post-status.enum';
import { UserRole } from '../users/enums/user-role.enum';
import { CurrentUserData } from '../auth/interfaces/jwt-payload.interface';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class BlogService {
  constructor(
    private readonly blogRepository: BlogRepository,
    private readonly redisService: RedisService,
  ) {}

  async create(
    createBlogPostDto: CreateBlogPostDto,
    currentUser: CurrentUserData,
  ) {
    this.validateBlocks(createBlogPostDto.blocks);

    const normalizedSlug = this.normalizeSlug(createBlogPostDto.slug);
    if (!normalizedSlug) {
      throw new BadRequestException('Invalid slug');
    }

    const existingPost = await this.blogRepository.findBySlug(normalizedSlug);
    if (existingPost) {
      throw new BadRequestException('Slug already exists');
    }

    const status = createBlogPostDto.status ?? BlogPostStatus.DRAFT;

    const createdPost = await this.blogRepository.create({
      title: createBlogPostDto.title.trim(),
      subtitle: createBlogPostDto.subtitle?.trim() ?? null,
      slug: normalizedSlug,
      tags: this.normalizeTags(createBlogPostDto.tags),
      status,
      authorId: new Types.ObjectId(currentUser.userId),
      blocks:
        createBlogPostDto.blocks?.map((block) => ({
          imageUrl: block.imageUrl?.trim() ?? null,
          html: block.html?.trim() ?? null,
          layout: block.layout,
        })) ?? [],
      publishedAt: status === BlogPostStatus.PUBLISHED ? new Date() : null,
    });

    const response = this.toResponse(createdPost);
    await this.invalidateBlogCache(
      String(createdPost._id),
      null,
      response.slug,
    );

    return response;
  }

  async findAllPublished(query: GetBlogPostsQueryDto) {
    const cacheKey = this.buildQueryCacheKey('blog:list', query);
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.blogRepository.findPublishedList({
        search: query.search,
        tag: query.tag,
        skip,
        limit,
      }),
      this.blogRepository.countPublished({
        search: query.search,
        tag: query.tag,
      }),
    ]);

    const response = {
      items: items.map((item) => this.toResponse(item)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    await this.redisService.set(cacheKey, response);

    return response;
  }

  async findOnePublished(slug: string) {
    const normalizedSlug = this.normalizeSlug(slug);
    const cacheKey = this.redisService.buildKey(
      'blog',
      'public',
      'slug',
      normalizedSlug,
    );
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const post = await this.blogRepository.findPublishedBySlug(normalizedSlug);

    if (!post) {
      throw new NotFoundException('Article not found');
    }

    const response = this.toResponse(post);
    await this.redisService.set(cacheKey, response);

    return response;
  }

  async findOne(id: string) {
    this.validateId(id);

    const cacheKey = this.redisService.buildKey('blog', 'id', id);
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const post = await this.blogRepository.findById(id);
    if (!post) {
      throw new NotFoundException('Article not found');
    }

    const response = this.toResponse(post);
    await this.redisService.set(cacheKey, response);

    return response;
  }

  async findBySlug(slug: string) {
    const normalizedSlug = this.normalizeSlug(slug);
    const cacheKey = this.redisService.buildKey('blog', 'slug', normalizedSlug);
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const post = await this.blogRepository.findBySlug(normalizedSlug);
    if (!post) {
      throw new NotFoundException('Article not found');
    }

    const response = this.toResponse(post);
    await this.redisService.set(cacheKey, response);

    return response;
  }

  async update(
    id: string,
    updateBlogPostDto: UpdateBlogPostDto,
    currentUser: CurrentUserData,
  ) {
    this.validateId(id);

    if (updateBlogPostDto.blocks !== undefined) {
      this.validateBlocks(updateBlogPostDto.blocks);
    }

    const existingPost = await this.blogRepository.findById(id);
    if (!existingPost) {
      throw new NotFoundException('Article not found');
    }

    this.ensureCanManage(existingPost, currentUser);

    const updateData: Record<string, unknown> = {};

    if (updateBlogPostDto.title !== undefined) {
      updateData.title = updateBlogPostDto.title.trim();
    }

    if (updateBlogPostDto.subtitle !== undefined) {
      updateData.subtitle = updateBlogPostDto.subtitle?.trim() || null;
    }

    if (updateBlogPostDto.slug !== undefined) {
      const normalizedSlug = this.normalizeSlug(updateBlogPostDto.slug);
      if (!normalizedSlug) {
        throw new BadRequestException('Invalid slug');
      }

      const postWithSameSlug =
        await this.blogRepository.findBySlug(normalizedSlug);
      if (postWithSameSlug && String(postWithSameSlug._id) !== id) {
        throw new BadRequestException('Slug already exists');
      }

      updateData.slug = normalizedSlug;
    }

    if (updateBlogPostDto.tags !== undefined) {
      updateData.tags = this.normalizeTags(updateBlogPostDto.tags);
    }

    if (updateBlogPostDto.blocks !== undefined) {
      updateData.blocks = updateBlogPostDto.blocks.map((block) => ({
        imageUrl: block.imageUrl?.trim() ?? null,
        html: block.html?.trim() ?? null,
        layout: block.layout,
      }));
    }

    if (updateBlogPostDto.status !== undefined) {
      updateData.status = updateBlogPostDto.status;

      if (
        updateBlogPostDto.status === BlogPostStatus.PUBLISHED &&
        existingPost.status !== BlogPostStatus.PUBLISHED
      ) {
        updateData.publishedAt = new Date();
      }

      if (updateBlogPostDto.status !== BlogPostStatus.PUBLISHED) {
        updateData.publishedAt = null;
      }
    }

    const updatedPost = await this.blogRepository.update(id, updateData);
    if (!updatedPost) {
      throw new NotFoundException('Article not found');
    }

    const response = this.toResponse(updatedPost);
    await this.invalidateBlogCache(id, existingPost.slug, response.slug);

    return response;
  }

  async remove(id: string, currentUser: CurrentUserData) {
    this.validateId(id);

    const existingPost = await this.blogRepository.findById(id);
    if (!existingPost) {
      throw new NotFoundException('Article not found');
    }

    this.ensureCanManage(existingPost, currentUser);

    await this.blogRepository.remove(id);
    await this.invalidateBlogCache(id, existingPost.slug, null);

    return {
      deleted: true,
      id,
    };
  }

  private ensureCanManage(post: any, currentUser: CurrentUserData) {
    if (currentUser.role === UserRole.ADMIN) {
      return;
    }

    const isOwner = String(post.authorId) === currentUser.userId;

    if (!isOwner) {
      throw new ForbiddenException('You can manage only your own articles');
    }
  }

  private validateBlocks(blocks?: Array<{ imageUrl?: string; html?: string }>) {
    if (!blocks) {
      return;
    }

    for (const block of blocks) {
      const hasImage = !!block.imageUrl?.trim();
      const hasHtml = !!block.html?.trim();

      if (!hasImage && !hasHtml) {
        throw new BadRequestException(
          'Each block must contain imageUrl or html',
        );
      }
    }
  }

  private normalizeTags(tags?: string[]) {
    if (!tags?.length) {
      return [];
    }

    return [
      ...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean)),
    ];
  }

  private normalizeSlug(slug: string) {
    return (
      slug
        ?.trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') ?? ''
    );
  }

  private validateId(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid article id');
    }
  }

  private async invalidateBlogCache(
    id: string,
    oldSlug?: string | null,
    newSlug?: string | null,
  ) {
    const keys = [
      this.redisService.buildKey('blog', 'id', id),
      oldSlug ? this.redisService.buildKey('blog', 'slug', oldSlug) : null,
      newSlug ? this.redisService.buildKey('blog', 'slug', newSlug) : null,
      oldSlug
        ? this.redisService.buildKey('blog', 'public', 'slug', oldSlug)
        : null,
      newSlug
        ? this.redisService.buildKey('blog', 'public', 'slug', newSlug)
        : null,
    ].filter((key): key is string => !!key);

    await this.redisService.delMany(keys);
    await this.redisService.delByPattern('blog:list:*');
  }

  private buildQueryCacheKey(prefix: string, query: Record<string, any>) {
    const normalizedQuery = Object.keys(query ?? {})
      .sort()
      .reduce<Record<string, any>>((result, key) => {
        const value = query[key];
        if (value !== undefined && value !== null && value !== '') {
          result[key] = value;
        }

        return result;
      }, {});

    const hash = createHash('sha1')
      .update(JSON.stringify(normalizedQuery))
      .digest('hex');

    return this.redisService.buildKey(prefix, hash);
  }

  private toResponse(post: any) {
    const raw = typeof post?.toObject === 'function' ? post.toObject() : post;
    const { __v, ...result } = raw;
    return result;
  }
}
