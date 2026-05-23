import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AuthSessionDocument = HydratedDocument<AuthSession>;

@Schema({
  timestamps: true,
  collection: 'auth_sessions',
})
export class AuthSession {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    select: false,
  })
  tokenHash: string;

  @Prop({
    type: String,
    default: null,
  })
  userAgent: string | null;

  @Prop({
    type: String,
    default: null,
  })
  ipAddress: string | null;

  @Prop({
    type: Date,
    required: true,
  })
  expiresAt: Date;

  @Prop({
    type: Date,
    default: null,
  })
  revokedAt: Date | null;

  @Prop({
    type: Date,
    default: null,
  })
  lastUsedAt: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const AuthSessionSchema = SchemaFactory.createForClass(AuthSession);

AuthSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
AuthSessionSchema.index({ userId: 1, revokedAt: 1 });
