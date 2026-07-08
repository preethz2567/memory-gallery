# Memory Gallery
hi! check this outt http://15.207.55.185:4000/

A personal photo gallery with reactions - built to demonstrate a full DevOps lifecycle: containerized Node.js + React app, CI/CD with GitHub Actions, infrastructure provisioned with Terraform on AWS.

## Architecture

<img width="572" height="297" alt="image" src="https://github.com/user-attachments/assets/860f692f-7204-427c-be78-45647101017a" />


## What it does
- Upload personal photos with a memory caption (admin password protected)
- Public gallery with masonry grid layout
- Emoji reactions with names — anyone can react, stored in RDS

## Tech Stack
- **Frontend:** React + TypeScript + Vite, TanStack Query
- **Backend:** Node.js + Express, Multer, AWS SDK v3
- **Database:** PostgreSQL (local Docker / AWS RDS in production)
- **Storage:** AWS S3 (image files)
- **Infrastructure:** Terraform (EC2, RDS, S3, IAM, CloudWatch)
- **CI/CD:** GitHub Actions (test + lint on PR, build + push to GHCR on merge)

## IAM Least Privilege Justification
The EC2 instance role has exactly these permissions, nothing more:

| Permission | Justification |
|---|---|
| `s3:PutObject` on bucket/* | Upload new photos |
| `s3:GetObject` on bucket/* | Read photos (for direct serving) |
| `s3:DeleteObject` on bucket/* | Delete photos from admin panel |
| `s3:ListBucket` on bucket | Check if keys exist |
| `logs:CreateLogGroup/Stream/PutLogEvents` on /memory-gallery/* | Push container logs to CloudWatch |

No `s3:*`, no `AdministratorAccess`, no permissions beyond what the app actually does.

## Run Locally

**Prerequisites:** Node.js 20, Docker Desktop

```bash
# 1. Start local PostgreSQL
docker compose -f docker-compose.dev.yml up -d

# 2. Install dependencies
npm install
cd client && npm install && cd ..

# 3. Copy and fill env vars
cp .env.example .env

# 4. Start backend
npm run dev

# 5. Start frontend (new terminal)
cd client && npm run dev
```

Open http://localhost:5173

## Deploy to AWS

**Prerequisites:** AWS CLI configured, Terraform installed

```bash
cd terraform
terraform init
terraform apply -var-file="terraform.tfvars"
```

After ~10 minutes, Terraform outputs your live URL.

## Glimpse of it

<img width="1918" height="937" alt="image" src="https://github.com/user-attachments/assets/fccf7d1b-f23a-4413-b246-b1ba96972cf0" />

<img width="1897" height="1021" alt="image" src="https://github.com/user-attachments/assets/5faf80c8-61b8-4a36-9729-5fba1fe99c2c" />




## CI/CD Pipeline

| Trigger | Jobs |
|---|---|
| Every PR to main | Test (Jest) + Lint (ESLint) + React build |
| Merge to main | Build Docker image + push to GHCR |
