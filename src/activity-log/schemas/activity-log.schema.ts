import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ActivityLogDocument = HydratedDocument<ActivityLog>;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'activity_logs',
})
export class ActivityLog {
  @Prop({
    type: String,
    required: true,
    trim: true,
    index: true,
  })
  action: string;

  @Prop({
    type: String,
    default: null,
    trim: true,
    index: true,
  })
  entity: string | null;

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
    lowercase: true,
  })
  userEmail: string | null;

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  method: string;

  @Prop({
    type: String,
    required: true,
  })
  url: string;

  @Prop({
    type: String,
    default: null,
    trim: true,
    index: true,
  })
  ip: string | null;

  @Prop({
    type: String,
    default: null,
  })
  userAgent: string | null;

  @Prop({
    type: Object,
    default: {},
  })
  params: Record<string, any>;

  @Prop({
    type: Object,
    default: {},
  })
  query: Record<string, any>;

  @Prop({
    type: Object,
    default: {},
  })
  body: Record<string, any>;

  @Prop({
    type: Number,
    default: null,
  })
  statusCode: number | null;

  @Prop({
    type: Boolean,
    required: true,
    index: true,
  })
  success: boolean;

  @Prop({
    type: String,
    default: null,
  })
  errorMessage: string | null;

  @Prop({
    type: Object,
    default: {},
  })
  metadata: Record<string, any>;

  createdAt?: Date;
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);

ActivityLogSchema.index({ createdAt: -1 });
