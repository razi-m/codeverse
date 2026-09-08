const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

/**
 * Deploys MessageBoard and syncs the address + ABI into the backend and
 * frontend so nobody has to copy-paste an address after a redeploy.
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();

  console.log(`Deploying with ${deployer.address} on ${hre.network.name} (chainId ${network.chainId})`);

  const board = await hre.ethers.deployContract("MessageBoard");
  await board.waitForDeployment();

  const address = await board.getAddress();
  console.log(`MessageBoard deployed to ${address}`);

  const artifact = await hre.artifacts.readArtifact("MessageBoard");
  const deployment = {
    address,
    chainId: Number(network.chainId),
    network: hre.network.name,
    deployedAt: new Date().toISOString(),
    abi: artifact.abi,
  };

  const targets = [
    path.join(__dirname, "..", "..", "backend", "src", "deployment.json"),
    path.join(__dirname, "..", "..", "frontend", "src", "lib", "deployment.json"),
  ];

  for (const target of targets) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(deployment, null, 2));
    console.log(`Wrote ${target}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
