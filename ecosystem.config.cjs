module.exports = {
  apps: [
    {
      name: "vault-backend",
      script: "./Backend/app.js",
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
