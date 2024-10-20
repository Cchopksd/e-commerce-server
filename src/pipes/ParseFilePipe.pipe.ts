import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';

@Injectable()
export class ImageValidation implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    // Check if multiple files were uploaded
    const { images } = value;

    if (Array.isArray(images)) {
      images.forEach((file) => {
        this.validateFile(file);
      });
    } else {
      // Handle the case for a single file
      this.validateFile(images);
    }

    return value;
  }

  private validateFile(file: any) {
    const tenMb = 10 * 1000 * 1000; // 10MB in bytes
    const allowedMimeTypes = ['image/jpeg', 'image/png']; // Only allow .jpg and .png
    if (file.size > tenMb) {
      throw new BadRequestException('File size should be less than 10MB');
    }

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException();
    }
  }
}
