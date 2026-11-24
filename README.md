# SAU Sticker Bot

Bot mínimo de WhatsApp con un solo comando: **`.sau`**.

## Qué hace

1. Responde a un video con `.sau`.
2. Descarga el video citado.
3. Genera una animación WebP de 512×512.
4. Extrae hasta 10 segundos de audio y lo codifica como Opus/Ogg.
5. Intenta enviar ambos como un único sticker con sonido usando el campo experimental `stickerAudio`.

## Importante: estado experimental

WhatsApp ha incorporado en builds recientes el campo `StickerMessage.audioMessage` (campo protobuf 26), pero la función de stickers con sonido sigue en desarrollo y su disponibilidad puede variar por versión/cuenta/dispositivo. La documentación consultada describe el soporte de `stickerAudio` en `baron-baileys-v2`, pero indica que la ruta de envío no fue probada de extremo a extremo. **No se garantiza que WhatsApp acepte el mensaje ni que el sonido aparezca en todos los clientes.**

El repositorio `7ucg/baron-baileys-v2` indica que ya no se mantiene y que el desarrollo continúa en `velowa`. Se usa aquí únicamente porque es el fork cuya documentación describe explícitamente `stickerAudio`. Antes de usarlo con tu número principal, prueba con una cuenta secundaria.

## Requisitos

- Node.js 20 o superior
- FFmpeg instalado y disponible como comando `ffmpeg`
- Una cuenta de WhatsApp para vincular como dispositivo
- Conexión a internet

## Instalación en Termux (Android)

```bash
pkg update && pkg upgrade
pkg install nodejs-lts ffmpeg git
```

Descomprime el proyecto, entra en la carpeta y ejecuta:

```bash
cp .env.example .env
npm install
npm start
```

Al iniciar, elige el método de vinculación:

```text
1. Conectar mediante código QR
2. Conectar mediante código de WhatsApp (8 dígitos)
```

- **Opción 1:** escanea el QR desde WhatsApp → Dispositivos vinculados.
- **Opción 2:** escribe tu número en formato internacional, con código de país y sin `+` ni espacios (por ejemplo, `502XXXXXXXX`). Después, en WhatsApp entra en Dispositivos vinculados → Vincular dispositivo → Vincular con número de teléfono e introduce el código que muestra Termux.

El código de vinculación lo genera WhatsApp/Baileys y puede cambiar en cada intento. No compartas ese código con nadie.

## Uso

En un chat, responde a un video con:

```text
.sau
```

El bot genera el sticker y lo envía al mismo chat.

## Límites

- El video se recorta a los primeros 10 segundos.
- El audio se recorta a los primeros 10 segundos.
- Si el video no tiene pista de audio, el envío puede fallar o generar un sticker sin audio.
- El tamaño final y la compatibilidad dependen del video y del cliente de WhatsApp.
- Esta es una prueba técnica; el protocolo puede cambiar sin aviso.

## Privacidad

La sesión de WhatsApp se guarda localmente en `auth/`. No compartas esa carpeta ni subas sus archivos a GitHub.
