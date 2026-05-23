import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { BlacklistController } from './blacklist.controller';
import { BlacklistRepository } from './blacklist.repository';
import { BlacklistService } from './blacklist.service';
import { BlacklistMiddleware } from './middleware/blacklist.middleware';
import {
  BlacklistEntry,
  BlacklistEntrySchema,
} from './schemas/blacklist-entry.schema';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    RedisModule,
    MongooseModule.forFeature([
      {
        name: BlacklistEntry.name,
        schema: BlacklistEntrySchema,
      },
    ]),
  ],
  controllers: [BlacklistController],
  providers: [BlacklistService, BlacklistRepository, BlacklistMiddleware],
  exports: [BlacklistService, BlacklistRepository],
})
export class BlacklistModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BlacklistMiddleware).forRoutes('*');
  }
}
