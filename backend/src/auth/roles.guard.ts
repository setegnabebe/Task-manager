import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRole = this.reflector.get<string>(
      'role',
      context.getHandler(),
    );
    if (!requiredRole) return true;
    interface AuthRequest extends Request {
      user?: { role?: string };
    }

    const req = context.switchToHttp().getRequest<AuthRequest>();
    const { user } = req;
    return user?.role === requiredRole;
  }
}
