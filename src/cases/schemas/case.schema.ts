import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { CaseCategory } from '../../case-categories/schemas/case-category.schema';
import { CaseBlockLayout } from '../enums/case-block-layout.enum';
import { CaseBlockType } from '../enums/case-block-type.enum';

export type CaseDocument = HydratedDocument<Case>;

@Schema({ _id: false })
export class CaseInfoItem {
  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  label: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  value: string;

  @Prop({
    type: String,
    default: null,
    trim: true,
  })
  icon: string | null;

  @Prop({
    type: Number,
    default: 24,
  })
  iconSize: number;

  @Prop({
    type: Number,
    default: 0,
  })
  order: number;
}

export const CaseInfoItemSchema = SchemaFactory.createForClass(CaseInfoItem);

@Schema({ _id: false })
export class CaseBlock {
  @Prop({
    type: String,
    enum: Object.values(CaseBlockType),
    required: true,
  })
  type: CaseBlockType;

  @Prop({
    type: String,
    default: null,
    trim: true,
  })
  heading: string | null;

  @Prop({
    type: String,
    default: null,
    trim: true,
  })
  text: string | null;

  @Prop({
    type: String,
    default: null,
  })
  html: string | null;

  @Prop({
    type: [String],
    default: [],
  })
  images: string[];

  @Prop({
    type: String,
    enum: Object.values(CaseBlockLayout),
    required: true,
  })
  layout: CaseBlockLayout;

  @Prop({
    type: Number,
    default: 0,
  })
  order: number;
}

export const CaseBlockSchema = SchemaFactory.createForClass(CaseBlock);

@Schema({ _id: false })
export class CaseTab {
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
  })
  slug: string;

  @Prop({
    type: [CaseBlockSchema],
    default: [],
  })
  blocks: CaseBlock[];

  @Prop({
    type: Number,
    default: 0,
  })
  order: number;

  @Prop({
    type: Boolean,
    default: true,
  })
  isActive: boolean;
}

export const CaseTabSchema = SchemaFactory.createForClass(CaseTab);

@Schema({
  timestamps: true,
  collection: 'cases',
})
export class Case {
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
    type: Types.ObjectId,
    ref: CaseCategory.name,
    required: true,
    index: true,
  })
  categoryId: Types.ObjectId;

  @Prop({
    type: String,
    default: null,
    trim: true,
  })
  subtitle: string | null;

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
  coverImage: string | null;

  @Prop({
    type: [CaseInfoItemSchema],
    default: [],
  })
  info: CaseInfoItem[];

  @Prop({
    type: [CaseTabSchema],
    default: [],
  })
  tabs: CaseTab[];

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

export const CaseSchema = SchemaFactory.createForClass(Case);

CaseSchema.index({ isActive: 1, order: 1 });
