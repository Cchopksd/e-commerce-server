import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/modules/user/schemas/user.schema';
import { Address, AddressSchema } from '../address/schemas/address.schema';
import { AddressService } from '../address/address.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { CloudFlareService } from '../cloudflare/cloudflare.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MongooseModule.forFeature([{ name: Address.name, schema: AddressSchema }]),
    CloudinaryModule,
  ],
  controllers: [UserController],
  providers: [UserService, CloudFlareService],
  exports: [UserService],
})
export class UserModule {}
