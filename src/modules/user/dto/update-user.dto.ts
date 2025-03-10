import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import {
  IsEmail,
  IsNumber,
  IsString,
  IsNotEmpty,
  IsOptional,
  Matches,
  Max,
  Min,
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
  @Matches(/^[0-9]{10}$/, { message: 'Phone number must be exactly 10 digits' })
  phone?: string;

  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @IsNotEmpty()
  @Min(18, { message: 'Age must be at least 18' })
  @Max(100, { message: 'Age must be at most 100' })
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
