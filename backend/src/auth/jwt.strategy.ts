import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: 'your_jwt_secret_key',
    });
  }

  validate(payload: { sub: number; username: string; role: string }) {
    return { id: payload.sub, username: payload.username, role: payload.role };
  }
}
