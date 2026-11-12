module.exports = {
  apps: [{
    name: 'ff-urdu-name',
    script: 'server.js',
    cwd: __dirname,
    env: { PORT: 20348, HOST: '127.0.0.1', NODE_ENV: 'production' },
    autorestart: true,
    max_restarts: 10,
  }],
};
