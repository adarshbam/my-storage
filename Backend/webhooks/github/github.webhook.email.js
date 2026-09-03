import sendEmail from "../../integrations/email/email.service.js";

/**
 * Detects which deployment stage failed based on stdout/stderr logs
 */
function identifyFailedStep(logs = []) {
  const text = logs.join("\n");
  if (text.includes("Your local changes to the following files would be overwritten by merge") || text.includes("[1/4]") || text.includes("fatal: unable to access")) {
    return "Step 1/4: Git Sync & Pull";
  }
  if (text.includes("[2/4]") || text.includes("FAIL") || text.includes("test failed") || text.includes("Jest") || text.includes("Vitest")) {
    return "Step 2/4: Automated Test Suite";
  }
  if (text.includes("[3/4]") || text.includes("aws s3 sync") || text.includes("vite build") || text.includes("build failed")) {
    return "Step 3/4: Frontend Build & S3/CloudFront Sync";
  }
  if (text.includes("[4/4]") || text.includes("npm install") || text.includes("pm2 reload") || text.includes("node-gyp")) {
    return "Step 4/4: Backend Dependencies & PM2 Reload";
  }
  return "Unknown Stage";
}

/**
 * Formats and dispatches a detailed failure alert email
 */
export async function sendDeploymentFailureEmail({
  commit = "unknown",
  commitMessage = "No commit message",
  author = "Unknown",
  exitCode = 1,
  errorMessage = null,
  logs = [],
  startedAt = new Date().toISOString(),
  finishedAt = new Date().toISOString(),
} = {}) {
  const recipient =
    process.env.ALERT_EMAIL ||
    process.env.SMTP_USER ||
    "adarshsingh800515@gmail.com";

  const failedStage = identifyFailedStep(logs);
  const recentLogs = logs.slice(-45).join("\n") || errorMessage || "No output logs captured.";

  const durationSec = Math.max(
    0,
    Math.round((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000)
  );

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
    .container { max-width: 680px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; border: 1px solid #334155; overflow: hidden; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); padding: 24px 32px; color: #ffffff; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
    .header p { margin: 6px 0 0 0; opacity: 0.9; font-size: 14px; }
    .content { padding: 28px 32px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .badge-error { background-color: #fee2e2; color: #991b1b; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0; }
    .card { background-color: #0f172a; padding: 14px 18px; border-radius: 8px; border: 1px solid #334155; }
    .card-label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #94a3b8; margin-bottom: 4px; }
    .card-value { font-size: 14px; font-weight: 500; color: #f1f5f9; word-break: break-all; }
    .commit-box { background-color: #0f172a; border-left: 4px solid #ef4444; padding: 14px 18px; border-radius: 4px; margin: 16px 0; }
    .commit-title { font-weight: 600; font-size: 15px; color: #f8fafc; margin-bottom: 4px; }
    .terminal { background-color: #020617; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; margin-top: 18px; overflow-x: auto; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 12px; line-height: 1.5; color: #fca5a5; max-height: 320px; }
    .footer { padding: 16px 32px; background-color: #0f172a; border-top: 1px solid #334155; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 CI/CD Deployment Failed</h1>
      <p>Vault Cloud Storage &bull; Production Automated Pipeline</p>
    </div>
    <div class="content">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span class="badge badge-error">Exit Code: ${exitCode}</span>
        <span style="font-size: 13px; color: #94a3b8;">Duration: ${durationSec}s</span>
      </div>

      <div class="commit-box">
        <div class="commit-title">💬 "${escapeHtml(commitMessage)}"</div>
        <div style="font-size: 13px; color: #94a3b8;">
          Commit: <strong style="color: #60a5fa;">${commit}</strong> &bull; Author: <strong>${escapeHtml(author)}</strong>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <div class="card-label">Failed Stage</div>
          <div class="card-value" style="color: #f87171; font-weight: 600;">${failedStage}</div>
        </div>
        <div class="card">
          <div class="card-label">Timestamp (UTC)</div>
          <div class="card-value">${new Date(finishedAt).toUTCString()}</div>
        </div>
      </div>

      <div style="margin-top: 20px;">
        <div style="font-size: 13px; font-weight: 600; color: #cbd5e1; margin-bottom: 6px;">
          Tail Output Logs (Last 45 Lines):
        </div>
        <pre class="terminal">${escapeHtml(recentLogs)}</pre>
      </div>
    </div>
    <div class="footer">
      Automated alert sent by Vault CI/CD Webhook Runner &bull; Server: AWS EC2 Ubuntu
    </div>
  </div>
</body>
</html>
  `;

  try {
    console.log(`📧 [CI/CD Alert] Sending failure notification email to ${recipient}...`);
    await sendEmail({
      to: recipient,
      subject: `🚨 [DEPLOY FAILED] Vault Storage: ${commit} - "${commitMessage.slice(0, 40)}"`,
      html,
    });
    console.log(`✅ [CI/CD Alert] Failure notification email delivered successfully.`);
  } catch (emailErr) {
    console.warn(`⚠️ [CI/CD Alert] Could not send failure notification email:`, emailErr.message);
  }
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
