import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  UnauthorizedException,
  Res,
  Req,
} from '@nestjs/common';
import { Response } from 'express';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { Public } from './decorator/auth.decorator';

interface TokenPayload {
  sub: string;
  profile_image: string;
  email: string;
  username: string;
  role: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async signIn(
    @Body() signInDto: Record<string, any>,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token } = await this.authService.signIn(
      signInDto.email,
      signInDto.password,
    );

    res.cookie('access_token', access_token, {
      httpOnly: false,
      sameSite: 'lax',
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });

    return {
      message: 'Login successfully',
      statusCode: HttpStatus.OK,
      access_token: access_token,
    };
  }

  @UseGuards(AuthGuard)
  @Post('refresh-token')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const user = req.user;
      if (!user) {
        throw new UnauthorizedException('User not authenticated');
      }

      const newAccessToken =
        await this.authService.generateRefreshTokenInfo(user);

      res.cookie('access_token', newAccessToken, {
        httpOnly: false,
        sameSite: 'lax',
        secure: false,
        maxAge: 24 * 60 * 60 * 1000,
        path: '/',
      });

      return {
        message: 'Refresh token successfully',
        statusCode: HttpStatus.OK,
        access_token: newAccessToken,
      };
    } catch (error) {
      throw new UnauthorizedException(error.response);
    }
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  getProfile(@Req() req: Request) {
    return req.user;
  }
}
