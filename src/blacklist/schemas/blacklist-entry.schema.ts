import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum BlacklistEntryType {
  IP = 'ip',
  USER = 'user',
}

export type BlacklistEntryDocument = HydratedDocument<BlacklistEntry>;

@Schema({
  timestamps: true,
  collection: 'blacklist_entries',
})
export class BlacklistEntry {
  @Prop({
    type: String,
    enum: Object.values(BlacklistEntryType),
    required: true,
    index: true,
  })
  type: BlacklistEntryType;

  @Prop({
    type: String,
    default: null,
    trim: true,
    index: true,
  })
  ip: string | null;

  @Prop({
    type: Types.ObjectId,
    default: null,
    index: true,
  })
  userId: Types.ObjectId | null;

  @Prop({
    type: String,
    default: null,
    trim: true,
  })
  reason: string | null;

  @Prop({
    type: Date,
    default: null,
    index: true,
  })
  expiresAt: Date | null;

  @Prop({
    type: Boolean,
    default: true,
    index: true,
  })
  isActive: boolean;

  @Prop({
    type: Types.ObjectId,
    default: null,
  })
  createdBy: Types.ObjectId | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const BlacklistEntrySchema =
  SchemaFactory.createForClass(BlacklistEntry);

BlacklistEntrySchema.index({ createdAt: -1 });
