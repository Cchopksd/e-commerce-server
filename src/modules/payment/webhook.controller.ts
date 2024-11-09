import { Body, Controller, Get, HttpStatus, Post } from '@nestjs/common';
import { OmiseWebhookDto } from './dto/omise-webhook.dto';
import { PaymentService } from './payment.service';
import { Public } from '../auth/decorator/auth.decorator';

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly paymentService: PaymentService) {}

  @Public()
  @Post('omise')
  async handleOmiseWebhooks(@Body() webhookDTO: OmiseWebhookDto) {
    console.log(webhookDTO);
    try {
      console.log('webhook omise is processing');
      const { key, data } = webhookDTO;

      if (key === 'charge.complete') {
        const { id, status } = data;

        const updatedPayment = await this.paymentService.updatePaymentStatus(
          id,
          status,
        );

        return {
          message: `Payment status updated to ${status}`,
          paymentId: id,
          updatedStatus: HttpStatus.OK,
        };
      }

      if (key === 'charge.failed') {
        const { id, status } = data;

        const updatedPayment = await this.paymentService.updatePaymentStatus(
          id,
          status,
        );

        return {
          message: `Payment failed, status updated to ${status}`,
          paymentId: id,
          updatedStatus: HttpStatus.OK,
        };
      }
      // Handle unexpected webhook keys
      console.warn('Unhandled webhook key:', key);
      return { message: 'Webhook received but not processed', key };
    } catch (error) {
      console.error('Error processing webhook:', error);
      return {
        message: 'An error occurred while processing the webhook',
        error: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    } finally {
      console.log('webhook omise has processed');
    }
  }
}
