import { ethers } from "ethers";
import { config, loadDeployment } from "../config.js";
import { notifyPayout } from "./notificationRouter.js";

/**
 * Live push-based hook: a persistent ethers subscription to PayoutTriggered,
 * firing the notification router the moment the event is mined — no
 * polling, no delay. This is the one thing insurance.ts never had (it's
 * strictly read-on-demand); this file is the standing listener that makes
 * a real notification loop possible at all.
 *
 * Never coupled to CropInsurance.sol itself (Phase 22) — this listens to
 * the ABI's event, nothing more; the contract knows nothing about Twilio.
 */

let started = false;

export function startPayoutListener(): void {
  if (started) return;
  const deployment = loadDeployment();
  if (!deployment) {
    console.warn("[payoutListener] no deployment found — payout notifications will not fire");
    return;
  }

  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const contract = new ethers.Contract(deployment.address, deployment.abi as ethers.InterfaceAbi, provider);

  contract.on(
    "PayoutTriggered",
    async (policyId, farmer, amount, consensusValue, thresholdValue, event) => {
      try {
        const chainId = Number((await provider.getNetwork()).chainId);
        console.log(
          `[payoutListener] PayoutTriggered policyId=${policyId} tx=${event.log.transactionHash} logIndex=${event.log.index}`
        );
        await notifyPayout({
          chainId,
          contractAddress: deployment.address,
          txHash: event.log.transactionHash,
          logIndex: event.log.index,
          policyId: Number(policyId),
          farmerAddress: farmer,
          amountWei: amount.toString(),
          consensusValueScaled: consensusValue.toString(),
          thresholdValueScaled: thresholdValue.toString(),
        });
      } catch (err) {
        // A notification-path failure must never crash the listener or be
        // mistaken for a payout failure — the payout already happened.
        console.error("[payoutListener] notifyPayout failed:", err);
      }
    }
  );

  started = true;
  console.log(`[payoutListener] listening for PayoutTriggered on ${deployment.address} (chain ${deployment.chainId})`);
}
