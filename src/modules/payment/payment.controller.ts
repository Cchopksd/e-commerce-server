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
  UseGuards,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { CreateSourceDto } from './dto/source.dto';
import {
  CreateCreditCardDto,
  CreateNewCreditCardDto,
} from './dto/create-credit-card.dto';
import {
  CreatePayWithCreditCardDto,
  PayWithCreditCardAgainDto,
} from './dto/credit-card.dto';
import { PromptPayDto } from './dto/prompt-pay-dto';
import { CardService } from './card.service';
import { DeleteCreditCardDto } from './dto/delete-credit-card.dto';
import { ValidateUserGuard } from '../auth/user.guard';

@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly cardService: CardService,
  ) {}

  @Post('add-credit-card')
  async card(@Body() createCreditCardDto: CreateCreditCardDto) {
    const token =
      await this.cardService.addCustomerAttachCreditCard(createCreditCardDto);
    return token;
  }

  @Post('add-new-credit-card')
  async attachACardToCustomer(
    @Body() createCreditCardDto: CreateNewCreditCardDto,
  ) {
    const token =
      await this.cardService.attachACardToCustomer(createCreditCardDto);
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

  @Post('repay-with-credit-card')
  async creditCardAgain(
    @Body() payWithCreditCardAgainDto: PayWithCreditCardAgainDto,
  ) {
    const result = await this.paymentService.payWithCreditCardAgain({
      creditPaymentDto: payWithCreditCardAgainDto,
    });
    return result;
  }

  @Get('get-list-payment')
  findAll(@Body() id: string, order: string) {
    return this.paymentService.getListOfCharges(id, order);
  }

  @Get('get-retrieve-customer')
  getRetrieveACustomer(@Query('user_id') user_id: string) {
    return this.cardService.getRetrieveACustomer(user_id);
  }

  @Get('charge/:id')
  findOne(@Param('id') id: string) {
    return this.paymentService.findOneByChargeId(id);
  }

  @Get('get-payment-by-id/:id')
  getPaymentByPaymentID(@Param('id') id: string) {
    return this.paymentService.getPaymentByPaymentID(id);
  }

  @Delete('remove-credit-card')
  @UseGuards(ValidateUserGuard)
  deleteCreditCard(@Query() deleteCreditCardDto: DeleteCreditCardDto) {
    return this.cardService.deleteCreditCard(deleteCreditCardDto);
  }
}
