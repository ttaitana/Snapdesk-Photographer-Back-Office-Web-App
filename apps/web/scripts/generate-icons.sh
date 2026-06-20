#!/usr/bin/env bash
# Regenerates public/icons/*.png from the hand-drawn SVG sources whenever the
# icon design changes — P10 PWA (TASKS.md). Requires ImageMagick (`convert`).
set -euo pipefail
cd "$(dirname "$0")/../public/icons"

convert -background none icon-source.svg -resize 192x192 icon-192.png
convert -background none icon-source.svg -resize 512x512 icon-512.png
convert -background none icon-source.svg -resize 180x180 apple-touch-icon.png
convert -background none icon-maskable-source.svg -resize 512x512 icon-maskable-512.png
convert -background none icon-source.svg -resize 32x32 favicon-32.png

echo "Icons regenerated in $(pwd)"
