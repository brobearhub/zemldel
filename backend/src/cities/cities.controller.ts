import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CitiesService } from './cities.service';
import { CitySuggestItemDto, PlaceSuggestPageDto } from './dto/city.dto';
import { RegionalCapitalItemDto } from './dto/regional-capital.dto';
import { ApiStandardErrors } from '../common/swagger/api-standard-errors.decorator';

@ApiTags('cities')
@ApiStandardErrors()
@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Get('capitals')
  @ApiOkResponse({ type: [RegionalCapitalItemDto] })
  listCapitals() {
    return this.citiesService.listCapitals();
  }

  @Get('place-suggest')
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiOkResponse({ type: PlaceSuggestPageDto })
  async suggestPlaces(
    @Query('q') q = '',
    @Query('limit') limit = '10',
    @Query('offset') offset = '0',
  ) {
    const limitNumber = Number(limit);
    const offsetNumber = Number(offset);
    return this.citiesService.suggestPlaces(
      String(q ?? ''),
      Number.isFinite(limitNumber) ? limitNumber : 10,
      Number.isFinite(offsetNumber) ? offsetNumber : 0,
    );
  }

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
