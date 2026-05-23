import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, UpdateQuery } from 'mongoose';

import {
  CaseCategory,
  CaseCategoryDocument,
} from './schemas/case-category.schema';

@Injectable()
export class CaseCategoriesRepository {
  constructor(
    @InjectModel(CaseCategory.name)
    private readonly caseCategoryModel: Model<CaseCategoryDocument>,
  ) {}

  create(data: Partial<CaseCategory>) {
    return this.caseCategoryModel.create(data);
  }

  findAll() {
    return this.caseCategoryModel
      .find()
      .sort({ order: 1, createdAt: -1 })
      .exec();
  }

  findById(id: string) {
    return this.caseCategoryModel.findById(id).exec();
  }

  findBySlug(slug: string) {
    return this.caseCategoryModel.findOne({ slug }).exec();
  }

  update(id: string, data: UpdateQuery<CaseCategory>) {
    return this.caseCategoryModel
      .findByIdAndUpdate(id, data, {
        returnDocument: 'after',
        runValidators: true,
      })
      .exec();
  }

  remove(id: string) {
    return this.caseCategoryModel.findByIdAndDelete(id).exec();
  }
}
