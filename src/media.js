import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

function runFFmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg terminó con código ${code}: ${stderr.slice(-1200)}`));
    });
  });
}

export async function makeStickerAndAudio(inputBuffer, maxVideoSeconds = 10, maxAudioSeconds = 10) {
  const work = await mkdtemp(join(tmpdir(), 'sau-bot-'));
  const input = join(work, 'input-video');
  const webpPath = join(work, 'sticker.webp');
  const audioPath = join(work, 'audio.ogg');

  try {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(input, inputBuffer);

    // La imagen animada y el audio se preparan por separado.
    // El audio se limita a 10 s para coincidir con el formato experimental.
    await runFFmpeg([
      '-y', '-i', input, '-t', String(maxVideoSeconds), '-an',
      '-vf', 'fps=15,scale=512:512:force_original_aspect_ratio=decrease:flags=lanczos,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=yuva420p',
      '-loop', '0', '-c:v', 'libwebp', '-q:v', '70', '-compression_level', '6',
      webpPath
    ]);

    await runFFmpeg([
      '-y', '-i', input, '-vn', '-t', String(maxAudioSeconds),
      '-ac', '1', '-ar', '48000', '-c:a', 'libopus', '-b:a', '48k',
      '-avoid_negative_ts', 'make_zero', audioPath
    ]);

    return {
      sticker: await readFile(webpPath),
      audio: await readFile(audioPath)
    };
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

export async function downloadQuotedVideo(downloadContentFromMessage, quotedMessage) {
  const video = quotedMessage.videoMessage || quotedMessage.ptvMessage?.videoMessage;
  if (!video) throw new Error('Responde directamente a un video o video corto.');
  const stream = await downloadContentFromMessage(video, 'video');
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export function unwrapMessage(message) {
  let current = message;
  while (current?.ephemeralMessage || current?.viewOnceMessage || current?.viewOnceMessageV2) {
    current = current.ephemeralMessage?.message
      || current.viewOnceMessage?.message
      || current.viewOnceMessageV2?.message;
  }
  return current || {};
}

export function getQuotedMessage(message) {
  const content = unwrapMessage(message);
  const body = content.conversation ? null : content.extendedTextMessage;
  const context = body?.contextInfo
    || content.imageMessage?.contextInfo
    || content.videoMessage?.contextInfo;
  return context?.quotedMessage ? unwrapMessage(context.quotedMessage) : null;
}
