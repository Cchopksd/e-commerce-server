import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from './enums/role.enum';

@Injectable()
export class ValidateUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const user_id = request.params.user_id;

    if (user.role === Role.ADMIN) {
      return true;
    }
    if (!user || user.sub !== user_id) {
      throw new UnauthorizedException(
        'You are not allowed to update this user',
      );
    }
    return true;
  }
}
