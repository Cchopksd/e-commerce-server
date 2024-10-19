import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';

export const databaseConfig = (
  configService: ConfigService,
): MongooseModule => ({ uri: configService.get<string>('MONGODB_URI') });
