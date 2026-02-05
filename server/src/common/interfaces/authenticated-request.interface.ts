import { Request } from 'express';

export interface JwtPayload {
    sub: string;
    id: string;
    staff_id?: string;
    email: string;
    roles: Array<{ code: string }>;
}

export type AuthenticatedRequest = Request & { user: JwtPayload };
