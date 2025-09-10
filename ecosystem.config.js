module.exports = {
  apps: [
    {
      name: 'frontend',
      script: 'node_modules/react-scripts/scripts/start.js',
      args: 'start',
      cwd: './frontend',
      interpreter: 'none',
      watch: true,
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        BROWSER: 'none'
      }
    },
    {
      name: 'backend',
      script: 'src/index.js',
      cwd: './node_backend',
      watch: true,
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      node_args: '--experimental-json-modules'
    }
  ]
};
