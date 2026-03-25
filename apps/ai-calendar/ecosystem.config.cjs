module.exports = {
  apps: [
    {
      name: "ai-calendar",
      script: "npm",
      args: "start",
      cwd: "/var/www/ai-calendar/apps/ai-calendar",
      env: {
        NODE_ENV: "production",
        PORT: 3002
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      error_file: "/var/log/pm2/ai-calendar-error.log",
      out_file: "/var/log/pm2/ai-calendar-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true
    }
  ]
};
