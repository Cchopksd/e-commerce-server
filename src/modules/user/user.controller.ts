import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '../auth/enums/role.enum';
import { Roles } from '../auth/decorator/role.decorator';
import { Public } from '../auth/decorator/auth.decorator';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Public()
  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    await this.userService.create(createUserDto);
    return {
      message: 'User created successfully',
      statusCode: HttpStatus.CREATED,
    };
  }

  @Roles(Role.ADMIN)
  @Get('get-all-user')
  findAll() {
    return this.userService.findAll();
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = this.userService.findOne(id);
    return user;
  }

  @Roles(Role.ADMIN)
  @Get('user-detail/:id')
  async findUserDetail(@Param('id') id: string) {
    const user = this.userService.findUserDetail(id);
    return user;
  }

  @Public()
  @Get(':email')
  async findByEmail(@Param('email') email: string) {
    const user = this.userService.findByEmail(email);
    return user;
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.userService.remove(id);
    return {
      message: 'User removed successfully',
      statusCode: HttpStatus.OK,
    };
  }
}
