import { spawn, execSync } from "child_process";
import path from "path";
import os from "os";
import fs from "fs";
import { fileURLToPath } from "url";
import { sendDeploymentFailureEmail } from "./github.webhook.email.js";

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

function isProcessAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

const initialSaved = loadStatusFromDisk();

// In-memory runtime state
let isDeploying = false;
let activeChild = null;
let pendingDeployment = null;

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
    saveStatusToDisk({
      isDeploying,
      pid: activeChild?.pid || null,
      lastDeployment,
    });
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

/**
 * Triggers deployment pipeline or queues it if a build is active
 */
export function triggerDeployment({
  commit = "HEAD",
  author = "github-webhook",
  message = "",
} = {}) {
  console.log(`\n======================================================`);
  console.log(`🚀 [CI/CD Runner] Trigger Event Received`);
  console.log(`📦 Commit ID:       [${commit}]`);
  console.log(`💬 Commit Message:  "${message}"`);
  console.log(`👤 Author:          ${author}`);
  console.log(`======================================================`);

  const currentDiskState = loadStatusFromDisk();
  const diskDeploying = Boolean(currentDiskState?.isDeploying);
  const diskPid = currentDiskState?.pid;
  const diskStarted = currentDiskState?.lastDeployment?.startedAt;

  // Stale lock detection: if claimed deploying but PID is dead or running > 5 mins
  const isProcessRunning = activeChild || (diskDeploying && isProcessAlive(diskPid));
  const ageMinutes = (Date.now() - new Date(diskStarted || 0).getTime()) / (1000 * 60);

  if (diskDeploying && (!isProcessRunning || ageMinutes > 5)) {
    console.warn(`⚠️ [CI/CD Runner] Clearing stale deployment lock (Age: ${Math.round(ageMinutes)}m).`);
    saveStatusToDisk({
      isDeploying: false,
      pid: null,
      lastDeployment: currentDiskState?.lastDeployment || lastDeployment,
    });
    isDeploying = false;
    activeChild = null;
  }

  // If a real build is currently actively running, queue this commit instead of dropping it
  if (isDeploying || (activeChild && !activeChild.killed)) {
    pendingDeployment = { commit, author, message };
    const activeCommit = lastDeployment.commit || currentDiskState?.lastDeployment?.commit || "current";
    console.log(
      `⏳ [CI/CD Runner] Build in progress for commit [${activeCommit}]. Commit [${commit}] queued for auto-run upon completion.`
    );
    return {
      started: false,
      status: "queued_behind_active_build",
      activeCommit,
      queuedCommit: commit,
    };
  }

  // Start fresh deployment
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
    logs: [
      `🚀 Starting deployment pipeline for commit [${commit}]...`,
      `💬 Message: "${message}"`,
      `👤 Author: ${author}`,
    ],
  };
  saveStatusToDisk({ isDeploying: true, pid: null, lastDeployment });

  console.log(`📜 [CI/CD Runner] Executing script: ${scriptPath}`);
  console.log(`📂 [CI/CD Runner] Working directory: ${workingDir}`);

  const child = spawn("bash", [scriptPath], {
    cwd: workingDir,
    env: {
      ...process.env,
      HOME: os.homedir(),
      CI: "true",
      TRIGGERED_COMMIT: commit,
      TRIGGERED_MESSAGE: message,
      TRIGGERED_AUTHOR: author,
    },
  });

  activeChild = child;
  saveStatusToDisk({ isDeploying: true, pid: child.pid, lastDeployment });

  const appendLog = (chunk) => {
    const text = chunk.toString();
    process.stdout.write(text);
    const lines = text.split("\n").filter(Boolean);
    lastDeployment.logs.push(...lines);
    if (lastDeployment.logs.length > 300) {
      lastDeployment.logs = lastDeployment.logs.slice(-300);
    }
    persistStatus();
  };

  child.stdout.on("data", appendLog);
  child.stderr.on("data", appendLog);

  child.on("close", (code) => {
    isDeploying = false;
    activeChild = null;
    lastDeployment.finishedAt = new Date().toISOString();
    lastDeployment.exitCode = code;

    // Enrich commit details directly from local git repository if available
    try {
      if (!lastDeployment.message || lastDeployment.message === "No commit message") {
        lastDeployment.message = execSync('git log -1 --pretty=format:"%s"', {
          cwd: workingDir,
        }).toString().trim();
      }
      if (
        !lastDeployment.author ||
        lastDeployment.author === "Unknown" ||
        lastDeployment.author === "github-committer"
      ) {
        lastDeployment.author = execSync('git log -1 --pretty=format:"%an"', {
          cwd: workingDir,
        }).toString().trim();
      }
    } catch (gitErr) {
      // Non-critical fallback
    }

    if (code === 0) {
      lastDeployment.status = "success";
      console.log(
        `\n🎉 [CI/CD Runner] Pipeline deployed successfully for commit [${commit}] (Exit Code: 0)\n`
      );
    } else {
      lastDeployment.status = "failed";
      console.error(
        `\n❌ [CI/CD Runner] Pipeline deployment failed with exit code: ${code}\n`
      );

      sendDeploymentFailureEmail({
        commit,
        commitMessage: message,
        author,
        exitCode: code,
        logs: lastDeployment.logs,
        startedAt: lastDeployment.startedAt,
        finishedAt: lastDeployment.finishedAt,
      }).catch((emailErr) => {
        console.warn("⚠️ [CI/CD Alert] Email dispatch warning:", emailErr.message);
      });
    }

    saveStatusToDisk({ isDeploying: false, pid: null, lastDeployment });

    // Auto-trigger next queued deployment if one arrived during this build
    if (pendingDeployment) {
      const next = pendingDeployment;
      pendingDeployment = null;
      console.log(
        `\n🔄 [CI/CD Runner] Running queued deployment for commit [${next.commit}]...\n`
      );
      setTimeout(() => triggerDeployment(next), 1000);
    }
  });

  child.on("error", (err) => {
    isDeploying = false;
    activeChild = null;
    lastDeployment.status = "error";
    lastDeployment.finishedAt = new Date().toISOString();
    lastDeployment.error = err.message;
    console.error(`❌ [CI/CD Runner] Failed to spawn deployment process:`, err.message);

    sendDeploymentFailureEmail({
      commit,
      commitMessage: message,
      author,
      exitCode: -1,
      errorMessage: err.message,
      logs: lastDeployment.logs,
      startedAt: lastDeployment.startedAt,
      finishedAt: lastDeployment.finishedAt,
    }).catch((emailErr) => {
      console.warn("⚠️ [CI/CD Alert] Email dispatch warning:", emailErr.message);
    });

    saveStatusToDisk({ isDeploying: false, pid: null, lastDeployment });

    if (pendingDeployment) {
      const next = pendingDeployment;
      pendingDeployment = null;
      setTimeout(() => triggerDeployment(next), 1000);
    }
  });

  return {
    started: true,
    status: "started",
    pid: child.pid,
    deployment: lastDeployment,
  };
}

export function resetLock() {
  activeChild = null;
  isDeploying = false;
  pendingDeployment = null;
  const currentDiskState = loadStatusFromDisk();
  if (currentDiskState?.lastDeployment) {
    if (currentDiskState.lastDeployment.status === "running") {
      currentDiskState.lastDeployment.status = "idle";
      currentDiskState.lastDeployment.finishedAt = new Date().toISOString();
    }
    saveStatusToDisk({
      isDeploying: false,
      pid: null,
      lastDeployment: currentDiskState.lastDeployment,
    });
  } else {
    saveStatusToDisk({ isDeploying: false, pid: null, lastDeployment });
  }
  console.log("🔓 [CI/CD Runner] Deployment lock reset by request.");
  return { success: true, message: "Deployment lock cleared" };
}

export function getStatus() {
  const diskState = loadStatusFromDisk();
  if (diskState) {
    // Auto-heal if claimed deploying but PID is no longer alive
    if (diskState.isDeploying && !isProcessAlive(diskState.pid) && !activeChild) {
      diskState.isDeploying = false;
      if (diskState.lastDeployment && diskState.lastDeployment.status === "running") {
        diskState.lastDeployment.status = "success";
        diskState.lastDeployment.finishedAt =
          diskState.lastDeployment.finishedAt || new Date().toISOString();
      }
      saveStatusToDisk(diskState);
    }
    return diskState;
  }
  return {
    isDeploying,
    lastDeployment,
  };
}
