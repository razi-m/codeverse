const hre = require("hardhat");

// Same scale convention as contracts/test/CropInsurance.test.js — x100.
const SCALE = 100n;
const mm = (n) => BigInt(n) * SCALE;
const DAY = 24 * 60 * 60;

/**
 * Seeds the local node with the demo scenario: two registered oracles and
 * one funded policy, ready for evaluatePolicy to be called against.
 * Reads the freshly-deployed address from backend/src/deployment.json, so
 * always run `npm run deploy` first.
 */
async function main() {
  const deployment = require("../../backend/src/deployment.json");
  const [owner, oracleA, oracleB, farmer] = await hre.ethers.getSigners();

  const insurance = await hre.ethers.getContractAt("CropInsurance", deployment.address, owner);

  console.log(`Seeding CropInsurance at ${deployment.address}`);

  await (await insurance.registerOracle(oracleA.address)).wait();
  await (await insurance.registerOracle(oracleB.address)).wait();
  console.log(`Registered oracles: ${oracleA.address}, ${oracleB.address}`);

  const now = Math.floor(Date.now() / 1000);
  const coverageAmount = hre.ethers.parseEther("1");

  const createTx = await insurance.createPolicy(
    farmer.address,
    "Cotton",
    "MH-VID-04",
    coverageAmount,
    0, // TriggerType.RainfallBelow
    mm(20), // thresholdValue: 20mm
    mm(5), // toleranceValue: 5mm
    now - DAY, // startDate: yesterday, so "today" is in-window
    now + 29 * DAY // endDate: +29 days
  );
  await createTx.wait();
  const policyId = await insurance.getPolicyCount();
  console.log(`Created policy ${policyId} for farmer ${farmer.address}`);

  await (await insurance.fundPolicy(policyId, { value: coverageAmount })).wait();
  console.log(`Funded policy ${policyId} with ${hre.ethers.formatEther(coverageAmount)} ETH`);

  console.log("\nSeed complete. Demo policy 1: 20mm threshold, 5mm tolerance, funded, active.");
  console.log("To trigger a payout, submit two agreeing sub-threshold readings from oracleA/oracleB");
  console.log("for today's periodId, then call evaluatePolicy(1, periodId).");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
