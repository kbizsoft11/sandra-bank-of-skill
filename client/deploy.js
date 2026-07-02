const Client = require('ssh2-sftp-client');

const sftp = new Client();

async function deploy() {
  try {
    await sftp.connect({
      host: '182.77.63.75',
      port: 22,
      username: 'kbiz',
      password: 'Linux@7988@7955'
    });

    await sftp.uploadDir(
      './dist/client/browser',
      '/var/www/html/bank-of-skill/client'
    );

    console.log('Deployment completed!');
  } catch (err) {
    console.error(err);
  } finally {
    sftp.end();
  }
}

deploy();