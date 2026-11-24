import 'dotenv/config';

export const config = {
  prefix: process.env.PREFIX || '.',
  maxVideoSeconds: Number(process.env.MAX_VIDEO_SECONDS || 10),
  maxAudioSeconds: Number(process.env.MAX_AUDIO_SECONDS || 10),
  tempDir: new URL('../media/tmp/', import.meta.url)
};
