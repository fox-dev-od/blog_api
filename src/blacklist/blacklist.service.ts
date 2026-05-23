import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { isValidObjectId, Types } from 'mongoose';

import { BlacklistRepository } from './blacklist.repository';
import { CreateBlacklistEntryDto } from './dto/create-blacklist-entry.dto';
import { GetBlacklistQueryDto } from './dto/get-blacklist-query.dto';
import { UpdateBlacklistEntryDto } from './dto/update-blacklist-entry.dto';
import {
  BlacklistEntry,
  BlacklistEntryType,
} from './schemas/blacklist-entry.schema';
import { RedisService } from '../redis/redis.service';

type BlacklistCacheValue = {
  blocked: boolean;
  reason?: string | null;
  expiresAt?: string | null;
};

@Injectable()
export class BlacklistService {
  private readonly logger = new Logger(BlacklistService.name);

  constructor(
    private readonly blacklistRepository: BlacklistRepository,
    private readonly redisService: RedisService,
  ) {}

  async create(dto: CreateBlacklistEntryDto, createdBy?: string) {
    this.validateTypePayload(dto.type, dto.ip, dto.userId);

    const normalizedIp = this.normalizeIp(dto.ip);
    const userId = this.toObjectIdOrNull(dto.userId, 'Invalid user id');

    await this.ensureNoActiveDuplicate(dto.type, normalizedIp, userId);

    const createdEntry = await this.blacklistRepository.create({
      type: dto.type,
      ip: dto.type === BlacklistEntryType.IP ? normalizedIp : null,
      userId: dto.type === BlacklistEntryType.USER ? userId : null,
      reason: dto.reason?.trim() || null,
      expiresAt: dto.expiresAt ?? null,
      isActive: dto.isActive ?? true,
      createdBy: this.toObjectIdOrNull(createdBy, 'Invalid creator id'),
    });

    await this.invalidateBlacklistCache(null, createdEntry);

    return createdEntry;
  }

  async findAll(query: GetBlacklistQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter = this.buildFilter(query);

    const [items, total] = await Promise.all([
      this.blacklistRepository.findAll(filter, page, limit),
      this.blacklistRepository.count(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    this.validateId(id, 'Invalid blacklist entry id');

    const entry = await this.blacklistRepository.findById(id);
    if (!entry) {
      throw new NotFoundException('Blacklist entry not found');
    }

    return entry;
  }

  async update(id: string, dto: UpdateBlacklistEntryDto) {
    this.validateId(id, 'Invalid blacklist entry id');

    const existingEntry = await this.blacklistRepository.findById(id);
    if (!existingEntry) {
      throw new NotFoundException('Blacklist entry not found');
    }

    const type = dto.type ?? existingEntry.type;
    const ip =
      dto.ip !== undefined ? this.normalizeIp(dto.ip) : existingEntry.ip;
    const userId =
      dto.userId !== undefined
        ? this.toObjectIdOrNull(dto.userId, 'Invalid user id')
        : existingEntry.userId;

    this.validateTypePayload(type, ip ?? undefined, userId?.toString());

    if (dto.isActive ?? existingEntry.isActive) {
      await this.ensureNoActiveDuplicate(type, ip, userId, id);
    }

    const updateData: Partial<BlacklistEntry> = {
      type,
      ip: type === BlacklistEntryType.IP ? ip : null,
      userId: type === BlacklistEntryType.USER ? userId : null,
    };

    if (dto.reason !== undefined) {
      updateData.reason = dto.reason?.trim() || null;
    }

    if (dto.expiresAt !== undefined) {
      updateData.expiresAt = dto.expiresAt ?? null;
    }

    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    const updatedEntry = await this.blacklistRepository.update(id, updateData);
    if (!updatedEntry) {
      throw new NotFoundException('Blacklist entry not found');
    }

    await this.invalidateBlacklistCache(existingEntry, updatedEntry);

    return updatedEntry;
  }

  async remove(id: string) {
    this.validateId(id, 'Invalid blacklist entry id');

    const deletedEntry = await this.blacklistRepository.remove(id);
    if (!deletedEntry) {
      throw new NotFoundException('Blacklist entry not found');
    }

    await this.invalidateBlacklistCache(deletedEntry, null);

    return {
      deleted: true,
      id,
    };
  }

  async activate(id: string) {
    this.validateId(id, 'Invalid blacklist entry id');

    const existingEntry = await this.blacklistRepository.findById(id);
    if (!existingEntry) {
      throw new NotFoundException('Blacklist entry not found');
    }

    await this.ensureNoActiveDuplicate(
      existingEntry.type,
      existingEntry.ip,
      existingEntry.userId,
      id,
    );

    const updatedEntry = await this.blacklistRepository.update(id, {
      isActive: true,
    });

    await this.invalidateBlacklistCache(existingEntry, updatedEntry);

    return updatedEntry;
  }

  async deactivate(id: string) {
    this.validateId(id, 'Invalid blacklist entry id');

    const existingEntry = await this.blacklistRepository.findById(id);
    if (!existingEntry) {
      throw new NotFoundException('Blacklist entry not found');
    }

    const updatedEntry = await this.blacklistRepository.update(id, {
      isActive: false,
    });
    if (!updatedEntry) {
      throw new NotFoundException('Blacklist entry not found');
    }

    await this.invalidateBlacklistCache(existingEntry, updatedEntry);

    return updatedEntry;
  }

  async isIpBlocked(ip: string): Promise<boolean> {
    const normalizedIp = this.normalizeIp(ip);
    if (!normalizedIp) {
      return false;
    }

    const cacheKey = this.redisService.buildKey(
      'blacklist',
      'ip',
      normalizedIp,
    );
    const cached = await this.redisService.get<BlacklistCacheValue>(cacheKey);
    if (cached) {
      return cached.blocked;
    }

    try {
      const activeEntry =
        await this.blacklistRepository.findActiveIp(normalizedIp);
      if (!activeEntry) {
        await this.cacheBlacklistResult(cacheKey, {
          blocked: false,
          reason: null,
          expiresAt: null,
        });
        return false;
      }

      if (this.isExpired(activeEntry.expiresAt)) {
        await this.blacklistRepository.update(String(activeEntry._id), {
          isActive: false,
        });
        await this.cacheBlacklistResult(cacheKey, {
          blocked: false,
          reason: null,
          expiresAt: null,
        });
        return false;
      }

      await this.cacheBlacklistResult(
        cacheKey,
        {
          blocked: true,
          reason: activeEntry.reason,
          expiresAt: activeEntry.expiresAt?.toISOString() ?? null,
        },
        activeEntry.expiresAt,
      );

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to check IP blacklist in MongoDB: ${this.getErrorMessage(error)}`,
      );
      return false;
    }
  }

  async isUserBlocked(userId: string): Promise<boolean> {
    this.validateId(userId, 'Invalid user id');

    const cacheKey = this.redisService.buildKey('blacklist', 'user', userId);
    const cached = await this.redisService.get<BlacklistCacheValue>(cacheKey);
    if (cached) {
      return cached.blocked;
    }

    try {
      const activeEntry = await this.blacklistRepository.findActiveUser(
        this.blacklistRepository.toObjectId(userId),
      );
      if (!activeEntry) {
        await this.cacheBlacklistResult(cacheKey, {
          blocked: false,
          reason: null,
          expiresAt: null,
        });
        return false;
      }

      if (this.isExpired(activeEntry.expiresAt)) {
        await this.blacklistRepository.update(String(activeEntry._id), {
          isActive: false,
        });
        await this.cacheBlacklistResult(cacheKey, {
          blocked: false,
          reason: null,
          expiresAt: null,
        });
        return false;
      }

      await this.cacheBlacklistResult(
        cacheKey,
        {
          blocked: true,
          reason: activeEntry.reason,
          expiresAt: activeEntry.expiresAt?.toISOString() ?? null,
        },
        activeEntry.expiresAt,
      );

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to check user blacklist in MongoDB: ${this.getErrorMessage(error)}`,
      );
      return false;
    }
  }

  private buildFilter(query: GetBlacklistQueryDto) {
    const filter: Record<string, any> = {};

    if (query.type) {
      filter.type = query.type;
    }

    if (query.ip) {
      filter.ip = this.normalizeIp(query.ip);
    }

    if (query.userId) {
      this.validateId(query.userId, 'Invalid user id');
      filter.userId = this.blacklistRepository.toObjectId(query.userId);
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    return filter;
  }

  private async ensureNoActiveDuplicate(
    type: BlacklistEntryType,
    ip: string | null,
    userId: Types.ObjectId | null,
    excludeId?: string,
  ) {
    const existingEntry =
      type === BlacklistEntryType.IP && ip
        ? await this.blacklistRepository.findActiveIp(ip)
        : userId
          ? await this.blacklistRepository.findActiveUser(userId)
          : null;

    if (!existingEntry || String(existingEntry._id) === excludeId) {
      return;
    }

    if (this.isExpired(existingEntry.expiresAt)) {
      await this.blacklistRepository.update(String(existingEntry._id), {
        isActive: false,
      });
      return;
    }

    throw new ConflictException('Active blacklist entry already exists');
  }

  private validateTypePayload(
    type: BlacklistEntryType,
    ip?: string | null,
    userId?: string | null,
  ) {
    if (type === BlacklistEntryType.IP && !this.normalizeIp(ip)) {
      throw new BadRequestException('IP is required');
    }

    if (type === BlacklistEntryType.USER && !userId) {
      throw new BadRequestException('User id is required');
    }

    if (userId) {
      this.validateId(userId, 'Invalid user id');
    }
  }

  private isExpired(expiresAt?: Date | null) {
    return !!expiresAt && expiresAt.getTime() <= Date.now();
  }

  private async cacheBlacklistResult(
    key: string,
    value: BlacklistCacheValue,
    expiresAt?: Date | null,
  ) {
    await this.redisService.set(
      key,
      value,
      this.getBlacklistCacheTtl(value, expiresAt),
    );
  }

  private getBlacklistCacheTtl(
    value: BlacklistCacheValue,
    expiresAt?: Date | null,
  ) {
    if (!value.blocked) {
      return 120;
    }

    if (!expiresAt) {
      return 900;
    }

    return Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
  }

  private async invalidateBlacklistCache(
    oldEntry?: BlacklistEntry | null,
    newEntry?: BlacklistEntry | null,
  ) {
    const keys = [
      oldEntry?.ip
        ? this.redisService.buildKey('blacklist', 'ip', oldEntry.ip)
        : null,
      newEntry?.ip
        ? this.redisService.buildKey('blacklist', 'ip', newEntry.ip)
        : null,
      oldEntry?.userId
        ? this.redisService.buildKey(
            'blacklist',
            'user',
            String(oldEntry.userId),
          )
        : null,
      newEntry?.userId
        ? this.redisService.buildKey(
            'blacklist',
            'user',
            String(newEntry.userId),
          )
        : null,
    ].filter((key): key is string => !!key);

    await this.redisService.delMany(keys);
  }

  private normalizeIp(ip?: string | null) {
    const trimmedIp = ip?.trim();
    if (!trimmedIp) {
      return null;
    }

    return trimmedIp.startsWith('::ffff:')
      ? trimmedIp.replace('::ffff:', '')
      : trimmedIp;
  }

  private toObjectIdOrNull(id: string | undefined, message: string) {
    if (!id) {
      return null;
    }

    this.validateId(id, message);
    return this.blacklistRepository.toObjectId(id);
  }

  private validateId(id: string, message: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(message);
    }
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}
