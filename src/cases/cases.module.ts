import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CaseCategoriesModule } from '../case-categories/case-categories.module';
import { CasesController } from './cases.controller';
import { CasesRepository } from './cases.repository';
import { CasesService } from './cases.service';
import { Case, CaseSchema } from './schemas/case.schema';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    CaseCategoriesModule,
    RedisModule,
    MongooseModule.forFeature([
      {
        name: Case.name,
        schema: CaseSchema,
      },
    ]),
  ],
  controllers: [CasesController],
  providers: [CasesService, CasesRepository],
  exports: [CasesService, CasesRepository],
})
export class CasesModule {}
