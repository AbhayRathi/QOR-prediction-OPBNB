# QOR Network - Demo Flow

This document outlines the complete end-to-end demonstration of the QOR (Quantum-Optimized Robotics Network) MVP.

## 🎬 Demo Script

### 1. Landing Page
**URL**: `/`

**Features to Show**:
- Hero section with "Quantum-Optimized Robotics Network" title
- Powered by opBNB badge
- Mock statistics (127 Active Robots, 43 Live Markets, $2.4M Total Volume)
- Feature cards explaining how QOR works:
  - Register Agents
  - Prediction Markets
  - Quantum Optimization
  - Oracle Verification
  - DAO Governance
  - Gasless UX

**Action**: Click "Get Started" or navigate to "Robots" in nav

---

### 2. Robot Registry
**URL**: `/robots`

**Demo Steps**:
1. Click "Register New Robot" button
2. Fill in registration form:
   - **Name**: `TestBot Alpha`
   - **Description**: `Advanced autonomous robot for delivery missions`
   - **Capabilities**: `navigation, sensing, delivery`
   - **Stake**: `150` tokens
3. Click "Register Robot"
4. ✅ Toast notification: "Robot registered successfully!"
5. New robot card appears showing:
   - Active status badge
   - Reputation: 100 (starting value)
   - Stake: 150 tokens
   - Capabilities as badges

**Key Points**:
- Staking mechanism for network participation
- Reputation system starts at 100
- Capabilities define what missions robot can handle

---

### 3. Create Prediction Market
**URL**: `/tasks`

**Demo Steps**:
1. Click "Create New Task" button
2. Fill in task form:
   - **Select Robot**: Choose "TestBot Alpha"
   - **Title**: `Downtown Delivery Mission`
   - **Description**: `Navigate downtown and deliver packages to 3 locations`
   - **Waypoints**: 
     ```json
     [
       {"lat": 37.7749, "lng": -122.4194, "action": "pickup"},
       {"lat": 37.7849, "lng": -122.4094, "action": "deliver"}
     ]
     ```
   - **Deadline**: Tomorrow's date
   - **Required Score**: `85.0`
3. Click "Create Task"
4. ✅ Toast: "Task created successfully!"
5. New task card appears in the grid showing:
   - Active status
   - YES Pool: 0.00
   - NO Pool: 0.00

**Key Points**:
- Tasks are tied to specific robots
- Binary prediction market automatically created
- Success threshold defined by required score

---

### 4. Trade on Market
**URL**: `/tasks/{task_id}`

**Demo Steps**:

#### Part A: Buy YES Shares
1. Click on the task card to open detail view
2. See Market Overview:
   - YES Pool and NO Pool displays
   - Progress bar showing probability
   - Assigned robot information
3. In "Trade" tab:
   - Enter username: `alice`
   - Enter amount: `50` tokens
   - Click "Buy YES"
4. ✅ Toast: "Bought 50 YES shares!"
5. Market updates:
   - YES Pool: 50.00
   - Probability: YES 62.5% / NO 37.5%

#### Part B: Buy NO Shares
1. Change username to: `bob`
2. Enter amount: `30` tokens
3. Click "Buy NO"
4. ✅ Toast: "Bought 30 NO shares!"
5. Market updates:
   - YES Pool: 50.00
   - NO Pool: 30.00
   - Total Pool: 80 tokens

**Key Points**:
- Real-time market updates
- Simple 1:1 share pricing for MVP
- Probability calculated as pool ratio

---

### 5. Run Quantum Optimizer
**URL**: `/tasks/{task_id}` - Optimize tab

**Demo Steps**:
1. Click "Optimize" tab
2. Click "Run Optimizer" button
3. ✅ Toast: "Optimization complete!"
4. Results displayed:
   - **Score**: 89.75 (above required 85.0)
   - **Solution URI**: `ipfs://Qm...` (mocked)
   - **Plan**: Step-by-step route with estimated times
     ```
     Step 1: pickup (Est. 12min)
     Step 2: deliver (Est. 8min)
     ```
5. Button changes to "Already Optimized"

**Key Points**:
- Classical TSP optimization algorithm
- Score must meet or exceed required threshold for success
- Plan stored on IPFS (mocked)
- Each waypoint has action and time estimate

---

### 6. Oracle Verification
**URL**: `/tasks/{task_id}` - Verify tab

**Demo Steps**:
1. Click "Verify" tab
2. Click "Verify Task" button
3. ✅ Toast: "Task succeeded. Score: 89.75/85.0"
4. Verification results shown:
   - **Result**: ✅ SUCCESS (green)
   - **Evidence URI**: `ipfs://Qm...`
   - Task status changes to "resolved"
   - Robot reputation updated to **110** (+10 for success)
5. "Redeem Winnings" button appears

**Key Points**:
- Oracle checks optimization score vs requirement
- Success: reputation +10, Failure: reputation -5
- Market resolves and payouts become available
- Evidence stored on IPFS (mocked)

---

### 7. Redeem Winnings
**URL**: `/tasks/{task_id}` - Verify tab

**Demo Steps**:
1. Click "Redeem Winnings" button
2. ✅ Toast shows payout amount
3. Example calculation:
   - alice bought 50 YES shares (cost: 50)
   - Task succeeded (YES wins)
   - Total pool: 80 tokens
   - alice's share: 50/50 = 100% of YES shares
   - alice payout: 80 tokens (60% profit!)

**Key Points**:
- Winners split total pool pro-rata
- Losers get nothing
- Winnings can only be redeemed once
- Incentivizes accurate predictions

---

### 8. Check Positions
**URL**: `/tasks/{task_id}` - Positions tab

**Demo Steps**:
1. Click "Positions" tab
2. See all market positions:
   - **alice**: YES, 50 shares, Cost: 50
   - **bob**: NO, 30 shares, Cost: 30
3. Winners show redemption status

**Key Points**:
- Transparency of all market participants
- Track who bet what side
- See redemption status

---

### 9. DAO Governance
**URL**: `/dao`

**Demo Steps**:
1. Click "Create Proposal" button
2. Fill in proposal:
   - **Title**: `Increase Robot Reputation Rewards`
   - **Description**: `Proposal to increase reputation rewards for successful missions from 10 to 15 points`
   - **Action**: `updateReputationReward`
3. Click "Create Proposal"
4. ✅ Toast: "Proposal created!"
5. New proposal card appears showing:
   - Active status
   - YES votes: 0
   - NO votes: 0
   - Vote buttons visible
6. Click "Vote YES"
7. ✅ Toast: "Voted YES!"
8. Vote counts update (YES: 1)
9. Multiple users can vote
10. When votes ≥5, "Execute Proposal" button appears
11. Click "Execute Proposal"
12. If YES > NO: Status changes to "executed"

**Key Points**:
- Community governance of network parameters
- Weighted voting (by stake + reputation)
- Simple majority for MVP
- Executed proposals change network behavior

---

## 🔄 Complete Lifecycle Summary

```
1. Register Robot (stake 150 tokens, reputation 100)
   ↓
2. Create Task (with waypoints, deadline, score requirement)
   ↓
3. Trade Market (alice buys YES for 50, bob buys NO for 30)
   ↓
4. Run Optimizer (generates plan, score 89.75/85.0)
   ↓
5. Verify Task (oracle confirms success)
   ↓
6. Update Reputation (robot reputation → 110)
   ↓
7. Redeem Winnings (alice gets 80 tokens payout)
   ↓
8. DAO Proposes Changes (community votes on improvements)
```

---

## 🎯 Key Demo Highlights

### Technical
- ✅ Full-stack app (React + FastAPI + MongoDB)
- ✅ Modern UI with Shadcn components
- ✅ Real-time state updates
- ✅ Toast notifications for feedback
- ✅ Responsive design
- ✅ Clean REST API

### Business Logic
- ✅ Staking mechanism
- ✅ Reputation system
- ✅ Prediction markets with pro-rata payouts
- ✅ Optimization algorithm
- ✅ Oracle verification
- ✅ DAO governance

### UX
- ✅ Quantum tech aesthetic (cyan/teal on dark navy)
- ✅ Smooth transitions and hover effects
- ✅ Clear visual hierarchy
- ✅ Intuitive navigation
- ✅ Real-time feedback

---

## 🚀 Next Steps for Production

When ready to deploy with real blockchain:

1. **Deploy Smart Contracts** to opBNB testnet
2. **Integrate Web3 Wallet** (Rainbow Kit or Privy)
3. **Configure IPFS** (Pinata or Web3.Storage)
4. **Set up Oracle Node** with real verification
5. **Implement Account Abstraction** (ERC-4337)
6. **Add Paymaster** for gasless transactions
7. **Deploy Subgraph** for The Graph indexer
8. **Security Audit** all contracts
9. **Launch Testnet Beta**
10. **Mainnet Deployment**

---

## 📝 API Keys Needed for Production

- opBNB RPC URL
- Pinata/Web3.Storage API key
- WalletConnect Project ID
- Paymaster API key (Biconomy/Stackup)
- Subgraph API key
- (Optional) Qiskit/D-Wave for quantum optimization

---

**Status**: MVP Complete ✅  
All core features functional with mocked blockchain/IPFS ready for real integration.
