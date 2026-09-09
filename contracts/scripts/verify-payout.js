const hre = require("hardhat");

// T1.15 checkpoint script — proves an end-to-end payout by execution, not
// inspection. Not part of the demo flow; delete-safe once M1 is confirmed
// manually, but left in place as a repeatable smoke test.
const SCALE = 100n;
const mm = (n) => BigInt(n) * SCALE;
const DAY = 24 * 60 * 60;

async function main() {
  const deployment = require("../../backend/src/deployment.json");
  const [, oracleA, oracleB, farmer] = await hre.ethers.getSigners();
  const insurance = await hre.ethers.getContractAt("CropInsurance", deployment.address);

  const policyId = 1n;
  const periodId = BigInt(Math.floor(Date.now() / 1000 / DAY));

  const balanceBefore = await hre.ethers.provider.getBalance(farmer.address);

  await (await insurance.connect(oracleA).submitReading(policyId, mm(9), periodId)).wait();
  await (await insurance.connect(oracleB).submitReading(policyId, mm(11), periodId)).wait();
  console.log("Submitted readings: oracleA=9mm, oracleB=11mm (mean=10mm, below 20mm threshold)");

  const tx = await insurance.evaluatePolicy(policyId, periodId);
  const receipt = await tx.wait();

  const balanceAfter = await hre.ethers.provider.getBalance(farmer.address);
  const delta = balanceAfter - balanceBefore;

  const payoutEvent = receipt.logs
    .map((log) => {
      try {
        return insurance.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((parsed) => parsed && parsed.name === "PayoutTriggered");

  console.log(`Farmer balance delta: ${hre.ethers.formatEther(delta)} ETH`);
  console.log(`PayoutTriggered event: ${payoutEvent ? "present" : "MISSING"}`);
  if (payoutEvent) {
    console.log(`  amount=${hre.ethers.formatEther(payoutEvent.args.amount)} ETH, consensusValue=${payoutEvent.args.consensusValue}`);
  }

  const policy = await insurance.getPolicy(policyId);
  console.log(`Policy status after evaluation: ${policy.status} (1 = PaidOut)`);

  if (delta !== hre.ethers.parseEther("1") || !payoutEvent || policy.status !== 1n) {
    console.error("\nFAIL: end-to-end payout did not verify.");
    process.exitCode = 1;
    return;
  }
  console.log("\nPASS: farmer balance increased by exactly 1 ETH, PayoutTriggered emitted, status is PaidOut.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
