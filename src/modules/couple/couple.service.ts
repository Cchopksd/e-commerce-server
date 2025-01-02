import {
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Couple, CoupleDocument } from './schema/couple.schema';
import { Model } from 'mongoose';
import { CreateCoupleDto } from './dto/create-couple';
import { UpdateCoupleDto } from './dto/update-couple.dto';

@Injectable()
export class CoupleService {
  constructor(
    @InjectModel(Couple.name) private coupleModel: Model<CoupleDocument>,
  ) {}
  async createCouple(createCoupleDto: CreateCoupleDto) {
    try {
      const createdCouple = this.coupleModel.create(createCoupleDto);
      return {
        message: 'Couple created successfully',
        statusCode: HttpStatus.OK,
        detail: createdCouple,
      };
    } catch (error) {
      console.error('Error creating couple:', error);
      throw new InternalServerErrorException('Failed to create couple');
    }
  }

  async removeCoupleById(id: string) {
    try {
      const removedCouple = this.coupleModel.findByIdAndDelete(id);

      return removedCouple;
    } catch (error) {
      console.error('Error removing couple:', error);
      throw new InternalServerErrorException('Failed to remove couple');
    }
  }

  async updateCouple(id: string, updateCoupleDto: UpdateCoupleDto) {
    try {
      const updatedCouple = this.coupleModel.findByIdAndUpdate(
        id,
        updateCoupleDto,
        { new: true },
      );
      return updatedCouple;
    } catch (error) {
      console.error('Error updating couple:', error);
      throw new InternalServerErrorException('Failed to update couple');
    }
  }

  async getCoupleById(id: string) {
    try {
      const couple = this.coupleModel.findById(id);
      return couple;
    } catch (error) {
      console.error('Error getting couple:', error);
      throw new InternalServerErrorException('Failed to get couple');
    }
  }

  async getAllCouplesWithoutSpecialCouple() {
    try {
      const couples = this.coupleModel.find({ user_id: { $exists: false } });
      return couples;
    } catch (error) {
      console.error('Error getting couples:', error);
      throw new InternalServerErrorException('Failed to get couples');
    }
  }
}
