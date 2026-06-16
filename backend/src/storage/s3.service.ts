import { Injectable } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';

function requireEnv(name: string) {
  const value = process.env[name];
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  throw new Error(`Missing env ${name}`);
}

function optionalEnv(name: string) {
  const value = process.env[name];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function normalizePrefix(prefix: string) {
  const trimmed = prefix.trim();
  if (trimmed.length === 0) return '';
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

@Injectable()
export class S3Service {
  readonly endpoint = requireEnv('YA_S3_ENDPOINT');
  readonly region = requireEnv('YA_S3_REGION');

  readonly accessKeyId = requireEnv('YA_S3_KEY');
  readonly secretAccessKey = requireEnv('YA_S3_SECRET');

  readonly privateBucket = requireEnv('YA_S3_PRIVATE_BUCKET');
  readonly publicBucket = optionalEnv('YA_S3_PUBLIC_BUCKET');
  readonly publicCdnBaseUrl = optionalEnv('YA_CDN_PUBLIC_BASE_URL');

  readonly publicPrefix = normalizePrefix(process.env.YA_S3_PUBLIC_PREFIX ?? 'public/');
  readonly privatePrefix = normalizePrefix(process.env.YA_S3_PRIVATE_PREFIX ?? 'private/');

  readonly forcePathStyle = (process.env.YA_S3_FORCE_PATH_STYLE ?? 'false') === 'true';

  /**
   * Yandex Object Storage is S3-compatible; we still enforce timeouts for safety.
   */
  readonly client = new S3Client({
    region: this.region,
    endpoint: this.endpoint,
    forcePathStyle: this.forcePathStyle,
    requestHandler: new NodeHttpHandler({
      connectionTimeout: 5_000,
      socketTimeout: 30_000,
    }),
    maxAttempts: 2,
    credentials: {
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.secretAccessKey,
    },
  });

  requirePublicBucket() {
    if (!this.publicBucket) {
      throw new Error('Missing env YA_S3_PUBLIC_BUCKET');
    }
    return this.publicBucket;
  }

  requirePublicCdnBaseUrl() {
    if (!this.publicCdnBaseUrl) {
      throw new Error('Missing env YA_CDN_PUBLIC_BASE_URL');
    }
    return this.publicCdnBaseUrl;
  }
}

