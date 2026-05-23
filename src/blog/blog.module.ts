import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { BlogRepository } from './blog.repository';
import { BlogPost, BlogPostSchema } from './schemas/blog-post.schema';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    RedisModule,
    MongooseModule.forFeature([
      {
        name: BlogPost.name,
        schema: BlogPostSchema,
      },
    ]),
  ],
  controllers: [BlogController],
  providers: [BlogService, BlogRepository],
  exports: [BlogService, BlogRepository],
})
export class BlogModule {}
