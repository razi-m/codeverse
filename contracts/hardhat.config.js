require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const { SEPOLIA_RPC_URL } = process.env;
// DEPLOYER_PRIVATE_KEY is the documented name; PRIVATE_KEY is kept as a
// fallback so an existing .env from before this name was settled on still
// works — never require a rename to avoid breaking a working setup.
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    // `npx hardhat node` serves this at http://127.0.0.1:8545 (chainId 31337)
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    // Only registered when both are present — running `--network sepolia`
    // without them fails with Hardhat's own "network sepolia doesn't
    // exist" rather than silently doing something with an empty key.
    ...(SEPOLIA_RPC_URL && DEPLOYER_PRIVATE_KEY
      ? {
          sepolia: {
            url: SEPOLIA_RPC_URL,
            accounts: [DEPLOYER_PRIVATE_KEY],
          },
        }
      : {}),
  },
};
