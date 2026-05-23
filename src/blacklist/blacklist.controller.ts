import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUserData } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../users/enums/user-role.enum';
import { BlacklistService } from './blacklist.service';
import { CreateBlacklistEntryDto } from './dto/create-blacklist-entry.dto';
import { GetBlacklistQueryDto } from './dto/get-blacklist-query.dto';
import { UpdateBlacklistEntryDto } from './dto/update-blacklist-entry.dto';

type RequestWithUser = Request & {
  user?: CurrentUserData;
};

@Roles(UserRole.ADMIN)
@Controller('blacklist')
export class BlacklistController {
  constructor(private readonly blacklistService: BlacklistService) {}

  @Get()
  findAll(@Query() query: GetBlacklistQueryDto) {
    return this.blacklistService.findAll(query);
  }

  @Post()
  create(
    @Body() dto: CreateBlacklistEntryDto,
    @Req() request: RequestWithUser,
  ) {
    return this.blacklistService.create(dto, request.user?.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.blacklistService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBlacklistEntryDto) {
    return this.blacklistService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.blacklistService.remove(id);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.blacklistService.activate(id);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.blacklistService.deactivate(id);
  }
}
