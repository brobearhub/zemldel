import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';

export function readPassportStorageConfig(env: NodeJS.ProcessEnv) {
  const required = (name: string) => {
    const value = env[name]?.trim();
    if (!value) throw new Error(`Missing env ${name}`);
    return value;
  };
  const endpoint = required('PASSPORT_S3_ENDPOINT');
  const url = new URL(endpoint);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  ) {
    throw new Error('PASSPORT_S3_ENDPOINT must be an HTTPS origin');
  }
  return {
    endpoint,
    region: required('PASSPORT_S3_REGION'),
    bucket: required('PASSPORT_S3_BUCKET'),
    kmsKeyId: required('PASSPORT_S3_KMS_KEY_ID'),
    credentials: {
      accessKeyId: required('PASSPORT_S3_ACCESS_KEY_ID'),
      secretAccessKey: required('PASSPORT_S3_SECRET_ACCESS_KEY'),
    },
  };
}

@Injectable()
export class PassportStorageService implements OnModuleDestroy {
  private connection?: {
    client: S3Client;
    bucket: string;
    kmsKeyId: string;
  };

  // Lazy initialization keeps existing deployments running until passport storage
  // is connected. A passport operation fails closed if its settings are missing.
  getConnection() {
    if (!this.connection) {
      const { bucket, kmsKeyId, ...config } = readPassportStorageConfig(
        process.env,
      );
      this.connection = {
        bucket,
        kmsKeyId,
        client: new S3Client({
          ...config,
          forcePathStyle: true,
          requestChecksumCalculation: 'WHEN_REQUIRED',
          responseChecksumValidation: 'WHEN_REQUIRED',
          requestHandler: new NodeHttpHandler({
            connectionTimeout: 5_000,
            socketTimeout: 30_000,
          }),
          maxAttempts: 2,
        }),
      };
    }
    return this.connection;
  }

  onModuleDestroy() {
    this.connection?.client.destroy();
    this.connection = undefined;
  }
}
