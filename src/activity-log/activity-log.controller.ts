import { Controller, Delete, Get, Param, Query } from '@nestjs/common';

import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { ActivityLogService } from './activity-log.service';
import { GetActivityLogsQueryDto } from './dto/get-activity-logs-query.dto';

@Roles(UserRole.ADMIN)
@Controller('activity-logs')
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  findAll(@Query() query: GetActivityLogsQueryDto) {
    return this.activityLogService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.activityLogService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.activityLogService.remove(id);
  }
}
