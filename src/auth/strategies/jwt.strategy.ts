import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { CurrentUserData, JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly configService: ConfigService) {
        const secret = configService.get<string>('JWT_ACCESS_SECRET');

        if (!secret) {
            throw new Error('JWT_ACCESS_SECRET is not defined');
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret,
        });
    }

    validate(payload: JwtPayload): CurrentUserData {
        if (payload.type !== 'access') {
            throw new UnauthorizedException('Invalid access token');
        }

        return {
            userId: payload.sub,
            email: payload.email,
            role: payload.role,
            sessionId: payload.sessionId,
        };
    }
}