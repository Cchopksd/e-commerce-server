import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { CreateSourceDto } from './dto/source.dto';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('card')
  async card(@Body() createPaymentDto: CreatePaymentDto) {
    const token = await this.paymentService.createToken(createPaymentDto);
    return token;
  }

  @Post('installment')
  async installment(@Body() createPaymentDto: CreatePaymentDto) {
    const token = await this.paymentService.createToken(createPaymentDto);
    console.log(token);
    return token;
  }

  @Post('prompt-pay')
  async promptPay(@Body() createSourceDto: CreateSourceDto) {
    const result = await this.paymentService.promptPay(createSourceDto);

    return {
      message: 'create payment successful',
      details: result,
      statusCode: HttpStatus.CREATED,
    };
  }

  @Get()
  findAll() {
    return this.paymentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto) {
    return this.paymentService.update(+id, updatePaymentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.paymentService.remove(+id);
  }
}
