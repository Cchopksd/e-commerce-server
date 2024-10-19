import { IsString, IsEmail, IsNotEmpty } from 'class-validator';

export class UserLogin {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
