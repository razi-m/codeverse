const fs = require("fs");
const path = require("path");

/**
 * Switches the active deployment.json (read by backend config.ts and
 * statically imported by the frontend) back to a previously deployed
 * network's backup, without needing to redeploy. Fixes the collision where
 * deploying to one network overwrites the other's active deployment.json.
 *
 * Usage: node scripts/use-deployment.js local|sepolia
 */
function main() {
  const networkKey = process.argv[2];
  if (networkKey !== "local" && networkKey !== "sepolia") {
    console.error(`Usage: node scripts/use-deployment.js local|sepolia`);
    process.exitCode = 1;
    return;
  }

  const targets = [
    path.join(__dirname, "..", "..", "backend", "src", "deployment.json"),
    path.join(__dirname, "..", "..", "frontend", "src", "lib", "deployment.json"),
  ];

  for (const target of targets) {
    const backup = path.join(path.dirname(target), `deployment.${networkKey}.json`);
    if (!fs.existsSync(backup)) {
      console.error(
        `No backup found at ${backup} — this network hasn't been deployed since the ` +
          `per-network backup was added. Deploy to it first (npm run deploy:${networkKey}).`
      );
      process.exitCode = 1;
      return;
    }
    fs.copyFileSync(backup, target);
    console.log(`Restored ${target} from ${backup}`);
  }

  console.log(`\nActive deployment is now "${networkKey}". Restart backend/frontend dev servers to pick it up.`);
}

main();
