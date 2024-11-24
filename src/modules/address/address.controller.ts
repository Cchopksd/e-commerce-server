import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
} from '@nestjs/common';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { Public } from '../auth/decorator/auth.decorator';

@Controller('address')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post('')
  async create(@Body() createAddressDto: CreateAddressDto) {
    await this.addressService.create(createAddressDto);
    return {
      message: 'User created successfully',
      statusCode: HttpStatus.CREATED,
    };
  }

  @Get('get-address-by-user/:user_id')
  getUserAddress(@Param('user_id') user_id: string) {
    return this.addressService.getUserAddress(user_id);
  }

  @Get(':id')
  findOne(@Body('user_id') user_id: string) {
    return this.addressService.findOne(user_id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAddressDto: UpdateAddressDto) {
    return this.addressService.update(id, updateAddressDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.addressService.remove(id);
  }
}
