import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { UserService } from '../user/user.service';
import { verifyPassword } from 'src/utils/password.util';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async signIn(email: string, pass: string): Promise<{ access_token: string }> {
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

    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
