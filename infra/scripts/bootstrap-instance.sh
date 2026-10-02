#!/usr/bin/env bash
set -euo pipefail

# Run this once as EC2 User Data on Ubuntu Server 26.04 LTS. It intentionally does
# not clone the repository, install Bun, or build application images.
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y docker.io docker-compose-v2 awscli curl
systemctl enable --now docker

if ! command -v aws >/dev/null 2>&1; then
  echo "AWS CLI is required; launch the Canonical Ubuntu Server 26.04 LTS AMI." >&2
  exit 1
fi

install -d -m 0755 /usr/local/lib/docker/cli-plugins
docker compose version >/dev/null

# Canonical's Ubuntu AMIs usually include SSM Agent as a snap. Install the
# regional Debian package only if neither supported service is already present.
if systemctl list-unit-files --no-legend | grep -q '^snap\.amazon-ssm-agent\.amazon-ssm-agent\.service'; then
  systemctl enable --now snap.amazon-ssm-agent.amazon-ssm-agent.service
else
  if ! command -v amazon-ssm-agent >/dev/null 2>&1; then
    curl --fail --silent --show-error --location \
      https://s3.ap-south-1.amazonaws.com/amazon-ssm-ap-south-1/latest/debian_amd64/amazon-ssm-agent.deb \
      --output /tmp/amazon-ssm-agent.deb
    dpkg -i /tmp/amazon-ssm-agent.deb
  fi
  systemctl enable --now amazon-ssm-agent
fi

install -d -m 0755 /opt/devmatch/releases
touch /var/log/devmatch-bootstrap.log

if ! swapon --show --noheadings | grep -q .; then
  fallocate -l 2G /swapfile
  chmod 0600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile swap swap defaults 0 0' >> /etc/fstab
fi

sysctl -w vm.swappiness=10
echo 'vm.swappiness=10' > /etc/sysctl.d/90-devmatch.conf

install -d -m 0755 /etc/docker
printf '%s\n' '{"log-driver":"local","log-opts":{"max-size":"10m","max-file":"3"}}' > /etc/docker/daemon.json
systemctl restart docker
