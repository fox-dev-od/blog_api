import {
  Body,
  Controller,
  Get,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import * as jwtPayloadInterface from './interfaces/jwt-payload.interface';
import {Public} from './decorators/public.decorator';
import {CreateUserDto} from "../users/dto/create-user.dto";
import {UsersService} from "../users/users.service";
import {Throttle} from "@nestjs/throttler";

@Controller('auth')
export class AuthController {
  constructor(
      private readonly authService: AuthService,
      private readonly userService: UsersService
  ) {
  }

  @Throttle({
    default: {
      ttl: 60_000,
      limit: 5,
    },
  })
  @Public()
  @Post('login')
  login(@Body() loginDto: LoginDto, @Req() req: Request) {
    return this.authService.login(loginDto, {
      userAgent: req.headers['user-agent'] ?? null,
      ipAddress: req.ip ?? null,
    });
  }

  @Post('register')
  @Public()
  register(@Body() registerDto: CreateUserDto) {
    return this.userService.create(registerDto);
  }

  @Get('me')
  me(@CurrentUser() currentUser: jwtPayloadInterface.CurrentUserData) {
    return this.authService.getMe(currentUser);
  }

  @Post('logout')
  logout(@CurrentUser() currentUser: jwtPayloadInterface.CurrentUserData) {
    return this.authService.logout(currentUser);
  }

  @Post('logout-all')
  logoutAll(@CurrentUser() currentUser: jwtPayloadInterface.CurrentUserData) {
    return this.authService.logoutAll(currentUser);
  }
}