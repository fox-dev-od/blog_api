import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, UpdateQuery } from 'mongoose';

import { Case, CaseDocument } from './schemas/case.schema';

@Injectable()
export class CasesRepository {
  constructor(
    @InjectModel(Case.name)
    private readonly caseModel: Model<CaseDocument>,
  ) {}

  create(data: Partial<Case>) {
    return this.caseModel.create(data);
  }

  findAll() {
    return this.caseModel
      .find()
      .populate('categoryId')
      .sort({ order: 1, createdAt: -1 })
      .exec();
  }

  findById(id: string) {
    return this.caseModel.findById(id).populate('categoryId').exec();
  }

  findBySlug(slug: string) {
    return this.caseModel.findOne({ slug }).populate('categoryId').exec();
  }

  findPublicBySlug(slug: string) {
    return this.caseModel
      .findOne({
        slug,
        isActive: true,
      })
      .populate('categoryId')
      .exec();
  }

  update(id: string, data: UpdateQuery<Case>) {
    return this.caseModel
      .findByIdAndUpdate(id, data, {
        returnDocument: 'after',
        runValidators: true,
      })
      .populate('categoryId')
      .exec();
  }

  remove(id: string) {
    return this.caseModel.findByIdAndDelete(id).exec();
  }
}
