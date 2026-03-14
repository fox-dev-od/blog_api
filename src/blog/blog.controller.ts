import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { BlogService } from './blog.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { GetBlogPostsQueryDto } from './dto/get-blog-posts-query.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import * as jwtPayloadInterface from '../auth/interfaces/jwt-payload.interface';
import {UserRole} from '../users/enums/user-role.enum';

@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {
  }

  @Public()
  @Get()
  findAllPublished(@Query() query: GetBlogPostsQueryDto) {
    return this.blogService.findAllPublished(query);
  }

  @Public()
  @Get(':slug')
  findOnePublished(@Param('slug') slug: string) {
    return this.blogService.findOnePublished(slug);
  }

  @Roles(UserRole.ADMIN, UserRole.AUTHOR)
  @Post()
  create(
      @Body() createBlogPostDto: CreateBlogPostDto,
      @CurrentUser() currentUser: jwtPayloadInterface.CurrentUserData,
  ) {
    return this.blogService.create(createBlogPostDto, currentUser);
  }

  @Roles(UserRole.ADMIN, UserRole.AUTHOR)
  @Patch(':id')
  update(
      @Param('id') id: string,
      @Body() updateBlogPostDto: UpdateBlogPostDto,
      @CurrentUser() currentUser: jwtPayloadInterface.CurrentUserData,
  ) {
    return this.blogService.update(id, updateBlogPostDto, currentUser);
  }

  @Roles(UserRole.ADMIN, UserRole.AUTHOR)
  @Delete(':id')
  remove(
      @Param('id') id: string,
      @CurrentUser() currentUser: jwtPayloadInterface.CurrentUserData,
  ) {
    return this.blogService.remove(id, currentUser);
  }
}