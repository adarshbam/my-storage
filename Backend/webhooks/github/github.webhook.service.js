import { spawn } from "child_process";
import path from "path";
import os from "os";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// State tracking for deployment pipeline
let isDeploying = false;
let lastDeployment = {
  status: "idle",
  commit: null,
  author: null,
  message: null,
  startedAt: null,
  finishedAt: null,
  exitCode: null,
  logs: [],
};

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
  if (isDeploying) {
    const msg = `⚠️ [CI/CD Runner] Deployment already in progress for commit [${lastDeployment.commit}]. Skipping duplicate trigger.`;
    console.warn(msg);
    return {
      started: false,
      reason: "ALREADY_IN_PROGRESS",
      currentDeployment: lastDeployment,
    };
  }

  isDeploying = true;
  const scriptPath = resolveDeployScript();
  const projectRoot = path.dirname(path.dirname(scriptPath));

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

  console.log(`\n======================================================`);
  console.log(`🚀 [CI/CD Runner] Initiating Pipeline Deployment`);
  console.log(`📦 Commit: ${commit} | Author: ${author}`);
  console.log(`📜 Script: ${scriptPath}`);
  console.log(`======================================================\n`);

  const child = spawn("bash", [scriptPath], {
    cwd: fs.existsSync(projectRoot) ? projectRoot : os.homedir(),
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
    if (lastDeployment.logs.length > 200) {
      lastDeployment.logs = lastDeployment.logs.slice(-200);
    }
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
        `\n🎉 [CI/CD Runner] Pipeline deployed successfuly for commit [${commit}] (Exit Code: 0)\n`,
      );
    } else {
      lastDeployment.status = "failed";
      console.error(
        `\n❌ [CI/CD Runner] Pipeline deployment failed with exit code: ${code}\n`,
      );
    }
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
  });

  return {
    started: true,
    pid: child.pid,
    deployment: lastDeployment,
  };
}

export function getStatus() {
  return {
    isDeploying,
    lastDeployment,
  };
}
