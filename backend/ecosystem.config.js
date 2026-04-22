module.exports = {
  apps: [{
    name: 'backend',
    script: 'src/app.js',
    instances: 1,
    autorestart: true,
    watch: true,            // 开发模式：文件改动自动重启
    watch_delay: 1000,      // 1秒防抖
    ignore_watch: ['node_modules', 'uploads', 'logs', '*.log'],
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'development',
    },
    env_production: {
      NODE_ENV: 'production',
    },
    // 日志配置
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    merge_logs: true,
  }],
};
