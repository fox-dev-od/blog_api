import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  ActivityLog,
  ActivityLogDocument,
} from './schemas/activity-log.schema';

@Injectable()
export class ActivityLogRepository {
  constructor(
    @InjectModel(ActivityLog.name)
    private readonly activityLogModel: Model<ActivityLogDocument>,
  ) {}

  create(data: Partial<ActivityLog>) {
    return this.activityLogModel.create(data);
  }

  findAll(filter: Record<string, any>, page: number, limit: number) {
    return this.activityLogModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
  }

  count(filter: Record<string, any>) {
    return this.activityLogModel.countDocuments(filter).exec();
  }

  findById(id: string) {
    return this.activityLogModel.findById(id).exec();
  }

  remove(id: string) {
    return this.activityLogModel.findByIdAndDelete(id).exec();
  }

  toObjectId(id: string) {
    return new Types.ObjectId(id);
  }
}
