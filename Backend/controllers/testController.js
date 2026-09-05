/**
 * Test Controller for verifying backend deployment and health status.
 * Completely public and unauthenticated, protected by rate limiting.
 */

export const getDeployTest = (req, res) => {
  return res.status(200).json({
    status: "success",
    message: "test one",
    testOne: "test one",
    testTwo: "test two",
    tests: ["test one", "test two"],
    deployment: {
      status: "deployed",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || "development",
    },
  });
};

export const getTestOne = (req, res) => {
  return res.status(200).json({
    status: "success",
    test: "test one",
    message: "test one",
    timestamp: new Date().toISOString(),
  });
};

export const getTestTwo = (req, res) => {
  return res.status(200).json({
    status: "success",
    test: "test two",
    message: "test two",
    timestamp: new Date().toISOString(),
  });
};
