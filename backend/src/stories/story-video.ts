import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import ffmpeg from 'ffmpeg-static';
import ffprobe from 'ffprobe-static';
import { STORY_VIDEO_MAX_BYTES } from './story-rules';

const run = promisify(execFile);
// Bound expensive transcodes per process, without an unbounded in-memory queue.
let processing = 0;

export async function prepareStoryVideo(buffer: Buffer) {
  if (!buffer.length || buffer.length > STORY_VIDEO_MAX_BYTES)
    throw new BadRequestException('Максимальный размер видео — 100 МБ');
  if (processing >= 2)
    throw new ServiceUnavailableException(
      'Обрабатываются другие видео. Попробуйте немного позже',
    );
  processing++;
  let dir: string | undefined;
  try {
    dir = await mkdtemp(join(tmpdir(), 'story-video-'));
    const source = join(dir, 'source');
    const video = join(dir, 'video.mp4');
    const poster = join(dir, 'poster.jpg');
    await writeFile(source, buffer);
    const probe = await run(
      process.env.FFPROBE_PATH || ffprobe.path,
      [
        '-v',
        'error',
        '-protocol_whitelist',
        'file',
        '-show_streams',
        '-show_format',
        '-of',
        'json',
        source,
      ],
      { timeout: 15000, maxBuffer: 1024 * 1024 },
    );
    const info = JSON.parse(probe.stdout) as {
      format?: { duration?: string; format_name?: string };
      streams?: {
        codec_type?: string;
        duration?: string;
        width?: number;
        height?: number;
      }[];
    };
    const stream = info.streams?.find((s) => s.codec_type === 'video');
    const duration = Math.max(
      Number(info.format?.duration) || 0,
      ...(info.streams ?? []).map((s) => Number(s.duration) || 0),
    );
    if (
      !stream ||
      !Number.isFinite(duration) ||
      duration <= 0 ||
      duration > 120
    )
      throw new BadRequestException('Видео должно длиться не больше 2 минут');
    if (
      !info.format?.format_name?.match(/mov|mp4|matroska|webm/) ||
      !stream.width ||
      !stream.height ||
      stream.width > 4096 ||
      stream.height > 4096
    )
      throw new BadRequestException(
        'Загрузите MP4, MOV или WebM с разрешением до 4K',
      );
    const binary = process.env.FFMPEG_PATH || ffmpeg;
    if (!binary)
      throw new ServiceUnavailableException('Обработчик видео недоступен');
    await run(
      binary,
      [
        '-nostdin',
        '-v',
        'error',
        '-protocol_whitelist',
        'file',
        '-threads',
        '2',
        '-i',
        source,
        '-map',
        '0:v:0',
        '-map',
        '0:a:0?',
        '-map_metadata',
        '-1',
        '-vf',
        "scale=w='min(1280,iw)':h='min(1280,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
        '-c:v',
        'libx264',
        '-threads',
        '2',
        '-preset',
        'veryfast',
        '-crf',
        '25',
        '-pix_fmt',
        'yuv420p',
        '-r',
        '30',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-movflags',
        '+faststart',
        '-t',
        '120',
        '-fs',
        String(STORY_VIDEO_MAX_BYTES),
        video,
      ],
      { timeout: 180000, maxBuffer: 1024 * 1024 },
    );
    await run(
      binary,
      [
        '-nostdin',
        '-v',
        'error',
        '-threads',
        '2',
        '-i',
        video,
        '-frames:v',
        '1',
        '-q:v',
        '3',
        poster,
      ],
      { timeout: 15000, maxBuffer: 1024 * 1024 },
    );
    return {
      video: await readFile(video),
      poster: await readFile(poster),
      duration,
    };
  } catch (error) {
    if (
      error instanceof BadRequestException ||
      error instanceof ServiceUnavailableException
    )
      throw error;
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      throw new ServiceUnavailableException('Обработчик видео недоступен');
    throw new BadRequestException(
      'Не удалось прочитать видео. Загрузите исправный MP4, MOV или WebM до 2 минут',
    );
  } finally {
    processing--;
    if (dir) await rm(dir, { recursive: true, force: true });
  }
}
