const path = require("path");

module.exports = {
  apps: [
    {
      name: "vault-backend",
      cwd: __dirname,
      script: path.join(__dirname, "Backend", "app.js"),
      instances: 2,
      exec_mode: "cluster",
      wait_ready: true,
      listen_timeout: 15000,
      kill_timeout: 10000,
      max_memory_restart: "800M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
