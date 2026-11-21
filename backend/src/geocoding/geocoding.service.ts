import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import { citySuggestSelect, toSuggestItem } from '../cities/city-suggest-item';
import { isAllowedLocationRow } from '../cities/location';
import { CADASTRAL_NUMBER } from '../common/cadastral-number';
import { PrismaService } from '../prisma/prisma.service';
import {
  GeocodingPorts,
  type AddressReference,
  type AddressSuggestion,
} from './geocoding.ports';

function addressText(value: unknown, max: number) {
  if (typeof value !== 'string' || value.length > max)
    throw new BadRequestException('Некорректный адрес');
  return value.trim();
}

@Injectable()
export class GeocodingService {
  constructor(
    private readonly ports: GeocodingPorts,
    private readonly prisma: PrismaService,
  ) {}

  get suggestionsSource() {
    return this.ports.suggestions.source;
  }

  private async addressCandidates(
    query: unknown,
  ): Promise<AddressSuggestion[]> {
    const text = addressText(query, 500);
    return text.length < 2 ? [] : this.ports.suggestions.suggest(text);
  }

  async suggestAddressLabels(query: unknown) {
    const candidates = await this.addressCandidates(query);
    return [...new Set(candidates.map(({ label }) => label))];
  }

  async suggestAddresses(query: unknown) {
    const suggestions = await this.addressCandidates(query);
    const seen = new Set<string>();
    const items = suggestions.filter(({ reference }) => {
      const key = reference.key ?? reference.text;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return { items, source: this.suggestionsSource };
  }

  async resolveAddress(input: unknown) {
    if (!input || typeof input !== 'object')
      throw new BadRequestException('Выберите адрес из подсказок');
    const { source, text, key, fiasId } = input as Partial<
      Record<keyof AddressReference, unknown>
    >;
    const query = addressText(text, 2000);
    if (typeof source !== 'string' || !source)
      throw new BadRequestException('Не указан источник подсказки');
    if (source !== this.suggestionsSource.id)
      throw new ConflictException(
        'Источник подсказок изменился. Выберите адрес ещё раз.',
      );
    if (key != null && (typeof key !== 'string' || key.length > 1000))
      throw new BadRequestException('Некорректный идентификатор подсказки');
    if (fiasId != null && (typeof fiasId !== 'string' || fiasId.length > 50))
      throw new BadRequestException('Некорректный код ФИАС');
    if (query.length < 2) return null;
    return this.ports.suggestions.resolve({
      source,
      text: query,
      ...(typeof key === 'string' && { key }),
      ...(typeof fiasId === 'string' && { fiasId }),
    });
  }

  async findCityCenter(cityId: string) {
    const city = await this.prisma.city.findUnique({
      where: { id: cityId, status: 'ACTIVE' },
      select: { ...citySuggestSelect, objectGuid: true },
    });
    if (!city) throw new NotFoundException('Город не найден');
    const { name, mapSearchName } = toSuggestItem(city);
    return this.ports.cityCenter.findCityCenter({
      name,
      mapSearchName,
      typeName: city.typeName,
      fiasId: city.objectGuid,
      regionName: city.regionName,
      regionCode: city.regionCode,
    });
  }

  async findCadastralLocation(input: unknown) {
    const number = typeof input === 'string' ? input.trim() : '';
    if (!CADASTRAL_NUMBER.test(number))
      throw new BadRequestException('Введите полный кадастровый номер');
    const result = await this.ports.cadastral.findCadastralLocation(number);
    if (result.status !== 'found') return result;
    const { localityFiasIds, ...location } = result;
    const ids = localityFiasIds
      .filter((id) => isUUID(id))
      .map((id) => id.toLowerCase());
    const rows = ids.length
      ? await this.prisma.city.findMany({
          where: { status: 'ACTIVE', objectGuid: { in: ids } },
          select: { ...citySuggestSelect, objectGuid: true, level: true },
        })
      : [];
    for (const id of ids) {
      const city = rows.find(
        (row) => row.objectGuid === id && isAllowedLocationRow(row),
      );
      if (city) return { ...location, city: toSuggestItem(city) };
    }
    return { ...location, city: null };
  }
}
