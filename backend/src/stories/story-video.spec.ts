import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import ffmpeg from 'ffmpeg-static';
import { prepareStoryVideo } from './story-video';

describe('video processing with real binaries', () => {
  let dir: string;
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'story-video-qa-'));
  });
  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });
  async function clip(duration: number) {
    const path = join(dir, `${duration}.mp4`);
    await promisify(execFile)(ffmpeg!, [
      '-nostdin',
      '-v',
      'error',
      '-f',
      'lavfi',
      '-i',
      'color=c=green:s=64x64:r=1',
      '-t',
      String(duration),
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      path,
    ]);
    return readFile(path);
  }
  it('produces browser MP4 and JPEG for a two-minute clip', async () => {
    const media = await prepareStoryVideo(await clip(120));
    expect(media.duration).toBe(120);
    expect(media.video.subarray(4, 8).toString()).toBe('ftyp');
    expect(media.poster.subarray(0, 3)).toEqual(Buffer.from([255, 216, 255]));
  }, 30000);
  it('rejects 121 seconds and disguised non-video data', async () => {
    await expect(prepareStoryVideo(await clip(121))).rejects.toThrow('2 минут');
    await expect(prepareStoryVideo(Buffer.from('not a movie'))).rejects.toThrow(
      'Не удалось прочитать видео',
    );
  }, 30000);
});
