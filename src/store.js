// Implémentation minimale du "SignalProtocolStore" attendu par
// @privacyresearch/libsignal-protocol-typescript.
// ⚠️ En mémoire uniquement (perdu au refresh). Pour la prod, il faudrait
// persister ça dans IndexedDB, chiffré avec un mot de passe utilisateur.

export class SignalProtocolStore {
  constructor() {
    this.store = {};
  }

  getIdentityKeyPair() {
    return Promise.resolve(this.get('identityKey'));
  }

  getLocalRegistrationId() {
    return Promise.resolve(this.get('registrationId'));
  }

  put(key, value) {
    if (value === undefined) throw new Error('Tried to store undefined for key ' + key);
    this.store[key] = value;
  }

  get(key, defaultValue) {
    if (key in this.store) return this.store[key];
    return defaultValue;
  }

  remove(key) {
    delete this.store[key];
  }

  isTrustedIdentity(identifier, identityKey) {
    const trusted = this.get('identityKey' + identifier);
    if (!trusted) return Promise.resolve(true); // TOFU : trust on first use
    return Promise.resolve(
      arrayBufferToString(trusted) === arrayBufferToString(identityKey)
    );
  }

  loadIdentityKey(identifier) {
    return Promise.resolve(this.get('identityKey' + identifier));
  }

  saveIdentity(identifier, identityKey) {
    const existing = this.get('identityKey' + identifier);
    this.put('identityKey' + identifier, identityKey);
    if (existing && arrayBufferToString(existing) !== arrayBufferToString(identityKey)) {
      return Promise.resolve(true); // la clé a changé (potentielle alerte sécurité côté UI)
    }
    return Promise.resolve(false);
  }

  loadPreKey(keyId) {
    let res = this.get('25519KeypreKey' + keyId);
    if (res !== undefined) res = { pubKey: res.pubKey, privKey: res.privKey };
    return Promise.resolve(res);
  }

  storePreKey(keyId, keyPair) {
    return Promise.resolve(this.put('25519KeypreKey' + keyId, keyPair));
  }

  removePreKey(keyId) {
    return Promise.resolve(this.remove('25519KeypreKey' + keyId));
  }

  loadSignedPreKey(keyId) {
    let res = this.get('25519KeysignedKey' + keyId);
    if (res !== undefined) res = { pubKey: res.pubKey, privKey: res.privKey };
    return Promise.resolve(res);
  }

  storeSignedPreKey(keyId, keyPair) {
    return Promise.resolve(this.put('25519KeysignedKey' + keyId, keyPair));
  }

  removeSignedPreKey(keyId) {
    return Promise.resolve(this.remove('25519KeysignedKey' + keyId));
  }

  loadSession(identifier) {
    return Promise.resolve(this.get('session' + identifier));
  }

  storeSession(identifier, record) {
    return Promise.resolve(this.put('session' + identifier, record));
  }

  removeSession(identifier) {
    return Promise.resolve(this.remove('session' + identifier));
  }

  removeAllSessions(identifier) {
    for (const id in this.store) {
      if (id.startsWith('session' + identifier)) {
        delete this.store[id];
      }
    }
    return Promise.resolve();
  }
}

export function arrayBufferToString(buf) {
  return Buffer.from(buf).toString('base64');
}
