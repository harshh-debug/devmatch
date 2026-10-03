#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || ! "$1" =~ ^[0-9a-f]{40}$ ]]; then
  echo "usage: devmatch-deploy <40-character-git-sha>" >&2
  exit 2
fi

release_sha="$1"
imds_token="$(curl --fail --silent --show-error --request PUT \
  --header 'X-aws-ec2-metadata-token-ttl-seconds: 300' \
  http://169.254.169.254/latest/api/token)"
region="$(curl --fail --silent --show-error \
  --header "X-aws-ec2-metadata-token: ${imds_token}" \
  http://169.254.169.254/latest/meta-data/placement/region)"
account_id="$(aws sts get-caller-identity --query Account --output text)"
registry="${account_id}.dkr.ecr.${region}.amazonaws.com"
release_root="/opt/devmatch/releases/${release_sha}"
runtime_env="/opt/devmatch/runtime.env"
current_sha_file="/opt/devmatch/CURRENT_SHA"
previous_sha=""

if [[ -f "$current_sha_file" ]]; then
  previous_sha="$(<"$current_sha_file")"
fi

parameter() {
  aws ssm get-parameter \
    --name "/devmatch/prod/$1" \
    --with-decryption \
    --query 'Parameter.Value' \
    --output text
}

rollback() {
  if [[ ! "$previous_sha" =~ ^[0-9a-f]{40}$ ]]; then
    echo "Deployment failed and no previous release is available." >&2
    return
  fi

  local previous_root="/opt/devmatch/releases/${previous_sha}"
  if [[ ! -f "${previous_root}/compose.env" ]]; then
    echo "Deployment failed and previous release metadata is missing." >&2
    return
  fi

  echo "Restoring application containers from ${previous_sha}." >&2
  docker compose \
    --env-file "${previous_root}/compose.env" \
    -f "${previous_root}/infra/compose.production.yml" \
    up -d --wait --wait-timeout 180 \
    auth-service user-service match-service chat-service profile-parser api-gateway
}

trap 'status=$?; if [[ $status -ne 0 ]]; then rollback || true; fi; exit $status' EXIT

release_bucket="$(parameter RELEASE_BUCKET)"

if [[ ! "$release_bucket" =~ ^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$ ]]; then
  echo "RELEASE_BUCKET must be a valid S3 bucket name." >&2
  exit 1
fi

install -d -m 0755 "$release_root"
aws s3 cp \
  "s3://${release_bucket}/releases/${release_sha}.tar.gz" \
  "${release_root}/release.tar.gz" \
  --only-show-errors
tar -xzf "${release_root}/release.tar.gz" -C "$release_root"

jwt_secret="$(parameter JWT_SECRET)"
database_url="$(parameter DATABASE_URL)"
direct_database_url="$(parameter DIRECT_DATABASE_URL)"
redis_password="$(parameter REDIS_PASSWORD)"
github_token="$(parameter GITHUB_TOKEN)"
allowed_origin="$(parameter ALLOWED_ORIGIN)"
api_domain="$(parameter API_DOMAIN)"
caddy_email="$(parameter CADDY_EMAIL)"

if [[ ! "$redis_password" =~ ^[A-Za-z0-9_-]+$ ]]; then
  echo "REDIS_PASSWORD must contain only URL-safe letters, digits, underscore, or hyphen." >&2
  exit 1
fi

umask 077
{
  printf 'NODE_ENV=production\n'
  printf 'JWT_SECRET=%s\n' "$jwt_secret"
  printf 'DATABASE_URL=%s\n' "$database_url"
  printf 'DIRECT_DATABASE_URL=%s\n' "$direct_database_url"
  printf 'DATABASE_POOL_MAX=2\n'
  printf 'DATABASE_CONNECT_TIMEOUT_MS=15000\n'
  printf 'DATABASE_IDLE_TIMEOUT_MS=30000\n'
  printf 'REDIS_PASSWORD=%s\n' "$redis_password"
  printf 'REDIS_URL=redis://:%s@redis:6379\n' "$redis_password"
  printf 'KAFKA_BROKERS=kafka:9092\n'
  printf 'ALLOWED_ORIGIN=%s\n' "$allowed_origin"
  printf 'AUTH_SERVICE_URL=http://auth-service:3002\n'
  printf 'USER_SERVICE_URL=http://user-service:3003\n'
  printf 'MATCH_SERVICE_URL=http://match-service:3004\n'
  printf 'CHAT_SERVICE_URL=http://chat-service:3005\n'
  printf 'RATE_LIMIT_WINDOW_MS=60000\n'
  printf 'RATE_LIMIT_MAX_PER_IP=100\n'
  printf 'PROFILE_SYNC_CONCURRENCY=2\n'
  printf 'WORKER_HEALTH_PORT=3010\n'
  printf 'GITHUB_TOKEN=%s\n' "$github_token"
} > "$runtime_env"
chmod 0600 "$runtime_env"

{
  printf 'ECR_REGISTRY=%s\n' "$registry"
  printf 'IMAGE_TAG=%s\n' "$release_sha"
  printf 'API_DOMAIN=%s\n' "$api_domain"
  printf 'CADDY_EMAIL=%s\n' "$caddy_email"
  printf 'RUNTIME_ENV_FILE=%s\n' "$runtime_env"
} > "${release_root}/compose.env"
chmod 0600 "${release_root}/compose.env"

aws ecr get-login-password --region "$region" | \
  docker login --username AWS --password-stdin "$registry" >/dev/null

compose=(docker compose --progress quiet --env-file "${release_root}/compose.env" -f "${release_root}/infra/compose.production.yml")
"${compose[@]}" pull
"${compose[@]}" up -d --wait --wait-timeout 180 redis kafka
"${compose[@]}" run --rm kafka-init
"${compose[@]}" --profile migration run --rm migrations
"${compose[@]}" up -d --wait --wait-timeout 240 \
  auth-service user-service match-service chat-service profile-parser
"${compose[@]}" up -d --wait --wait-timeout 180 api-gateway
"${compose[@]}" up -d caddy

curl --fail --silent --show-error --retry 12 --retry-delay 5 --retry-connrefused \
  "https://${api_domain}/health/ready" >/dev/null

install -m 0755 \
  "${release_root}/infra/scripts/deploy-release.sh" \
  /usr/local/bin/devmatch-deploy
printf '%s\n' "$release_sha" > "$current_sha_file"
trap - EXIT
echo "Deployment ${release_sha} is healthy."
