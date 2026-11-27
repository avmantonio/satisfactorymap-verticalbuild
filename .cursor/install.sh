#!/usr/bin/env bash
# Cloud Agent bootstrap for the Satisfactory Save Map (mirrors build.sh, but
# reuses the toolchain the base image already ships and is safe to re-run).
set -euo pipefail

cd "$(dirname "$0")/.."

REFRESH_SCRATCH_ONLY=0
if [ "${1:-}" = "--scratch-worktree" ]; then
  REFRESH_SCRATCH_ONLY=1
fi

# Wayfinder tracker lives only on this branch. Cloud Builds start from the
# default branch, so check it out as the sibling worktree agents expect.
SCRATCH_BRANCH="scratch/vertical-builds"
SCRATCH_PATH="$(cd .. && pwd)/satisfactorymap-scratch"

ensure_scratch_worktree() {
  local refresh_only="${1:-0}"

  echo "Fetching ${SCRATCH_BRANCH}..."
  if ! git fetch --no-tags origin "${SCRATCH_BRANCH}"; then
    if [ "$refresh_only" = "1" ] && [ -e "$SCRATCH_PATH" ]; then
      echo "warning: fetch of ${SCRATCH_BRANCH} failed; using existing worktree"
      return 0
    fi
    echo "error: could not fetch origin/${SCRATCH_BRANCH}" >&2
    return 1
  fi

  if ! git rev-parse --verify "origin/${SCRATCH_BRANCH}" >/dev/null 2>&1; then
    echo "error: origin/${SCRATCH_BRANCH} not found after fetch" >&2
    return 1
  fi

  local head
  head="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
  if [ "$head" = "$SCRATCH_BRANCH" ]; then
    echo "This checkout is already ${SCRATCH_BRANCH}."
    return 0
  fi

  if [ -e "$SCRATCH_PATH" ]; then
    echo "Updating scratch worktree at ${SCRATCH_PATH}..."
    git -C "$SCRATCH_PATH" fetch --no-tags origin "${SCRATCH_BRANCH}"
    if [ "$refresh_only" = "1" ]; then
      git -C "$SCRATCH_PATH" merge --ff-only "origin/${SCRATCH_BRANCH}" || \
        echo "warning: could not fast-forward scratch worktree; leaving as-is"
    else
      git -C "$SCRATCH_PATH" reset --hard "origin/${SCRATCH_BRANCH}"
    fi
    return 0
  fi

  echo "Checking out ${SCRATCH_BRANCH} at ${SCRATCH_PATH}..."
  if git show-ref --verify --quiet "refs/heads/${SCRATCH_BRANCH}"; then
    git worktree add "$SCRATCH_PATH" "${SCRATCH_BRANCH}"
  else
    git worktree add -b "${SCRATCH_BRANCH}" "$SCRATCH_PATH" "origin/${SCRATCH_BRANCH}"
  fi
  git -C "$SCRATCH_PATH" reset --hard "origin/${SCRATCH_BRANCH}"
}

ensure_scratch_worktree "$REFRESH_SCRATCH_ONLY"
if [ "$REFRESH_SCRATCH_ONLY" = "1" ]; then
  exit 0
fi

# Pinned, matching build.sh: unattended setup must not pull "latest".
WASM_PACK_VERSION="v0.15.0"
GAME_DATA_URL="https://github.com/valentinps/satisfactorymap/releases/download/game-data-v3/game_data.zip"
GAME_DATA_SHA256="686bac80b43c57044048b9fb95be2d0347d2eb2556cb2564e0c9fed3442fe1d0"

# --- Rust toolchain -------------------------------------------------------
# A transitive dependency (time 0.3.53) needs edition2024, so require a stable
# toolchain >= 1.85. The base image may pin an older default (e.g. 1.83).
if command -v rustup >/dev/null 2>&1; then
  rustup toolchain install stable --profile minimal >/dev/null 2>&1 || true
  rustup default stable
  rustup target add wasm32-unknown-unknown
  source "${CARGO_HOME:-$HOME/.cargo}/env" 2>/dev/null || true
fi

# --- wasm-pack ------------------------------------------------------------
# build_site.py looks for wasm-pack on PATH and in ~/.cargo/bin, so drop the
# pinned prebuilt binary there rather than compiling it from source.
mkdir -p "$HOME/.cargo/bin"
if ! "$HOME/.cargo/bin/wasm-pack" --version 2>/dev/null | grep -q "${WASM_PACK_VERSION#v}"; then
  echo "Installing wasm-pack ${WASM_PACK_VERSION}..."
  TARBALL="wasm-pack-${WASM_PACK_VERSION}-x86_64-unknown-linux-musl.tar.gz"
  curl --proto '=https' --tlsv1.2 -sSf -L -o "/tmp/${TARBALL}" \
    "https://github.com/rustwasm/wasm-pack/releases/download/${WASM_PACK_VERSION}/${TARBALL}"
  tar -xzf "/tmp/${TARBALL}" --strip-components=1 -C "$HOME/.cargo/bin" \
    "wasm-pack-${WASM_PACK_VERSION}-x86_64-unknown-linux-musl/wasm-pack"
  rm -f "/tmp/${TARBALL}"
fi

# --- Python build deps ----------------------------------------------------
# Pillow is needed by tools/build_site.py to cut the map tile pyramid.
python3 -m pip install --break-system-packages --quiet 'Pillow>=10,<12'

# --- Game-derived data ----------------------------------------------------
# Not committed (large/derivative); restore it from the release archive. Skip
# the download when a previous run already unpacked it.
if [ ! -f game_data/generated/map_highres.png ]; then
  echo "Downloading game data..."
  curl --proto '=https' --tlsv1.2 -sSf -L -o game_data.zip "$GAME_DATA_URL"
  echo "${GAME_DATA_SHA256}  game_data.zip" | sha256sum -c -
  python3 game_data/package_game_data.py unpack game_data.zip
  rm -f game_data.zip
fi

# --- Build the static site ------------------------------------------------
echo "Building WASM + static site..."
python3 tools/build_site.py

echo "Install complete. Serve with: python3 tools/serve_site.py"
