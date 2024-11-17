import { BadRequestException } from '@nestjs/common';

/**
 * Validates if the given ID is a valid MongoDB ObjectId.
 * @param id - The ID to validate.
 * @throws BadRequestException if the ID format is invalid.
 */
export function validateObjectId(id: string, fieldName: string): void {
  if (!id || typeof id !== 'string') {
    throw new BadRequestException({
      message: `${fieldName} must be a non-empty string`,
      statusCode: 400,
    });
  }

  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  if (!objectIdRegex.test(id)) {
    throw new BadRequestException({
      message: `Invalid ${fieldName} ID format`,
      statusCode: 400,
    });
  }
}
