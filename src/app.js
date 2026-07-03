import * as SignalClient from '@privacyresearch/libsignal-protocol-typescript';
import io from 'socket.io-client';
import { SignalProtocolStore, arrayBufferToString } from './store.js';

const socket = io();
const store = new SignalProtocolStore();

let myUsername = null;
const DEVICE_ID = 1; // adresse Signal = (username, deviceId)

const logEl = document.getElementById('log');
const log = (msg) => {
  const li = document.createElement('li');
  li.textContent = msg;
  logEl.appendChild(li);
};

// ---------- 1. Génération des clés au premier lancement ----------
async function generateAndRegister(username) {
  myUsername = username;

  const identityKeyPair = await SignalClient.KeyHelper.generateIdentityKeyPair();
  const registrationId = SignalClient.KeyHelper.generateRegistrationId();

  store.put('identityKey', identityKeyPair);
  store.put('registrationId', registrationId);

  const preKey = await SignalClient.KeyHelper.generatePreKey(registrationId);
  const signedPreKey = await SignalClient.KeyHelper.generateSignedPreKey(
    identityKeyPair,
    registrationId
  );

  await store.storePreKey(preKey.keyId, preKey.keyPair);
  await store.storeSignedPreKey(signedPreKey.keyId, signedPreKey.keyPair);

  // C'est CE bundle (clés publiques uniquement) qui part sur le serveur.
  // Les clés privées ci-dessus (identityKeyPair.privKey, preKey.keyPair.privKey...)
  // ne quittent JAMAIS le navigateur.
  const preKeyBundle = {
    registrationId,
    identityKey: identityKeyPair.pubKey,
    signedPreKey: {
      keyId: signedPreKey.keyId,
      publicKey: signedPreKey.keyPair.pubKey,
      signature: signedPreKey.signature,
    },
    preKey: {
      keyId: preKey.keyId,
      publicKey: preKey.keyPair.pubKey,
    },
  };

  socket.emit('register', { username, keyBundle: preKeyBundle });
  log(`Inscrit en tant que ${username}. Clés générées localement.`);
}

// ---------- 2. Établir une session avec un contact ----------
async function getOrCreateSession(targetUsername) {
  const address = new SignalClient.SignalProtocolAddress(targetUsername, DEVICE_ID);
  const existing = await store.loadSession(address.toString());
  if (existing) return address;

  const bundle = await new Promise((resolve, reject) => {
    socket.emit('get-keys', targetUsername, (res) => {
      if (res.error) reject(new Error(res.error));
      else resolve(res);
    });
  });

  const sessionBuilder = new SignalClient.SessionBuilder(store, address);
  await sessionBuilder.processPreKey({
    registrationId: bundle.registrationId,
    identityKey: bundle.identityKey,
    signedPreKey: {
      keyId: bundle.signedPreKey.keyId,
      publicKey: bundle.signedPreKey.publicKey,
      signature: bundle.signedPreKey.signature,
    },
    preKey: {
      keyId: bundle.preKey.keyId,
      publicKey: bundle.preKey.publicKey,
    },
  });

  return address;
}

// ---------- 3. Chiffrer et envoyer ----------
async function sendMessage(targetUsername, plaintext) {
  const address = await getOrCreateSession(targetUsername);
  const cipher = new SignalClient.SessionCipher(store, address);

  const buffer = new TextEncoder().encode(plaintext).buffer;
  const ciphertext = await cipher.encrypt(buffer);

  socket.emit('send-message', {
    to: targetUsername,
    encryptedMessage: ciphertext, // { type, body } — body est déjà chiffré (Double Ratchet)
  });

  log(`Moi -> ${targetUsername}: ${plaintext}`);
}

// ---------- 4. Réception et déchiffrement ----------
socket.on('receive-message', async ({ from, encryptedMessage }) => {
  const address = new SignalClient.SignalProtocolAddress(from, DEVICE_ID);
  const cipher = new SignalClient.SessionCipher(store, address);

  let plaintextBuffer;
  if (encryptedMessage.type === 3) {
    // Premier message reçu de ce contact : contient un PreKeyMessage
    plaintextBuffer = await cipher.decryptPreKeyWhisperMessage(
      encryptedMessage.body,
      'binary'
    );
  } else {
    plaintextBuffer = await cipher.decryptWhisperMessage(
      encryptedMessage.body,
      'binary'
    );
  }

  const plaintext = new TextDecoder().decode(plaintextBuffer);
  log(`${from} -> Moi: ${plaintext}`);
});

// ---------- UI hooks ----------
document.getElementById('registerBtn').addEventListener('click', () => {
  const username = document.getElementById('username').value.trim();
  if (username) generateAndRegister(username);
});

document.getElementById('sendBtn').addEventListener('click', () => {
  const to = document.getElementById('target').value.trim();
  const msg = document.getElementById('message').value;
  if (to && msg) sendMessage(to, msg).catch((e) => log('Erreur: ' + e.message));
  document.getElementById('message').value = '';
});
