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
import { CasesService } from './cases.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateCaseDto } from './dto/update-case.dto';
import { ActivityLog } from '../activity-log/decorators/activity.decorator';

@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Roles(UserRole.ADMIN)
  @Get()
  findAll() {
    return this.casesService.findAll();
  }

  @Public()
  @Get('public')
  findPublicList() {
    return this.casesService.findPublicList();
  }

  @Public()
  @Get('public/by-category/:categorySlug')
  findPublicByCategorySlug(@Param('categorySlug') categorySlug: string) {
    return this.casesService.findPublicByCategorySlug(categorySlug);
  }

  @Roles(UserRole.ADMIN)
  @ActivityLog({ action: 'CREATE_CASE', entity: 'case' })
  @Post()
  create(@Body() createCaseDto: CreateCaseDto) {
    return this.casesService.create(createCaseDto);
  }

  @Roles(UserRole.ADMIN)
  @Get('by-slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.casesService.findBySlug(slug);
  }

  @Public()
  @Get('public/by-slug/:slug')
  findPublicBySlug(@Param('slug') slug: string) {
    return this.casesService.findPublicBySlug(slug);
  }

  @Roles(UserRole.ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.casesService.findOne(id);
  }

  @Roles(UserRole.ADMIN)
  @ActivityLog({ action: 'UPDATE_CASE', entity: 'case' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCaseDto: UpdateCaseDto) {
    return this.casesService.update(id, updateCaseDto);
  }

  @Roles(UserRole.ADMIN)
  @ActivityLog({ action: 'DELETE_CASE', entity: 'case' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.casesService.remove(id);
  }
}
