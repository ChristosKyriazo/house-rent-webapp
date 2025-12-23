# Cloud Deployment Guide (Azure/AWS)

This guide explains how to deploy the House Rent Webapp to Azure or AWS.

## 🏗️ Current Architecture (Cloud-Ready)

The app is structured to be easily deployable to cloud platforms:

- ✅ **Environment variables** for all configuration
- ✅ **Prisma ORM** - easy database switching (SQLite → PostgreSQL)
- ✅ **No hardcoded paths** - all relative
- ✅ **Stateless design** - sessions stored in database
- ✅ **Next.js App Router** - optimized for serverless/containerized deployment

---

## 📋 Pre-Deployment Checklist

### 1. Database Migration (SQLite → PostgreSQL)

**Current (Local):**
```env
DATABASE_URL="file:./dev.db"
```

**For Azure PostgreSQL:**
```env
DATABASE_URL="postgresql://username:password@your-server.postgres.database.azure.com:5432/dbname?sslmode=require"
```

**For AWS RDS PostgreSQL:**
```env
DATABASE_URL="postgresql://username:password@your-rds-endpoint.region.rds.amazonaws.com:5432/dbname"
```

**Steps:**
1. Create PostgreSQL database on Azure/AWS
2. Update `prisma/schema.prisma` to use `provider = "postgresql"` instead of `"sqlite"`
3. Update `.env` with PostgreSQL connection string
4. Run migrations: `npx prisma migrate deploy` (production) or `npx prisma migrate dev` (staging)

---

## 🚀 Azure Deployment

### Option 1: Azure App Service (Recommended for Next.js)

1. **Create Azure App Service:**
   ```bash
   az webapp create --resource-group myResourceGroup --plan myAppServicePlan --name my-webapp --runtime "NODE:18-lts"
   ```

2. **Set Environment Variables:**
   ```bash
   az webapp config appsettings set --resource-group myResourceGroup --name my-webapp --settings \
     DATABASE_URL="postgresql://..." \
     NODE_ENV="production"
   ```

3. **Deploy from GitHub:**
   - Connect your GitHub repo to Azure App Service
   - Enable continuous deployment
   - Azure will auto-deploy on push to `main` branch

4. **Build Settings:**
   - Build command: `npm run build`
   - Start command: `npm start`

### Option 2: Azure Container Apps

1. **Create Dockerfile** (if not exists):
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. **Deploy to Azure Container Registry and Container Apps**

---

## ☁️ AWS Deployment

### Option 1: AWS Amplify (Easiest for Next.js)

1. **Connect GitHub repo** to AWS Amplify
2. **Build settings** (auto-detected):
   - Build command: `npm run build`
   - Output directory: `.next`
3. **Environment variables:**
   - Add `DATABASE_URL` in Amplify console
   - Add `NODE_ENV=production`

### Option 2: AWS Elastic Beanstalk

1. **Create application:**
   ```bash
   eb init -p node.js house-rent-webapp
   ```

2. **Set environment variables:**
   ```bash
   eb setenv DATABASE_URL="postgresql://..." NODE_ENV=production
   ```

3. **Deploy:**
   ```bash
   eb deploy
   ```

### Option 3: AWS ECS/Fargate (Container)

1. **Create Dockerfile** (same as Azure)
2. **Push to ECR** (Elastic Container Registry)
3. **Create ECS service** with Fargate

---

## 🔧 Required Changes for Production

### 1. Update Prisma Schema

Change `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"  // Changed from "sqlite"
  url      = env("DATABASE_URL")
}
```

### 2. Install PostgreSQL Driver

```bash
npm install @prisma/client pg
npm install -D @types/pg
```

### 3. Run Production Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Apply migrations (production)
npx prisma migrate deploy
```

### 4. Environment Variables

Set these in your cloud platform:

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `NODE_ENV=production`

**Optional (for future AI features):**
- `OPENAI_API_KEY` - If you add AI search later

---

## 🔒 Security Checklist

- ✅ Passwords hashed with bcryptjs
- ✅ HTTP-only cookies for sessions
- ✅ Environment variables for secrets
- ✅ SQL injection protection (Prisma handles this)
- ⚠️ **Add HTTPS** (cloud platforms usually handle this)
- ⚠️ **Add rate limiting** (consider adding later)
- ⚠️ **Add CORS** if needed for API access

---

## 📊 Database Options

### Azure
- **Azure Database for PostgreSQL** (recommended)
- **Azure SQL Database** (requires schema changes)

### AWS
- **Amazon RDS PostgreSQL** (recommended)
- **Amazon Aurora PostgreSQL** (scalable option)

---

## 🧪 Testing Before Deployment

1. **Test locally with PostgreSQL:**
   ```bash
   # Install PostgreSQL locally or use Docker
   docker run --name postgres-test -e POSTGRES_PASSWORD=test -p 5432:5432 -d postgres
   
   # Update .env to point to local PostgreSQL
   DATABASE_URL="postgresql://postgres:test@localhost:5432/testdb"
   
   # Run migrations
   npx prisma migrate dev
   
   # Test the app
   npm run dev
   ```

2. **Build test:**
   ```bash
   npm run build
   npm start
   ```

---

## 📝 Deployment Steps Summary

1. ✅ Create PostgreSQL database on Azure/AWS
2. ✅ Update `prisma/schema.prisma` (change provider to `postgresql`)
3. ✅ Install PostgreSQL driver: `npm install pg @types/pg`
4. ✅ Update `.env` with production `DATABASE_URL`
5. ✅ Test locally with PostgreSQL
6. ✅ Push code to GitHub
7. ✅ Deploy to cloud platform (App Service/Amplify/etc.)
8. ✅ Set environment variables in cloud console
9. ✅ Run migrations: `npx prisma migrate deploy`
10. ✅ Test production deployment

---

## 💰 Cost Estimates (Approximate)

### Azure
- **App Service (Basic tier)**: ~$13-55/month
- **PostgreSQL (Basic tier)**: ~$25-50/month
- **Total**: ~$40-100/month

### AWS
- **Amplify**: Free tier available, then ~$15/month
- **RDS PostgreSQL (t3.micro)**: ~$15-20/month
- **Total**: ~$30-40/month (after free tier)

---

## 🆘 Troubleshooting

### Database Connection Issues
- Check firewall rules (allow your app's IP)
- Verify connection string format
- Check SSL requirements (Azure requires `sslmode=require`)

### Build Failures
- Ensure `NODE_ENV=production` is set
- Check that all dependencies are in `package.json` (not just devDependencies)
- Verify Prisma Client is generated: `npx prisma generate`

### Session Issues
- Ensure cookies work (check domain settings)
- Verify `DATABASE_URL` is accessible from your app

---

**Note**: Keep testing locally with SQLite for now. When ready to deploy, follow this guide to switch to PostgreSQL and deploy to your chosen cloud platform.

