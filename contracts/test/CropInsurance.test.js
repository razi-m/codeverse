const { expect } = require("chai");
const { ethers } = require("hardhat");

// Scale factor for measurement values (docs/Schema.md Units) — x100.
const SCALE = 100n;
const mm = (n) => BigInt(n) * SCALE;

const DAY = 24 * 60 * 60;

async function deployInsurance() {
  const [owner, oracleA, oracleB, farmer, stranger] = await ethers.getSigners();
  const CropInsurance = await ethers.getContractFactory("CropInsurance");
  const insurance = await CropInsurance.deploy();
  return { insurance, owner, oracleA, oracleB, farmer, stranger };
}

// Standard demo-shaped policy: RainfallBelow 20mm threshold, 5mm tolerance,
// 1 ETH coverage, a 30-day window starting "now".
async function createStandardPolicy(insurance, owner, farmer, overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  const startDate = overrides.startDate ?? now - DAY; // started yesterday so "today" is in-window
  const endDate = overrides.endDate ?? now + 29 * DAY;
  const coverageAmount = overrides.coverageAmount ?? ethers.parseEther("1");
  const thresholdValue = overrides.thresholdValue ?? mm(20);
  const toleranceValue = overrides.toleranceValue ?? mm(5);

  const tx = await insurance
    .connect(owner)
    .createPolicy(
      farmer.address,
      "Cotton",
      "MH-VID-04",
      coverageAmount,
      0, // TriggerType.RainfallBelow
      thresholdValue,
      toleranceValue,
      startDate,
      endDate
    );
  await tx.wait();
  const policyId = await insurance.getPolicyCount();
  return { policyId, coverageAmount, thresholdValue, toleranceValue, startDate, endDate };
}

// periodId is days-since-epoch (docs/Schema.md); the contract converts to
// seconds internally by multiplying by 1 day. "Today" keeps a period inside
// any window built around `now` above.
function todayPeriodId() {
  return BigInt(Math.floor(Date.now() / 1000 / DAY));
}

describe("CropInsurance", () => {
  describe("Policy lifecycle", () => {
    it("creates a policy with valid terms and sequential IDs", async () => {
      const { insurance, owner, farmer } = await deployInsurance();
      const { policyId } = await createStandardPolicy(insurance, owner, farmer);
      expect(policyId).to.equal(1n);

      const policy = await insurance.getPolicy(policyId);
      expect(policy.farmer).to.equal(farmer.address);
      expect(policy.status).to.equal(0n); // Active
      expect(policy.funded).to.equal(false);

      const { policyId: secondId } = await createStandardPolicy(insurance, owner, farmer);
      expect(secondId).to.equal(2n);
    });

    it("reverts policy creation from a non-owner", async () => {
      const { insurance, stranger, farmer } = await deployInsurance();
      await expect(createStandardPolicy(insurance, stranger, farmer)).to.be.reverted;
    });

    it("funds a policy and sets funded=true", async () => {
      const { insurance, owner, farmer } = await deployInsurance();
      const { policyId, coverageAmount } = await createStandardPolicy(insurance, owner, farmer);

      await expect(insurance.connect(owner).fundPolicy(policyId, { value: coverageAmount }))
        .to.emit(insurance, "PolicyFunded")
        .withArgs(policyId, coverageAmount);

      const policy = await insurance.getPolicy(policyId);
      expect(policy.funded).to.equal(true);
    });

    it("reverts funding below the coverage amount", async () => {
      const { insurance, owner, farmer } = await deployInsurance();
      const { policyId, coverageAmount } = await createStandardPolicy(insurance, owner, farmer);

      await expect(
        insurance.connect(owner).fundPolicy(policyId, { value: coverageAmount - 1n })
      ).to.be.revertedWithCustomError(insurance, "InsufficientFunding");
    });

    it("cancels a funded policy and refunds the owner", async () => {
      const { insurance, owner, farmer } = await deployInsurance();
      const { policyId, coverageAmount } = await createStandardPolicy(insurance, owner, farmer);
      await insurance.connect(owner).fundPolicy(policyId, { value: coverageAmount });

      await expect(insurance.connect(owner).cancelPolicy(policyId)).to.changeEtherBalances(
        [owner, insurance],
        [coverageAmount, -coverageAmount]
      );

      const policy = await insurance.getPolicy(policyId);
      expect(policy.status).to.equal(3n); // Cancelled
    });
  });

  describe("Oracle registration", () => {
    it("lets the owner register an oracle", async () => {
      const { insurance, owner, oracleA } = await deployInsurance();
      await expect(insurance.connect(owner).registerOracle(oracleA.address))
        .to.emit(insurance, "OracleRegistered")
        .withArgs(oracleA.address);
      expect(await insurance.isRegisteredOracle(oracleA.address)).to.equal(true);
    });

    it("reverts registration from a non-owner", async () => {
      const { insurance, stranger, oracleA } = await deployInsurance();
      await expect(insurance.connect(stranger).registerOracle(oracleA.address)).to.be.reverted;
    });

    it("blocks submission after deregistration", async () => {
      const { insurance, owner, oracleA, farmer } = await deployInsurance();
      const { policyId } = await createStandardPolicy(insurance, owner, farmer);
      await insurance.connect(owner).registerOracle(oracleA.address);
      await insurance.connect(owner).deregisterOracle(oracleA.address);

      expect(await insurance.isRegisteredOracle(oracleA.address)).to.equal(false);
      await expect(
        insurance.connect(oracleA).submitReading(policyId, mm(10), todayPeriodId())
      ).to.be.revertedWithCustomError(insurance, "OracleNotRegistered");
    });
  });

  describe("Reading submission", () => {
    it("accepts a reading from a registered oracle and emits ReadingSubmitted", async () => {
      const { insurance, owner, oracleA, farmer } = await deployInsurance();
      const { policyId } = await createStandardPolicy(insurance, owner, farmer);
      await insurance.connect(owner).registerOracle(oracleA.address);

      await expect(insurance.connect(oracleA).submitReading(policyId, mm(10), todayPeriodId())).to.emit(
        insurance,
        "ReadingSubmitted"
      );
    });

    it("reverts submission from an unregistered oracle", async () => {
      const { insurance, owner, oracleA, farmer } = await deployInsurance();
      const { policyId } = await createStandardPolicy(insurance, owner, farmer);

      await expect(
        insurance.connect(oracleA).submitReading(policyId, mm(10), todayPeriodId())
      ).to.be.revertedWithCustomError(insurance, "OracleNotRegistered");
    });

    it("reverts a duplicate submission for the same policy-period", async () => {
      const { insurance, owner, oracleA, farmer } = await deployInsurance();
      const { policyId } = await createStandardPolicy(insurance, owner, farmer);
      await insurance.connect(owner).registerOracle(oracleA.address);
      const period = todayPeriodId();

      await insurance.connect(oracleA).submitReading(policyId, mm(10), period);
      await expect(
        insurance.connect(oracleA).submitReading(policyId, mm(11), period)
      ).to.be.revertedWithCustomError(insurance, "DuplicateReading");
    });

    it("accepts submissions from the same oracle across distinct periods", async () => {
      const { insurance, owner, oracleA, farmer } = await deployInsurance();
      const { policyId } = await createStandardPolicy(insurance, owner, farmer);
      await insurance.connect(owner).registerOracle(oracleA.address);
      const period = todayPeriodId();

      await insurance.connect(oracleA).submitReading(policyId, mm(10), period);
      await expect(insurance.connect(oracleA).submitReading(policyId, mm(11), period + 1n)).to.not.be.reverted;
    });
  });

  describe("Consensus", () => {
    async function setupFundedPolicyWithOracles(overrides = {}) {
      const ctx = await deployInsurance();
      const policy = await createStandardPolicy(ctx.insurance, ctx.owner, ctx.farmer, overrides);
      await ctx.insurance.connect(ctx.owner).fundPolicy(policy.policyId, { value: policy.coverageAmount });
      await ctx.insurance.connect(ctx.owner).registerOracle(ctx.oracleA.address);
      await ctx.insurance.connect(ctx.owner).registerOracle(ctx.oracleB.address);
      return { ...ctx, ...policy };
    }

    it("agreement within tolerance emits ConsensusReached with correct mean and spread", async () => {
      const { insurance, oracleA, oracleB, policyId } = await setupFundedPolicyWithOracles();
      const period = todayPeriodId();

      await insurance.connect(oracleA).submitReading(policyId, mm(10), period);
      await expect(insurance.connect(oracleB).submitReading(policyId, mm(12), period)).to.not.be.reverted;

      // mean(10,12)=11, spread=2 — both scaled x100
      await expect(insurance.evaluatePolicy(policyId, period))
        .to.emit(insurance, "ConsensusReached")
        .withArgs(policyId, period, mm(11), mm(2));
    });

    it("disagreement beyond tolerance emits ConsensusFailed and PayoutRejected(3); no funds move", async () => {
      const { insurance, oracleA, oracleB, policyId, farmer } = await setupFundedPolicyWithOracles();
      const period = todayPeriodId();

      await insurance.connect(oracleA).submitReading(policyId, mm(5), period);
      await insurance.connect(oracleB).submitReading(policyId, mm(30), period); // spread=25 > tolerance=5

      const tx = insurance.evaluatePolicy(policyId, period);
      await expect(tx).to.emit(insurance, "ConsensusFailed");
      await expect(tx).to.emit(insurance, "PayoutRejected").withArgs(policyId, period, 3, 0n, mm(20));
      await expect(tx).to.changeEtherBalance(farmer, 0);
    });

    it("fewer than two readings emits PayoutRejected(2); no funds move", async () => {
      const { insurance, oracleA, policyId, farmer } = await setupFundedPolicyWithOracles();
      const period = todayPeriodId();

      await insurance.connect(oracleA).submitReading(policyId, mm(10), period);

      const tx = insurance.evaluatePolicy(policyId, period);
      await expect(tx).to.emit(insurance, "PayoutRejected").withArgs(policyId, period, 2, 0n, mm(20));
      await expect(tx).to.changeEtherBalance(farmer, 0);
    });
  });

  describe("Trigger evaluation and payout", () => {
    async function setupFundedPolicyWithOracles(overrides = {}) {
      const ctx = await deployInsurance();
      const policy = await createStandardPolicy(ctx.insurance, ctx.owner, ctx.farmer, overrides);
      await ctx.insurance.connect(ctx.owner).fundPolicy(policy.policyId, { value: policy.coverageAmount });
      await ctx.insurance.connect(ctx.owner).registerOracle(ctx.oracleA.address);
      await ctx.insurance.connect(ctx.owner).registerOracle(ctx.oracleB.address);
      return { ...ctx, ...policy };
    }

    it("consensus below threshold pays exactly coverageAmount and sets PaidOut", async () => {
      const { insurance, oracleA, oracleB, policyId, farmer, coverageAmount, thresholdValue } =
        await setupFundedPolicyWithOracles();
      const period = todayPeriodId();

      await insurance.connect(oracleA).submitReading(policyId, mm(9), period);
      await insurance.connect(oracleB).submitReading(policyId, mm(11), period); // mean=10 < 20 threshold

      const tx = insurance.evaluatePolicy(policyId, period);
      await expect(tx).to.changeEtherBalances([insurance, farmer], [-coverageAmount, coverageAmount]);
      await expect(tx)
        .to.emit(insurance, "PayoutTriggered")
        .withArgs(policyId, farmer.address, coverageAmount, mm(10), thresholdValue);

      const policy = await insurance.getPolicy(policyId);
      expect(policy.status).to.equal(1n); // PaidOut
    });

    it("consensus at or above threshold emits PayoutRejected(1); no funds move", async () => {
      const { insurance, oracleA, oracleB, policyId, farmer, thresholdValue } =
        await setupFundedPolicyWithOracles();
      const period = todayPeriodId();

      await insurance.connect(oracleA).submitReading(policyId, mm(24), period);
      await insurance.connect(oracleB).submitReading(policyId, mm(26), period); // mean=25 > 20

      const tx = insurance.evaluatePolicy(policyId, period);
      await expect(tx)
        .to.emit(insurance, "PayoutRejected")
        .withArgs(policyId, period, 1, mm(25), thresholdValue);
      await expect(tx).to.changeEtherBalance(farmer, 0);
    });

    it("BOUNDARY: consensus exactly equal to threshold does not pay (strictly-below, D8)", async () => {
      const { insurance, oracleA, oracleB, policyId, farmer, thresholdValue } =
        await setupFundedPolicyWithOracles();
      const period = todayPeriodId();

      // Both readings exactly at threshold (20mm) — mean is exactly 20mm too.
      await insurance.connect(oracleA).submitReading(policyId, mm(20), period);
      await insurance.connect(oracleB).submitReading(policyId, mm(20), period);

      const tx = insurance.evaluatePolicy(policyId, period);
      await expect(tx)
        .to.emit(insurance, "PayoutRejected")
        .withArgs(policyId, period, 1, mm(20), thresholdValue);
      await expect(tx).to.changeEtherBalance(farmer, 0);

      const policy = await insurance.getPolicy(policyId);
      expect(policy.status).to.equal(0n); // still Active — no payout occurred
    });

    it("double payout: second evaluation after payout emits PayoutRejected(4); balance unchanged", async () => {
      const { insurance, oracleA, oracleB, policyId, farmer } = await setupFundedPolicyWithOracles();
      const period = todayPeriodId();

      await insurance.connect(oracleA).submitReading(policyId, mm(9), period);
      await insurance.connect(oracleB).submitReading(policyId, mm(11), period);
      await insurance.evaluatePolicy(policyId, period);

      const secondTx = insurance.evaluatePolicy(policyId, period);
      await expect(secondTx).to.emit(insurance, "PayoutRejected").withArgs(policyId, period, 4, mm(10), mm(20));
      await expect(secondTx).to.changeEtherBalance(farmer, 0);
    });

    it("period outside [startDate, endDate] emits PayoutRejected(5)", async () => {
      const now = Math.floor(Date.now() / 1000);
      const { insurance, oracleA, oracleB, policyId, thresholdValue } = await setupFundedPolicyWithOracles({
        startDate: now + 10 * DAY,
        endDate: now + 40 * DAY,
      });
      const period = todayPeriodId(); // today — before the window starts

      await insurance.connect(oracleA).submitReading(policyId, mm(9), period);
      await insurance.connect(oracleB).submitReading(policyId, mm(11), period);

      await expect(insurance.evaluatePolicy(policyId, period))
        .to.emit(insurance, "PayoutRejected")
        .withArgs(policyId, period, 5, mm(10), thresholdValue);
    });

    it("unfunded policy emits PayoutRejected(6); no transfer attempted", async () => {
      const { insurance, owner, oracleA, oracleB, farmer } = await deployInsurance();
      const { policyId, thresholdValue } = await createStandardPolicy(insurance, owner, farmer);
      // Deliberately not funded.
      await insurance.connect(owner).registerOracle(oracleA.address);
      await insurance.connect(owner).registerOracle(oracleB.address);
      const period = todayPeriodId();

      await insurance.connect(oracleA).submitReading(policyId, mm(9), period);
      await insurance.connect(oracleB).submitReading(policyId, mm(11), period);

      const tx = insurance.evaluatePolicy(policyId, period);
      await expect(tx)
        .to.emit(insurance, "PayoutRejected")
        .withArgs(policyId, period, 6, mm(10), thresholdValue);
      await expect(tx).to.changeEtherBalance(farmer, 0);
    });

    it("permissionless: a non-owner, non-oracle stranger can call evaluatePolicy", async () => {
      const { insurance, oracleA, oracleB, stranger, policyId, farmer, coverageAmount } =
        await setupFundedPolicyWithOracles();
      const period = todayPeriodId();

      await insurance.connect(oracleA).submitReading(policyId, mm(9), period);
      await insurance.connect(oracleB).submitReading(policyId, mm(11), period);

      await expect(
        insurance.connect(stranger).evaluatePolicy(policyId, period)
      ).to.changeEtherBalances([insurance, farmer], [-coverageAmount, coverageAmount]);
    });

    it("E6: rejecting-contract farmer — transfer fails, whole tx reverts, status stays Active", async () => {
      const { insurance, owner, oracleA, oracleB } = await deployInsurance();

      const RejectingFarmer = await ethers.getContractFactory("RejectingFarmer");
      const rejectingFarmer = await RejectingFarmer.deploy();
      const rejectingFarmerAddress = await rejectingFarmer.getAddress();

      const now = Math.floor(Date.now() / 1000);
      const coverageAmount = ethers.parseEther("1");
      await insurance
        .connect(owner)
        .createPolicy(
          rejectingFarmerAddress,
          "Cotton",
          "MH-VID-04",
          coverageAmount,
          0,
          mm(20),
          mm(5),
          now - DAY,
          now + 29 * DAY
        );
      const policyId = await insurance.getPolicyCount();
      await insurance.connect(owner).fundPolicy(policyId, { value: coverageAmount });
      await insurance.connect(owner).registerOracle(oracleA.address);
      await insurance.connect(owner).registerOracle(oracleB.address);

      const period = todayPeriodId();
      await insurance.connect(oracleA).submitReading(policyId, mm(9), period);
      await insurance.connect(oracleB).submitReading(policyId, mm(11), period);

      await expect(insurance.evaluatePolicy(policyId, period)).to.be.revertedWithCustomError(
        insurance,
        "PayoutTransferFailed"
      );

      // The whole transaction reverted, so status must still read Active —
      // never a state where PaidOut is recorded but funds did not move (E6).
      const policy = await insurance.getPolicy(policyId);
      expect(policy.status).to.equal(0n); // Active
    });
  });
});
