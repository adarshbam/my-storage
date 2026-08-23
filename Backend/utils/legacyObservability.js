/**
 * Enhanced lightweight observability utility for monitoring legacy byte-serving Express endpoints:
 * - GET /file/:fileId
 * - GET /file/:fileId/thumbnail
 *
 * Strictly adheres to privacy & security constraints:
 * - Logs structured JSON tagged with [LEGACY_BYTE_ENDPOINT_USAGE]
 * - Never logs HMAC signatures, signed CDN URLs, B2 credentials, authorization headers, cookies, or file content.
 */

const MAX_RECENT_LOGS = 50;

function createEmptyEndpointMetrics() {
  return {
    totalRequests: 0,
    successfulStreams: 0,
    errors: 0,
    lastRequestAt: null,
    byCallerType: {
      browser: 0,
      api_client: 0,
      unknown: 0,
    },
    byAction: {
      inline: 0,
      download: 0,
      range: 0,
      thumbnail: 0,
    },
    byStatusCode: {},
  };
}

const legacyMetrics = {
  startedAt: new Date().toISOString(),
  getFileById: createEmptyEndpointMetrics(),
  getThumbnail: createEmptyEndpointMetrics(),
  recentRequests: [],
};

/**
 * Safely classify caller type based on sanitized user-agent string
 */
function classifyCaller(userAgent = "") {
  const ua = (userAgent || "").toLowerCase();
  if (!ua || ua === "unknown") return "unknown";
  if (
    ua.includes("curl") ||
    ua.includes("postman") ||
    ua.includes("python-requests") ||
    ua.includes("axios") ||
    ua.includes("node-fetch") ||
    ua.includes("insomnia") ||
    ua.includes("wget") ||
    ua.includes("httpie")
  ) {
    return "api_client";
  }
  if (
    ua.includes("mozilla") ||
    ua.includes("chrome") ||
    ua.includes("safari") ||
    ua.includes("firefox") ||
    ua.includes("edge") ||
    ua.includes("opera")
  ) {
    return "browser";
  }
  return "unknown";
}

export function logLegacyEndpointUsage({
  endpoint,
  fileId,
  userId,
  action,
  range,
  statusCode,
  streamedBytes,
  durationMs,
  userAgent,
  referer,
  error,
}) {
  const timestamp = new Date().toISOString();
  const metricKey = endpoint.includes("thumbnail") ? "getThumbnail" : "getFileById";
  const callerType = classifyCaller(userAgent);
  const statusStr = String(statusCode || (error ? 500 : 200));

  const targetMetrics = legacyMetrics[metricKey];
  if (targetMetrics) {
    targetMetrics.totalRequests++;
    targetMetrics.lastRequestAt = timestamp;

    if (statusCode >= 200 && statusCode < 400 && streamedBytes) {
      targetMetrics.successfulStreams++;
    }
    if (statusCode >= 400 || error) {
      targetMetrics.errors++;
    }

    // Breakdown by caller type
    targetMetrics.byCallerType[callerType] =
      (targetMetrics.byCallerType[callerType] || 0) + 1;

    // Breakdown by action
    const actionKey = range ? "range" : action || (metricKey === "getThumbnail" ? "thumbnail" : "inline");
    targetMetrics.byAction[actionKey] =
      (targetMetrics.byAction[actionKey] || 0) + 1;

    // Breakdown by status code
    targetMetrics.byStatusCode[statusStr] =
      (targetMetrics.byStatusCode[statusStr] || 0) + 1;
  }

  // Safe structured log entry (no secrets, tokens, CDN signatures, or cookies)
  const logEntry = {
    tag: "[LEGACY_BYTE_ENDPOINT_USAGE]",
    timestamp,
    endpoint,
    fileId: fileId ? String(fileId) : null,
    userId: userId ? String(userId) : null,
    callerType,
    action: action || (metricKey === "getThumbnail" ? "thumbnail" : "inline"),
    range: Boolean(range),
    statusCode: Number(statusStr),
    streamedBytes: Boolean(streamedBytes),
    durationMs: durationMs || 0,
    userAgent: userAgent ? String(userAgent).substring(0, 150) : "unknown",
    referer: referer ? String(referer).substring(0, 150) : "unknown",
    ...(error ? { error: error.message || String(error) } : {}),
  };

  // Maintain circular buffer of recent invocations
  legacyMetrics.recentRequests.unshift({
    timestamp: logEntry.timestamp,
    endpoint: logEntry.endpoint,
    fileId: logEntry.fileId,
    userId: logEntry.userId,
    callerType: logEntry.callerType,
    action: logEntry.action,
    range: logEntry.range,
    statusCode: logEntry.statusCode,
    streamedBytes: logEntry.streamedBytes,
    durationMs: logEntry.durationMs,
    userAgent: logEntry.userAgent,
    referer: logEntry.referer,
  });

  if (legacyMetrics.recentRequests.length > MAX_RECENT_LOGS) {
    legacyMetrics.recentRequests.pop();
  }

  console.info(JSON.stringify(logEntry));
}

/**
 * Returns structured metrics summary for admin dashboard / inspection
 */
export function getLegacyTrafficMetrics() {
  const totalLegacyRequests =
    legacyMetrics.getFileById.totalRequests +
    legacyMetrics.getThumbnail.totalRequests;

  return {
    startedAt: legacyMetrics.startedAt,
    totalLegacyRequests,
    isZeroTraffic: totalLegacyRequests === 0,
    getFileById: { ...legacyMetrics.getFileById },
    getThumbnail: { ...legacyMetrics.getThumbnail },
    recentRequests: [...legacyMetrics.recentRequests],
  };
}

export function resetLegacyTrafficMetrics() {
  legacyMetrics.startedAt = new Date().toISOString();
  legacyMetrics.getFileById = createEmptyEndpointMetrics();
  legacyMetrics.getThumbnail = createEmptyEndpointMetrics();
  legacyMetrics.recentRequests = [];
}
