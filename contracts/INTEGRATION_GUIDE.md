# 🔌 Integration Guide: Connecting Smart Contracts to QOR App

This guide shows how to replace the mocked backend with real smart contract interactions.

## 📋 Overview

**Current State**: Backend mocks all blockchain operations in MongoDB
**Target State**: Backend/Frontend calls real smart contracts on opBNB

## 🎯 Integration Strategy

We have **two options**:

### Option A: Hybrid (Recommended for MVP)
- Keep MongoDB for fast queries/indexing
- Contracts as source of truth
- Backend syncs contract events to MongoDB
- Best of both worlds: speed + decentralization

### Option B: Full On-Chain
- All state on contracts
- Frontend reads directly from blockchain
- Slower but fully decentralized

**Let's implement Option A (Hybrid)**

---

## Step 1: Install Web3 Libraries

### Backend
```bash
cd /app/backend
pip install web3 eth-account
pip freeze > requirements.txt
```

### Frontend
```bash
cd /app/frontend
yarn add wagmi viem @tanstack/react-query @rainbow-me/rainbowkit
```

---

## Step 2: Backend Integration

I'll create a Web3 service layer that wraps contract interactions:

### File: `/app/backend/web3_service.py`

```python
from web3 import Web3
from eth_account import Account
import json
import os
from pathlib import Path

class Web3Service:
    def __init__(self):
        # Connect to opBNB
        self.w3 = Web3(Web3.HTTPProvider(os.getenv('OPBNB_RPC_URL')))
        
        # Load deployment info
        deployment_file = Path(__file__).parent.parent / 'contracts/deployments/opbnbTestnet.json'
        with open(deployment_file) as f:
            self.deployment = json.load(f)
        
        # Initialize contracts
        self.robot_registry = self._load_contract('RobotRegistry')
        self.task_market = self._load_contract('TaskMarket')
        self.quantum_oracle = self._load_contract('QuantumOracle')
        self.ethical_dao = self._load_contract('EthicalDAO')
        
        # Oracle account (for signing transactions)
        self.oracle_account = Account.from_key(os.getenv('ORACLE_PRIVATE_KEY'))
    
    def _load_contract(self, name):
        """Load contract ABI and create instance"""
        artifact_path = Path(__file__).parent.parent / f'contracts/artifacts/{name}.sol/{name}.json'
        with open(artifact_path) as f:
            artifact = json.load(f)
        
        address = self.deployment['contracts'][name]
        return self.w3.eth.contract(address=address, abi=artifact['abi'])
    
    def register_robot(self, robot_id_hash, metadata_uri, owner_address, stake_wei):
        """Register robot on-chain"""
        # This would be called by frontend directly via MetaMask
        # Backend just stores the event data
        pass
    
    def get_robot(self, robot_id_hash):
        """Fetch robot data from contract"""
        return self.robot_registry.functions.getRobot(robot_id_hash).call()
    
    def submit_optimization_result(self, task_id, solution_uri, score):
        """Submit optimization result as oracle"""
        tx = self.quantum_oracle.functions.submitResult(
            task_id, solution_uri, score
        ).build_transaction({
            'from': self.oracle_account.address,
            'nonce': self.w3.eth.get_transaction_count(self.oracle_account.address),
            'gas': 200000,
            'gasPrice': self.w3.eth.gas_price
        })
        
        signed_tx = self.oracle_account.sign_transaction(tx)
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        
        return receipt
    
    def verify_task(self, task_id, robot_id, required_score, evidence_uri):
        """Verify task completion and finalize market"""
        tx = self.quantum_oracle.functions.verifyTask(
            task_id, robot_id, required_score, evidence_uri
        ).build_transaction({
            'from': self.oracle_account.address,
            'nonce': self.w3.eth.get_transaction_count(self.oracle_account.address),
            'gas': 300000,
            'gasPrice': self.w3.eth.gas_price
        })
        
        signed_tx = self.oracle_account.sign_transaction(tx)
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        
        return receipt

# Singleton instance
web3_service = Web3Service()
```

### Update Backend Routes

Modify `/app/backend/server.py` to use web3_service for oracle operations:

```python
# Add to server.py
from web3_service import web3_service

@api_router.post("/optimizer/optimize", response_model=OptimizeResult)
async def optimize_task(input: OptimizeRequest):
    # ... existing optimization logic ...
    
    # Submit to blockchain
    try:
        task_id_bytes = bytes.fromhex(input.task_id.replace('-', ''))
        receipt = web3_service.submit_optimization_result(
            task_id_bytes, 
            solution_uri, 
            int(score * 100)  # Convert to integer for Solidity
        )
        print(f"Optimization submitted on-chain: {receipt.transactionHash.hex()}")
    except Exception as e:
        print(f"Error submitting to chain: {e}")
    
    return result

@api_router.post("/oracle/verify", response_model=VerifyResult)
async def verify_task(input: VerifyRequest):
    # ... existing verification logic ...
    
    # Verify on blockchain
    try:
        task_id_bytes = bytes.fromhex(task_id.replace('-', ''))
        robot_id_bytes = bytes.fromhex(robot_id.replace('-', ''))
        
        receipt = web3_service.verify_task(
            task_id_bytes,
            robot_id_bytes,
            int(task["required_score"] * 100),
            input.evidence_uri
        )
        print(f"Verification submitted on-chain: {receipt.transactionHash.hex()}")
    except Exception as e:
        print(f"Error verifying on chain: {e}")
    
    return result
```

---

## Step 3: Frontend Integration

### Configure wagmi

Create `/app/frontend/src/web3/config.js`:

```javascript
import { http, createConfig } from 'wagmi'
import { injected, walletConnect } from 'wagmi/connectors'
import { defineChain } from 'viem'

// Define opBNB Testnet
export const opBNBTestnet = defineChain({
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
    default: { name: 'opBNB Scan', url: 'https://opbnb-testnet.bscscan.com' },
  },
  testnet: true,
})

export const config = createConfig({
  chains: [opBNBTestnet],
  connectors: [injected()],
  transports: {
    [opBNBTestnet.id]: http(),
  },
})

// Load contract ABIs
import RobotRegistryABI from '../contracts/RobotRegistry.json'
import TaskMarketABI from '../contracts/TaskMarket.json'
import QuantumOracleABI from '../contracts/QuantumOracle.json'
import EthicalDAOABI from '../contracts/EthicalDAO.json'

export const contracts = {
  robotRegistry: {
    address: RobotRegistryABI.address,
    abi: RobotRegistryABI.abi,
  },
  taskMarket: {
    address: TaskMarketABI.address,
    abi: TaskMarketABI.abi,
  },
  quantumOracle: {
    address: QuantumOracleABI.address,
    abi: QuantumOracleABI.abi,
  },
  ethicalDAO: {
    address: EthicalDAOABI.address,
    abi: EthicalDAOABI.abi,
  },
}
```

### Update App.js

Wrap app with wagmi providers:

```javascript
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './web3/config'

const queryClient = new QueryClient()

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <div className="App">
          {/* Your existing app */}
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

### Add Wallet Connection

Create wallet connect button component:

```javascript
// /app/frontend/src/components/WalletConnect.js
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Button } from '@/components/ui/button'

export function WalletConnect() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected) {
    return (
      <div className="wallet-connected">
        <span>{address.slice(0, 6)}...{address.slice(-4)}</span>
        <Button onClick={() => disconnect()}>Disconnect</Button>
      </div>
    )
  }

  return (
    <Button onClick={() => connect({ connector: connectors[0] })}>
      Connect Wallet
    </Button>
  )
}
```

### Use Contracts in Components

Example: Register Robot with real contract call:

```javascript
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { contracts } from './web3/config'
import { parseEther } from 'viem'

const { writeContract, data: hash } = useWriteContract()

const handleRegister = async (e) => {
  e.preventDefault()
  
  // Generate robot ID
  const robotId = keccak256(toHex(`robot-${Date.now()}`))
  
  // Upload metadata to IPFS first (or use mock)
  const metadataURI = `ipfs://QmMockMetadata${Date.now()}`
  
  // Call contract
  writeContract({
    ...contracts.robotRegistry,
    functionName: 'registerRobot',
    args: [robotId, metadataURI],
    value: parseEther(formData.stake_amount), // Stake in BNB
  })
}

// Wait for transaction
const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash })

if (isSuccess) {
  toast.success("Robot registered on-chain!")
  // Also save to backend DB for indexing
  await axios.post(`${API}/robots/register`, {...})
}
```

---

## 🔄 Event Syncing

To keep MongoDB in sync with blockchain:

### Create Event Listener

```python
# /app/backend/event_listener.py
from web3_service import web3_service
import asyncio

async def listen_to_events():
    """Listen to contract events and sync to MongoDB"""
    
    # Robot Registration events
    robot_filter = web3_service.robot_registry.events.RobotRegistered.create_filter(fromBlock='latest')
    
    while True:
        for event in robot_filter.get_new_entries():
            # Parse event
            robot_id = event.args.robotId
            owner = event.args.owner
            metadata_uri = event.args.metadataURI
            stake = event.args.stake
            
            # Save to MongoDB
            await db.robots.insert_one({
                'id': robot_id.hex(),
                'owner': owner,
                'metadata_uri': metadata_uri,
                'stake': stake,
                'reputation': 100,
                'active': True,
                'created_at': datetime.now(timezone.utc).isoformat()
            })
            
            print(f"Synced robot {robot_id.hex()} to database")
        
        await asyncio.sleep(5)  # Check every 5 seconds

# Run in background
asyncio.create_task(listen_to_events())
```

---

## 📊 Summary of Changes

### What Stays Mocked:
- IPFS uploads (return mock CIDs)
- Optimization algorithm (keep classical TSP)

### What Goes On-Chain:
- Robot registration (with real BNB stake)
- Market trading (YES/NO with real BNB)
- Oracle verification (updates reputation on-chain)
- DAO voting (on-chain governance)

### Hybrid Benefits:
- ✅ Fast queries (MongoDB)
- ✅ Decentralized truth (Blockchain)
- ✅ Event-driven sync
- ✅ Fallback if blockchain slow

---

## 🚀 Deployment Steps

1. **Deploy Contracts** (follow DEPLOYMENT_GUIDE.md)
2. **Update Backend .env**:
   ```env
   OPBNB_RPC_URL=https://opbnb-testnet-rpc.bnbchain.org
   ORACLE_PRIVATE_KEY=0x...
   ```
3. **Install Dependencies** (web3, wagmi)
4. **Restart Services**
5. **Test End-to-End**

---

Need help with any specific integration? Let me know which part you want to implement first!
