# 🚀 Deployment Guide

Complete guide for deploying the Raptors Esports CRM to production.

## 📋 **Pre-Deployment Checklist**

### ✅ **Code Quality**
- [ ] All tests passing
- [ ] Build successful (`npm run build`)
- [ ] TypeScript errors resolved
- [ ] ESLint warnings addressed
- [ ] Security audit clean (`npm audit`)

### ✅ **Database Setup**
- [ ] Supabase project created
- [ ] Complete schema deployed
- [ ] Row Level Security policies configured
- [ ] Database backups enabled
- [ ] Test data populated (optional)

### ✅ **Environment Configuration**
- [ ] Environment variables configured
- [ ] API keys secured
- [ ] Domain/subdomain ready
- [ ] SSL certificate configured
- [ ] CDN setup (optional)

---

## 🗄️ **Database Deployment**

### **1. Supabase Project Setup**
```bash
# Create new Supabase project
# Visit: https://supabase.com/dashboard

# Note down:
# - Project URL
# - Anon Key
# - Service Role Key (for admin operations)
```

### **2. Schema Deployment**
Run the complete schema in your Supabase SQL Editor:

```sql
-- 1. Core tables (users, teams, profiles)
-- 2. Performance tables (performances, slots, winnings)
-- 3. Attendance tables (sessions, attendances, holidays)
-- 4. Tryouts tables (tryouts, applications, evaluations)
-- 5. Communication tables (discord_webhooks, logs)
-- 6. System tables (admin_config, permissions)
```

### **3. Row Level Security**
Enable RLS and configure policies:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
-- ... repeat for all tables

-- Create policies for role-based access
CREATE POLICY "Users can view team data" ON users
  FOR SELECT USING (team_id = auth.uid()::text OR role IN ('admin', 'manager'));

-- ... additional policies as needed
```

### **4. Initial Data**
```sql
-- Create admin user
INSERT INTO users (id, email, name, role) 
VALUES ('admin-uuid', 'admin@raptors.com', 'Admin User', 'admin');

-- Create default teams
INSERT INTO teams (name, tier, status) 
VALUES ('Raptors Main', 'T1', 'active');

-- Configure tier defaults
INSERT INTO tier_defaults (tier, default_slot_rate) 
VALUES ('T1', 1500), ('T2', 1200), ('T3', 1000), ('T4', 800);
```

---

## 🔧 **Environment Configuration**

### **Production Environment Variables**
Create `.env.production` or configure in your deployment platform:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# Optional: Analytics
NEXT_PUBLIC_GA_ID=GA-XXXXXXXXX

# Optional: Error Tracking
SENTRY_DSN=your-sentry-dsn
```

### **Security Considerations**
- Never commit `.env` files to version control
- Use different Supabase projects for staging/production
- Rotate API keys regularly
- Enable Supabase's built-in security features

---

## 🌐 **Vercel Deployment**

### **1. Install Vercel CLI**
```bash
npm i -g vercel
```

### **2. Login and Setup**
```bash
# Login to Vercel
vercel login

# Link project (in project directory)
vercel link
```

### **3. Configure Environment Variables**
```bash
# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add NEXT_PUBLIC_SITE_URL
```

### **4. Deploy**
```bash
# Deploy to production
vercel --prod

# Or use automatic deployments via Git integration
```

### **5. Custom Domain**
```bash
# Add custom domain
vercel domains add your-domain.com

# Configure DNS records as instructed
```

---

## 🐳 **Docker Deployment**

### **Dockerfile**
```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

### **Docker Compose**
```yaml
version: '3.8'
services:
  raptors-crm:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl
    depends_on:
      - raptors-crm
    restart: unless-stopped
```

---

## ☁️ **AWS Deployment**

### **1. Using AWS Amplify**
```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Configure Amplify
amplify configure

# Initialize project
amplify init

# Add hosting
amplify add hosting

# Deploy
amplify publish
```

### **2. Using AWS EC2 + PM2**
```bash
# On EC2 instance
sudo apt update
sudo apt install nodejs npm nginx

# Clone repository
git clone <repository-url>
cd raptors-esports-crm

# Install dependencies
npm install

# Install PM2
npm install -g pm2

# Build application
npm run build

# Start with PM2
pm2 start npm --name "raptors-crm" -- start

# Configure Nginx reverse proxy
sudo nano /etc/nginx/sites-available/raptors-crm
```

**Nginx Configuration**:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
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

---

## 📊 **Monitoring & Analytics**

### **1. Application Monitoring**
```javascript
// pages/_app.js
import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function App({ Component, pageProps }) {
  const router = useRouter()

  useEffect(() => {
    // Google Analytics
    const handleRouteChange = (url) => {
      gtag('config', 'GA-XXXXXXXXX', {
        page_path: url,
      })
    }
    router.events.on('routeChangeComplete', handleRouteChange)
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router.events])

  return <Component {...pageProps} />
}
```

### **2. Error Tracking**
```javascript
// lib/sentry.js
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
})
```

### **3. Performance Monitoring**
- Use Vercel Analytics for performance insights
- Monitor Core Web Vitals
- Set up uptime monitoring (Pingdom, UptimeRobot)
- Configure log aggregation (LogRocket, DataDog)

---

## 🔒 **Security Hardening**

### **1. HTTPS Configuration**
```bash
# Using Let's Encrypt with Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### **2. Security Headers**
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
          }
        ]
      }
    ]
  }
}
```

### **3. Database Security**
- Enable RLS on all tables
- Use least-privilege access patterns
- Regular security audits
- Monitor for unusual access patterns

---

## 🔄 **CI/CD Pipeline**

### **GitHub Actions**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Build application
        run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

---

## 📈 **Performance Optimization**

### **1. Build Optimization**
```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizeCss: true,
  },
  images: {
    domains: ['your-domain.com'],
    formats: ['image/webp', 'image/avif'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  }
}
```

### **2. Database Optimization**
- Add appropriate indexes
- Use connection pooling
- Implement caching strategies
- Monitor query performance

### **3. CDN Configuration**
- Configure Vercel Edge Network
- Optimize static asset delivery
- Implement proper cache headers
- Use image optimization

---

## 🚨 **Troubleshooting**

### **Common Issues**

**Build Failures**:
```bash
# Clear cache and reinstall
rm -rf .next node_modules
npm install
npm run build
```

**Environment Variable Issues**:
```bash
# Verify variables are set
vercel env ls

# Pull environment variables locally
vercel env pull .env.local
```

**Database Connection Issues**:
- Verify Supabase URL and keys
- Check RLS policies
- Confirm network connectivity
- Review Supabase logs

**Performance Issues**:
- Monitor Core Web Vitals
- Check bundle size
- Optimize images and assets
- Review database query performance

---

## 📞 **Support & Maintenance**

### **Regular Maintenance Tasks**
- [ ] Update dependencies monthly
- [ ] Security patch reviews
- [ ] Database performance monitoring
- [ ] Backup verification
- [ ] SSL certificate renewal
- [ ] Log rotation and cleanup

### **Emergency Contacts**
- Development Team: dev@raptors.com
- Infrastructure: ops@raptors.com
- Database: dba@raptors.com

---

**Deployment Guide Version**: 1.0 - Production Ready ✅
