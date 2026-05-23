import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { BlacklistService } from '../blacklist.service';

@Injectable()
export class BlacklistMiddleware implements NestMiddleware {
  private readonly logger = new Logger(BlacklistMiddleware.name);

  constructor(private readonly blacklistService: BlacklistService) {}

  async use(request: Request, response: Response, next: NextFunction) {
    if (request.method === 'OPTIONS' || request.path === '/health') {
      return next();
    }

    const ip = this.getRequestIp(request);
    if (!ip) {
      return next();
    }

    try {
      const isBlocked = await this.blacklistService.isIpBlocked(ip);
      if (!isBlocked) {
        return next();
      }

      return response.status(403).json({
        statusCode: 403,
        message: 'Access denied',
        error: 'Forbidden',
      });
    } catch (error: unknown) {
      this.logger.error(
        `Failed to check IP blacklist: ${this.getErrorMessage(error)}`,
      );
      return next();
    }
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }

  private getRequestIp(request: Request) {
    const forwardedFor = request.headers['x-forwarded-for'];
    const cloudflareIp = request.headers['cf-connecting-ip'];

    const ip =
      this.firstHeaderValue(forwardedFor)?.split(',')[0]?.trim() ||
      this.firstHeaderValue(cloudflareIp) ||
      request.ip ||
      request.socket.remoteAddress ||
      null;

    return this.normalizeIp(ip);
  }

  private firstHeaderValue(value?: string | string[]) {
    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }

  private normalizeIp(ip?: string | null) {
    if (!ip) {
      return null;
    }

    return ip.startsWith('::ffff:') ? ip.replace('::ffff:', '') : ip;
  }
}
