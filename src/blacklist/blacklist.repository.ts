import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, UpdateQuery } from 'mongoose';

import {
  BlacklistEntry,
  BlacklistEntryDocument,
  BlacklistEntryType,
} from './schemas/blacklist-entry.schema';

@Injectable()
export class BlacklistRepository {
  constructor(
    @InjectModel(BlacklistEntry.name)
    private readonly blacklistEntryModel: Model<BlacklistEntryDocument>,
  ) {}

  create(data: Partial<BlacklistEntry>) {
    return this.blacklistEntryModel.create(data);
  }

  findAll(filter: Record<string, any>, page: number, limit: number) {
    return this.blacklistEntryModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
  }

  count(filter: Record<string, any>) {
    return this.blacklistEntryModel.countDocuments(filter).exec();
  }

  findById(id: string) {
    return this.blacklistEntryModel.findById(id).exec();
  }

  findActiveIp(ip: string) {
    return this.blacklistEntryModel
      .findOne({
        type: BlacklistEntryType.IP,
        ip,
        isActive: true,
      })
      .exec();
  }

  findActiveUser(userId: Types.ObjectId) {
    return this.blacklistEntryModel
      .findOne({
        type: BlacklistEntryType.USER,
        userId,
        isActive: true,
      })
      .exec();
  }

  findBlockingIp(ip: string, now: Date) {
    return this.blacklistEntryModel
      .findOne({
        type: BlacklistEntryType.IP,
        ip,
        isActive: true,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
      })
      .exec();
  }

  findBlockingUser(userId: Types.ObjectId, now: Date) {
    return this.blacklistEntryModel
      .findOne({
        type: BlacklistEntryType.USER,
        userId,
        isActive: true,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
      })
      .exec();
  }

  update(id: string, data: UpdateQuery<BlacklistEntry>) {
    return this.blacklistEntryModel
      .findByIdAndUpdate(id, data, {
        returnDocument: 'after',
        runValidators: true,
      })
      .exec();
  }

  remove(id: string) {
    return this.blacklistEntryModel.findByIdAndDelete(id).exec();
  }

  toObjectId(id: string) {
    return new Types.ObjectId(id);
  }
}
