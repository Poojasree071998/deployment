import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Service to generate Nginx configuration blocks for deployed projects.
 */
export const generateNginxConfig = (projectName: string, subdomain: string, port: number) => {
  const domain = process.env.ROOT_DOMAIN || 'localhost';
  
  const config = `
server {
    listen 80;
    server_name ${subdomain}.${domain};

    access_log /var/log/nginx/${projectName}.access.log;
    error_log /var/log/nginx/${projectName}.error.log;

    location / {
        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Increase body size for file uploads
        client_max_body_size 50M;
    }
}
`;

  // Write to a local folder so the user can easily find it
  try {
    const configDir = path.join(__dirname, '../../../../config/nginx');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    const filePath = path.join(configDir, `${subdomain}.conf`);
    fs.writeFileSync(filePath, config);
    
    console.log(`\n✅ Nginx Config saved to: config/nginx/${subdomain}.conf`);
  } catch (err: any) {
    console.error('⚠️ Could not save Nginx config to file:', err.message);
  }

  console.log(`\n📄 Generated Nginx Config for ${projectName}:`);
  console.log(config);
  
  return config;
};
