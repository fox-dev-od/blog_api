import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './users.repository';
import {UserRole} from "./enums/user-role.enum";

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(createUserDto: CreateUserDto) {
    const email = createUserDto.email.toLowerCase().trim();

    const existingUser = await this.usersRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.usersRepository.create({
      email,
      name: createUserDto.name.trim(),
      passwordHash,
      role: UserRole.USER,
      isActive: true,
    });

    return this.toResponse(user);
  }

  async findAll() {
    const users = await this.usersRepository.findAll();
    return users.map((user) => this.toResponse(user));
  }

  async findOne(id: string) {
    this.validateId(id);

    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toResponse(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    this.validateId(id);

    const existingUser = await this.usersRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const updateData: Record<string, unknown> = {};

    if (updateUserDto.email) {
      const normalizedEmail = updateUserDto.email.toLowerCase().trim();

      const userWithSameEmail = await this.usersRepository.findByEmail(normalizedEmail);
      if (userWithSameEmail && String(userWithSameEmail._id) !== id) {
        throw new ConflictException('User with this email already exists');
      }

      updateData.email = normalizedEmail;
    }

    if (updateUserDto.name !== undefined) {
      updateData.name = updateUserDto.name.trim();
    }

    if (updateUserDto.password) {
      updateData.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (updateUserDto.role !== undefined) {
      updateData.role = updateUserDto.role;
    }

    if (updateUserDto.isActive !== undefined) {
      updateData.isActive = updateUserDto.isActive;
    }

    const updatedUser = await this.usersRepository.update(id, updateData);
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return this.toResponse(updatedUser);
  }

  async remove(id: string) {
    this.validateId(id);

    const deletedUser = await this.usersRepository.remove(id);
    if (!deletedUser) {
      throw new NotFoundException('User not found');
    }

    return {
      deleted: true,
      id,
    };
  }

  private validateId(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid user id');
    }
  }

  private toResponse(user: any) {
    const raw = typeof user?.toObject === 'function' ? user.toObject() : user;
    const { passwordHash, __v, ...result } = raw;
    return result;
  }
}