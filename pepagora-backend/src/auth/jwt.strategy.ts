import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET, // ✅ Uses env secret
    });
  }

  async validate(payload: any) {
    // ✅ Payload contains what you added during sign-in: { sub: user._id, role: user.role }
    return {
      userId: payload.sub,
      role: payload.role,
    };
  }
}
