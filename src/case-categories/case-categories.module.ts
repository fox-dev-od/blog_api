import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CaseCategoriesController } from './case-categories.controller';
import { CaseCategoriesRepository } from './case-categories.repository';
import { CaseCategoriesService } from './case-categories.service';
import {
  CaseCategory,
  CaseCategorySchema,
} from './schemas/case-category.schema';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    RedisModule,
    MongooseModule.forFeature([
      {
        name: CaseCategory.name,
        schema: CaseCategorySchema,
      },
    ]),
  ],
  controllers: [CaseCategoriesController],
  providers: [CaseCategoriesService, CaseCategoriesRepository],
  exports: [CaseCategoriesService, CaseCategoriesRepository],
})
export class CaseCategoriesModule {}
