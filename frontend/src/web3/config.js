import { http, createConfig } from 'wagmi'
import { injected } from 'wagmi/connectors'

// Define opBNB Testnet chain
export const opBNBTestnet = {
  id: 5611,
  name: 'opBNB Testnet',
  network: 'opbnb-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'BNB',
    symbol: 'BNB',
  },
  rpcUrls: {
    default: { http: ['https://opbnb-testnet-rpc.bnbchain.org'] },
    public: { http: ['https://opbnb-testnet-rpc.bnbchain.org'] },
  },
  blockExplorers: {
    default: { name: 'opBNBScan', url: 'https://opbnb-testnet.bscscan.com' },
  },
  testnet: true,
}

// Create wagmi config
export const config = createConfig({
  chains: [opBNBTestnet],
  connectors: [injected()],
  transports: {
    [opBNBTestnet.id]: http(),
  },
})

// Mock contract addresses (will be replaced after deployment)
export const CONTRACT_ADDRESSES = {
  RobotRegistry: '0x0000000000000000000000000000000000000001',
  TaskMarket: '0x0000000000000000000000000000000000000002',
  QuantumOracle: '0x0000000000000000000000000000000000000003',
  EthicalDAO: '0x0000000000000000000000000000000000000004',
}

// Minimal ABIs for now (will be replaced with full ABIs after deployment)
export const ABIS = {
  RobotRegistry: [
    {
      inputs: [
        { name: 'idHash', type: 'bytes32' },
        { name: 'metadataURI', type: 'string' }
      ],
      name: 'registerRobot',
      outputs: [],
      stateMutability: 'payable',
      type: 'function'
    },
    {
      inputs: [{ name: 'robotId', type: 'bytes32' }],
      name: 'getRobot',
      outputs: [{
        components: [
          { name: 'owner', type: 'address' },
          { name: 'metadataURI', type: 'string' },
          { name: 'reputation', type: 'int256' },
          { name: 'stake', type: 'uint256' },
          { name: 'active', type: 'bool' },
          { name: 'registeredAt', type: 'uint256' }
        ],
        name: '',
        type: 'tuple'
      }],
      stateMutability: 'view',
      type: 'function'
    }
  ],
  TaskMarket: [
    {
      inputs: [{ name: 'taskId', type: 'bytes32' }],
      name: 'buyYes',
      outputs: [],
      stateMutability: 'payable',
      type: 'function'
    },
    {
      inputs: [{ name: 'taskId', type: 'bytes32' }],
      name: 'buyNo',
      outputs: [],
      stateMutability: 'payable',
      type: 'function'
    },
    {
      inputs: [{ name: 'taskId', type: 'bytes32' }],
      name: 'redeem',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function'
    }
  ],
  EthicalDAO: [
    {
      inputs: [
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'target', type: 'address' },
        { name: 'callData', type: 'bytes' }
      ],
      name: 'propose',
      outputs: [{ name: '', type: 'uint256' }],
      stateMutability: 'nonpayable',
      type: 'function'
    },
    {
      inputs: [
        { name: 'proposalId', type: 'uint256' },
        { name: 'support', type: 'bool' }
      ],
      name: 'vote',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function'
    }
  ]
}

// Helper to get contract config
export function getContract(contractName) {
  return {
    address: CONTRACT_ADDRESSES[contractName],
    abi: ABIS[contractName] || [],
  }
}
