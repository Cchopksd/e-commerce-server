import { Module } from '@nestjs/common';
import { CloudFlareService } from './cloudflare.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [CloudFlareService],
  exports: [CloudFlareService],
})
export class CloudFlareModule {}
