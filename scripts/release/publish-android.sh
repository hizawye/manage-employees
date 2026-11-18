#!/usr/bin/env bash
# Promote a signed artifact directory only after GitHub acknowledges each digest.
set -euo pipefail
if [[ $# != 2 ]]; then
  echo 'Usage: scripts/release/publish-android.sh vX.Y.Z PACKAGED_DIRECTORY' >&2
  exit 2
fi
: "${GH_REPO:?Set GH_REPO to the repository slug}"
tag=$1
artifacts=$(realpath "$2")
repo_root=$(cd "$(dirname "$0")/../.." && pwd)
cd "$repo_root"
tmp=$(mktemp -d)
trap 'rm -rf -- "$tmp"' EXIT
names=(Manage-Employees.apk Manage-Employees-Migrate-Android9Plus.apk SHA256SUMS release.json)
# Another release might have completed while this build was running.
gh api --paginate --slurp "repos/$GH_REPO/releases?per_page=100" > "$tmp/releases.json"
python3 scripts/release/android_version.py "$tag" --published-pages "$tmp/releases.json"
id=$(jq -r --arg tag "$tag" '.[][] | select(.tag_name == $tag) | .id' "$tmp/releases.json")
if [[ -z $id ]]; then
  if [[ -f release/notes/$tag.md ]]; then
    cp -- "release/notes/$tag.md" "$tmp/notes.md"
  else
    gh api --method POST "repos/$GH_REPO/releases/generate-notes" -f "tag_name=$tag" --jq .body > "$tmp/notes.md"
  fi
  printf '\n' >> "$tmp/notes.md"
  cat docs/android-release-notes.md >> "$tmp/notes.md"
  gh release create "$tag" --repo "$GH_REPO" --verify-tag --draft --title "Manage Employees ${tag#v}" --notes-file "$tmp/notes.md"
  id=$(gh release view "$tag" --repo "$GH_REPO" --json databaseId --jq .databaseId)
fi
release=$(gh api "repos/$GH_REPO/releases/$id")
if [[ $(jq -r .prerelease <<< "$release") != false ]]; then
  echo 'Stable release tag has a pre-release flag.' >&2
  exit 1
fi
if [[ $(jq -r .draft <<< "$release") == true ]]; then
  files=()
  for name in "${names[@]}"; do files+=("$artifacts/$name"); done
  (cd "$artifacts" && sha256sum --strict --check SHA256SUMS)
  gh release upload "$tag" "${files[@]}" --clobber --repo "$GH_REPO"
  reference=$artifacts
else
  # A retry after publication must verify the existing bytes without replacing them.
  gh release download "$tag" --repo "$GH_REPO" --dir "$tmp" --pattern 'release.json' --pattern 'SHA256SUMS'
  reference=$tmp
fi
gh api --paginate --slurp "repos/$GH_REPO/releases/$id/assets?per_page=100" > "$tmp/assets.json"
python3 - "$tmp/assets.json" "$reference" "$tag" <<'PY'
import hashlib, json, pathlib, sys
assets = {a['name']: a for page in json.load(open(sys.argv[1])) for a in page if a['state'] == 'uploaded'}
root = pathlib.Path(sys.argv[2]); meta = json.loads((root / 'release.json').read_text()); config = json.loads(pathlib.Path('app.json').read_text())['expo']
checksums = {meta['file']:meta['sha256'], meta['migration']['file']:meta['migration']['sha256']}
if (meta['version'], meta['versionCode'], meta['applicationId']) != (sys.argv[3][1:], config['android']['versionCode'], config['android']['package']):
    sys.exit('Published metadata differs from tagged source')
if set(checksums) != {'Manage-Employees.apk', 'Manage-Employees-Migrate-Android9Plus.apk'}:
    sys.exit('Missing expected release APKs')
if set((root/'SHA256SUMS').read_text().splitlines()) != {f'{h}  {n}' for n,h in checksums.items()}:
    sys.exit('Public SHA256SUMS and release.json disagree')
for name in ['SHA256SUMS','release.json']:
    checksums[name] = hashlib.sha256((root/name).read_bytes()).hexdigest()
for name,h in checksums.items():
    if assets.get(name,{}).get('digest') != 'sha256:'+h:
        sys.exit('GitHub asset digest mismatch: '+name)
PY
if [[ $(jq -r .draft <<< "$release") == true ]]; then
  gh release edit "$tag" --repo "$GH_REPO" --draft=false --latest
fi
gh release view "$tag" --repo "$GH_REPO" --json url --jq .url
