import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { ApiStandardErrors } from './common/swagger/api-standard-errors.decorator';

@ApiTags('app')
@ApiStandardErrors()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOkResponse({ schema: { type: 'string' } })
  getHello(): string {
    return this.appService.getHello();
  }
}
