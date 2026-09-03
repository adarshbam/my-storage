import * as deployService from "./github.webhook.service.js";
import { createHmac, timingSafeEqual } from "crypto";
import { GITHUB_WEBHOOK_SECRET } from "../../config/config.js";

/**
 * Handles incoming GitHub Webhook events (push, ping, etc.)
 */
export async function handleGithubWebhook(req, res) {
  try {
    const event = req.headers["x-github-event"] || "push";
    const signature = req.headers["x-hub-signature-256"];
    const secret = GITHUB_WEBHOOK_SECRET || process.env.GITHUB_WEBHOOK_SECRET;
    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "unknown-ip";

    // 1. Authenticate webhook signature if secret is configured
    if (secret) {
      if (!signature) {
        console.warn(
          `⚠️ [GitHub Webhook] Rejected: Missing x-hub-signature-256 header (IP: ${clientIp}).`,
        );
        return res.status(401).json({
          success: false,
          message: "Missing x-hub-signature-256 header",
        });
      }

      // Must use the exact raw unparsed request Buffer!
      const rawPayload = req.rawBody || Buffer.from(JSON.stringify(req.body));
      const generatedSignature =
        "sha256=" + createHmac("sha256", secret).update(rawPayload).digest("hex");

      const sigBuffer = Buffer.from(signature);
      const genBuffer = Buffer.from(generatedSignature);

      const isMatch =
        sigBuffer.length === genBuffer.length &&
        timingSafeEqual(sigBuffer, genBuffer);

      if (!isMatch) {
        console.warn(
          `❌ [GitHub Webhook Security Alert] Signature mismatch from IP: ${clientIp} for event: "${event}".`,
        );
        return res.status(401).json({
          success: false,
          message: "Invalid webhook signature",
        });
      }
    } else {
      console.warn(
        "⚠️ [GitHub Webhook] GITHUB_WEBHOOK_SECRET not set. Proceeding without signature check.",
      );
    }

    console.log(
      `📥 [GitHub Webhook] Received verified event: "${event}" from IP: ${clientIp}`,
    );

    // 1. Handle GitHub ping verification
    if (event === "ping") {
      return res.status(200).json({
        success: true,
        event: "ping",
        message: "GitHub webhook connected successfully! CI/CD runner is ready.",
        zen: req.body?.zen,
        hookId: req.body?.hook_id,
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Handle push events
    if (event === "push") {
      const ref = req.body?.ref || "";
      // Only deploy on main/master branch push
      const isMainBranch =
        ref === "refs/heads/main" || ref === "refs/heads/master";

      if (!isMainBranch) {
        return res.status(200).json({
          success: true,
          message: `Push to non-production branch (${ref}) ignored.`,
          branch: ref,
        });
      }

      const commitsArr = Array.isArray(req.body?.commits) ? req.body.commits : [];
      const targetCommit =
        req.body?.head_commit ||
        (commitsArr.length > 0 ? commitsArr[commitsArr.length - 1] : null);

      const commit = targetCommit?.id
        ? targetCommit.id.slice(0, 7)
        : req.body?.after
          ? req.body.after.slice(0, 7)
          : "latest";

      const author =
        targetCommit?.author?.name ||
        req.body?.sender?.login ||
        "github-committer";

      const rawMessage = targetCommit?.message || "No commit message";
      const commitMessage = rawMessage.split("\n")[0].trim();

      // Immediate HTTP 200 response to satisfy GitHub's 10-second timeout
      res.status(200).json({
        success: true,
        status: "queued",
        message: `Deployment pipeline queued for commit [${commit}]`,
        commit,
        author,
        commitMessage,
        timestamp: new Date().toISOString(),
      });

      // Execute the deployment asynchronously
      const deployResult = deployService.triggerDeployment({
        commit,
        author,
        message: commitMessage,
      });

      console.log(
        `📋 [GitHub Webhook] Trigger status: "${deployResult.status}" for commit [${commit}]`,
      );
      return;
    }

    // 3. Fallback for other events
    return res.status(200).json({
      success: true,
      message: `GitHub event "${event}" acknowledged without deployment action.`,
    });
  } catch (err) {
    console.error("❌ [GitHub Webhook Error] Unexpected failure handling webhook:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error processing webhook",
      error: err.message,
    });
  }
}

/**
 * Returns current deployment pipeline status and recent logs
 */
export function getDeploymentStatus(req, res) {
  const status = deployService.getStatus();
  return res.status(200).json({
    success: true,
    ...status,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Resets deployment lock if manually requested
 */
export function resetDeploymentLock(req, res) {
  const result = deployService.resetLock();
  return res.status(200).json(result);
}
