import { spawn, execSync } from "child_process";
import path from "path";
import os from "os";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATUS_FILE = path.join(os.homedir(), ".deployment-status.json");

function saveStatusToDisk(data) {
  try {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    // Non-critical
  }
}

function loadStatusFromDisk() {
  try {
    if (fs.existsSync(STATUS_FILE)) {
      const content = fs.readFileSync(STATUS_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    // Non-critical
  }
  return null;
}

const initialSaved = loadStatusFromDisk();

// State tracking for deployment pipeline
let isDeploying = initialSaved?.isDeploying || false;
let lastDeployment = initialSaved?.lastDeployment || {
  status: "idle",
  commit: null,
  author: null,
  message: null,
  startedAt: null,
  finishedAt: null,
  exitCode: null,
  logs: [],
};

let saveTimeout = null;
function persistStatus() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveStatusToDisk({ isDeploying, lastDeployment });
  }, 250);
}

function resolveDeployScript() {
  const homeDir = os.homedir();
  const possiblePaths = [
    path.join(homeDir, "my-storage/scripts/deploy-full.sh"),
    path.join(homeDir, "my-storage/deploy-full.sh"),
    path.resolve(__dirname, "../../../scripts/deploy-full.sh"),
    path.resolve(__dirname, "../../../deploy-full.sh"),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // Default fallback for Ubuntu EC2
  return "/home/ubuntu/my-storage/scripts/deploy-full.sh";
}

export function triggerDeployment({
  commit = "HEAD",
  author = "github-webhook",
  message = "",
} = {}) {
  const currentDiskState = loadStatusFromDisk();
  if (isDeploying || currentDiskState?.isDeploying) {
    const activeCommit =
      lastDeployment.commit || currentDiskState?.lastDeployment?.commit;
    const msg = `⚠️ [CI/CD Runner] Deployment already in progress for commit [${activeCommit}]. Skipping duplicate trigger.`;
    console.warn(msg);
    return {
      started: false,
      reason: "ALREADY_IN_PROGRESS",
      currentDeployment: currentDiskState?.lastDeployment || lastDeployment,
    };
  }

  isDeploying = true;
  const scriptPath = resolveDeployScript();
  const projectRoot = path.dirname(path.dirname(scriptPath));
  const workingDir = fs.existsSync(projectRoot) ? projectRoot : os.homedir();

  lastDeployment = {
    status: "running",
    commit,
    author,
    message,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    exitCode: null,
    logs: [],
  };
  saveStatusToDisk({ isDeploying, lastDeployment });

  // Pre-flight check: discard any dirty changes or file mode flags on the deployment runner
  try {
    execSync("git reset --hard HEAD", { cwd: workingDir, stdio: "ignore" });
  } catch (err) {
    // Non-critical: script will also run git reset --hard origin/main
  }

  console.log(`\n======================================================`);
  console.log(`🚀 [CI/CD Runner] Initiating Pipeline Deploymen`);
  console.log(`📦 Commit: ${commit} | Author: ${author}`);
  console.log(`📜 Script: ${scriptPath}`);
  console.log(`======================================================\n`);

  const child = spawn("bash", [scriptPath], {
    cwd: workingDir,
    env: {
      ...process.env,
      HOME: os.homedir(),
      CI: "true",
      TRIGGERED_COMMIT: commit,
    },
  });

  const appendLog = (chunk) => {
    const text = chunk.toString();
    process.stdout.write(text);
    const lines = text.split("\n").filter(Boolean);
    lastDeployment.logs.push(...lines);
    if (lastDeployment.logs.length > 250) {
      lastDeployment.logs = lastDeployment.logs.slice(-250);
    }
    persistStatus();
  };

  child.stdout.on("data", appendLog);
  child.stderr.on("data", appendLog);

  child.on("close", (code) => {
    isDeploying = false;
    lastDeployment.finishedAt = new Date().toISOString();
    lastDeployment.exitCode = code;

    if (code === 0) {
      lastDeployment.status = "success";
      console.log(
        `\n🎉 [CI/CD Runner] Pipeline deployed successful for commit [${commit}] (Exit Code: 0)\n`,
      );
    } else {
      lastDeployment.status = "failed";
      console.error(
        `\n❌ [CI/CD Runner] Pipeline deployment failed with exit code: ${code}\n`,
      );
    }
    saveStatusToDisk({ isDeploying, lastDeployment });
  });

  child.on("error", (err) => {
    isDeploying = false;
    lastDeployment.status = "error";
    lastDeployment.finishedAt = new Date().toISOString();
    lastDeployment.error = err.message;
    console.error(
      `❌ [CI/CD Runner] Failed to spawn deployment process:`,
      err.message,
    );
    saveStatusToDisk({ isDeploying, lastDeployment });
  });

  return {
    started: true,
    pid: child.pid,
    deployment: lastDeployment,
  };
}

export function getStatus() {
  const diskState = loadStatusFromDisk();
  if (diskState) {
    return diskState;
  }
  return {
    isDeploying,
    lastDeployment,
  };
}
