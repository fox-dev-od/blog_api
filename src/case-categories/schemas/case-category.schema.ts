import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CaseCategoryDocument = HydratedDocument<CaseCategory>;

@Schema({
  timestamps: true,
  collection: 'case_categories',
})
export class CaseCategory {
  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  title: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
  })
  slug: string;

  @Prop({
    type: String,
    default: null,
    trim: true,
  })
  description: string | null;

  @Prop({
    type: String,
    default: null,
    trim: true,
  })
  image: string | null;

  @Prop({
    type: Number,
    default: 0,
    index: true,
  })
  order: number;

  @Prop({
    type: Boolean,
    default: true,
    index: true,
  })
  isActive: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CaseCategorySchema = SchemaFactory.createForClass(CaseCategory);

CaseCategorySchema.index({ isActive: 1, order: 1 });
