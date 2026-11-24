import { createRequire } from 'node:module';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import { handleSau } from './command.js';
import { config } from './config.js';

const require = createRequire(import.meta.url);
const baileys = require('baron-baileys-v2');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = baileys;

if (!makeWASocket || !useMultiFileAuthState) {
  throw new Error('No se pudieron cargar makeWASocket/useMultiFileAuthState desde baron-baileys-v2.');
}

const rl = createInterface({ input, output });
const ask = async (question) => (await rl.question(question)).trim();

async function chooseConnectionMethod() {
  console.log('\\n================================');
  console.log('       SAU STICKER BOT');
  console.log('================================');
  console.log('1. Conectar mediante código QR');
  console.log('2. Conectar mediante código de WhatsApp (8 dígitos)');

  while (true) {
    const choice = await ask('\\nSelecciona un método (1 o 2): ');
    if (choice === '1' || choice === '2') return choice;

    console.log('Opción no válida. Escribe 1 o 2.');
  }
}

let connecting = false;
let selectedMethod;
let pairingCodeRequested = false;

async function startBot() {
  if (connecting) return;
  connecting = true;

  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    markOnlineOnConnect: false,
    browser: ['SAU Sticker Bot', 'Chrome', '1.0.0']
  });

  sock.ev.on('creds.update', saveCreds);

  // Para el método de código, solicita el número en formato internacional,
  // sin +, espacios ni guiones (ejemplo: 502XXXXXXXX).
  if (selectedMethod === '2' && !state.creds.registered && !pairingCodeRequested) {
    pairingCodeRequested = true;
    try {
      const phoneNumber = (await ask(
        '\\nEscribe tu número con código de país, sin + ni espacios (ej. 502XXXXXXXX): '
      )).replace(/[^0-9]/g, '');

      if (!phoneNumber || phoneNumber.length < 8) {
        throw new Error('Número no válido. Reinicia el bot e inténtalo de nuevo.');
      }

      const code = await sock.requestPairingCode(phoneNumber);
      const formatted = String(code).match(/.{1,4}/g)?.join('-') || code;
      console.log('\\n================================');
      console.log(`Código de vinculación: ${formatted}`);
      console.log('================================');
      console.log('En WhatsApp: Dispositivos vinculados → Vincular dispositivo →');
      console.log('Vincular con número de teléfono y escribe el código mostrado.');
    } catch (error) {
      console.error('No se pudo generar el código de vinculación:', error.message);
      connecting = false;
      rl.close();
      process.exitCode = 1;
      return;
    }
  }

  sock.ev.on('connection.update', ({ connection, qr, lastDisconnect }) => {
    if (qr && selectedMethod === '1') {
      qrcode.generate(qr, { small: true });
      console.log('Escanea el QR desde WhatsApp → Dispositivos vinculados.');
    }

    if (connection === 'open') {
      console.log('\\n✅ SAU Sticker Bot conectado. Comando disponible: .sau');
      connecting = false;
      if (!rl.closed) rl.close();
    }

    if (connection === 'close') {
      connecting = false;
      const status = lastDisconnect?.error?.output?.statusCode;
      if (status !== DisconnectReason.loggedOut) {
        console.log('Conexión cerrada; reconectando…');
        setTimeout(() => startBot().catch(console.error), 2500);
      } else {
        console.log('Sesión cerrada. Borra ./auth solo si deseas volver a vincular el dispositivo.');
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const message of messages) {
      if (!message.message || message.key.fromMe) continue;
      const text = message.message.conversation
        || message.message.extendedTextMessage?.text
        || '';
      if (text.trim().toLowerCase() === `${config.prefix}sau`) {
        await handleSau(sock, message);
      }
    }
  });
}

selectedMethod = await chooseConnectionMethod();
await startBot().catch(error => {
  connecting = false;
  console.error('No se pudo iniciar el bot:', error);
  if (!rl.closed) rl.close();
});
