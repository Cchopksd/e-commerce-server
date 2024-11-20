import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.access_token; // Extract the token from cookies
    if (!token) {
      throw new UnauthorizedException('Access token is missing');
    }

    try {
      const payload = this.jwtService.verify(token); // Corrected method call
      (req as any).user = payload; // Attach the payload to the request
      next();
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

