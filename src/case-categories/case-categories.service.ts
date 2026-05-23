import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isValidObjectId } from 'mongoose';

import { CreateCaseCategoryDto } from './dto/create-case-category.dto';
import { UpdateCaseCategoryDto } from './dto/update-case-category.dto';
import { CaseCategoriesRepository } from './case-categories.repository';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class CaseCategoriesService {
  constructor(
    private readonly caseCategoriesRepository: CaseCategoriesRepository,
    private readonly redisService: RedisService,
  ) {}

  async create(createCaseCategoryDto: CreateCaseCategoryDto) {
    const normalizedSlug = this.normalizeSlug(createCaseCategoryDto.slug);
    if (!normalizedSlug) {
      throw new BadRequestException('Invalid slug');
    }

    const existingCategory =
      await this.caseCategoriesRepository.findBySlug(normalizedSlug);
    if (existingCategory) {
      throw new ConflictException('Case category slug already exists');
    }

    const category = await this.caseCategoriesRepository.create({
      title: createCaseCategoryDto.title.trim(),
      slug: normalizedSlug,
      description: createCaseCategoryDto.description?.trim() || null,
      image: createCaseCategoryDto.image?.trim() || null,
      order: createCaseCategoryDto.order ?? 0,
      isActive: createCaseCategoryDto.isActive ?? true,
    });

    const response = this.toResponse(category);
    await this.invalidateCaseCategoryCache(
      String(category._id),
      null,
      response.slug,
    );

    return response;
  }

  async findAll() {
    const cacheKey = this.redisService.buildKey('case-category', 'list', 'all');
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const categories = await this.caseCategoriesRepository.findAll();
    const response = categories.map((category) => this.toResponse(category));
    await this.redisService.set(cacheKey, response);

    return response;
  }

  async findOne(id: string) {
    this.validateId(id);

    const cacheKey = this.redisService.buildKey('case-category', 'id', id);
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const category = await this.caseCategoriesRepository.findById(id);
    if (!category) {
      throw new NotFoundException('Case category not found');
    }

    const response = this.toResponse(category);
    await this.redisService.set(cacheKey, response);

    return response;
  }

  async findBySlug(slug: string) {
    const normalizedSlug = this.normalizeSlug(slug);
    const cacheKey = this.redisService.buildKey(
      'case-category',
      'slug',
      normalizedSlug,
    );
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const category =
      await this.caseCategoriesRepository.findBySlug(normalizedSlug);
    if (!category) {
      throw new NotFoundException('Case category not found');
    }

    const response = this.toResponse(category);
    await this.redisService.set(cacheKey, response);

    return response;
  }

  async update(id: string, updateCaseCategoryDto: UpdateCaseCategoryDto) {
    this.validateId(id);

    const existingCategory = await this.caseCategoriesRepository.findById(id);
    if (!existingCategory) {
      throw new NotFoundException('Case category not found');
    }

    const updateData: Record<string, unknown> = {};

    if (updateCaseCategoryDto.title !== undefined) {
      updateData.title = updateCaseCategoryDto.title.trim();
    }

    if (updateCaseCategoryDto.slug !== undefined) {
      const normalizedSlug = this.normalizeSlug(updateCaseCategoryDto.slug);
      if (!normalizedSlug) {
        throw new BadRequestException('Invalid slug');
      }

      const categoryWithSameSlug =
        await this.caseCategoriesRepository.findBySlug(normalizedSlug);
      if (categoryWithSameSlug && String(categoryWithSameSlug._id) !== id) {
        throw new ConflictException('Case category slug already exists');
      }

      updateData.slug = normalizedSlug;
    }

    if (updateCaseCategoryDto.description !== undefined) {
      updateData.description =
        updateCaseCategoryDto.description?.trim() || null;
    }

    if (updateCaseCategoryDto.image !== undefined) {
      updateData.image = updateCaseCategoryDto.image?.trim() || null;
    }

    if (updateCaseCategoryDto.order !== undefined) {
      updateData.order = updateCaseCategoryDto.order;
    }

    if (updateCaseCategoryDto.isActive !== undefined) {
      updateData.isActive = updateCaseCategoryDto.isActive;
    }

    const updatedCategory = await this.caseCategoriesRepository.update(
      id,
      updateData,
    );
    if (!updatedCategory) {
      throw new NotFoundException('Case category not found');
    }

    const response = this.toResponse(updatedCategory);
    await this.invalidateCaseCategoryCache(
      id,
      existingCategory.slug,
      response.slug,
    );

    return response;
  }

  async remove(id: string) {
    this.validateId(id);

    const deletedCategory = await this.caseCategoriesRepository.remove(id);
    if (!deletedCategory) {
      throw new NotFoundException('Case category not found');
    }

    await this.invalidateCaseCategoryCache(id, deletedCategory.slug, null);

    return {
      deleted: true,
      id,
    };
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
      throw new BadRequestException('Invalid case category id');
    }
  }

  private async invalidateCaseCategoryCache(
    id: string,
    oldSlug?: string | null,
    newSlug?: string | null,
  ) {
    const keys = [
      this.redisService.buildKey('case-category', 'id', id),
      oldSlug
        ? this.redisService.buildKey('case-category', 'slug', oldSlug)
        : null,
      newSlug
        ? this.redisService.buildKey('case-category', 'slug', newSlug)
        : null,
    ].filter((key): key is string => !!key);

    await this.redisService.delMany(keys);
    await this.redisService.delByPattern('case-category:list:*');
  }

  private toResponse(category: any) {
    const raw =
      typeof category?.toObject === 'function' ? category.toObject() : category;
    const { __v, ...result } = raw;
    return result;
  }
}
