import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseEther, keccak256, toHex } from 'viem';
import { getContract } from './config';

/**
 * Hook for registering a robot on-chain
 */
export function useRegisterRobot() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const registerRobot = async (robotData) => {
    // Generate robot ID hash from name + timestamp
    const robotIdString = `${robotData.name}-${Date.now()}`;
    const robotIdHash = keccak256(toHex(robotIdString));

    // Mock metadata URI (in production, upload to IPFS first)
    const metadataURI = `ipfs://Qm${robotIdString.slice(0, 44)}`;

    // Call contract
    writeContract({
      ...getContract('RobotRegistry'),
      functionName: 'registerRobot',
      args: [robotIdHash, metadataURI],
      value: parseEther(robotData.stake_amount.toString()),
    });

    return { robotIdHash, metadataURI };
  };

  return {
    registerRobot,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Hook for buying YES shares in a market
 */
export function useBuyYes() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const buyYes = async (taskId, amount) => {
    // Convert task UUID to bytes32
    const taskIdHash = keccak256(toHex(taskId));

    writeContract({
      ...getContract('TaskMarket'),
      functionName: 'buyYes',
      args: [taskIdHash],
      value: parseEther(amount.toString()),
    });
  };

  return {
    buyYes,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Hook for buying NO shares in a market
 */
export function useBuyNo() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const buyNo = async (taskId, amount) => {
    // Convert task UUID to bytes32
    const taskIdHash = keccak256(toHex(taskId));

    writeContract({
      ...getContract('TaskMarket'),
      functionName: 'buyNo',
      args: [taskIdHash],
      value: parseEther(amount.toString()),
    });
  };

  return {
    buyNo,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Hook for redeeming winnings from a resolved market
 */
export function useRedeemWinnings() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const redeem = async (taskId) => {
    const taskIdHash = keccak256(toHex(taskId));

    writeContract({
      ...getContract('TaskMarket'),
      functionName: 'redeem',
      args: [taskIdHash],
    });
  };

  return {
    redeem,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Hook for voting on DAO proposals
 */
export function useVoteOnProposal() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const vote = async (proposalId, support) => {
    writeContract({
      ...getContract('EthicalDAO'),
      functionName: 'vote',
      args: [BigInt(proposalId), support],
    });
  };

  return {
    vote,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Hook to check if user is connected
 */
export function useIsConnected() {
  const { isConnected, address } = useAccount();
  return { isConnected, address };
}

/**
 * Helper to format transaction hash for explorer
 */
export function getTxUrl(hash) {
  return `https://opbnb-testnet.bscscan.com/tx/${hash}`;
}
