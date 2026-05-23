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
import {
  CurrentUserData,
  JwtPayload,
} from '../interfaces/jwt-payload.interface';

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
      return this.refreshAccessToken(request, response);
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        accessToken,
        {
          secret: this.getRequiredConfig('JWT_ACCESS_SECRET'),
        },
      );

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

    return this.refreshAccessToken(request, response);
  }

  private async refreshAccessToken(
    request: RequestWithUser,
    response: Response,
  ) {
    const refreshToken = this.readCookie(request, 'refreshToken');
    if (!refreshToken) {
      this.authService.clearAuthCookies(response);
      throw new UnauthorizedException('Refresh token is required');
    }

    let refreshed: Awaited<ReturnType<AuthService['refreshByToken']>>;
    try {
      refreshed = await this.authService.refreshByToken(refreshToken, {
        userAgent: request.headers['user-agent'] ?? null,
        ipAddress: request.ip ?? null,
      });
    } catch (error) {
      this.authService.clearAuthCookies(response);
      throw error;
    }

    this.authService.setAccessCookie(response, refreshed.accessToken);
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
    return this.readCookie(request, 'accessToken');
  }

  private readCookie(request: Request, name: string): string | null {
    const cookieHeader = request.headers.cookie;

    if (!cookieHeader) {
      return null;
    }

    const cookie = cookieHeader
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`));

    if (!cookie) {
      return null;
    }

    return decodeURIComponent(cookie.slice(name.length + 1));
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
