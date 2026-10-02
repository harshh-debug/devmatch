# DevMatch backend deployment on one EC2 instance

The production backend is deliberately a single-host deployment. Docker Compose runs Caddy, the gateway, all backend services, Redis, and Kafka on one EC2 instance. Neon remains the hosted PostgreSQL provider. This is a low-operations launch architecture, not a highly available one.

GitHub Actions builds seven immutable images, pushes them to ECR, uploads a small release bundle to S3, and asks the EC2 host to deploy it through AWS Systems Manager (SSM). No SSH access, source checkout, dependency install, or image build happens on EC2.

## Current host

- EC2 instance: `i-06327d47b86c1d5db` (`t3.medium`), Ubuntu Server 26.04 LTS, x86_64.
- Root disk: 40 GB encrypted gp3; the instance has a 2 GB swap file.
- Elastic IP: `13.202.242.196`.
- API hostname: `devmatch-api.duckdns.org`, pointed at the Elastic IP.
- Security group: inbound TCP `80` and `443` only; no SSH or application service ports.
- Instance management: SSM; Docker Engine and Docker Compose are installed.

The API hostname is already pointed at the host. Caddy will obtain and renew its HTTPS certificate automatically after the backend is deployed and configured with `API_DOMAIN` and `CADDY_EMAIL`.

For a future replacement host, use a Canonical Ubuntu Server 26.04 LTS x86_64 AMI, `t3.medium`, 40 GB encrypted gp3, an Elastic IP, and a security group that allows only inbound TCP `80` and `443`.

## Remaining AWS setup

Use one AWS region consistently (the workflows default to `ap-south-1`).

1. Create seven private ECR repositories named `devmatch-api-gateway`, `devmatch-auth`, `devmatch-user-service`, `devmatch-match-service`, `devmatch-chat-service`, `devmatch-profile-parser`, and `devmatch-migrations`. Enable immutable tags and scan-on-push.
2. Create a versioned, private S3 bucket for release bundles. Block public access. Record its exact name.
3. The existing EC2 instance role has `AmazonSSMManagedInstanceCore` and runtime permissions. Confirm it can pull from the seven ECR repositories, read `s3://<release-bucket>/releases/*`, and read `/devmatch/prod/*` from Parameter Store (including KMS decrypt if a customer-managed key is used).
4. Create a GitHub OIDC identity provider and a deployment role restricted to this repository's `main` branch. Grant it ECR push permissions for those repositories, `s3:PutObject` for `releases/*`, and `ssm:SendCommand`/`ssm:GetCommandInvocation` for this instance only.

[`scripts/bootstrap-instance.sh`](scripts/bootstrap-instance.sh) is the Ubuntu User Data bootstrap. It installs Docker, Docker Compose, and AWS CLI; enables SSM; creates `/opt/devmatch/releases`; configures Docker log rotation; and adds a 2 GB swap file. It has already been run on the current host. Do not install Bun, clone this repository, or open SSH.

The first GitHub deployment bootstraps `/usr/local/bin/devmatch-deploy` itself through SSM, so no manual copy of the deployment script is needed.

## Required GitHub repository variables

- `AWS_DEPLOY_ROLE_ARN`
- `EC2_INSTANCE_ID`
- `RELEASE_BUCKET`
- `API_BASE_URL` — `https://devmatch-api.duckdns.org`

Protect the GitHub `production` environment with required reviewers. The deploy role is assumed using GitHub OIDC; do not add AWS access keys to GitHub secrets.

## Required Parameter Store values

Create these names under `/devmatch/prod/`. Use `SecureString` for credentials and connection strings; `String` is sufficient for the remaining configuration.

- `JWT_SECRET`
- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
- `REDIS_PASSWORD` — URL-safe letters, digits, underscores, or hyphens only
- `GITHUB_TOKEN`
- `ALLOWED_ORIGIN` — the production Vercel frontend origin, for example `https://<your-app>.vercel.app`
- `API_DOMAIN` — `devmatch-api.duckdns.org` (hostname only, no scheme)
- `CADDY_EMAIL`
- `RELEASE_BUCKET` — the exact private bucket created above

The instance role, not GitHub Actions, reads these values. The runtime environment file is generated on EC2 with mode `0600`.

## First deployment checklist

1. Deploy the frontend to Vercel and set its production URL as `APP_DOMAIN`, `AUTH_URL`, and `ALLOWED_ORIGIN` where applicable.
2. Set the Vercel frontend variables and GitHub OAuth callback URLs. Login uses `/api/auth/callback/github`; account linking uses `/api/github/link`.
3. Create the remaining ECR, S3, SSM Parameter Store, and GitHub OIDC deployment resources; then configure the required GitHub repository variables.
4. Trigger **Backend Production Deploy** from `main` and approve the protected `production` environment.
5. Confirm the release in SSM, `https://devmatch-api.duckdns.org/health/ready`, and the Socket.IO endpoint.

The release script runs migrations once, starts Redis and Kafka with persistent Docker volumes, deploys internal services before the gateway, validates readiness, and restores the previous application images when readiness fails. It does not roll back database migrations automatically.
