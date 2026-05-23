import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { isValidObjectId, Types } from 'mongoose';

import { CaseCategoriesRepository } from '../case-categories/case-categories.repository';
import {
  CaseBlockDto,
  CaseInfoItemDto,
  CaseTabDto,
  CreateCaseDto,
} from './dto/create-case.dto';
import { UpdateCaseDto } from './dto/update-case.dto';
import { CaseBlockType } from './enums/case-block-type.enum';
import { CasesRepository } from './cases.repository';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class CasesService {
  constructor(
    private readonly casesRepository: CasesRepository,
    private readonly caseCategoriesRepository: CaseCategoriesRepository,
    private readonly redisService: RedisService,
  ) {}

  async create(createCaseDto: CreateCaseDto) {
    this.validateId(createCaseDto.categoryId, 'Invalid case category id');
    await this.ensureCategoryExists(createCaseDto.categoryId);
    this.validateTabs(createCaseDto.tabs);

    const normalizedSlug = this.normalizeSlug(createCaseDto.slug);
    if (!normalizedSlug) {
      throw new BadRequestException('Invalid slug');
    }

    const existingCase = await this.casesRepository.findBySlug(normalizedSlug);
    if (existingCase) {
      throw new ConflictException('Case slug already exists');
    }

    const createdCase = await this.casesRepository.create({
      title: createCaseDto.title.trim(),
      slug: normalizedSlug,
      categoryId: new Types.ObjectId(createCaseDto.categoryId),
      subtitle: createCaseDto.subtitle?.trim() || null,
      description: createCaseDto.description?.trim() || null,
      coverImage: createCaseDto.coverImage?.trim() || null,
      info: this.normalizeInfo(createCaseDto.info),
      tabs: this.normalizeTabs(createCaseDto.tabs),
      order: createCaseDto.order ?? 0,
      isActive: createCaseDto.isActive ?? true,
    });

    const populatedCase = await this.casesRepository.findById(
      String(createdCase._id),
    );

    const response = this.toResponse(populatedCase ?? createdCase);
    await this.invalidateCaseCache(
      String(createdCase._id),
      null,
      response.slug,
    );

    return response;
  }

  async findAll() {
    const cacheKey = this.buildQueryCacheKey('case:list', {});
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const cases = await this.casesRepository.findAll();
    const response = cases.map((caseItem) => this.toResponse(caseItem));
    await this.redisService.set(cacheKey, response);

    return response;
  }

  async findOne(id: string) {
    this.validateId(id, 'Invalid case id');

    const cacheKey = this.redisService.buildKey('case', 'id', id);
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const caseItem = await this.casesRepository.findById(id);
    if (!caseItem) {
      throw new NotFoundException('Case not found');
    }

    const response = this.toResponse(caseItem);
    await this.redisService.set(cacheKey, response);

    return response;
  }

  async findBySlug(slug: string) {
    const normalizedSlug = this.normalizeSlug(slug);
    const cacheKey = this.redisService.buildKey('case', 'slug', normalizedSlug);
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const caseItem = await this.casesRepository.findBySlug(normalizedSlug);
    if (!caseItem) {
      throw new NotFoundException('Case not found');
    }

    const response = this.toResponse(caseItem);
    await this.redisService.set(cacheKey, response);

    return response;
  }

  async findPublicBySlug(slug: string) {
    const normalizedSlug = this.normalizeSlug(slug);
    const cacheKey = this.redisService.buildKey(
      'case',
      'public',
      'slug',
      normalizedSlug,
    );
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const caseItem =
      await this.casesRepository.findPublicBySlug(normalizedSlug);
    if (!caseItem) {
      throw new NotFoundException('Case not found');
    }

    const response = this.toResponse(caseItem);
    await this.redisService.set(cacheKey, response);

    return response;
  }

  async update(id: string, updateCaseDto: UpdateCaseDto) {
    this.validateId(id, 'Invalid case id');

    const existingCase = await this.casesRepository.findById(id);
    if (!existingCase) {
      throw new NotFoundException('Case not found');
    }

    const updateData: Record<string, unknown> = {};

    if (updateCaseDto.title !== undefined) {
      updateData.title = updateCaseDto.title.trim();
    }

    if (updateCaseDto.slug !== undefined) {
      const normalizedSlug = this.normalizeSlug(updateCaseDto.slug);
      if (!normalizedSlug) {
        throw new BadRequestException('Invalid slug');
      }

      const caseWithSameSlug =
        await this.casesRepository.findBySlug(normalizedSlug);
      if (caseWithSameSlug && String(caseWithSameSlug._id) !== id) {
        throw new ConflictException('Case slug already exists');
      }

      updateData.slug = normalizedSlug;
    }

    if (updateCaseDto.categoryId !== undefined) {
      this.validateId(updateCaseDto.categoryId, 'Invalid case category id');
      await this.ensureCategoryExists(updateCaseDto.categoryId);
      updateData.categoryId = new Types.ObjectId(updateCaseDto.categoryId);
    }

    if (updateCaseDto.subtitle !== undefined) {
      updateData.subtitle = updateCaseDto.subtitle?.trim() || null;
    }

    if (updateCaseDto.description !== undefined) {
      updateData.description = updateCaseDto.description?.trim() || null;
    }

    if (updateCaseDto.coverImage !== undefined) {
      updateData.coverImage = updateCaseDto.coverImage?.trim() || null;
    }

    if (updateCaseDto.info !== undefined) {
      updateData.info = this.normalizeInfo(updateCaseDto.info);
    }

    if (updateCaseDto.tabs !== undefined) {
      this.validateTabs(updateCaseDto.tabs);
      updateData.tabs = this.normalizeTabs(updateCaseDto.tabs);
    }

    if (updateCaseDto.order !== undefined) {
      updateData.order = updateCaseDto.order;
    }

    if (updateCaseDto.isActive !== undefined) {
      updateData.isActive = updateCaseDto.isActive;
    }

    const updatedCase = await this.casesRepository.update(id, updateData);
    if (!updatedCase) {
      throw new NotFoundException('Case not found');
    }

    const response = this.toResponse(updatedCase);
    await this.invalidateCaseCache(id, existingCase.slug, response.slug);

    return response;
  }

  async remove(id: string) {
    this.validateId(id, 'Invalid case id');

    const deletedCase = await this.casesRepository.remove(id);
    if (!deletedCase) {
      throw new NotFoundException('Case not found');
    }

    await this.invalidateCaseCache(id, deletedCase.slug, null);

    return {
      deleted: true,
      id,
    };
  }

  private async ensureCategoryExists(categoryId: string) {
    const category = await this.caseCategoriesRepository.findById(categoryId);
    if (!category) {
      throw new NotFoundException('Case category not found');
    }
  }

  private validateTabs(tabs?: CaseTabDto[]) {
    if (!tabs) {
      return;
    }

    const slugs = new Set<string>();

    for (const tab of tabs) {
      const normalizedSlug = this.normalizeSlug(tab.slug);
      if (!normalizedSlug) {
        throw new BadRequestException('Invalid case tab slug');
      }

      if (slugs.has(normalizedSlug)) {
        throw new BadRequestException('Case tab slugs must be unique');
      }
      slugs.add(normalizedSlug);

      this.validateBlocks(tab.blocks);
    }
  }

  private validateBlocks(blocks?: CaseBlockDto[]) {
    if (!blocks) {
      return;
    }

    for (const block of blocks) {
      const hasHeading = !!block.heading?.trim();
      const hasText = !!block.text?.trim();
      const hasHtml = !!block.html?.trim();
      const hasImages = this.normalizeStringList(block.images).length > 0;

      if (block.type === CaseBlockType.TEXT && !hasText && !hasHtml) {
        throw new BadRequestException('Text block must contain text or html');
      }

      if (block.type === CaseBlockType.GALLERY && !hasImages) {
        throw new BadRequestException(
          'Gallery block must contain at least one image',
        );
      }

      if (
        block.type === CaseBlockType.TEXT_IMAGES &&
        !(hasText || hasHtml || hasHeading) &&
        !hasImages
      ) {
        throw new BadRequestException(
          'Text-images block must contain text, html or heading and at least one image',
        );
      }

      if (
        block.type === CaseBlockType.TEXT_IMAGES &&
        (hasText || hasHtml || hasHeading) !== hasImages
      ) {
        throw new BadRequestException(
          'Text-images block must contain text, html or heading and at least one image',
        );
      }
    }
  }

  private normalizeInfo(info?: CaseInfoItemDto[]) {
    return (
      info?.map((item) => ({
        label: item.label.trim(),
        value: item.value.trim(),
        icon: item.icon?.trim() || null,
        order: item.order ?? 0,
      })) ?? []
    );
  }

  private normalizeTabs(tabs?: CaseTabDto[]) {
    return (
      tabs?.map((tab) => ({
        title: tab.title.trim(),
        slug: this.normalizeSlug(tab.slug),
        blocks: this.normalizeBlocks(tab.blocks),
        order: tab.order ?? 0,
        isActive: tab.isActive ?? true,
      })) ?? []
    );
  }

  private normalizeBlocks(blocks?: CaseBlockDto[]) {
    return (
      blocks?.map((block) => ({
        type: block.type,
        heading: block.heading?.trim() || null,
        text: block.text?.trim() || null,
        html: block.html?.trim() || null,
        images: this.normalizeStringList(block.images),
        layout: block.layout,
        order: block.order ?? 0,
      })) ?? []
    );
  }

  private normalizeStringList(items?: string[]) {
    return items?.map((item) => item.trim()).filter(Boolean) ?? [];
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

  private validateId(id: string, message: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(message);
    }
  }

  private async invalidateCaseCache(
    id: string,
    oldSlug?: string | null,
    newSlug?: string | null,
  ) {
    const keys = [
      this.redisService.buildKey('case', 'id', id),
      oldSlug ? this.redisService.buildKey('case', 'slug', oldSlug) : null,
      newSlug ? this.redisService.buildKey('case', 'slug', newSlug) : null,
      oldSlug
        ? this.redisService.buildKey('case', 'public', 'slug', oldSlug)
        : null,
      newSlug
        ? this.redisService.buildKey('case', 'public', 'slug', newSlug)
        : null,
    ].filter((key): key is string => !!key);

    await this.redisService.delMany(keys);
    await this.redisService.delByPattern('case:list:*');
    await this.redisService.delByPattern('case:category:*');
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

  private toResponse(caseItem: any) {
    const raw =
      typeof caseItem?.toObject === 'function' ? caseItem.toObject() : caseItem;
    const { __v, ...result } = raw;

    result.info = this.sortByOrder(result.info);
    result.tabs = this.sortTabs(result.tabs);

    return result;
  }

  private sortTabs(tabs?: any[]) {
    return this.sortByOrder(tabs).map((tab) => ({
      ...tab,
      blocks: this.sortByOrder(tab.blocks),
    }));
  }

  private sortByOrder<T extends { order?: number }>(items?: T[]) {
    return [...(items ?? [])].sort(
      (first, second) => (first.order ?? 0) - (second.order ?? 0),
    );
  }
}
