import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CitiesService } from './cities.service';
import { CitySuggestItemDto } from './dto/city.dto';
import { ApiStandardErrors } from '../common/swagger/api-standard-errors.decorator';

@ApiTags('cities')
@ApiStandardErrors()
@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Get('suggest')
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ type: [CitySuggestItemDto] })
  async suggest(@Query('q') q = '', @Query('limit') limit = '10') {
    const limitNumber = Number(limit);
    return this.citiesService.suggest(
      String(q ?? ''),
      Number.isFinite(limitNumber) ? limitNumber : 10,
    );
  }
}
