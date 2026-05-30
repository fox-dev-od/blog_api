import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { CaseCategoriesService } from './case-categories.service';
import { CreateCaseCategoryDto } from './dto/create-case-category.dto';
import { UpdateCaseCategoryDto } from './dto/update-case-category.dto';
import { ActivityLog } from '../activity-log/decorators/activity.decorator';

@Controller('case-categories')
export class CaseCategoriesController {
  constructor(private readonly caseCategoriesService: CaseCategoriesService) {}

  @Roles(UserRole.ADMIN)
  @Get()
  findAll() {
    return this.caseCategoriesService.findAll();
  }

  @Public()
  @Get('public')
  findAllActive() {
    return this.caseCategoriesService.findAllActive();
  }

  @Public()
  @Get('public/by-slug/:slug')
  findActiveBySlug(@Param('slug') slug: string) {
    return this.caseCategoriesService.findActiveBySlug(slug);
  }

  @Roles(UserRole.ADMIN)
  @ActivityLog({ action: 'CREATE_CASE_CATEGORY', entity: 'case-category' })
  @Post()
  create(@Body() createCaseCategoryDto: CreateCaseCategoryDto) {
    return this.caseCategoriesService.create(createCaseCategoryDto);
  }

  @Roles(UserRole.ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.caseCategoriesService.findOne(id);
  }

  @Roles(UserRole.ADMIN)
  @ActivityLog({ action: 'UPDATE_CASE_CATEGORY', entity: 'case-category' })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCaseCategoryDto: UpdateCaseCategoryDto,
  ) {
    return this.caseCategoriesService.update(id, updateCaseCategoryDto);
  }

  @Roles(UserRole.ADMIN)
  @ActivityLog({ action: 'DELETE_CASE_CATEGORY', entity: 'case-category' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.caseCategoriesService.remove(id);
  }
}
