/**
 * Convert stereo audio buffer to mono
 * @param input Buffer of stereo audio
 * @returns
 */
export function convertStereoToMono(input: Buffer): Buffer {
  const stereoData = new Int16Array(input);
  const monoData = new Int16Array(stereoData.length / 2);
  for (let i = 0, j = 0; i < stereoData.length; i += 4) {
    monoData[j] = stereoData[i];
    j += 1;
    monoData[j] = stereoData[i + 1];
    j += 1;
  }
  return Buffer.from(monoData);
}

export function getDurationFromMonoBuffer(buffer: Buffer): number {
  const duration = buffer.length / 48000 / 2;
  return duration;
}

export const changeSampleRate = (
  buffer: Buffer,
  fromSampleRate: number,
  toSampleRate: number,
): Buffer => {
  const resampledBuffer = new Int16Array(
    Math.round((buffer.length * toSampleRate) / fromSampleRate),
  );
  const resampleRatio = fromSampleRate / toSampleRate;
  for (let i = 0; i < resampledBuffer.length; i++) {
    resampledBuffer[i] = buffer[Math.round(i * resampleRatio)];
  }
  return Buffer.from(resampledBuffer);
};

import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';

/**
 * Utility class for audio processing operations.
 */
class AudioUtils {
  /**
   * Converts mono 44.1kHz PCM audio to stereo 48kHz PCM audio.
   *
   * @param inputBuffer - The input PCM audio buffer in mono 44.1kHz format (signed 16-bit little-endian)
   * @returns Promise resolving to a Buffer containing stereo 48kHz PCM audio (signed 16-bit little-endian)
   * @throws {Error} If FFmpeg processing fails
   *
   */
  static async mono441kHzToStereo48kHz(inputBuffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      ffmpeg(Readable.from(inputBuffer))
        .inputFormat('s16le')
        .inputOptions(['-ar 44100', '-ac 1', '-f s16le'])
        .outputFormat('s16le')
        .outputOptions([
          '-ar 48000',
          '-ac 2',
          '-af aresample=async=1:first_pts=0',
          '-f s16le',
        ])
        .on('error', (err) => reject(new Error(`FFmpeg error: ${err.message}`)))
        .pipe()
        .on('data', (chunk) => chunks.push(chunk))
        .on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
  /**
   * Converts mono 24kHz PCM audio to stereo 48kHz PCM audio.
   *
   * @param inputBuffer - The input PCM audio buffer in mono 24kHz format (signed 16-bit little-endian)
   * @returns Promise resolving to a Buffer containing stereo 48kHz PCM audio (signed 16-bit little-endian)
   * @throws {Error} If FFmpeg processing fails
   *
   */
  static async mono24khzToStereo48kHz(inputBuffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      ffmpeg(Readable.from(inputBuffer))
        .inputFormat('s16le')
        .inputOptions(['-ar 24000', '-ac 1', '-f s16le'])
        .outputFormat('s16le')
        .outputOptions([
          '-ar 48000',
          '-ac 2',
          '-af aresample=async=1:first_pts=0',
          '-f s16le',
        ])
        .on('error', (err) => reject(new Error(`FFmpeg error: ${err.message}`)))
        .pipe()
        .on('data', (chunk) => chunks.push(chunk))
        .on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
}

// resample16kTo24kMono(inputBuffer: Buffer): Promise<Buffer> {
export const resample16kTo24kMono = (inputBuffer: Buffer): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    ffmpeg(Readable.from(inputBuffer))
      .inputFormat('s16le')
      .inputOptions(['-ar 16000', '-ac 1', '-f s16le'])
      .outputFormat('s16le')
      .outputOptions([
        '-ar 24000',
        '-ac 1',
        '-af aresample=async=1:first_pts=0',
        '-f s16le',
      ])
      .on('error', (err) => reject(new Error(`FFmpeg error: ${err.message}`)))
      .pipe()
      .on('data', (chunk) => chunks.push(chunk))
      .on('end', () => resolve(Buffer.concat(chunks)));
  });
};

export { AudioUtils };
