import { SetMetadata } from '@nestjs/common';

export const ACTIVITY_LOG_METADATA_KEY = 'activity_log_metadata';

export type ActivityLogMetadata =
  | string
  | {
      action: string;
      entity?: string;
      metadata?: Record<string, any>;
    };

export const ActivityLog = (metadata: ActivityLogMetadata) =>
  SetMetadata(ACTIVITY_LOG_METADATA_KEY, metadata);
