import {
  Injectable,
  PipeTransform,
  ArgumentMetadata,
  BadRequestException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';

@Injectable()
export class ImageValidation implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    const { images } = value;

    if (!images || images.length === 0) {
      return value;
    }

    if (Array.isArray(images)) {
      images.forEach((file) => {
        this.validateFile(file);
      });
    } else {
      this.validateFile(images);
    }

    return value;
  }

  private validateFile(file: any) {
    const tenMb = 10 * 1000 * 1000; // 10MB in bytes
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']; // Allowed MIME types

    // Validate file size
    if (file.size > tenMb) {
      throw new BadRequestException('File size should be less than 10MB');
    }

    // Validate MIME type
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException(
        'File Media Type support is: image/jpeg, image/png, image/webp',
      );
    }
  }
}
