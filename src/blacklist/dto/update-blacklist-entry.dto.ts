import { PartialType } from '@nestjs/mapped-types';

import { CreateBlacklistEntryDto } from './create-blacklist-entry.dto';

export class UpdateBlacklistEntryDto extends PartialType(
  CreateBlacklistEntryDto,
) {}
