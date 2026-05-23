import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { CaseCategoriesService } from './case-categories.service';
import { CreateCaseCategoryDto } from './dto/create-case-category.dto';
import { UpdateCaseCategoryDto } from './dto/update-case-category.dto';

@Controller('case-categories')
export class CaseCategoriesController {
  constructor(private readonly caseCategoriesService: CaseCategoriesService) {}

  @Roles(UserRole.ADMIN)
  @Get()
  findAll() {
    return this.caseCategoriesService.findAll();
  }

  @Roles(UserRole.ADMIN)
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
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCaseCategoryDto: UpdateCaseCategoryDto,
  ) {
    return this.caseCategoriesService.update(id, updateCaseCategoryDto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.caseCategoriesService.remove(id);
  }
}
