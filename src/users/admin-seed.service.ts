import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

import { UserRole } from './enums/user-role.enum';
import { UsersRepository } from './users.repository';

@Injectable()
export class AdminSeedService implements OnModuleInit {
  private readonly logger = new Logger(AdminSeedService.name);
  private readonly adminEmail = 'sudo_dev@gmail.com';

  constructor(private readonly usersRepository: UsersRepository) {}

  async onModuleInit() {
    const existingAdmin = await this.usersRepository.findByEmail(
      this.adminEmail,
    );
    if (existingAdmin) {
      this.logger.log('Admin seed skipped: sudo_dev@gmail.com already exists');
      return;
    }

    const password = randomBytes(18).toString('base64url');
    const passwordHash = await bcrypt.hash(password, 10);

    await this.usersRepository.create({
      email: this.adminEmail,
      name: 'Sudo Dev',
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
    });

    this.logger.warn('Admin user created');
    this.logger.warn(`Admin email: ${this.adminEmail}`);
    this.logger.warn(`Admin password: ${password}`);
  }
}
