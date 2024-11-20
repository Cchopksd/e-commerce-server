import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { UserService } from '../user/user.service';
import { verifyPassword } from 'src/utils/password.util';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private configService: ConfigService,
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async signIn(
    email: string,
    pass: string,
  ): Promise<{ access_token: string; refresh_token: string }> {
    if (!email) {
      throw new BadRequestException('Email is required');
    }
    if (!pass) {
      throw new BadRequestException('Password is required');
    }

    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new BadRequestException({
        message: 'email or password is not match',
        statusCode: 400,
      });
    }
    const match = await verifyPassword(pass, user?.password);
    if (!match) {
      throw new BadRequestException({
        message: 'email or password is not match',
        statusCode: 400,
      });
    }
    const payload = {
      sub: user._id.toString(),
      profile_image: user.profile_image,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const accessToken = await this.generateAccessToken(payload);
    const refreshToken = await this.generateRefreshToken(payload);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async generateAccessToken(payload: any) {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: '15m',
    });
  }

  async generateRefreshToken(payload: any) {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });
  }

  async validateAccessToken(token: string) {
    return this.jwtService.verify(token, {
      secret: this.configService.get<string>('JWT_SECRET'),
    });
  }

  async validateRefreshToken(token: string) {
    return this.jwtService.verify(token, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
    });
  }
}
