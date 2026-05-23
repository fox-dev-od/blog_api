import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isValidObjectId } from 'mongoose';

import { GetActivityLogsQueryDto } from './dto/get-activity-logs-query.dto';
import { ActivityLogRepository } from './activity-log.repository';
import { ActivityLog } from './schemas/activity-log.schema';

@Injectable()
export class ActivityLogService {
  constructor(private readonly activityLogRepository: ActivityLogRepository) {}

  create(data: Partial<ActivityLog>) {
    return this.activityLogRepository.create(data);
  }

  async findAll(query: GetActivityLogsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter = this.buildFilter(query);

    const [items, total] = await Promise.all([
      this.activityLogRepository.findAll(filter, page, limit),
      this.activityLogRepository.count(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    this.validateId(id, 'Invalid activity log id');

    const log = await this.activityLogRepository.findById(id);
    if (!log) {
      throw new NotFoundException('Activity log not found');
    }

    return log;
  }

  async remove(id: string) {
    this.validateId(id, 'Invalid activity log id');

    const deletedLog = await this.activityLogRepository.remove(id);
    if (!deletedLog) {
      throw new NotFoundException('Activity log not found');
    }

    return {
      deleted: true,
      id,
    };
  }

  private buildFilter(query: GetActivityLogsQueryDto) {
    const filter: Record<string, any> = {};

    if (query.action) {
      filter.action = query.action.trim();
    }

    if (query.entity) {
      filter.entity = query.entity.trim();
    }

    if (query.userId) {
      this.validateId(query.userId, 'Invalid user id');
      filter.userId = this.activityLogRepository.toObjectId(query.userId);
    }

    if (query.ip) {
      filter.ip = query.ip.trim();
    }

    if (query.success !== undefined) {
      filter.success = query.success;
    }

    if (query.dateFrom || query.dateTo) {
      const createdAt: Record<string, Date> = {};

      if (query.dateFrom) {
        createdAt.$gte = new Date(query.dateFrom);
      }

      if (query.dateTo) {
        createdAt.$lte = new Date(query.dateTo);
      }

      filter.createdAt = createdAt;
    }

    return filter;
  }

  private validateId(id: string, message: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(message);
    }
  }
}
