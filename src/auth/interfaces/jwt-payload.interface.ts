import { UserRole } from '../../users/enums/user-role.enum';

export interface JwtPayload {
    sub: string;
    email: string;
    role: UserRole;
    sessionId: string;
    type: 'access' | 'refresh';
}

export interface CurrentUserData {
    userId: string;
    email: string;
    role: UserRole;
    sessionId: string;
}