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
/* The line `import { Response } from 'express';` is importing the `Response` type from the 'express'
module in the TypeScript file. This allows the TypeScript code to use the `Response` type defined in
the 'express' module for handling HTTP responses in the NestJS application. */
// import { Response } from 'express';

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

    res.cookie('refresh_token', access_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });

    return {
      message: 'Login successfully',
      statusCode: HttpStatus.OK,
    };
  }

  @Public()
  @Post('refresh-token')
  async refresh(
    @Req() req: Request & { cookies: { [key: string]: string } },
    @Res({ passthrough: true }) res: Response,
  ) {
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
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  getProfile(@Req() req: Request) {
    return req.user;
  }
}
