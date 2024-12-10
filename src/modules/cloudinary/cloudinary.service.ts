import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cloudinary from 'cloudinary';
import * as sharp from 'sharp';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    cloudinary.v2.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
      secure: true,
    });
  }

  async uploadImage(file: Express.Multer.File, folderName: string) {
    try {
      const resizedBuffer = await this.resizeImage(file.buffer);

      const fileStr = `data:${file.mimetype};base64,${resizedBuffer.toString('base64')}`;

      const response = await cloudinary.v2.uploader.upload(fileStr, {
        upload_preset: 'e-commerce',
        resource_type: 'image',
        quality: 'auto:low',
        folder: `e-commerce/${folderName}`,
      });

      const images = {
        image_url: response.secure_url,
        public_id: response.public_id,
      };

      return images;
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      throw new Error('Failed to upload image: ' + error.message);
    }
  }

  async deleteImage(publicId: string) {
    return await cloudinary.v2.uploader.destroy(publicId);
  }

  private resizeImage(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
      .resize({ width: 1024 })
      .png({ quality: 50 })
      .toBuffer();
  }
}
