import { BadRequestException } from '@nestjs/common';

/**
 * Validates if the given ID is a valid MongoDB ObjectId.
 * @param id - The ID to validate.
 * @throws BadRequestException if the ID format is invalid.
 */
export function validateObjectId(id: string,name:string): void {
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    throw new BadRequestException({
      message: `Invalid ${name} ID format`,
      statusCode: 400,
    });
  }
}
