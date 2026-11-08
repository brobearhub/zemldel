import { describe, expect, it } from 'vitest';
import { readPassportStorageConfig } from './passport-storage.service';

const settings = {
  PASSPORT_S3_ENDPOINT: 'https://storage.yandexcloud.net',
  PASSPORT_S3_REGION: 'ru-central1',
  PASSPORT_S3_BUCKET: 'test-passports',
  PASSPORT_S3_KMS_KEY_ID: 'test-kms',
  PASSPORT_S3_ACCESS_KEY_ID: 'test-access',
  PASSPORT_S3_SECRET_ACCESS_KEY: 'test-secret',
};

describe('passport storage configuration', () => {
  it('uses the public test bucket only for NODE_ENV=testing', () => {
    expect(
      readPassportStorageConfig({
        ...settings,
        NODE_ENV: 'testing',
        S3_ENDPOINT: 'https://s3.twcstorage.ru',
        S3_REGION: 'ru-1',
        S3_PUBLIC_BUCKET: 'zemledel-testing-public',
        S3_KEY: 'testing-access',
        S3_SECRET: 'testing-secret',
      }),
    ).toMatchObject({
      bucket: 'zemledel-testing-public',
      kmsKeyId: null,
      credentials: {
        accessKeyId: 'testing-access',
        secretAccessKey: 'testing-secret',
      },
    });
  });

  it('does not use public storage in production when secure settings are missing', () => {
    expect(() =>
      readPassportStorageConfig({
        NODE_ENV: 'production',
        S3_ENDPOINT: 'https://s3.twcstorage.ru',
        S3_PUBLIC_BUCKET: 'zemledel-testing-public',
      }),
    ).toThrow('Missing env PASSPORT_S3_ENDPOINT');
  });

  it('uses dedicated credentials even when general storage is configured', () => {
    expect(
      readPassportStorageConfig({
        ...settings,
        S3_KEY: 'public-access',
        S3_SECRET: 'public-secret',
        S3_PRIVATE_BUCKET: 'general-private',
      }),
    ).toMatchObject({
      bucket: 'test-passports',
      credentials: {
        accessKeyId: 'test-access',
        secretAccessKey: 'test-secret',
      },
    });
  });

  it.each(Object.keys(settings))(
    'rejects missing %s without fallback',
    (name) => {
      expect(() =>
        readPassportStorageConfig({
          ...settings,
          [name]: '',
          S3_KEY: 'general-access',
          S3_SECRET: 'general-secret',
        }),
      ).toThrow(`Missing env ${name}`);
    },
  );

  it.each([
    'http://storage.example.com',
    'https://user:secret@storage.example.com',
    'https://storage.example.com/bucket',
    'https://storage.example.com?token=secret',
    'https://storage.example.com#fragment',
  ])('rejects unsafe endpoint %s', (endpoint) => {
    expect(() =>
      readPassportStorageConfig({
        ...settings,
        PASSPORT_S3_ENDPOINT: endpoint,
      }),
    ).toThrow('PASSPORT_S3_ENDPOINT must be an HTTPS origin');
  });
});
