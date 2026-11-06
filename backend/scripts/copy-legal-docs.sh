#!/bin/sh
set -eu

# При публикации только dist нужны legal/: nest build не переносит их сам.
root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
rm -rf "$root/dist/legal"
mkdir -p "$root/dist"
cp -R "$root/legal" "$root/dist/legal"
