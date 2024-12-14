import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { UserService } from '../user/user.service';
import { verifyPassword } from 'src/utils/password.util';
import { ConfigService } from '@nestjs/config';

const AUTH_ERROR_MESSAGES = {
  EMAIL_REQUIRED: 'Email is required',
  PASSWORD_REQUIRED: 'Password is required',
  INVALID_CREDENTIALS: 'Email or password is incorrect',
  INVALID_ACCESS_TOKEN: 'Invalid access token',
  INVALID_REFRESH_TOKEN: 'Invalid refresh token',
} as const;

interface TokenPayload {
  sub: string;
  profile_image: string;
  email: string;
  username: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private configService: ConfigService,
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async signIn(email: string, pass: string): Promise<{ access_token: string }> {
    if (!email) {
      throw new BadRequestException(AUTH_ERROR_MESSAGES.EMAIL_REQUIRED);
    }
    if (!pass) {
      throw new BadRequestException(AUTH_ERROR_MESSAGES.PASSWORD_REQUIRED);
    }

    const user = await this.userService.findByEmail(email);
    if (!user || !(await verifyPassword(pass, user.password))) {
      throw new BadRequestException({
        message: AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS,
        statusCode: 400,
      });
    }

    const refreshToken = await this.generateRefreshToken(user);

    return {
      access_token: refreshToken,
    };
  }

  async generateAccessToken(payload: TokenPayload) {
    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      const { exp, iat, ...newPayload } = payload as any;

      const token = this.jwtService.sign(newPayload, {
        secret,
        expiresIn: '15m',
      });

      return token;
    } catch (error) {
      console.error('Error generating access token:', error);
      throw new UnauthorizedException('Failed to generate access token');
    }
  }

  async generateRefreshToken(user: any) {
    const payload: TokenPayload = {
      sub: (user._id ?? user.sub).toString(),
      profile_image:
        user.profile_image?.[0]?.image_url ?? user.profile_image ?? '',
      email: user.email,
      username: user.username,
      role: user.role,
    };

    try {
      return this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '7d',
      });
    } catch (error) {
      throw new UnauthorizedException('Failed to generate refresh token');
    }
  }

  async validateAccessToken(token: string) {
    try {
      return await this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch (error) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.INVALID_ACCESS_TOKEN);
    }
  }

  async validateRefreshToken(token: string) {
    try {
      return await this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch (error) {
      throw new UnauthorizedException(
        AUTH_ERROR_MESSAGES.INVALID_REFRESH_TOKEN,
      );
    }
  }
}
