"""
Web3 Service Layer for QOR Network
Handles all smart contract interactions
"""

from web3 import Web3
from eth_account import Account
import json
import os
from pathlib import Path

class Web3Service:
    def __init__(self):
        # Connect to opBNB testnet
        rpc_url = os.getenv('OPBNB_RPC_URL', 'https://opbnb-testnet-rpc.bnbchain.org')
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        
        # Mock contract addresses (will be replaced after deployment)
        self.contract_addresses = {
            'RobotRegistry': os.getenv('ROBOT_REGISTRY_ADDRESS', '0x0000000000000000000000000000000000000001'),
            'TaskMarket': os.getenv('TASK_MARKET_ADDRESS', '0x0000000000000000000000000000000000000002'),
            'QuantumOracle': os.getenv('QUANTUM_ORACLE_ADDRESS', '0x0000000000000000000000000000000000000003'),
            'EthicalDAO': os.getenv('ETHICAL_DAO_ADDRESS', '0x0000000000000000000000000000000000000004')
        }
        
        # Load contract ABIs (will use mock for now)
        self.contracts = {}
        for name in self.contract_addresses.keys():
            self.contracts[name] = self._load_contract(name)
        
        # Oracle account for signing transactions
        oracle_key = os.getenv('ORACLE_PRIVATE_KEY')
        if oracle_key:
            self.oracle_account = Account.from_key(oracle_key)
        else:
            # Generate temporary oracle account for testing
            self.oracle_account = Account.create()
            print(f"⚠️  Using temporary oracle account: {self.oracle_account.address}")
    
    def _load_contract(self, name):
        """Load contract ABI and create instance"""
        try:
            # Try to load from compiled artifacts
            artifact_path = Path(__file__).parent.parent / f'contracts/artifacts/contracts/{name}.sol/{name}.json'
            if artifact_path.exists():
                with open(artifact_path) as f:
                    artifact = json.load(f)
                abi = artifact['abi']
            else:
                # Use minimal ABI for mock
                abi = self._get_minimal_abi(name)
            
            address = self.contract_addresses[name]
            return self.w3.eth.contract(address=address, abi=abi)
        except Exception as e:
            print(f"⚠️  Could not load contract {name}: {e}")
            return None
    
    def _get_minimal_abi(self, name):
        """Minimal ABI for mocking"""
        abis = {
            'RobotRegistry': [
                {"inputs": [{"name": "robotId", "type": "bytes32"}, {"name": "metadataURI", "type": "string"}], "name": "registerRobot", "outputs": [], "stateMutability": "payable", "type": "function"},
                {"inputs": [{"name": "robotId", "type": "bytes32"}], "name": "getRobot", "outputs": [{"components": [{"name": "owner", "type": "address"}, {"name": "metadataURI", "type": "string"}, {"name": "reputation", "type": "int256"}, {"name": "stake", "type": "uint256"}, {"name": "active", "type": "bool"}], "name": "", "type": "tuple"}], "stateMutability": "view", "type": "function"},
                {"inputs": [{"name": "robotId", "type": "bytes32"}, {"name": "delta", "type": "int256"}], "name": "adjustReputation", "outputs": [], "stateMutability": "nonpayable", "type": "function"}
            ],
            'TaskMarket': [
                {"inputs": [{"name": "taskId", "type": "bytes32"}], "name": "buyYes", "outputs": [], "stateMutability": "payable", "type": "function"},
                {"inputs": [{"name": "taskId", "type": "bytes32"}], "name": "buyNo", "outputs": [], "stateMutability": "payable", "type": "function"},
                {"inputs": [{"name": "taskId", "type": "bytes32"}, {"name": "success", "type": "bool"}, {"name": "evidenceURI", "type": "string"}], "name": "finalize", "outputs": [], "stateMutability": "nonpayable", "type": "function"}
            ],
            'QuantumOracle': [
                {"inputs": [{"name": "taskId", "type": "bytes32"}, {"name": "solutionURI", "type": "string"}, {"name": "score", "type": "uint256"}], "name": "submitResult", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
                {"inputs": [{"name": "taskId", "type": "bytes32"}, {"name": "robotId", "type": "bytes32"}, {"name": "requiredScore", "type": "uint256"}, {"name": "evidenceURI", "type": "string"}], "name": "verifyTask", "outputs": [], "stateMutability": "nonpayable", "type": "function"}
            ],
            'EthicalDAO': [
                {"inputs": [{"name": "title", "type": "string"}, {"name": "description", "type": "string"}], "name": "propose", "outputs": [{"name": "", "type": "uint256"}], "stateMutability": "nonpayable", "type": "function"},
                {"inputs": [{"name": "proposalId", "type": "uint256"}, {"name": "support", "type": "bool"}], "name": "vote", "outputs": [], "stateMutability": "nonpayable", "type": "function"}
            ]
        }
        return abis.get(name, [])
    
    def is_connected(self):
        """Check if connected to blockchain"""
        try:
            return self.w3.is_connected()
        except:
            return False
    
    def get_contract_address(self, contract_name):
        """Get contract address"""
        return self.contract_addresses.get(contract_name)
    
    def submit_optimization_result(self, task_id_bytes, solution_uri, score):
        """Submit optimization result to blockchain"""
        try:
            if not self.is_connected():
                print("⚠️  Not connected to blockchain, skipping on-chain submission")
                return None
            
            contract = self.contracts['QuantumOracle']
            if not contract:
                print("⚠️  QuantumOracle contract not loaded")
                return None
            
            # Build transaction
            tx = contract.functions.submitResult(
                task_id_bytes,
                solution_uri,
                int(score)
            ).build_transaction({
                'from': self.oracle_account.address,
                'nonce': self.w3.eth.get_transaction_count(self.oracle_account.address),
                'gas': 200000,
                'gasPrice': self.w3.eth.gas_price or 1000000000
            })
            
            # Sign and send
            signed_tx = self.oracle_account.sign_transaction(tx)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            
            print(f"✅ Optimization submitted on-chain: {receipt.transactionHash.hex()}")
            return receipt
        except Exception as e:
            print(f"⚠️  Error submitting optimization to chain: {e}")
            return None
    
    def verify_task(self, task_id_bytes, robot_id_bytes, required_score, evidence_uri):
        """Verify task completion and finalize market"""
        try:
            if not self.is_connected():
                print("⚠️  Not connected to blockchain, skipping on-chain verification")
                return None
            
            contract = self.contracts['QuantumOracle']
            if not contract:
                print("⚠️  QuantumOracle contract not loaded")
                return None
            
            # Build transaction
            tx = contract.functions.verifyTask(
                task_id_bytes,
                robot_id_bytes,
                int(required_score),
                evidence_uri
            ).build_transaction({
                'from': self.oracle_account.address,
                'nonce': self.w3.eth.get_transaction_count(self.oracle_account.address),
                'gas': 300000,
                'gasPrice': self.w3.eth.gas_price or 1000000000
            })
            
            # Sign and send
            signed_tx = self.oracle_account.sign_transaction(tx)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            
            print(f"✅ Verification submitted on-chain: {receipt.transactionHash.hex()}")
            return receipt
        except Exception as e:
            print(f"⚠️  Error verifying on chain: {e}")
            return None

# Singleton instance
web3_service = Web3Service()
