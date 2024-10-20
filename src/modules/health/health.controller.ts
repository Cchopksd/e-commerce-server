import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  MongooseHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../auth/decorator/auth.decorator';

@Public()
@Controller('health-check')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private mongoose: MongooseHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () =>
        this.http.responseCheck(
          'nestjs-docs',
          'https://docs.nestjs.com',
          (res) => res.status === 204,
        ),
      () => this.mongoose.pingCheck('mongodb'),
    ]);
  }
}
