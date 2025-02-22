import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { CreateSourceDto } from './dto/source.dto';
import { CreateCreditCardDto, CreateNewCreditCardDto } from './dto/create-credit-card.dto';
import { CreatePayWithCreditCardDto } from './dto/credit-card.dto';
import { PromptPayDto } from './dto/prompt-pay-dto';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('add-credit-card')
  async card(@Body() createCreditCardDto: CreateCreditCardDto) {
    const token =
      await this.paymentService.addCustomerAttachCreditCard(
        createCreditCardDto,
      );
    return token;
  }

  @Post('add-new-credit-card')
  async attachACardToCustomer(
    @Body() createCreditCardDto: CreateNewCreditCardDto,
  ) {
    const token =
      await this.paymentService.attachACardToCustomer(createCreditCardDto);
    return token;
  }

  // @Post('installment')
  // async installment(@Body() createPaymentDto: CreatePaymentDto) {
  //   const token = await this.paymentService.createToken(createPaymentDto);
  //   return token;
  // }

  @Post('prompt-pay')
  async promptPay(@Body() createSourceDto: PromptPayDto) {
    const result = await this.paymentService.promptPay(createSourceDto);
    return result;
  }

  @Post('credit-card')
  async creditCard(
    @Body() createPayWithCreditCardDto: CreatePayWithCreditCardDto,
  ) {
    const result = await this.paymentService.creditCard(
      createPayWithCreditCardDto,
    );
    return result;
  }

  @Get('get-list-payment')
  findAll(@Body() id: string, order: string) {
    return this.paymentService.getListOfCharges(id, order);
  }

  @Get('get-retrieve-customer')
  getRetrieveACustomer(@Query('user_id') user_id: string) {
    return this.paymentService.getRetrieveACustomer(user_id);
  }

  @Get('charge/:id')
  findOne(@Param('id') id: string) {
    return this.paymentService.findOneByChargeId(id);
  }

  @Get('get-payment-by-id/:id')
  getPaymentByPaymentID(@Param('id') id: string) {
    return this.paymentService.getPaymentByPaymentID(id);
  }
}
