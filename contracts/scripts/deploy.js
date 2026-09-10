const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

const SEPOLIA_CHAIN_ID = 11155111n;

/**
 * Deploys CropInsurance and syncs the address + ABI into the backend and
 * frontend so nobody has to copy-paste an address after a redeploy. Same
 * script for every network — `--network localhost` vs `--network sepolia`
 * is the only difference; nothing here is network-specific by design.
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();

  if (network.chainId === SEPOLIA_CHAIN_ID) {
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    if (balance === 0n) {
      throw new Error(
        `Deployer ${deployer.address} has 0 ETH on Sepolia — cannot pay gas. ` +
          `Fund it from a testnet faucet (e.g. https://sepoliafaucet.com) and retry.`
      );
    }
    console.log(`Deployer balance: ${hre.ethers.formatEther(balance)} Sepolia ETH (testnet, no real value)`);
  }

  console.log(`Deploying with ${deployer.address} on ${hre.network.name} (chainId ${network.chainId})`);

  const insurance = await hre.ethers.deployContract("CropInsurance");
  await insurance.waitForDeployment();

  const address = await insurance.getAddress();
  const deployTx = insurance.deploymentTransaction();
  const receipt = deployTx ? await deployTx.wait() : null;

  console.log(`\nCropInsurance deployed:`);
  console.log(`  Address:     ${address}`);
  console.log(`  Deployer:    ${deployer.address}`);
  console.log(`  Network:     ${hre.network.name}`);
  console.log(`  Chain ID:    ${network.chainId}`);
  console.log(`  Tx hash:     ${deployTx ? deployTx.hash : "n/a"}`);
  console.log(`  Block:       ${receipt ? receipt.blockNumber : "n/a"}`);
  if (network.chainId === SEPOLIA_CHAIN_ID) {
    console.log(`  Explorer:    https://sepolia.etherscan.io/address/${address}`);
    console.log(`  Explorer tx: https://sepolia.etherscan.io/tx/${deployTx ? deployTx.hash : ""}`);
  }

  const artifact = await hre.artifacts.readArtifact("CropInsurance");
  const deployment = {
    address,
    chainId: Number(network.chainId),
    network: hre.network.name,
    deployedAt: new Date().toISOString(),
    deployTxHash: deployTx ? deployTx.hash : null,
    deployBlockNumber: receipt ? receipt.blockNumber : null,
    abi: artifact.abi,
  };

  // "local" or "sepolia" — used only to name the per-network backup copy
  // below, so the active deployment.json (still the single file backend
  // config.ts and the frontend's static import both read) never silently
  // destroys the other network's last-known deployment when you switch.
  const networkKey = network.chainId === SEPOLIA_CHAIN_ID ? "sepolia" : "local";

  const targets = [
    path.join(__dirname, "..", "..", "backend", "src", "deployment.json"),
    path.join(__dirname, "..", "..", "frontend", "src", "lib", "deployment.json"),
  ];

  for (const target of targets) {
    const dir = path.dirname(target);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(target, JSON.stringify(deployment, null, 2));
    console.log(`Wrote ${target}`);

    const backup = path.join(dir, `deployment.${networkKey}.json`);
    fs.writeFileSync(backup, JSON.stringify(deployment, null, 2));
    console.log(`Wrote ${backup} (per-network backup)`);
  }

  console.log(
    `\nTo switch the active deployment.json back to this network later without ` +
      `redeploying, run: npm run use-deployment -- ${networkKey}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
