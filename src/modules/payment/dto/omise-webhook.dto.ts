// src/payments/dto/omise-webhook.dto.ts
import {
  IsString,
  IsObject,
  IsEnum,
  ValidateNested,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

enum EventObject {
  EVENT = 'event',
}

enum EventKey {
  CHARGE_COMPLETE = 'charge.complete',
}

export class OmiseChargeDataDto {
  @IsString()
  id: string;

  @IsEnum(['successful', 'unsuccessful'])
  status: string;
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
