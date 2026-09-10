const path = require("path");
require("dotenv").config(); // contracts/.env — SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY
require("dotenv").config({ path: path.resolve(__dirname, "../../backend/.env") }); // ORACLE_A_KEY, ORACLE_B_KEY
const { ethers } = require("ethers");
const abi = require("../../backend/src/deployment.json").abi;

// Same demo scenario as scripts/seed.js, adapted for Sepolia: real oracle
// wallets (ORACLE_A_KEY/ORACLE_B_KEY from backend/.env) instead of Hardhat
// signers, and a hardcoded contract address instead of deployment.json
// (which is shared/overwritten between local and Sepolia deploys).
const SEPOLIA_CONTRACT = "0xF638B0dA1382b4d941198631280086426Aca423d";
const SCALE = 100n;
const mm = (n) => BigInt(n) * SCALE;
const DAY = 24 * 60 * 60;

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!rpcUrl) throw new Error("SEPOLIA_RPC_URL not set in contracts/.env");
  if (!deployerKey) throw new Error("DEPLOYER_PRIVATE_KEY not set in contracts/.env");

  const oracleAKey = process.env.ORACLE_A_KEY;
  const oracleBKey = process.env.ORACLE_B_KEY;
  if (!oracleAKey || !oracleBKey) {
    throw new Error(
      "ORACLE_A_KEY / ORACLE_B_KEY not set. Load backend/.env into this process or export them."
    );
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const network = await provider.getNetwork();
  if (network.chainId !== 11155111n) {
    throw new Error(`Refusing: connected chain ID is ${network.chainId}, expected Sepolia (11155111)`);
  }

  const deployer = new ethers.Wallet(deployerKey, provider);
  const oracleA = new ethers.Wallet(oracleAKey, provider);
  const oracleB = new ethers.Wallet(oracleBKey, provider);

  const insurance = new ethers.Contract(SEPOLIA_CONTRACT, abi, deployer);

  console.log(`Seeding CropInsurance at ${SEPOLIA_CONTRACT} on Sepolia`);
  console.log(`Deployer/owner: ${deployer.address}`);
  console.log(`Oracle A: ${oracleA.address}`);
  console.log(`Oracle B: ${oracleB.address}`);

  const alreadyA = await insurance.isRegisteredOracle(oracleA.address);
  const alreadyB = await insurance.isRegisteredOracle(oracleB.address);

  if (!alreadyA) {
    const tx = await insurance.registerOracle(oracleA.address);
    console.log(`registerOracle(A) tx: ${tx.hash}`);
    await tx.wait();
  } else {
    console.log("Oracle A already registered, skipping.");
  }

  if (!alreadyB) {
    const tx = await insurance.registerOracle(oracleB.address);
    console.log(`registerOracle(B) tx: ${tx.hash}`);
    await tx.wait();
  } else {
    console.log("Oracle B already registered, skipping.");
  }

  // Demo farmer: reuse the deployer address (no separate farmer wallet needed).
  const farmer = deployer.address;
  const now = Math.floor(Date.now() / 1000);
  const coverageAmount = ethers.parseEther("0.0005"); // small, testnet-scale payout

  const createTx = await insurance.createPolicy(
    farmer,
    "Cotton",
    "MH-VID-04",
    coverageAmount,
    0, // TriggerType.RainfallBelow
    mm(20), // thresholdValue: 20mm
    mm(5), // toleranceValue: 5mm
    now - DAY,
    now + 29 * DAY
  );
  console.log(`createPolicy tx: ${createTx.hash}`);
  await createTx.wait();

  const policyId = await insurance.getPolicyCount();
  console.log(`Created policy ${policyId} for farmer ${farmer}`);

  const fundTx = await insurance.fundPolicy(policyId, { value: coverageAmount });
  console.log(`fundPolicy tx: ${fundTx.hash}`);
  await fundTx.wait();
  console.log(`Funded policy ${policyId} with ${ethers.formatEther(coverageAmount)} ETH`);

  // Two agreeing sub-threshold readings -> should trigger a payout.
  const periodId = Math.floor(now / DAY);
  const readingValue = mm(12); // below the 20mm threshold

  const insuranceAsA = insurance.connect(oracleA);
  const insuranceAsB = insurance.connect(oracleB);

  const readTxA = await insuranceAsA.submitReading(policyId, readingValue, periodId);
  console.log(`submitReading(A) tx: ${readTxA.hash}`);
  await readTxA.wait();

  const readTxB = await insuranceAsB.submitReading(policyId, readingValue, periodId);
  console.log(`submitReading(B) tx: ${readTxB.hash}`);
  await readTxB.wait();

  const evalTx = await insuranceAsA.evaluatePolicy(policyId, periodId);
  console.log(`evaluatePolicy tx: ${evalTx.hash}`);
  const receipt = await evalTx.wait();

  console.log("\n--- Result ---");
  for (const log of receipt.logs) {
    try {
      const parsed = insurance.interface.parseLog(log);
      if (parsed) console.log(`Event: ${parsed.name}`, parsed.args.toString());
    } catch {
      // not one of our events, skip
    }
  }

  console.log(`\nExplorer: https://sepolia.etherscan.io/address/${SEPOLIA_CONTRACT}`);
  console.log(`evaluatePolicy tx: https://sepolia.etherscan.io/tx/${evalTx.hash}`);
}

main().catch((error) => {
  console.error("FAILED:", error.message ?? error);
  process.exitCode = 1;
});
