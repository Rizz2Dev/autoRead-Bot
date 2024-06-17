const {
  default:
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
} = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const pino = require('pino')
const cfonts = require('cfonts')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
const question = (text) => {
  return new Promise((resolve) => {
    rl.question(text, resolve)
  })
}

const { say } = cfonts
say('Wa\nAutoRead', {
  font: 'slick',
  align: 'center',
  gradient: ['blue', 'magenta']
})
say('WA AutoRead message created by Rizz2Dev', {
  font: 'console',
  align: 'center',
  gradient: ['yellow', 'magenta']
})

async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState("sessions")
  const sock = makeWASocket({
    printQRInTerminal: false,
    browser: ['Linux', 'Chrome', ''],
    auth: state,
    logger: pino({ level: 'silent' }),
    markOnlineOnConnect: false
  })
  if(!sock.authState.creds.registered) {
    const phoneNumber = await question("ENTER YOUR PHONE HERE: ")
    let code = await sock.requestPairingCode(phoneNumber)
        code = code?.match(/.{1,4}/g)?.join("-") || code;
    console.log('yourCode: ' + code)
  }
  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    
    if (connection === 'close') {
        let reason = new Boom(lastDisconnect?.error)?.output.statusCode;

        if (
            reason === DisconnectReason.badSession ||
            reason === DisconnectReason.connectionClosed ||
            reason === DisconnectReason.connectionLost ||
            reason === DisconnectReason.connectionReplaced ||
            reason === DisconnectReason.restartRequired ||
            reason === DisconnectReason.timedOut
        ) {
            connect();
        } else if (reason === DisconnectReason.loggedOut) {
            // Handle logout scenario if needed
        } else {
            sock.end(`Unknown DisconnectReason: ${reason}|${connection}`);
        }
    } else if (connection === 'open') {
        console.log('connected')
    }
  })
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type === 'notify') {
        for (const msg of messages) {
            const messageContent = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
            console.log(`
READ MESSAGES [
    FROM: ${msg.key.remoteJid.split('@')[0]}
    MESSAGE: ${messageContent}
]
`);
            
            await sock.readMessages([msg.key]);
        }
    }
  })
}

connect()