import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersRepository {
    constructor(
        @InjectModel(User.name)
        private readonly userModel: Model<UserDocument>,
    ) {}

    create(data: Partial<User>) {
        return this.userModel.create(data);
    }

    findAll() {
        return this.userModel.find().sort({ createdAt: -1 }).exec();
    }

    findById(id: string) {
        return this.userModel.findById(id).exec();
    }

    findByEmail(email: string) {
        return this.userModel.findOne({ email }).exec();
    }

    findByEmailWithPassword(email: string) {
        return this.userModel.findOne({ email }).select('+passwordHash').exec();
    }

    update(id: string, data: Partial<User>) {
        return this.userModel
            .findByIdAndUpdate(id, data, {
                returnDocument: 'after',
                runValidators: true,
            })
            .exec();
    }

    remove(id: string) {
        return this.userModel.findByIdAndDelete(id).exec();
    }
}