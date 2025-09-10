
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'node_backend', 'data', 'database.sqlite');
const dbShmPath = path.join(__dirname, 'node_backend', 'data', 'database.sqlite-shm');
const dbWalPath = path.join(__dirname, 'node_backend', 'data', 'database.sqlite-wal');

if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('Deleted database.sqlite');
}

if (fs.existsSync(dbShmPath)) {
  fs.unlinkSync(dbShmPath);
  console.log('Deleted database.sqlite-shm');
}

if (fs.existsSync(dbWalPath)) {
  fs.unlinkSync(dbWalPath);
  console.log('Deleted database.sqlite-wal');
}
