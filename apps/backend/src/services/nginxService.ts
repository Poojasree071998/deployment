import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execAsync = promisify(exec);

const NGINX_SITES_PATH = process.env.NGINX_SITES_PATH || '/etc/nginx/sites-available';
const NGINX_ENABLED_PATH = process.env.NGINX_ENABLED_PATH || '/etc/nginx/sites-enabled';
const BASE_DOMAIN = process.env.ROOT_DOMAIN || 'localhost';

/**
 * Service to manage Nginx configurations for real-world VPS deployments.
 */
export class NginxService {
  /**
   * Generates and applies an Nginx configuration for a project
   */
  static async generateAndApply(projectName: string, subdomain: string, targetPort: number) {
    const fullDomain = `${subdomain}.${BASE_DOMAIN}`;
    
    const config = `
server {
    listen 80;
    server_name ${fullDomain};

    access_log /var/log/nginx/${projectName}.access.log;
    error_log /var/log/nginx/${projectName}.error.log;

    location / {
        proxy_pass http://127.0.0.1:${targetPort};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 100M;
    }
}
`;

    const configPath = path.join(NGINX_SITES_PATH, `${fullDomain}.conf`);
    const enabledPath = path.join(NGINX_ENABLED_PATH, `${fullDomain}.conf`);

    try {
      // 1. Write the config file (Production path)
      if (fs.existsSync(NGINX_SITES_PATH)) {
        fs.writeFileSync(configPath, config);
        
        // 2. Create symlink to sites-enabled
        if (!fs.existsSync(enabledPath)) {
          fs.symlinkSync(configPath, enabledPath);
        }

        // 3. Test and reload Nginx
        await execAsync('nginx -t');
        await execAsync('systemctl reload nginx');
        console.log(`[NGINX] Successfully configured routing for ${fullDomain}`);
      } else {
        // Fallback for local development/testing
        const localConfigDir = path.join(__dirname, '../../../../config/nginx');
        if (!fs.existsSync(localConfigDir)) {
          fs.mkdirSync(localConfigDir, { recursive: true });
        }
        const localFilePath = path.join(localConfigDir, `${subdomain}.conf`);
        fs.writeFileSync(localFilePath, config);
        console.log(`[NGINX] Mock environment: Config saved to ${localFilePath}`);
      }
    } catch (error: any) {
      console.error(`[NGINX] Error configuring routing: ${error.message}`);
      throw error;
    }
    
    return config;
  }

  /**
   * Removes Nginx configuration for a project
   */
  static async removeConfig(subdomain: string) {
    const fullDomain = `${subdomain}.${BASE_DOMAIN}`;
    const configPath = path.join(NGINX_SITES_PATH, `${fullDomain}.conf`);
    const enabledPath = path.join(NGINX_ENABLED_PATH, `${fullDomain}.conf`);

    try {
      if (fs.existsSync(enabledPath)) fs.unlinkSync(enabledPath);
      if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
      
      if (fs.existsSync(NGINX_SITES_PATH)) {
        await execAsync('systemctl reload nginx');
      }
      console.log(`[NGINX] Removed routing for ${fullDomain}`);
    } catch (error: any) {
      console.error(`[NGINX] Error removing routing: ${error.message}`);
    }
  }
}
