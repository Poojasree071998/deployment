const { spawn } = require('child_process');

console.log('\x1b[36m%s\x1b[0m', '🚀 Starting Public Tunnel for GitHub Webhooks...');
console.log('--------------------------------------------------');

/**
 * This script uses npx to run ngrok without needing to install it globally.
 * It exposes port 5000 (the backend API).
 */
const ngrok = spawn('npx', ['ngrok', 'http', '5000'], {
  shell: true
});

ngrok.stdout.on('data', (data) => {
  const output = data.toString();
  if (output.includes('Forwarding')) {
    const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.ngrok-free\.app/);
    if (urlMatch) {
      const url = urlMatch[0];
      console.log('\n\x1b[32m%s\x1b[0m', '✅ Tunnel established!');
      console.log('\x1b[33m%s\x1b[0m', '👉 YOUR PUBLIC URL: ' + url);
      console.log('\n\x1b[1m%s\x1b[0m', 'INSTRUCTIONS:');
      console.log('1. Copy the URL above.');
      console.log('2. Go to your Dashboard -> Select Project -> Webhooks tab.');
      console.log('3. Paste it into the "Public Tunnel URL" field.');
      console.log('4. Click "Setup Webhook Automatically".');
      console.log('--------------------------------------------------');
    }
  }
});

ngrok.stderr.on('data', (data) => {
  console.error(`Error: ${data}`);
});

ngrok.on('close', (code) => {
  console.log(`Tunnel closed with code ${code}`);
});

console.log('Waiting for ngrok to provide a URL...');
console.log('(Note: If this is your first time, you might need to run "npx ngrok config add-authtoken <your-token>")');
