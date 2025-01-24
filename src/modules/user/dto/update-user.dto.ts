import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import {
  IsEmail,
  IsNumber,
  IsString,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { IsEnum } from 'class-validator';
import { UserRole } from '../schemas/user.schema';
import { Transform } from 'class-transformer';

export class UpdateUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  first_name: string;

  @IsString()
  @IsNotEmpty()
  last_name: string;

  @IsString()
  @IsOptional()
  phone: string;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsNotEmpty()
  age: number;
}

export class UpdateUserPasswordDto {
  @IsString()
  @IsNotEmpty()
  old_password: string;

  @IsString()
  @IsNotEmpty()
  new_password: string;
}
