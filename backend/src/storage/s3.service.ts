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
  readonly endpoint = requireEnv('S3_ENDPOINT');
  readonly region = requireEnv('S3_REGION');

  readonly accessKeyId = requireEnv('S3_KEY');
  readonly secretAccessKey = requireEnv('S3_SECRET');

  readonly privateBucket = requireEnv('S3_PRIVATE_BUCKET');
  readonly publicBucket = optionalEnv('S3_PUBLIC_BUCKET');
  readonly publicCdnBaseUrl = optionalEnv('CDN_PUBLIC_BASE_URL');

  readonly publicPrefix = normalizePrefix(
    process.env.S3_PUBLIC_PREFIX ?? 'public/',
  );
  readonly privatePrefix = normalizePrefix(
    process.env.S3_PRIVATE_PREFIX ?? 'private/',
  );

  readonly forcePathStyle =
    (process.env.S3_FORCE_PATH_STYLE ?? 'false') === 'true';

  /**
   * Use an S3-compatible endpoint with explicit connection and socket timeouts.
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
      throw new Error('Missing env S3_PUBLIC_BUCKET');
    }
    return this.publicBucket;
  }

  requirePublicCdnBaseUrl() {
    if (!this.publicCdnBaseUrl) {
      throw new Error('Missing env CDN_PUBLIC_BASE_URL');
    }
    return this.publicCdnBaseUrl;
  }
}
