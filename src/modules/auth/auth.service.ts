import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';

import { UserService } from '../user/user.service';
import { verifyPassword } from '@/utils/password.util';
import { Role } from './enums/role.enum';

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
  private readonly clientID: string;
  private readonly clientSecret: string;
  private readonly redirectUrl: string;
  constructor(
    private configService: ConfigService,
    private userService: UserService,
    private jwtService: JwtService,
  ) {
    this.clientID = this.configService.get<string>('GOOGLE_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    this.redirectUrl = this.configService.get<string>('GOOGLE_REDIRECT_URI');
  }

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

    const payload: TokenPayload = {
      sub: user._id.toString(),
      profile_image: user.profile_image,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const refreshToken = await this.generateRefreshToken(payload);

    return {
      access_token: refreshToken,
    };
  }

  async signWithGoogle(): Promise<{ url: string }> {
    try {
      // Ensure required OAuth configuration is present
      if (!this.clientID) {
        throw new Error('Missing Google Client ID');
      }
      if (!this.redirectUrl) {
        throw new Error('Missing Google Redirect URL');
      }

      const scopes = ['openid', 'profile', 'email'];
      const encodedRedirect = encodeURIComponent(this.redirectUrl);
      const encodedScopes = encodeURIComponent(scopes.join(' '));

      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${this.clientID}&redirect_uri=${this.redirectUrl}&scope=openid%20profile%20email&access_type=offline`;
      if (process.env.NODE_ENV === 'development') {
        console.info(googleAuthUrl);
      }
      // Return the generated URL
      return { url: googleAuthUrl };
    } catch (error) {
      // Log and handle errors gracefully
      console.error(
        'Error generating Google Auth URL:',
        error.message || error,
      );
      throw new UnauthorizedException('Failed to initialize Google sign-in');
    }
  }

  async GoogleCallback(code: string): Promise<{ access_token: string }> {
    try {
      const tokenResponse = await axios.post(
        'https://oauth2.googleapis.com/token',
        {
          code,
          client_id: this.clientID,
          client_secret: this.clientSecret,
          redirect_uri: this.redirectUrl,
          grant_type: 'authorization_code',
        },
      );
      const { id_token } = tokenResponse.data;

      const userInfo: any = jwt.decode(id_token);

      const userIsExist = await this.userService.findByEmail(userInfo.email);

      if (!userIsExist) {
        await this.userService.createWithGoogle({
          email: userInfo.email,
          username: userInfo.name,
          password: 'google',
          phone: '0000000000',
          profile_image: [{ image_url: userInfo.picture, public_id: '' }],
          first_name: userInfo.given_name || '',
          last_name: userInfo.family_name || '',
          age: 0,
        });
      }

      const user = await this.userService.findByEmail(userInfo.email);

      const payload: TokenPayload = {
        sub: user._id.toString(),
        profile_image: user.profile_image,
        email: user.email,
        username: user.username,
        role: user.role,
      };

      const refreshToken = await this.generateRefreshToken(payload);

      return {
        access_token: refreshToken,
      };
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw new UnauthorizedException('Failed to sign in with Google');
    }
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

  async generateRefreshToken(payload: any) {
    try {
      return this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '7d',
      });
    } catch (error) {
      throw new UnauthorizedException('Failed to generate refresh token');
    }
  }

  async generateRefreshTokenInfo(previous: any) {
    const user = await this.userService.findOne(previous.sub.toString());
    const payload: TokenPayload = {
      sub: user._id.toString(),
      profile_image: user.profile_image,
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
