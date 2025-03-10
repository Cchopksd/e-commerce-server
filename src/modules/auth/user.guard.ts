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
    const user_id_from_query = request.query.user_id;

    if (user.role === Role.ADMIN) {
      return true;
    }
    if (!user || user.sub !== user_id && user.sub !== user_id_from_query) {
      throw new UnauthorizedException(
        'You are not authorized to perform this action',
      );
    }
    return true;
  }
}
