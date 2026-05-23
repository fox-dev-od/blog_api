import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import * as jwtPayloadInterface from './interfaces/jwt-payload.interface';
import { Public } from './decorators/public.decorator';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UsersService } from '../users/users.service';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UsersService,
  ) {}

  @Throttle({
    default: {
      ttl: 60_000,
      limit: 5,
    },
  })
  @Public()
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto, {
      userAgent: req.headers['user-agent'] ?? null,
      ipAddress: req.ip ?? null,
    });

    this.authService.setAuthCookies(res, result.tokens);

    return result.user;
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
  async logout(
    @CurrentUser() currentUser: jwtPayloadInterface.CurrentUserData,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.logout(currentUser);
    this.authService.clearAuthCookies(res);

    return result;
  }

  @Post('logout-all')
  async logoutAll(
    @CurrentUser() currentUser: jwtPayloadInterface.CurrentUserData,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.logoutAll(currentUser);
    this.authService.clearAuthCookies(res);

    return result;
  }
}
