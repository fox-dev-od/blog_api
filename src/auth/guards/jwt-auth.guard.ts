import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { TokenExpiredError } from 'jsonwebtoken';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthService } from '../auth.service';
import { CurrentUserData, JwtPayload } from '../interfaces/jwt-payload.interface';

type RequestWithUser = Request & {
    user?: CurrentUserData;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly authService: AuthService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        const request = context.switchToHttp().getRequest<RequestWithUser>();
        const response = context.switchToHttp().getResponse<Response>();

        const accessToken = this.extractAccessToken(request);
        if (!accessToken) {
            throw new UnauthorizedException('Access token is required');
        }

        try {
            const payload = await this.jwtService.verifyAsync<JwtPayload>(accessToken, {
                secret: this.getRequiredConfig('JWT_ACCESS_SECRET'),
            });

            if (payload.type !== 'access') {
                throw new UnauthorizedException('Invalid access token type');
            }

            request.user = this.toCurrentUser(payload);
            return true;
        } catch (error) {
            if (!(error instanceof TokenExpiredError)) {
                throw new UnauthorizedException('Invalid access token');
            }
        }

        const refreshToken = this.extractRefreshToken(request);
        if (!refreshToken) {
            throw new UnauthorizedException('Refresh token is required');
        }

        const refreshed = await this.authService.refreshByToken(refreshToken, {
            userAgent: request.headers['user-agent'] ?? null,
            ipAddress: request.ip ?? null,
        });

        response.setHeader('x-access-token', refreshed.accessToken);
        response.setHeader('x-refresh-token', refreshed.refreshToken);

        const payload = await this.jwtService.verifyAsync<JwtPayload>(
            refreshed.accessToken,
            {
                secret: this.getRequiredConfig('JWT_ACCESS_SECRET'),
            },
        );

        request.user = this.toCurrentUser(payload);

        return true;
    }

    private extractAccessToken(request: Request): string | null {
        const authHeader = request.headers.authorization;

        if (!authHeader) {
            return null;
        }

        const [type, token] = authHeader.split(' ');

        if (type !== 'Bearer' || !token) {
            return null;
        }

        return token;
    }

    private extractRefreshToken(request: Request): string | null {
        const headerValue = request.headers['x-refresh-token'];

        if (Array.isArray(headerValue)) {
            return headerValue[0] ?? null;
        }

        return headerValue ?? null;
    }

    private toCurrentUser(payload: JwtPayload): CurrentUserData {
        return {
            userId: payload.sub,
            email: payload.email,
            role: payload.role,
            sessionId: payload.sessionId,
        };
    }

    private getRequiredConfig(key: string): string {
        const value = this.configService.get<string>(key);

        if (!value) {
            throw new Error(`${key} is not defined`);
        }

        return value;
    }
}