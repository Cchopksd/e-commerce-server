import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
} from 'class-validator';

export class CreateAddressDto {
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  province: string;

  @IsNotEmpty()
  district: string;

  @IsNotEmpty()
  subdistrict: string;

  @IsNotEmpty()
  post_id: number;

  @IsNotEmpty()
  detail: number;
}