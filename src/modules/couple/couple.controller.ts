import {
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { Roles } from '../auth/decorator/role.decorator';
import { Role } from '../auth/enums/role.enum';
import { CreateCoupleDto } from './dto/create-couple';
import { CoupleService } from './couple.service';

@Controller('couple')
export class CoupleController {
  constructor(private readonly coupleService: CoupleService) {}

  @Roles(Role.ADMIN)
  @Post('create')
  async createCouple(@Body() createCoupleDto: CreateCoupleDto) {
    const createdCouple =
      await this.coupleService.createCouple(createCoupleDto);
    return createdCouple;
  }

  @Roles(Role.ADMIN)
  @Delete('remove/:id')
  async removeCouple(@Param('id') id: string) {
    const result = await this.coupleService.removeCoupleById(id);

    if (!result) {
      throw new NotFoundException('Couple not found');
    }

    return { message: 'Couple removed successfully' };
  }
  @Get('retrieve-by-name/:name')
  async retrieveCouple(@Param('name') name: string) {
    if (!name) {
      throw new NotFoundException('Couple not found');
    }
    const couple = await this.coupleService.retrieveCoupleByName(name);

    return couple;
  }
}
