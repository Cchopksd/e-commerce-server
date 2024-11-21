import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Request,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { Public } from './decorator/auth.decorator';
import { Response } from 'express';

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
    const { access_token, refresh_token } = await this.authService.signIn(
      signInDto.email,
      signInDto.password,
    );

    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      message: 'Login successfully',
      statusCode: HttpStatus.OK,
      access_token,
    };
  }

  @Public()
  @Post('refresh-token')
  async refresh(@Req() req: Request & { cookies: { [key: string]: string } }) {
    const refresh_token = req.cookies?.refresh_token;

    if (!refresh_token) {
      throw new UnauthorizedException('Refresh token not found in cookies');
    }

    try {
      const payload =
        await this.authService.validateRefreshToken(refresh_token);
      const newAccessToken =
        await this.authService.generateAccessToken(payload);

      return {
        message: 'Refresh token successfully',
        statusCode: HttpStatus.OK,
        access_token: newAccessToken,
      };
    } catch (error) {
      throw new UnauthorizedException(
        error?.message || 'Invalid or expired refresh token',
      );
    }
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}
