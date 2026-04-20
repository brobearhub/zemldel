import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  @Controller()
  class TestController {
    @Get('/')
    getRoot() {
      return 'ok';
    }
  }

  @Module({ controllers: [TestController] })
  class TestAppModule {}

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('ok');
  });
});
