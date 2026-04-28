import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Injectable, InternalServerErrorException } from '@nestjs/common';

type EncryptedBlob = {
  alg: 'AES-256-GCM';
  keyVersion: number;
  iv: Buffer;
  tag: Buffer;
  ciphertext: Buffer;
};

@Injectable()
export class DocumentsCryptoService {
  private getKey(version: number) {
    const byVersion = process.env[`DOCUMENTS_MASTER_KEY_V${version}_BASE64`];
    const fallback = process.env.DOCUMENTS_MASTER_KEY_BASE64;
    const raw = (byVersion ?? fallback ?? '').trim();
    if (!raw) {
      throw new InternalServerErrorException(
        'DOCUMENTS_MASTER_KEY_BASE64 is not configured',
      );
    }

    const key = Buffer.from(raw, 'base64');
    if (key.length !== 32) {
      throw new InternalServerErrorException(
        'DOCUMENTS_MASTER_KEY_BASE64 must be 32 bytes (base64-encoded)',
      );
    }
    return key;
  }

  encryptJson(input: unknown): EncryptedBlob {
    const keyVersion = 1;
    const key = this.getKey(keyVersion);
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const plaintext = Buffer.from(JSON.stringify(input), 'utf8');
    const ciphertext = Buffer.concat([
      cipher.update(plaintext),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return { alg: 'AES-256-GCM', keyVersion, iv, tag, ciphertext };
  }

  decryptJson(blob: EncryptedBlob): unknown {
    if (blob.alg !== 'AES-256-GCM') {
      throw new InternalServerErrorException(
        'Unsupported encryption algorithm',
      );
    }
    const key = this.getKey(blob.keyVersion);
    const decipher = createDecipheriv('aes-256-gcm', key, blob.iv);
    decipher.setAuthTag(blob.tag);
    const plaintext = Buffer.concat([
      decipher.update(blob.ciphertext),
      decipher.final(),
    ]);
    try {
      return JSON.parse(plaintext.toString('utf8'));
    } catch {
      throw new InternalServerErrorException('Failed to decrypt payload');
    }
  }
}
