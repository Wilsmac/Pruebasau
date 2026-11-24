import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { downloadContentFromMessage } = require('baron-baileys-v2');
import { config } from './config.js';
import { downloadQuotedVideo, getQuotedMessage, makeStickerAndAudio } from './media.js';

export async function handleSau(sock, message) {
  const jid = message.key.remoteJid;
  const quoted = getQuotedMessage(message.message);

  if (!quoted) {
    await sock.sendMessage(jid, {
      text: 'Responde a un video con *.sau* para convertirlo en sticker animado con audio.'
    }, { quoted: message });
    return;
  }

  const hasVideo = Boolean(quoted.videoMessage || quoted.ptvMessage?.videoMessage);
  if (!hasVideo) {
    await sock.sendMessage(jid, { text: 'El mensaje citado no contiene un video.' }, { quoted: message });
    return;
  }

  await sock.sendMessage(jid, { text: '⏳ Preparando el sticker animado con audio…' }, { quoted: message });

  try {
    const videoBuffer = await downloadQuotedVideo(downloadContentFromMessage, quoted);
    const { sticker, audio } = await makeStickerAndAudio(
      videoBuffer,
      config.maxVideoSeconds,
      config.maxAudioSeconds
    );

    // API experimental del fork: stickerAudio hace que Baileys adjunte
    // un AudioMessage dentro de StickerMessage.audioMessage (campo protobuf 26).
    // La compatibilidad real depende de la versión de WhatsApp del destinatario.
    await sock.sendMessage(jid, {
      sticker,
      stickerAudio: audio,
      isAnimated: true,
      mimetype: 'image/webp'
    }, { quoted: message });

  } catch (error) {
    console.error('[.sau]', error);
    await sock.sendMessage(jid, {
      text: `No se pudo crear/enviar el sticker.\n${error.message}\n\nSi el error es de formato/protocolo, puede que esta compilación experimental no sea compatible con tu sesión de WhatsApp.`
    }, { quoted: message });
  }
}
