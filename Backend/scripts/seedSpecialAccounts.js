import "../config/config.js";
import { connectDB, disconnectDB } from "../databases/mongoose.js";
import { disconnectRedis } from "../databases/redis.js";
import { provisionSpecialAccounts } from "../services/specialAccounts.service.js";

async function main() {
  console.log("🚀 [SeedSpecialAccounts] Starting manual provisioning run...");
  try {
    const success = await provisionSpecialAccounts();
    if (success) {
      console.log("🎉 [SeedSpecialAccounts] Special accounts successfully configured!");
    } else {
      console.error("❌ [SeedSpecialAccounts] Provisioning encountered errors.");
    }
  } catch (err) {
    console.error("❌ [SeedSpecialAccounts] Fatal error:", err);
  } finally {
    try {
      await disconnectDB();
      await disconnectRedis();
    } catch {}
    console.log("👋 [SeedSpecialAccounts] Done. Exiting.");
    process.exit(0);
  }
}

main();
