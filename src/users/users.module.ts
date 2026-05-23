import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';
import { User, UserSchema } from './schemas/user.schema';
import { AdminSeedService } from './admin-seed.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, AdminSeedService],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
