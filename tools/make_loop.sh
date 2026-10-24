#!/usr/bin/env bash
# Turn a stretch of your own gameplay footage into a looping clip for a case
# study: a small muted MP4 plus a poster frame, ready to drop into images/.
#
#   tools/make_loop.sh footage.mov 00:01:12 4 pistolwhip_drumgun
#   tools/make_loop.sh footage.mov 00:01:12 4 pistolwhip_drumgun 720
#
# Arguments: input file, start time, length in seconds, output name, and an
# optional width in pixels (default 960). Output goes to images/ unless OUT_DIR
# is set. Then use it on a page like the other clips:
#
#   <figure><video src="../images/NAME.mp4" poster="../images/NAME_poster.jpg"
#     autoplay muted loop playsinline aria-label="What the clip shows"></video></figure>
set -euo pipefail

if [ "$#" -lt 4 ]; then
  sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
fi

input="$1"; start="$2"; length="$3"; name="$4"; width="${5:-960}"
out_dir="${OUT_DIR:-$(cd "$(dirname "$0")/.." && pwd)/images}"
mkdir -p "$out_dir"

ffmpeg -hide_banner -loglevel error -y -ss "$start" -t "$length" -i "$input" \
  -vf "fps=24,scale=${width}:-2:flags=lanczos" -an \
  -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p -movflags +faststart \
  "$out_dir/$name.mp4"

ffmpeg -hide_banner -loglevel error -y -ss 0 -i "$out_dir/$name.mp4" -frames:v 1 -q:v 3 \
  "$out_dir/${name}_poster.jpg"

ls -lh "$out_dir/$name.mp4" "$out_dir/${name}_poster.jpg" | awk '{print $5, $9}'
