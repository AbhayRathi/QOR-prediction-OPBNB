import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';

export function WalletConnect() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="wallet-connected" data-testid="wallet-connected">
        <div className="wallet-info">
          <div className="wallet-address">
            {address.slice(0, 6)}...{address.slice(-4)}
          </div>
          {chain && (
            <div className="wallet-chain">
              {chain.name}
            </div>
          )}
        </div>
        <Button 
          onClick={() => disconnect()} 
          variant="outline"
          size="sm"
          data-testid="disconnect-wallet-btn"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="wallet-disconnected">
      <Button
        onClick={() => {
          const connector = connectors[0];
          if (connector) {
            connect({ connector });
          }
        }}
        disabled={isPending}
        data-testid="connect-wallet-btn"
        className="connect-wallet-btn"
      >
        {isPending ? 'Connecting...' : 'Connect Wallet'}
      </Button>
    </div>
  );
}
