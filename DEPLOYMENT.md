# Deployment Guide

This guide covers deploying the WhatsApp bot to various environments, from local development to production.

## 🏠 Local Development

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- WhatsApp Business API credentials
- OpenAI API key

### Quick Start
```bash
# Clone and setup
git clone <repository-url>
cd base-ts-meta-memory
npm install

# Configure environment
cp .env-example .env
# Edit .env with your credentials

# Build and run
npm run build
npm start
```

### Development Mode
```bash
npm run dev  # Hot reload with nodemon
```

## 🐳 Docker Deployment

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3008

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3008/ || exit 1

# Start the application
CMD ["npm", "start"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  whatsapp-bot:
    build: .
    ports:
      - "3008:3008"
    environment:
      - NODE_ENV=production
      - PORT=3008
      - JWT_TOKEN=${JWT_TOKEN}
      - NUMBER_ID=${NUMBER_ID}
      - VERIFY_TOKEN=${VERIFY_TOKEN}
      - VERSION=${VERSION}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - MONGO_DB_URI=${MONGO_DB_URI}
      - MONGO_DB_NAME=${MONGO_DB_NAME}
    depends_on:
      - mongodb
    restart: unless-stopped

  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password
      - MONGO_INITDB_DATABASE=whatsapp_bot_db
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

volumes:
  mongodb_data:
```

### Build and Run
```bash
# Build the image
docker build -t whatsapp-bot .

# Run with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f whatsapp-bot
```

## ☁️ Cloud Deployment

### Heroku

#### 1. Create Heroku App
```bash
# Install Heroku CLI
heroku create your-whatsapp-bot

# Add MongoDB addon
heroku addons:create mongolab:sandbox
```

#### 2. Configure Environment Variables
```bash
heroku config:set JWT_TOKEN=your_whatsapp_token
heroku config:set NUMBER_ID=your_number_id
heroku config:set VERIFY_TOKEN=your_verify_token
heroku config:set VERSION=v22.0
heroku config:set OPENAI_API_KEY=your_openai_key
heroku config:set MONGO_DB_URI=$(heroku config:get MONGODB_URI)
heroku config:set MONGO_DB_NAME=whatsapp_bot_db
```

#### 3. Deploy
```bash
git push heroku main
```

### Railway

#### 1. Connect Repository
1. Go to [Railway](https://railway.app/)
2. Connect your GitHub repository
3. Add MongoDB service

#### 2. Configure Environment
```env
JWT_TOKEN=your_whatsapp_token
NUMBER_ID=your_number_id
VERIFY_TOKEN=your_verify_token
VERSION=v22.0
OPENAI_API_KEY=your_openai_key
MONGO_DB_URI=your_mongodb_uri
MONGO_DB_NAME=whatsapp_bot_db
```

#### 3. Deploy
Railway will automatically deploy when you push to your repository.

### DigitalOcean App Platform

#### 1. Create App
1. Go to DigitalOcean App Platform
2. Connect your GitHub repository
3. Select Node.js environment

#### 2. Configure Environment
Add environment variables in the DigitalOcean dashboard:
- `JWT_TOKEN`
- `NUMBER_ID`
- `VERIFY_TOKEN`
- `VERSION`
- `OPENAI_API_KEY`
- `MONGO_DB_URI`
- `MONGO_DB_NAME`

#### 3. Deploy
DigitalOcean will automatically deploy your app.

### AWS EC2

#### 1. Launch EC2 Instance
```bash
# Connect to your EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip
```

#### 2. Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Install PM2
sudo npm install -g pm2
```

#### 3. Deploy Application
```bash
# Clone repository
git clone <repository-url>
cd base-ts-meta-memory

# Install dependencies
npm install

# Create environment file
cp .env-example .env
# Edit .env with your credentials

# Build application
npm run build

# Start with PM2
pm2 start npm --name "whatsapp-bot" -- start
pm2 startup
pm2 save
```

#### 4. Configure Nginx (Optional)
```bash
# Install Nginx
sudo apt install nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/whatsapp-bot
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3008;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/whatsapp-bot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🔧 Environment Configuration

### Production Environment Variables

```env
# Application
NODE_ENV=production
PORT=3008

# WhatsApp Business API
JWT_TOKEN=your_whatsapp_business_api_token
NUMBER_ID=your_phone_number_id
VERIFY_TOKEN=your_webhook_verify_token
VERSION=v22.0

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# MongoDB
MONGO_DB_URI=mongodb://username:password@host:port/database
MONGO_DB_NAME=whatsapp_bot_db

# Optional: SSL/TLS
SSL_KEY_PATH=/path/to/private.key
SSL_CERT_PATH=/path/to/certificate.crt
```

### Security Considerations

1. **Environment Variables**: Never commit sensitive data to version control
2. **HTTPS**: Use HTTPS in production for webhook security
3. **Firewall**: Configure firewall rules appropriately
4. **Database Security**: Use MongoDB authentication
5. **Rate Limiting**: Implement rate limiting for production

## 📊 Monitoring and Logging

### PM2 Monitoring
```bash
# Monitor application
pm2 monit

# View logs
pm2 logs whatsapp-bot

# Restart application
pm2 restart whatsapp-bot
```

### Health Checks
```bash
# Check if bot is running
curl http://localhost:3008/

# Check media endpoints
curl http://localhost:3008/v1/media
```

### Log Rotation
```bash
# Install logrotate
sudo apt install logrotate

# Create logrotate configuration
sudo nano /etc/logrotate.d/whatsapp-bot
```

```
/var/log/whatsapp-bot/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 root root
}
```

## 🔄 CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy WhatsApp Bot

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build application
      run: npm run build
    
    - name: Deploy to Heroku
      uses: akhileshns/heroku-deploy@v3.12.12
      with:
        heroku_api_key: ${{ secrets.HEROKU_API_KEY }}
        heroku_app_name: ${{ secrets.HEROKU_APP_NAME }}
        heroku_email: ${{ secrets.HEROKU_EMAIL }}
```

### Environment Secrets
Configure these secrets in your GitHub repository:
- `HEROKU_API_KEY`
- `HEROKU_APP_NAME`
- `HEROKU_EMAIL`

## 🚀 Scaling Considerations

### Horizontal Scaling
- Use load balancers for multiple instances
- Implement session sharing for MongoDB
- Use Redis for caching (optional)

### Vertical Scaling
- Increase CPU and memory as needed
- Monitor resource usage
- Optimize database queries

### Database Scaling
- Use MongoDB Atlas for managed scaling
- Implement read replicas for heavy read loads
- Use MongoDB sharding for large datasets

## 🔍 Troubleshooting

### Common Issues

1. **Webhook Verification Fails**
   - Check `VERIFY_TOKEN` matches Meta configuration
   - Ensure HTTPS is enabled in production
   - Verify webhook URL is accessible

2. **Media Processing Errors**
   - Check OpenAI API key and quota
   - Verify MongoDB connection
   - Check file permissions for temporary files

3. **Memory Issues**
   - Monitor memory usage with `pm2 monit`
   - Increase Node.js memory limit: `node --max-old-space-size=4096`
   - Implement garbage collection optimization

4. **Database Connection Issues**
   - Check MongoDB connection string
   - Verify network connectivity
   - Check MongoDB authentication

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm start

# Check specific modules
DEBUG=whatsapp-bot:* npm start
```

## 📈 Performance Optimization

### Application Level
- Implement connection pooling for MongoDB
- Use async/await properly
- Implement request caching
- Optimize media processing

### Infrastructure Level
- Use CDN for static assets
- Implement database indexing
- Use load balancers
- Monitor and scale based on metrics

## 🔐 Security Checklist

- [ ] HTTPS enabled in production
- [ ] Environment variables secured
- [ ] Database authentication enabled
- [ ] Firewall rules configured
- [ ] Rate limiting implemented
- [ ] Input validation in place
- [ ] Error handling without sensitive data exposure
- [ ] Regular security updates
- [ ] Backup strategy implemented
- [ ] Monitoring and alerting configured 