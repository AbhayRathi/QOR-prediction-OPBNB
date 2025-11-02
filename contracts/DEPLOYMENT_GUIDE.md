# 🚀 Smart Contract Deployment Guide

This guide will walk you through deploying QOR Network smart contracts to opBNB and integrating them with your application.

## 📋 Prerequisites

1. **MetaMask Wallet** installed in your browser
2. **BNB tokens** on opBNB testnet (get from faucet)
3. **Node.js** and **yarn** installed

## 🎯 Step-by-Step Deployment

### Step 1: Get opBNB Testnet BNB

1. Open MetaMask
2. Add opBNB Testnet network:
   - Network Name: `opBNB Testnet`
   - RPC URL: `https://opbnb-testnet-rpc.bnbchain.org`
   - Chain ID: `5611`
   - Currency Symbol: `BNB`
   - Block Explorer: `https://opbnb-testnet.bscscan.com`

3. Get testnet BNB from faucet:
   - Visit: https://testnet.bnbchain.org/faucet-smart
   - Enter your wallet address
   - Request testnet BNB (you'll need ~0.01 BNB for deployment)

### Step 2: Export Your Private Key

⚠️ **IMPORTANT**: NEVER share your private key or commit it to git!

1. Open MetaMask
2. Click three dots → Account Details
3. Click "Export Private Key"
4. Enter your password
5. Copy the private key (starts with `0x`)

### Step 3: Configure Environment

```bash
cd /app/contracts

# Copy example env file
cp .env.example .env

# Edit .env file
nano .env
```

Add your private key:
```env
PRIVATE_KEY=0xyour_private_key_here_without_quotes
OPBNB_TESTNET_RPC=https://opbnb-testnet-rpc.bnbchain.org
```

### Step 4: Install Dependencies

```bash
cd /app/contracts
yarn install
```

### Step 5: Compile Contracts

```bash
npx hardhat compile
```

You should see:
```
✓ Compiled 4 Solidity files successfully
```

### Step 6: Deploy to opBNB Testnet

```bash
npm run deploy:testnet
```

This will:
1. Deploy all 4 contracts (RobotRegistry, TaskMarket, QuantumOracle, EthicalDAO)
2. Connect them together
3. Save deployment addresses
4. Export ABIs for frontend

Expected output:
```
🚀 Deploying QOR Network contracts to opBNB...

📝 Deploying with account: 0x...
💰 Account balance: ...

📦 Deploying RobotRegistry...
✅ RobotRegistry deployed to: 0x...

📦 Deploying TaskMarket...
✅ TaskMarket deployed to: 0x...

📦 Deploying QuantumOracle...
✅ QuantumOracle deployed to: 0x...

📦 Deploying EthicalDAO...
✅ EthicalDAO deployed to: 0x...

🔗 Connecting contracts...
✅ All contracts connected

🎉 Deployment complete!
```

### Step 7: Verify Deployment

1. Copy one of the contract addresses from the output
2. Visit: https://opbnb-testnet.bscscan.com/address/YOUR_ADDRESS
3. You should see your deployed contract!

---

## 🔌 Integration with Application

After deployment, you need to integrate contracts with your app:

### Backend Integration

The deployment script automatically creates `/app/contracts/deployments/opbnbTestnet.json` with all addresses.

**Update backend to use contracts:**

1. Install web3 library:
```bash
cd /app/backend
pip install web3
```

2. Create contract service:
```python
# /app/backend/web3_service.py
from web3 import Web3
import json
import os

# Load deployment
with open('../contracts/deployments/opbnbTestnet.json') as f:
    deployment = json.load(f)

# Connect to opBNB
w3 = Web3(Web3.HTTPProvider('https://opbnb-testnet-rpc.bnbchain.org'))

# Load contract ABIs
def get_contract(name):
    with open(f'../contracts/artifacts/{name}.sol/{name}.json') as f:
        artifact = json.load(f)
    address = deployment['contracts'][name]
    return w3.eth.contract(address=address, abi=artifact['abi'])

# Contract instances
robot_registry = get_contract('RobotRegistry')
task_market = get_contract('TaskMarket')
quantum_oracle = get_contract('QuantumOracle')
ethical_dao = get_contract('EthicalDAO')
```

### Frontend Integration

The deployment script automatically exports ABIs to `/app/frontend/src/contracts/`.

**Install Web3 libraries:**

```bash
cd /app/frontend
yarn add wagmi viem @rainbow-me/rainbowkit
```

**Configure wagmi:**

```javascript
// /app/frontend/src/web3Config.js
import { http, createConfig } from 'wagmi'
import { opBNBTestnet } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [opBNBTestnet],
  connectors: [injected()],
  transports: {
    [opBNBTestnet.id]: http(),
  },
})

// Contract addresses (from deployment)
import RobotRegistry from './contracts/RobotRegistry.json'
import TaskMarket from './contracts/TaskMarket.json'
import QuantumOracle from './contracts/QuantumOracle.json'
import EthicalDAO from './contracts/EthicalDAO.json'

export const contracts = {
  robotRegistry: {
    address: RobotRegistry.address,
    abi: RobotRegistry.abi
  },
  taskMarket: {
    address: TaskMarket.address,
    abi: TaskMarket.abi
  },
  quantumOracle: {
    address: QuantumOracle.address,
    abi: QuantumOracle.abi
  },
  ethicalDAO: {
    address: EthicalDAO.address,
    abi: EthicalDAO.abi
  }
}
```

---

## 🧪 Testing Contracts

### Test Robot Registration

```javascript
// Example: Register a robot from frontend
import { useWriteContract } from 'wagmi'
import { contracts } from './web3Config'

const { writeContract } = useWriteContract()

// Generate robot ID
const robotId = ethers.id("TestBot-" + Date.now())

// Register
writeContract({
  ...contracts.robotRegistry,
  functionName: 'registerRobot',
  args: [robotId, 'ipfs://QmMetadataURI'],
  value: parseEther('0.01') // 0.01 BNB stake
})
```

### Test Market Trading

```javascript
// Buy YES shares
const taskId = ethers.id("task-123")

writeContract({
  ...contracts.taskMarket,
  functionName: 'buyYes',
  args: [taskId],
  value: parseEther('0.005') // 0.005 BNB = 0.005 shares
})
```

---

## 📊 Contract Architecture

```
┌─────────────────┐
│ RobotRegistry   │ ← Manages robots, stakes, reputation
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  TaskMarket     │ ← Prediction markets, trading
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ QuantumOracle   │ ← Optimization results, verification
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  EthicalDAO     │ ← Governance, proposals, voting
└─────────────────┘
```

**All contracts are interconnected:**
- Oracle can adjust reputation in RobotRegistry
- Oracle can finalize markets in TaskMarket
- DAO can update parameters in all contracts

---

## 🔐 Security Notes

1. **Private Key Security**:
   - NEVER commit `.env` to git
   - Use `.env.example` as template
   - Consider hardware wallet for mainnet

2. **Contract Security**:
   - Contracts use OpenZeppelin base contracts
   - Simple access control with owner/oracle modifiers
   - For production, get professional audit

3. **Testing**:
   - Always test on testnet first
   - Test all functions before mainnet
   - Monitor gas costs

---

## 📝 Maintenance

### Update Contract Addresses in Backend

After deployment, update your backend `.env`:

```env
# Add to /app/backend/.env
ROBOT_REGISTRY_ADDRESS=0x...
TASK_MARKET_ADDRESS=0x...
QUANTUM_ORACLE_ADDRESS=0x...
ETHICAL_DAO_ADDRESS=0x...
OPBNB_RPC_URL=https://opbnb-testnet-rpc.bnbchain.org
```

### Restart Services

```bash
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
```

---

## 🚀 Mainnet Deployment

When ready for mainnet:

1. Get real BNB on opBNB mainnet
2. Update RPC in `.env`:
```env
OPBNB_MAINNET_RPC=https://opbnb-mainnet-rpc.bnbchain.org
```
3. Deploy:
```bash
npm run deploy:mainnet
```
4. Update frontend to use mainnet network

---

## 🆘 Troubleshooting

### "Insufficient funds"
- Check wallet balance: need ~0.01 BNB
- Get more from faucet

### "Nonce too high"
- Reset MetaMask: Settings → Advanced → Reset Account

### "Contract not deployed"
- Verify on block explorer
- Check transaction hash
- Confirm network is correct

### "Cannot connect to RPC"
- Try alternative RPC: https://opbnb-testnet.nodereal.io/v1/YOUR_API_KEY
- Check network status

---

## 📚 Additional Resources

- **opBNB Docs**: https://docs.bnbchain.org/opbnb-docs/
- **Faucet**: https://testnet.bnbchain.org/faucet-smart
- **Explorer**: https://opbnb-testnet.bscscan.com
- **Hardhat Docs**: https://hardhat.org/docs

---

## ✅ Deployment Checklist

- [ ] MetaMask installed and configured
- [ ] opBNB Testnet added to MetaMask
- [ ] Testnet BNB acquired from faucet
- [ ] Private key exported and added to `.env`
- [ ] Dependencies installed (`yarn install`)
- [ ] Contracts compiled (`npx hardhat compile`)
- [ ] Contracts deployed (`npm run deploy:testnet`)
- [ ] Deployment verified on block explorer
- [ ] Contract addresses saved
- [ ] Backend updated with addresses
- [ ] Frontend configured with wagmi
- [ ] Services restarted
- [ ] Test transactions executed

---

**Need help?** Drop the error message and I'll assist with debugging!
