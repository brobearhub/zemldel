import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  describe('root', () => {
    it('should return "Hello World!"', () => {
      appController = new AppController(new AppService());
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
