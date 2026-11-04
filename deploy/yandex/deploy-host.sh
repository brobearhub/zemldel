#!/bin/sh
# Usage: sh deploy/yandex/deploy-host.sh HOST ROLE IMAGE ENV_FILE [DB_CA_FILE]
set -eu
host=${1:?Pass the server public IPv4}
role=${2:?Pass frontend or backend}
image=${3:?Pass cr.yandex/REGISTRY/IMAGE:IMMUTABLE_TAG}
env_file=${4:?Pass the local runtime env file}
ca_file=${5:-}
case "$host" in *[!0-9.]*|'') echo 'HOST must be a public IPv4 address.' >&2; exit 1;; esac
case "$role" in frontend|backend) ;; *) echo 'ROLE must be frontend or backend.' >&2; exit 1;; esac
case "$image" in *[!a-zA-Z0-9./:_-]*|'') echo 'Invalid image reference.' >&2; exit 1;; esac
case "$image" in cr.yandex/*:*) ;; *) echo 'Use cr.yandex/REGISTRY/IMAGE:TAG.' >&2; exit 1;; esac
test -s "$env_file"
if [ "$role" = backend ]; then
  test -n "$ca_file" && test -s "$ca_file" || { echo 'Pass the existing database public CA file as argument 5.' >&2; exit 1; }
fi
# Do not print or source env files. Set ~/.ssh/config for a nondefault SSH key.
ssh "ubuntu@$host" 'cloud-init status --wait >/dev/null && install -d -m 700 ~/.zemledel-upload'
scp "$env_file" "ubuntu@$host:.zemledel-upload/app.env"
if [ "$role" = backend ]; then
  scp "$ca_file" "ubuntu@$host:.zemledel-upload/root.crt"
  ssh "ubuntu@$host" 'sudo install -m 644 ~/.zemledel-upload/root.crt /etc/zemledel/db-certs/root.crt && rm -f ~/.zemledel-upload/root.crt'
fi
ssh "ubuntu@$host" 'sudo install -m 600 ~/.zemledel-upload/app.env /etc/zemledel/app.env && rm -f ~/.zemledel-upload/app.env'
ssh "ubuntu@$host" "sudo /usr/local/sbin/zemledel-deploy '$image'"
