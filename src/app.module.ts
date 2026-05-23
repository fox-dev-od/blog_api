import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { BlogModule } from './blog/blog.module';
import { CaseCategoriesModule } from './case-categories/case-categories.module';
import { CasesModule } from './cases/cases.module';
import { ActivityLogModule } from './activity-log/activity-log.module';
import { BlacklistModule } from './blacklist/blacklist.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uri = configService.get<string>('MONGO_URI');

        if (!uri) {
          throw new Error('MONGO_URI is not defined');
        }

        return { uri };
      },
    }),

    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: Number(configService.get('THROTTLE_TTL') ?? 60_000),
            limit: Number(configService.get('THROTTLE_LIMIT') ?? 20),
          },
        ],
      }),
    }),

    UsersModule,
    AuthModule,
    BlogModule,
    CaseCategoriesModule,
    CasesModule,
    ActivityLogModule,
    BlacklistModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
