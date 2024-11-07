import { Body, Controller, Get, Post } from '@nestjs/common';
import { OmiseWebhookDto } from './dto/omise-webhook.dto';
import { PaymentService } from './payment.service';
import { Public } from '../auth/decorator/auth.decorator';

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly paymentService: PaymentService) {}

  @Public()
  @Post('omise')
  async handleOmiseWebhooks(@Body() webhookDTO: OmiseWebhookDto) {
    const { key, data } = webhookDTO;
    if (key === 'charge.complete') {
      const { id, status } = data;
      if (status === 'successful') {
        const result = await this.paymentService.updatePaymentStatus(
          id,
          'paid',
        );
        return result;
      } else {
        const result = await this.paymentService.updatePaymentStatus(
          id,
          status,
        );
        return result;
      }
    }
    return { message: 'Webhook received' };
  }
}
