#!/bin/sh
set -eu

# Onreza публикует только dist. nest build не переносит legal/, копируем в dist/legal.
root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
rm -rf "$root/dist/legal"
mkdir -p "$root/dist"
cp -R "$root/legal" "$root/dist/legal"
