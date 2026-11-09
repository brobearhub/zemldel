import { describe, expect, it } from 'vitest';
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { STORY_TEXT_MAX_LENGTH } from '../story-rules';
import { CreateStoryDto } from './story.dto';

describe('CreateStoryDto', () => {
  it('принимает 2048 символов, даже если перевод строки пришёл как CRLF', () => {
    const text = 'а\n'.repeat(STORY_TEXT_MAX_LENGTH / 2 - 1) + 'бб';
    const wire = text.replace(/\n/g, '\r\n');
    expect(text).toHaveLength(STORY_TEXT_MAX_LENGTH);
    expect(wire.length).toBeGreaterThan(STORY_TEXT_MAX_LENGTH);

    const dto = plainToInstance(CreateStoryDto, {
      text: wire,
      durationHours: 24,
    });
    expect(validateSync(dto)).toEqual([]);
    expect(dto.text).toBe(text);
  });
});
