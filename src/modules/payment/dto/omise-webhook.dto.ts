// src/payments/dto/omise-webhook.dto.ts
import {
  IsString,
  IsObject,
  IsEnum,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

// Enum for Event Object
enum EventObject {
  EVENT = 'event',
}

// Enum for Event Keys (webhook event types)
export enum EventKey {
  CHARGE_COMPLETE = 'charge.complete',
  CHARGE_FAILED = 'charge.failed',
  CHARGE_REFUNDED = 'charge.refunded',
}

// Enum for Charge Status
export enum ChargeStatus {
  SUCCESSFUL = 'successful',
  FAILED = 'failed',
  EXPIRE = 'expire',
}

export class OmiseChargeDataDto {
  @IsString()
  id: string;

  @IsEnum(ChargeStatus)
  status: ChargeStatus;
}

export class OmiseWebhookDto {
  @IsString()
  id: string;

  @IsEnum(EventObject)
  object: EventObject;

  @IsEnum(EventKey)
  key: EventKey;

  @IsObject()
  @ValidateNested()
  @Type(() => OmiseChargeDataDto)
  data: OmiseChargeDataDto;
}
