# DevMatch production infrastructure

## Bootstrap once

1. Copy `terraform/bootstrap/terraform.tfvars.example` to an ignored `terraform.tfvars` and set `github_repository`.
2. Run `terraform init`, `terraform plan`, and `terraform apply` inside `terraform/bootstrap` using the intended AWS administrator identity.
3. Record the state bucket, OIDC provider ARN, Terraform apply-role ARN, and Terraform plan-role ARN outputs.
4. Initialize `terraform/` with `backend.hcl` copied from the example, then review and apply the main plan.

## Required GitHub repository variables

- `AWS_TERRAFORM_ROLE_ARN`
- `AWS_TERRAFORM_PLAN_ROLE_ARN`
- `AWS_GITHUB_OIDC_PROVIDER_ARN`
- `AWS_DEPLOY_ROLE_ARN`
- `TF_STATE_BUCKET`
- `EC2_INSTANCE_ID`
- `RELEASE_BUCKET`
- `API_BASE_URL` such as `https://api.example.com`

Protect the GitHub `production` environment with required reviewers. Do not store AWS access keys in GitHub.

## Vercel and GitHub OAuth

Configure `apps/web` as the Vercel project root and set `main` as its production branch. Add production values for `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CHAT_URL`, `NEXT_PUBLIC_SUPPORT_EMAIL`, `AUTH_URL`, `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `GITHUB_LINK_ID`, and `GITHUB_LINK_SECRET`. Map `app.<domain>` to Vercel and register the exact production callbacks for both GitHub login and GitHub account linking before opening registration.

## Required SSM parameters

Create these parameters under `/devmatch/prod/`; use `SecureString` for credentials and database values:

- `JWT_SECRET`
- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
- `REDIS_PASSWORD` using URL-safe letters, digits, underscores, or hyphens
- `GITHUB_TOKEN`
- `ALLOWED_ORIGIN` such as `https://app.example.com`
- `API_DOMAIN` such as `api.example.com`
- `CADDY_EMAIL`

The deployment role sends only the release SHA through SSM. EC2 downloads the matching bundle, renders its protected runtime environment, runs migrations, starts services in dependency order, verifies readiness, and restores the previous application images if readiness fails.
