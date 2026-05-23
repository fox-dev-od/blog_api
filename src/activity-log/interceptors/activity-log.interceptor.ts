import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { isValidObjectId, Types } from 'mongoose';

import {
  ACTIVITY_LOG_METADATA_KEY,
  ActivityLogMetadata,
} from '../decorators/activity.decorator';
import { ActivityLogService } from '../activity-log.service';
import { ActivityLog } from '../schemas/activity-log.schema';

type RequestWithUser = Request & {
  user?: {
    userId?: string;
    email?: string;
  };
};

@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ActivityLogInterceptor.name);
  private readonly sensitiveKeys = new Set([
    'password',
    'confirmpassword',
    'token',
    'accesstoken',
    'refreshtoken',
    'authorization',
    'secret',
    'apikey',
  ]);

  constructor(
    private readonly reflector: Reflector,
    private readonly activityLogService: ActivityLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const metadata = this.reflector.getAllAndOverride<ActivityLogMetadata>(
      ACTIVITY_LOG_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!metadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const response = context.switchToHttp().getResponse<Response>();
    const normalizedMetadata = this.normalizeMetadata(metadata);
    const baseLog = {
      action: normalizedMetadata.action,
      entity: normalizedMetadata.entity ?? null,
      userId: this.getUserId(request.user?.userId),
      userEmail: request.user?.email ?? null,
      method: request.method,
      url: request.originalUrl ?? request.url,
      ip: this.normalizeIp(request.ip) ?? null,
      userAgent: request.headers['user-agent'] ?? null,
      params: this.sanitizeRecord(request.params),
      query: this.sanitizeRecord(request.query),
      body: this.sanitizeRecord(request.body),
      metadata: this.sanitizeRecord(normalizedMetadata.metadata ?? {}),
    };

    return next.handle().pipe(
      tap(() => {
        this.writeLog({
          ...baseLog,
          statusCode: response.statusCode,
          success: true,
          errorMessage: null,
        });
      }),
      catchError((error: unknown) => {
        this.writeLog({
          ...baseLog,
          statusCode: this.getErrorStatusCode(error, response.statusCode),
          success: false,
          errorMessage: this.getErrorMessage(error),
        });

        return throwError(() => error);
      }),
    );
  }

  private normalizeMetadata(metadata: ActivityLogMetadata) {
    if (typeof metadata === 'string') {
      return {
        action: metadata,
        entity: null,
        metadata: {},
      };
    }

    return {
      action: metadata.action,
      entity: metadata.entity ?? null,
      metadata: metadata.metadata ?? {},
    };
  }

  private writeLog(data: Partial<ActivityLog>) {
    void this.activityLogService.create(data).catch((error: Error) => {
      this.logger.error(`Failed to write activity log: ${error.message}`);
    });
  }

  private sanitizeRecord(value: unknown): Record<string, any> {
    const sanitizedValue = this.sanitize(value);

    if (
      !sanitizedValue ||
      typeof sanitizedValue !== 'object' ||
      Array.isArray(sanitizedValue)
    ) {
      return {};
    }

    return sanitizedValue as Record<string, any>;
  }

  private sanitize(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item));
    }

    if (!value || typeof value !== 'object') {
      return value;
    }

    return Object.entries(value).reduce<Record<string, any>>(
      (result, [key, nestedValue]) => {
        if (this.sensitiveKeys.has(key.toLowerCase())) {
          result[key] = '[REDACTED]';
          return result;
        }

        result[key] = this.sanitize(nestedValue);
        return result;
      },
      {},
    );
  }

  private getUserId(userId?: string) {
    if (!userId || !isValidObjectId(userId)) {
      return null;
    }

    return new Types.ObjectId(userId);
  }

  private getErrorStatusCode(error: unknown, responseStatusCode?: number) {
    if (error instanceof HttpException) {
      return error.getStatus();
    }

    return responseStatusCode ?? 500;
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }

  private normalizeIp(ip?: string | null) {
    if (!ip) {
      return null;
    }

    return ip.startsWith('::ffff:') ? ip.replace('::ffff:', '') : ip;
  }
}
