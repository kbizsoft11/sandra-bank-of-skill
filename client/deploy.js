require('dotenv').config();
const path = require('path');
const Client = require('ssh2-sftp-client');

const sftp = new Client();

async function deploy() {
  const host = process.env.SFTP_HOST;
  const port = process.env.SFTP_PORT ? Number(process.env.SFTP_PORT) : 22;
  const username = process.env.SFTP_USERNAME;
  const password = process.env.SFTP_PASSWORD;
  const privateKey = process.env.SFTP_PRIVATE_KEY;
  const targetDir = process.env.SFTP_TARGET_DIR || '/var/www/html/bank-of-skill/client';

  if (!host || !username) {
    throw new Error('SFTP_HOST and SFTP_USERNAME are required.');
  }

  const config = {
    host,
    port,
    username,
  };

  if (privateKey) {
    config.privateKey = privateKey.replace(/\\n/g, '\n');
  } else if (password) {
    config.password = password;
  } else {
    throw new Error('SFTP_PASSWORD or SFTP_PRIVATE_KEY is required.');
  }

  try {
    await sftp.connect(config);

    const clientDist = path.join(__dirname, 'dist', 'client', 'browser');
    const serverDist = path.join(__dirname, '..', 'server', 'dist');

    console.log('Uploading client to', path.posix.join(targetDir, 'client'));
    await sftp.uploadDir(clientDist, path.posix.join(targetDir, 'client'));

    console.log('Uploading server to', path.posix.join(targetDir, 'server'));
    await sftp.uploadDir(serverDist, path.posix.join(targetDir, 'server'));

    console.log('Deployment completed!');
  } catch (err) {
  console.error("===== DEPLOYMENT FAILED =====");
  console.error(err);

  console.error("Message:", err.message);

  if (err.code) {
    console.error("Code:", err.code);
  }

  if (err.stack) {
    console.error(err.stack);
  }

  process.exit(1);
} finally {
    sftp.end();
  }
}

deploy();