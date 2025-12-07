module.exports = {
    apps: [
        {
            name: 'crm-sfr-api',
            script: 'dist/index.js',
            cwd: './server',
            instances: 'max', // Utilise tous les CPU disponibles
            exec_mode: 'cluster',
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'development',
                PORT: 3000
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 3000
            },
            // Logs
            log_file: './logs/combined.log',
            out_file: './logs/out.log',
            error_file: './logs/error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,

            // Restart policy
            autorestart: true,
            max_restarts: 10,
            min_uptime: '10s',
            restart_delay: 4000,

            // Graceful shutdown
            kill_timeout: 5000,
            wait_ready: true,
            listen_timeout: 10000,

            // Health monitoring
            exp_backoff_restart_delay: 100,
        },
        {
            name: 'crm-sfr-client',
            script: 'npx',
            args: 'serve -s dist -l 5173',
            cwd: './client',
            instances: 1,
            exec_mode: 'fork',
            watch: false,
            env_production: {
                NODE_ENV: 'production'
            },
            // Logs
            log_file: './logs/client-combined.log',
            out_file: './logs/client-out.log',
            error_file: './logs/client-error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

            // Restart policy
            autorestart: true,
            max_restarts: 5,
        }
    ],

    deploy: {
        production: {
            user: 'deploy',
            host: ['your-server-ip'],
            ref: 'origin/main',
            repo: 'git@github.com:your-repo/crm-sfr.git',
            path: '/var/www/crm-sfr',
            'pre-deploy-local': '',
            'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
            'pre-setup': '',
            env: {
                NODE_ENV: 'production'
            }
        }
    }
};
