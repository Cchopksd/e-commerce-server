import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { OmiseWebhookDto } from './dto/omise-webhook.dto';
import { PaymentService } from './payment.service';
import { Public } from '../auth/decorator/auth.decorator';
import { Logger } from '@nestjs/common';
import { PaymentGateway } from './payment.gateway';

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly paymentGateway: PaymentGateway,
  ) {}

  @Public()
  @Post('omise')
  async handleOmiseWebhooks(@Body() webhookDTO: OmiseWebhookDto) {
    this.logger.log('Received Omise webhook');

    try {
      const { key, data } = webhookDTO;

      if (key === 'charge.complete') {
        this.logger.log(
          `Processing charge.complete for payment ID: ${data.id}`,
        );
        const { id, status } = data;

        const payment = await this.paymentService.updatePaymentStatus(
          id,
          status,
        );

        if (payment.detail.status === 'paid' && payment.detail.user_id) {
          console.log(
            `Payment successful for charge: ${payment.detail.charge_id}, user: ${payment.detail.user_id}`,
          );

          // ส่งข้อมูลให้เฉพาะ Client ที่ user_id และ charge_id ตรงกัน
          this.paymentGateway.sendToUserWithCharge(
            payment.detail.user_id,
            payment.detail.charge_id,
            payment.detail.status,
          );
        }
        return {
          message: `Payment status updated to ${status}`,
          paymentId: id,
          statusCode: HttpStatus.OK,
        };
      }

      if (key === 'charge.failed') {
        this.logger.warn(`Processing charge.failed for payment ID: ${data.id}`);
        const { id, status } = data;

        await this.paymentService.updatePaymentStatus(id, status);

        return {
          message: `Payment failed, status updated to ${status}`,
          paymentId: id,
          statusCode: HttpStatus.OK,
        };
      }

      // Handle unexpected webhook keys
      this.logger.warn(`Unhandled webhook key: ${key}`);
      return { message: 'Webhook received but not processed', key };
    } catch (error) {
      this.logger.error('Error processing webhook', error.stack);

      throw new HttpException(
        {
          message: 'An error occurred while processing the webhook',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      this.logger.log('Webhook processing completed');
    }
  }
}
