import { resetProUser, deleteTestFlows } from "../helpers/db";

async function globalTeardown() {
  console.log("[E2E teardown] Cleaning up...");
  deleteTestFlows();
  resetProUser();
  console.log("[E2E teardown] Done.");
}

export default globalTeardown;
