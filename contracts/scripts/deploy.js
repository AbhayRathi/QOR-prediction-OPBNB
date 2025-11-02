const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying QOR Network contracts to opBNB...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString(), "\n");

  // Deploy RobotRegistry
  console.log("📦 Deploying RobotRegistry...");
  const RobotRegistry = await hre.ethers.getContractFactory("RobotRegistry");
  const robotRegistry = await RobotRegistry.deploy();
  await robotRegistry.waitForDeployment();
  const robotRegistryAddress = await robotRegistry.getAddress();
  console.log("✅ RobotRegistry deployed to:", robotRegistryAddress, "\n");

  // Deploy TaskMarket
  console.log("📦 Deploying TaskMarket...");
  const TaskMarket = await hre.ethers.getContractFactory("TaskMarket");
  const taskMarket = await TaskMarket.deploy();
  await taskMarket.waitForDeployment();
  const taskMarketAddress = await taskMarket.getAddress();
  console.log("✅ TaskMarket deployed to:", taskMarketAddress, "\n");

  // Deploy QuantumOracle
  console.log("📦 Deploying QuantumOracle...");
  const QuantumOracle = await hre.ethers.getContractFactory("QuantumOracle");
  const quantumOracle = await QuantumOracle.deploy();
  await quantumOracle.waitForDeployment();
  const quantumOracleAddress = await quantumOracle.getAddress();
  console.log("✅ QuantumOracle deployed to:", quantumOracleAddress, "\n");

  // Deploy EthicalDAO
  console.log("📦 Deploying EthicalDAO...");
  const EthicalDAO = await hre.ethers.getContractFactory("EthicalDAO");
  const ethicalDAO = await EthicalDAO.deploy();
  await ethicalDAO.waitForDeployment();
  const ethicalDAOAddress = await ethicalDAO.getAddress();
  console.log("✅ EthicalDAO deployed to:", ethicalDAOAddress, "\n");

  // Connect contracts
  console.log("🔗 Connecting contracts...");
  
  // Set oracle address in RobotRegistry
  await robotRegistry.setOracleAddress(quantumOracleAddress);
  console.log("✅ Set oracle address in RobotRegistry");

  // Set DAO address in RobotRegistry
  await robotRegistry.setDAOAddress(ethicalDAOAddress);
  console.log("✅ Set DAO address in RobotRegistry");

  // Set oracle address in TaskMarket
  await taskMarket.setOracleAddress(quantumOracleAddress);
  console.log("✅ Set oracle address in TaskMarket");

  // Set contract addresses in Oracle
  await quantumOracle.setRobotRegistry(robotRegistryAddress);
  await quantumOracle.setTaskMarket(taskMarketAddress);
  console.log("✅ Set contract addresses in Oracle");

  // Set RobotRegistry in DAO
  await ethicalDAO.setRobotRegistry(robotRegistryAddress);
  console.log("✅ Set RobotRegistry in DAO\n");

  // Save deployment info
  const deployment = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      RobotRegistry: robotRegistryAddress,
      TaskMarket: taskMarketAddress,
      QuantumOracle: quantumOracleAddress,
      EthicalDAO: ethicalDAOAddress
    }
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const deploymentFile = path.join(deploymentsDir, `${hre.network.name}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));
  console.log("💾 Deployment info saved to:", deploymentFile);

  // Export ABIs for frontend
  const abisDir = path.join(__dirname, "../../frontend/src/contracts");
  if (!fs.existsSync(abisDir)) {
    fs.mkdirSync(abisDir, { recursive: true });
  }

  // Read and save ABIs
  const contracts = ["RobotRegistry", "TaskMarket", "QuantumOracle", "EthicalDAO"];
  for (const contractName of contracts) {
    const artifactPath = path.join(__dirname, `../artifacts/${contractName}.sol/${contractName}.json`);
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const abiFile = path.join(abisDir, `${contractName}.json`);
    fs.writeFileSync(abiFile, JSON.stringify({
      address: deployment.contracts[contractName],
      abi: artifact.abi
    }, null, 2));
  }
  console.log("💾 ABIs exported to:", abisDir);

  console.log("\n🎉 Deployment complete!\n");
  console.log("📋 Contract Addresses:");
  console.log("   RobotRegistry:", robotRegistryAddress);
  console.log("   TaskMarket:", taskMarketAddress);
  console.log("   QuantumOracle:", quantumOracleAddress);
  console.log("   EthicalDAO:", ethicalDAOAddress);
  console.log("\n📖 View on explorer:");
  const explorerUrl = hre.network.name === "opbnbTestnet" 
    ? "https://opbnb-testnet.bscscan.com/address/"
    : "https://opbnb.bscscan.com/address/";
  console.log("   ", explorerUrl + robotRegistryAddress);
  console.log("\n⚡ Next steps:");
  console.log("   1. Update backend/.env with contract addresses");
  console.log("   2. Restart backend server");
  console.log("   3. Test on frontend!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
