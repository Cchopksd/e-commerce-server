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
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, UpdateUserPasswordDto } from './dto/update-user.dto';
import { Role } from '../auth/enums/role.enum';
import { Roles } from '../auth/decorator/role.decorator';
import { Public } from '../auth/decorator/auth.decorator';
import { ValidateUserGuard } from '../auth/user.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ImageValidation } from 'src/pipes/ParseFilePipe.pipe';

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

  @Patch('update-by-id/:user_id')
  @UseGuards(ValidateUserGuard)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 1 }]))
  update(
    @Param('user_id') user_id: string,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFiles()
    files: { images?: Express.Multer.File },
  ) {
    return this.userService.update(user_id, updateUserDto, files);
  }

  @Patch('reset-password/:user_id')
  @UseGuards(ValidateUserGuard)
  updatePassword(
    @Param('user_id') user_id: string,
    @Body() updateUserPasswordDto: UpdateUserPasswordDto,
  ) {
    return this.userService.updatePassword(user_id, updateUserPasswordDto);
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
