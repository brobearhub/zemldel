import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { STORY_TEXT_MAX_LENGTH } from '../story-rules';
import { CreateStoryDto } from './story.dto';

describe('CreateStoryDto', () => {
  it('принимает 500 символов, даже если перевод строки пришёл как CRLF', () => {
    const text = `${Array.from({ length: 50 }, () => 'а'.repeat(9)).join('\n')}б`;
    const wire = text.replace(/\n/g, '\r\n');
    expect(text).toHaveLength(STORY_TEXT_MAX_LENGTH);
    expect(wire.length).toBeGreaterThan(STORY_TEXT_MAX_LENGTH);

    const dto = plainToInstance(CreateStoryDto, { text: wire, durationDays: 1 });
    expect(validateSync(dto)).toEqual([]);
    expect(dto.text).toBe(text);
  });
});
