import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUserData } from '../interfaces/jwt-payload.interface';

export const CurrentUser = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): CurrentUserData => {
        const request = ctx.switchToHttp().getRequest();
        return request.user;
    },
);