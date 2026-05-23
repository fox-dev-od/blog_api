import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';

import { ActivityLogController } from './activity-log.controller';
import { ActivityLogRepository } from './activity-log.repository';
import { ActivityLogService } from './activity-log.service';
import { ActivityLogInterceptor } from './interceptors/activity-log.interceptor';
import { ActivityLog, ActivityLogSchema } from './schemas/activity-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: ActivityLog.name,
        schema: ActivityLogSchema,
      },
    ]),
  ],
  controllers: [ActivityLogController],
  providers: [
    ActivityLogService,
    ActivityLogRepository,
    {
      provide: APP_INTERCEPTOR,
      useClass: ActivityLogInterceptor,
    },
  ],
  exports: [ActivityLogService, ActivityLogRepository],
})
export class ActivityLogModule {}
