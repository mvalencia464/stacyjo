#!/usr/bin/env bash
# Zips the 22 audiobook MP3s and uploads the ZIP to the private R2 bucket.
# Bundle buyers see it at the top of their downloads as soon as it's uploaded.
#
# Usage: scripts/upload-audiobook-zip.sh /path/to/folder-with-the-22-mp3s
set -euo pipefail

DIR="${1:?Pass the folder that holds the 22 MP3s}"
COUNT=$(find "$DIR" -maxdepth 1 -name '*.mp3' | wc -l | tr -d ' ')
if [ "$COUNT" != "22" ]; then
  echo "Expected 22 MP3s in $DIR, found $COUNT. Stopping." >&2
  exit 1
fi

OUT="$(mktemp -d)/The-Leash-Goes-Both-Ways-Audiobook.zip"
# -0 stores without recompressing (MP3s are already compressed); -j drops folder paths.
(cd "$DIR" && zip -0 -j -q "$OUT" ./*.mp3)
echo "Built $(du -h "$OUT" | cut -f1) ZIP with $COUNT tracks."

npx wrangler r2 object put "stacyjo-downloads/audio/The-Leash-Goes-Both-Ways-Audiobook.zip" \
  --file "$OUT" --content-type application/zip --remote
echo "Uploaded. Bundle buyers will now see the ZIP first on their download page."
