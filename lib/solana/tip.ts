import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';

// Company wallet address (receives 20% of tips)
export const COMPANY_WALLET = 'AGNTj3MU4BK1Aj2XqXRTdGFy4noUmt5wLVvAyzMnHPc4';

// Performer wallet address (receives 80% of tips)
export const PERFORMER_WALLET = 'mkuNXJEa1xLped556LhNH6H9XwTqRyYeDB2SryQFUFQ';

// Devnet RPC endpoint
export const DEVNET_RPC = 'https://api.devnet.solana.com';

// Fixed tip amount for MVP (0.01 SOL)
export const TIP_AMOUNT_SOL = 0.01;

/**
 * Send a split tip on devnet
 * 20% goes to company wallet, 80% goes to performer wallet
 * @param connection Solana connection instance
 * @param senderPublicKey Public key of the sender (viewer's wallet)
 * @param signTransaction Function to sign the transaction from wallet adapter
 * @param sendTransaction Function to send the transaction from wallet adapter
 * @returns Transaction signature
 */
export async function sendTip(
  connection: Connection,
  senderPublicKey: PublicKey,
  signTransaction: (transaction: Transaction) => Promise<Transaction>,
  sendTransaction: (transaction: Transaction, connection: Connection) => Promise<string>
): Promise<string> {
  try {
    // Create wallet public keys
    const companyPublicKey = new PublicKey(COMPANY_WALLET);
    const performerPublicKey = new PublicKey(PERFORMER_WALLET);

    // Convert SOL to lamports (1 SOL = 1,000,000,000 lamports)
    const totalLamports = TIP_AMOUNT_SOL * LAMPORTS_PER_SOL;

    // Calculate split: 20% to company, 80% to performer
    const companyShare = Math.floor(totalLamports * 0.20);
    const performerShare = totalLamports - companyShare;

    console.log(`Splitting tip of ${TIP_AMOUNT_SOL} SOL (${totalLamports} lamports):`);
    console.log(`  Company (20%): ${companyShare} lamports (${companyShare / LAMPORTS_PER_SOL} SOL)`);
    console.log(`  Performer (80%): ${performerShare} lamports (${performerShare / LAMPORTS_PER_SOL} SOL)`);

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

    // Create transaction with two transfer instructions
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: senderPublicKey,
    });

    // Add company transfer (20%)
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: senderPublicKey,
        toPubkey: companyPublicKey,
        lamports: companyShare,
      })
    );

    // Add performer transfer (80%)
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: senderPublicKey,
        toPubkey: performerPublicKey,
        lamports: performerShare,
      })
    );

    // Send transaction using wallet adapter
    const signature = await sendTransaction(transaction, connection);

    console.log('Split tip transaction sent:', signature);
    console.log('View on Solana Explorer:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    });

    if (confirmation.value.err) {
      throw new Error('Transaction failed: ' + JSON.stringify(confirmation.value.err));
    }

    console.log('Split tip transaction confirmed!');
    return signature;
  } catch (error) {
    console.error('Error sending split tip:', error);
    throw error;
  }
}

/**
 * Get the Solana Explorer URL for a transaction
 */
export function getExplorerUrl(signature: string, cluster: 'devnet' | 'mainnet-beta' = 'devnet'): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}
