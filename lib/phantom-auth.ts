import bs58 from 'bs58';

export interface PhantomSignInMessage {
  domain: string;
  publicKey: string;
  nonce: string;
  statement: string;
}

export function createSignInMessage(publicKey: string): string {
  const domain = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
  const nonce = generateNonce();
  const statement = 'Sign this message to authenticate with Pillowtalk';

  return `${domain} wants you to sign in with your Solana account:
${publicKey}

${statement}

Nonce: ${nonce}`;
}

export function generateNonce(): string {
  return bs58.encode(crypto.getRandomValues(new Uint8Array(32)));
}

export async function signInWithPhantom(publicKey: string, signMessage: (message: Uint8Array) => Promise<Uint8Array>): Promise<{ publicKey: string; signature: string; message: string }> {
  try {
    const message = createSignInMessage(publicKey);
    const encodedMessage = new TextEncoder().encode(message);
    const signature = await signMessage(encodedMessage);

    return {
      publicKey,
      signature: bs58.encode(signature),
      message,
    };
  } catch (error) {
    console.error('Failed to sign message:', error);
    throw new Error('Failed to sign message with Phantom wallet');
  }
}
