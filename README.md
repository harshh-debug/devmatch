# DevMatch

DevMatch is a Turborepo containing a Next.js frontend and a Bun/TypeScript backend split into an API gateway, auth, user, match, chat, and profile-sync services.

## Local development

Install the pinned dependencies and start the workspace:

```bash
bun install --frozen-lockfile
bun run dev
```

Useful repository checks:

```bash
bun run check-types
bun run lint
bun run test
```

The local dependency stack is defined in `infra/docker-compose.yml`.

## Production architecture

- The frontend deploys independently to Vercel.
- Neon hosts PostgreSQL.
- One AWS EC2 instance runs Caddy, the API gateway, all backend services, Redis, and single-node Kafka with Docker Compose.
- GitHub Actions builds SHA-tagged images and pushes them to Amazon ECR.
- A protected production job uploads the release bundle to S3 and deploys it through AWS Systems Manager.
- Only Caddy exposes host ports 80 and 443. SSH and internal service ports remain closed.

Terraform is not used. AWS resources are intentionally provisioned manually for the initial single-host release. Follow [the infrastructure runbook](infra/README.md) for the required EC2, ECR, S3, IAM, SSM Parameter Store, GitHub, DNS, and first-deployment setup.
