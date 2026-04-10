import { Controller, Get, Query } from '@nestjs/common';
import { CitiesService } from './cities.service';

@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Get('suggest')
  async suggest(@Query('q') q = '', @Query('limit') limit = '10') {
    const limitNumber = Number(limit);
    return this.citiesService.suggest(
      String(q ?? ''),
      Number.isFinite(limitNumber) ? limitNumber : 10,
    );
  }
}
