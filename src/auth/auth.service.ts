import {
    Injectable,
    UnauthorizedException,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { Types } from 'mongoose';
import type { SignOptions } from 'jsonwebtoken';

import { UsersRepository } from '../users/users.repository';
import { AuthRepository } from './auth.repository';
import { LoginDto } from './dto/login.dto';
import { CurrentUserData, JwtPayload } from './interfaces/jwt-payload.interface';

type RequestMeta = {
    userAgent?: string | null;
    ipAddress?: string | null;
};

@Injectable()
export class AuthService {
    constructor(
        private readonly usersRepository: UsersRepository,
        private readonly authRepository: AuthRepository,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {}

    async login(loginDto: LoginDto, meta: RequestMeta) {
        const email = loginDto.email.toLowerCase().trim();

        const user = await this.usersRepository.findByEmailWithPassword(email);
        if (!user) {
            throw new UnauthorizedException('Invalid email or password');
        }

        if (!user.isActive) {
            throw new UnauthorizedException('User is inactive');
        }

        const isPasswordValid = await bcrypt.compare(
            loginDto.password,
            user.passwordHash,
        );

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid email or password');
        }

        const tokens = await this.issueTokenPair(
            String(user._id),
            user.email,
            user.role,
            meta,
        );

        return {
            user: this.toUserResponse(user),
            ...tokens,
        };
    }

    async refreshByToken(refreshToken: string, meta: RequestMeta) {
        const normalizedRefreshToken = refreshToken.trim();

        if (!normalizedRefreshToken) {
            throw new UnauthorizedException('Refresh token is required');
        }

        const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
        if (!refreshSecret) {
            throw new Error('JWT_REFRESH_SECRET is not defined');
        }

        let payload: JwtPayload;

        try {
            payload = await this.jwtService.verifyAsync<JwtPayload>(
                normalizedRefreshToken,
                {
                    secret: refreshSecret,
                },
            );
        } catch {
            throw new UnauthorizedException('Invalid refresh token');
        }

        if (payload.type !== 'refresh') {
            throw new UnauthorizedException('Invalid refresh token type');
        }

        const session = await this.authRepository.findSessionById(payload.sessionId);
        if (!session) {
            throw new UnauthorizedException('Session not found');
        }

        if (session.revokedAt) {
            throw new UnauthorizedException('Session already revoked');
        }

        if (session.expiresAt.getTime() < Date.now()) {
            throw new UnauthorizedException('Refresh token expired');
        }

        const incomingHash = this.hashToken(normalizedRefreshToken);
        if (session.tokenHash !== incomingHash) {
            throw new UnauthorizedException('Refresh token mismatch');
        }

        const user = await this.usersRepository.findById(payload.sub);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (!user.isActive) {
            throw new UnauthorizedException('User is inactive');
        }

        await this.authRepository.revokeSession(payload.sessionId);

        const tokens = await this.issueTokenPair(
            String(user._id),
            user.email,
            user.role,
            meta,
        );

        return {
            user: this.toUserResponse(user),
            ...tokens,
        };
    }

    async getMe(currentUser: CurrentUserData) {
        const user = await this.usersRepository.findById(currentUser.userId);

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return this.toUserResponse(user);
    }

    async logout(currentUser: CurrentUserData) {
        await this.authRepository.revokeSession(currentUser.sessionId);

        return {
            success: true,
        };
    }

    async logoutAll(currentUser: CurrentUserData) {
        await this.authRepository.revokeAllUserSessions(currentUser.userId);

        return {
            success: true,
        };
    }

    private async issueTokenPair(
        userId: string,
        email: string,
        role: any,
        meta: RequestMeta,
    ) {
        const refreshExpiresAt = this.getRefreshExpiresAt();

        const session = await this.authRepository.createSession({
            userId: new Types.ObjectId(userId),
            tokenHash: 'pending',
            expiresAt: refreshExpiresAt,
            userAgent: meta.userAgent ?? null,
            ipAddress: meta.ipAddress ?? null,
            lastUsedAt: new Date(),
        });

        const sessionId = String(session._id);

        const accessPayload: JwtPayload = {
            sub: userId,
            email,
            role,
            sessionId,
            type: 'access',
        };

        const refreshPayload: JwtPayload = {
            sub: userId,
            email,
            role,
            sessionId,
            type: 'refresh',
        };

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(accessPayload, {
                secret: this.getRequiredConfig('JWT_ACCESS_SECRET'),
                expiresIn: this.getJwtExpiresIn('JWT_ACCESS_EXPIRES_IN'),
            }),
            this.jwtService.signAsync(refreshPayload, {
                secret: this.getRequiredConfig('JWT_REFRESH_SECRET'),
                expiresIn: this.getJwtExpiresIn('JWT_REFRESH_EXPIRES_IN'),
            }),
        ]);

        await this.authRepository.updateSession(sessionId, {
            tokenHash: this.hashToken(refreshToken),
            lastUsedAt: new Date(),
            userAgent: meta.userAgent ?? null,
            ipAddress: meta.ipAddress ?? null,
        });

        return {
            accessToken,
            refreshToken,
        };
    }

    private getJwtExpiresIn(key: string): SignOptions['expiresIn'] {
        const value = this.getRequiredConfig(key);

        if (/^\d+$/.test(value)) {
            return Number(value);
        }

        return value as SignOptions['expiresIn'];
    }

    private hashToken(token: string) {
        return createHash('sha256').update(token).digest('hex');
    }

    private getRefreshExpiresAt() {
        const raw = this.getRequiredConfig('JWT_REFRESH_EXPIRES_IN');

        if (raw.endsWith('d')) {
            const days = Number(raw.replace('d', ''));
            return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        }

        if (raw.endsWith('h')) {
            const hours = Number(raw.replace('h', ''));
            return new Date(Date.now() + hours * 60 * 60 * 1000);
        }

        if (raw.endsWith('m')) {
            const minutes = Number(raw.replace('m', ''));
            return new Date(Date.now() + minutes * 60 * 1000);
        }

        const seconds = Number(raw);
        return new Date(Date.now() + seconds * 1000);
    }

    private getRequiredConfig(key: string) {
        const value = this.configService.get<string>(key);

        if (!value) {
            throw new Error(`${key} is not defined`);
        }

        return value;
    }

    private toUserResponse(user: any) {
        const raw = typeof user?.toObject === 'function' ? user.toObject() : user;
        const { passwordHash, __v, ...result } = raw;
        return result;
    }
}