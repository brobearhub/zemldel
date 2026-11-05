import { describe, expect, it } from 'vitest';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  describe('root', () => {
    it('returns the API identity', () => {
      appController = new AppController(new AppService());
      expect(appController.getHello()).toBe('Zemledel API');
    });
  });
});
