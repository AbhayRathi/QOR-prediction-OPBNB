import { toast } from 'sonner';
import { getTxUrl } from '@/web3/hooks';

/**
 * Show transaction pending toast
 */
export function showTxPending(message = 'Transaction pending...') {
  return toast.loading(message, {
    description: 'Waiting for confirmation...',
  });
}

/**
 * Show transaction success toast
 */
export function showTxSuccess(hash, message = 'Transaction successful!') {
  toast.success(message, {
    description: (
      <a 
        href={getTxUrl(hash)} 
        target="_blank" 
        rel="noopener noreferrer"
        style={{ color: '#22d3ee', textDecoration: 'underline' }}
      >
        View on Explorer →
      </a>
    ),
  });
}

/**
 * Show transaction error toast
 */
export function showTxError(error, message = 'Transaction failed') {
  const errorMessage = error?.message || error?.toString() || 'Unknown error';
  toast.error(message, {
    description: errorMessage.slice(0, 100),
  });
}

/**
 * Show wallet not connected warning
 */
export function showConnectWalletWarning() {
  toast.warning('Wallet not connected', {
    description: 'Please connect your wallet to continue',
  });
}
