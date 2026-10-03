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

## AWS resources provisioned

All resources below are in `ap-south-1`:

- Private ECR repositories: `devmatch-api-gateway`, `devmatch-auth`, `devmatch-user-service`, `devmatch-match-service`, `devmatch-chat-service`, `devmatch-profile-parser`, and `devmatch-migrations`. Tags are immutable and scan-on-push is enabled. GitHub Actions will build and push image contents.
- Private, versioned release bucket: `devmatch-releases-241810645401-ap-south-1`; public access is blocked and TLS is required.
- EC2 role: `devmatch-ec2-role`, with `AmazonSSMManagedInstanceCore` and runtime permissions for ECR pulls, this S3 release prefix, and `/devmatch/prod/*` parameters.
- GitHub OIDC provider: `token.actions.githubusercontent.com`.
- GitHub Actions role: `arn:aws:iam::241810645401:role/devmatch-github-deploy-role`, trusted for this repository's `main` branch jobs and the protected `production` environment. It can push to the seven ECR repositories, upload release bundles, and invoke SSM on this instance.
- Runtime Parameter Store values are present under `/devmatch/prod/`; credentials and connection strings use `SecureString`.

[`scripts/bootstrap-instance.sh`](scripts/bootstrap-instance.sh) is the Ubuntu User Data bootstrap. It installs Docker, Docker Compose, and AWS CLI; enables SSM; creates `/opt/devmatch/releases`; configures Docker log rotation; and adds a 2 GB swap file. It has already been run on the current host. Do not install Bun, clone this repository, or open SSH.

The first GitHub deployment bootstraps `/usr/local/bin/devmatch-deploy` itself through SSM, so no manual copy of the deployment script is needed.

## Required GitHub repository variables

- `AWS_DEPLOY_ROLE_ARN` — `arn:aws:iam::241810645401:role/devmatch-github-deploy-role`
- `EC2_INSTANCE_ID` — `i-06327d47b86c1d5db`
- `RELEASE_BUCKET` — `devmatch-releases-241810645401-ap-south-1`
- `API_BASE_URL` — `https://devmatch-api.duckdns.org`

Protect the GitHub `production` environment with required reviewers. The deploy role is assumed using GitHub OIDC; do not add AWS access keys to GitHub secrets.

## Parameter Store values

These names are configured under `/devmatch/prod/`. Credentials and connection strings use `SecureString`; `String` is used for the remaining configuration.

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

1. Configure the four GitHub repository variables above and protect the `production` environment with a required reviewer. Do not add long-lived AWS access keys to GitHub.
2. Confirm the Neon connection strings in `.env.production.local` target the intended production database/branch before deploying; the migration image runs during deployment.
3. Trigger **Backend Production Deploy** from `main` and approve the protected `production` environment.
4. Confirm the release in SSM, `https://devmatch-api.duckdns.org/health/ready`, and the Socket.IO endpoint. Caddy should obtain its certificate once the deployment starts.
5. Configure the GitHub OAuth callbacks when ready: login uses `/api/auth/callback/github`; account linking uses `/api/github/link` on `https://devmatch-hub.vercel.app`.

The release script runs migrations once, starts Redis and Kafka with persistent Docker volumes, deploys internal services before the gateway, validates readiness, and restores the previous application images when readiness fails. It does not roll back database migrations automatically.
