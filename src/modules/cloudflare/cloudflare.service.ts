import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import * as sharp from 'sharp';
import slugify from 'slugify';

@Injectable()
export class CloudFlareService {
  private s3Client: S3Client;
  private bucket_name: string;
  private domain_name: string;

  constructor(private configService: ConfigService) {
    this.bucket_name = this.configService.get<string>('CLOUDFLARE_BUCKET_NAME');
    this.domain_name = this.configService.get<string>('DOMAIN_NAME');

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${this.configService.get<string>('CLOUDFLARE_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.configService.get<string>('CLOUDFLARE_ACCESS_KEY'),
        secretAccessKey: this.configService.get<string>(
          'CLOUDFLARE_SECRET_KEY',
        ),
      },
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folderName: string,
  ): Promise<string> {
    try {
      const resizedBuffer = await this.resizeImage(file.buffer);

      const key = `images/${folderName}/${Date.now()}-${file.originalname}`
        .replace(' ', '-')
        .replace(/\.[^/.]+$/, '.webp');

      const command = new PutObjectCommand({
        Bucket: this.bucket_name,
        Key: key,
        Body: resizedBuffer,
        ContentType: 'image/webp',
      });

      await this.s3Client.send(command);
      return `https://${this.domain_name}/${key}`;
    } catch (error) {
      console.error('Error uploading to Cloudflare R2:', error);
      throw new Error('Failed to upload image: ' + error.message);
    }
  }

  async deleteImage(key: string): Promise<string> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket_name,
        Key: key.replace(/\.[^/.]+$/, ''),
      });
      await this.s3Client.send(command);

      return `Image with key "${key}" deleted successfully.`;
    } catch (error) {
      console.error('Error deleting image from Cloudflare R2:', error);
      throw new Error('Failed to delete image: ' + error.message);
    }
  }

  private resizeImage(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer).webp({ quality: 70 }).toBuffer();
  }
}
