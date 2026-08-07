# DigitalOcean Deployment Guide 🌊

Complete guide for self-hosting Dahoot on a DigitalOcean Ubuntu droplet.

## Prerequisites

- DigitalOcean account
- Domain name (recommended for SSL)
- Local development machine with SSH access
- Basic knowledge of Linux commands

## Step 1: Create DigitalOcean Droplet

1. Log in to DigitalOcean and create a new droplet
2. Choose **Ubuntu 24.04 LTS** (or latest LTS)
3. Select appropriate size (recommended: 2GB RAM, 1 CPU for small deployments)
4. Choose a datacenter region closest to your users
5. Add your SSH key for authentication
6. Name the droplet (e.g., `dahoot-server`)
7. Create the droplet

## Step 2: Initial Server Setup

Connect to your droplet:

```bash
ssh root@your-droplet-ip
```

Update the system:

```bash
apt update && apt upgrade -y
```

Install required packages:

```bash
apt install -y nginx nodejs npm certbot python3-certbot-nginx ufail
```

Set up firewall:

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

## Step 3: Install PocketBase

Download and install PocketBase:

```bash
cd /opt
mkdir pocketbase
cd pocketbase

# Download latest PocketBase (check for latest version at https://pocketbase.io/docs/)
wget https://github.com/pocketbase/pocketbase/releases/download/v0.39.5/pocketbase_0.39.5_linux_amd64.zip

unzip pocketbase_0.39.5_linux_amd64.zip
rm pocketbase_0.39.5_linux_amd64.zip
chmod +x pocketbase
```

Create PocketBase data directory:

```bash
mkdir -p pb_data pb_hooks pb_migrations
```

## Step 4: Configure PocketBase as System Service

Create systemd service file:

```bash
nano /etc/systemd/system/pocketbase.service
```

Add the following content:

```ini
[Unit]
Description=PocketBase Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/pocketbase
ExecStart=/opt/pocketbase/pocketbase serve --http=127.0.0.1:8090
Restart=always
RestartSec=5
LimitNOFILE=65535
StandardOutput=append:/var/log/pocketbase.log
StandardError=append:/var/log/pocketbase.log

[Install]
WantedBy=multi-user.target
```

Set permissions and start service:

```bash
chown -R www-data:www-data /opt/pocketbase
systemctl daemon-reload
systemctl enable pocketbase
systemctl start pocketbase
systemctl status pocketbase
```

## Step 5: Configure Nginx

Create Nginx configuration:

```bash
nano /etc/nginx/sites-available/dahoot
```

Add the following configuration (replace `your-domain.com` with your actual domain):

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL configuration (will be configured by certbot)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend static files
    location / {
        root /opt/dahoot/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # PocketBase API
    location /api/ {
        proxy_pass http://127.0.0.1:8090/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Disable buffering for SSE (real-time notifications)
        proxy_buffering off;
        proxy_read_timeout 24h;
        proxy_send_timeout 24h;
    }

    # PocketBase admin (optional - restrict access in production)
    location /_/ {
        proxy_pass http://127.0.0.1:8090/_/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Optional: Restrict access to specific IP addresses
        # allow 1.2.3.4;
        # deny all;
    }
}
```

Enable the site:

```bash
ln -s /etc/nginx/sites-available/dahoot /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

## Step 6: Obtain SSL Certificate

```bash
certbot --nginx -d your-domain.com -d www.your-domain.com
```

Follow the prompts and choose to redirect HTTP to HTTPS.

## Step 7: Configure Local Environment

On your local machine, update `.env` file:

```bash
# Update with your actual values
DEPLOY_SERVER_IP=your-droplet-ip
DEPLOY_SERVER_USER=root
DEPLOY_SERVER_PATH=/opt/dahoot/
VITE_POCKETBASE_LIVE_URL=https://your-domain.com/api
POCKETBASE_HOOKS_PATH=/opt/pocketbase/pb_hooks
```

## Step 8: Initial Database Setup

Set up the production database:

```bash
npm run db:setup -- --live
```

This will create the necessary collections and seed default data on your production PocketBase instance.

## Step 9: Deploy Application

Deploy the application to your server:

```bash
# Full deployment (Both backend & frontend to VPS)
npm run deploy

# Or deploy backend only (PocketBase hooks & schema check)
npm run deploy-backend

# Or deploy frontend only (Vite build & dist/ rsync)
npm run deploy-frontend
```

The deployment script supports modular workflows:
- **`npm run deploy`**: Performs version checks, schema checks, builds static frontend assets, uploads `dist/`, and syncs PocketBase `pb_hooks/`.
- **`npm run deploy-backend`**: Performs version checks, schema checks, and syncs `pb_hooks/` to your server (ideal when using Cloudflare Pages / Vercel for frontend hosting).
- **`npm run deploy-frontend`**: Builds production assets locally and uploads `dist/` to your server.

## Step 10: Verify Deployment

1. Visit `https://your-domain.com` - you should see the Dahoot interface
2. Test the PocketBase admin at `https://your-domain.com/_/`
3. Create a test game and verify functionality

## Ongoing Maintenance

### Update Application

Make changes locally, then deploy according to your architecture:

```bash
# Deploy both backend and frontend changes
npm run deploy

# Deploy backend PocketBase hooks only
npm run deploy-backend

# Deploy frontend static assets only
npm run deploy-frontend
```

### Database Schema Changes

When you make schema changes:

```bash
npm run db:setup -- --live
```

### Monitor Logs

```bash
# PocketBase logs
tail -f /var/log/pocketbase.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Backup Database

```bash
# Create backup
tar -czf pocketbase-backup-$(date +%Y%m%d).tar.gz /opt/pocketbase/pb_data

# Copy to local machine
scp root@your-droplet-ip:/root/pocketbase-backup-*.tar.gz ./backups/
```

### Restart Services

```bash
# Restart PocketBase
systemctl restart pocketbase

# Restart Nginx
systemctl restart nginx
```

## Troubleshooting

### PocketBase won't start

```bash
# Check status
systemctl status pocketbase

# Check logs
journalctl -u pocketbase -n 50
```

### Nginx configuration issues

```bash
# Test configuration
nginx -t

# Check logs
tail -f /var/log/nginx/error.log
```

### Deployment fails

1. Verify SSH connectivity: `ssh root@your-droplet-ip`
2. Check environment variables in `.env`
3. Ensure PocketBase is running on the server
4. Verify directory permissions

### Performance Optimization

For higher traffic, consider:

1. Upgrade droplet resources
2. Enable Nginx caching
3. Use CDN for static assets
4. Implement database indexing
5. Set up monitoring tools

## Security Recommendations

1. **Restrict PocketBase admin access** - Uncomment IP restrictions in Nginx config
2. **Use strong passwords** - Set secure admin credentials
3. **Keep system updated** - Run `apt update && apt upgrade -y` regularly
4. **Configure firewall** - Only allow necessary ports
5. **Set up fail2ban** - Protect against brute force attacks
6. **Regular backups** - Automate database backups
7. **Monitor logs** - Watch for suspicious activity

## Cost Optimization

- Use appropriate droplet size for your needs
- Enable DigitalOcean backups ($1/month)
- Consider reserved instances for long-term deployments
- Monitor resource usage and scale accordingly

## Support

For issues specific to:
- **Dahoot**: Check the main README and GitHub issues
- **PocketBase**: Visit https://pocketbase.io/docs/
- **DigitalOcean**: Check DigitalOcean community and support docs
- **Nginx**: Consult Nginx documentation and forums