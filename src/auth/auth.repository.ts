import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, UpdateQuery } from 'mongoose';
import { AuthSession, AuthSessionDocument } from './schemas/auth-session.schema';

@Injectable()
export class AuthRepository {
    constructor(
        @InjectModel(AuthSession.name)
        private readonly authSessionModel: Model<AuthSessionDocument>,
    ) {}

    createSession(data: {
        userId: Types.ObjectId;
        tokenHash: string;
        expiresAt: Date;
        userAgent?: string | null;
        ipAddress?: string | null;
        lastUsedAt?: Date | null;
    }) {
        return this.authSessionModel.create(data);
    }

    findSessionById(id: string) {
        return this.authSessionModel.findById(id).select('+tokenHash').exec();
    }

    updateSession(id: string, data: UpdateQuery<AuthSession>) {
        return this.authSessionModel
            .findByIdAndUpdate(id, data, {
                returnDocument: 'after',
                runValidators: true,
            })
            .select('+tokenHash')
            .exec();
    }

    revokeSession(id: string) {
        return this.authSessionModel.findByIdAndUpdate(
            id,
            {
                revokedAt: new Date(),
            },
            {  returnDocument: 'after' },
        );
    }

    revokeAllUserSessions(userId: string) {
        return this.authSessionModel.updateMany(
            {
                userId: new Types.ObjectId(userId),
                revokedAt: null,
            },
            {
                revokedAt: new Date(),
            },
        );
    }
}