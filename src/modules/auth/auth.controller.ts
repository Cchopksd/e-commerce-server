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
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { Public } from './decorator/auth.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async signIn(
    @Body() signInDto: Record<string, any>,
  ) {
    const { access_token, refresh_token } = await this.authService.signIn(
      signInDto.email,
      signInDto.password,
    );
    
    return access_token;
  }

  @Post('refresh')
  async refresh(@Body() body: any) {
    const { refreshToken } = body;
    const payload = await this.authService.validateRefreshToken(refreshToken);
    const newAccessToken = await this.authService.generateAccessToken(payload);
    return { accessToken: newAccessToken };
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}
