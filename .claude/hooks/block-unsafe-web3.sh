#!/usr/bin/env bash
# PreToolUse hook: blocks writing unsafe wallet-authorization patterns into code.
# Wired in .claude/settings.json for Write|Edit|MultiEdit. Exit 2 = block.
# Dependency-free: scans the raw tool-input JSON (no jq required).
set -uo pipefail

input="$(cat)"

# Best-effort target path; enforce only on source code.
fpath="$(printf '%s' "$input" | sed -nE 's/.*"file_path"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/p' | head -1)"
case "$fpath" in
  *.sol|*.ts|*.tsx|*.js|*.jsx|*.cjs|*.mjs) ;;  # check these
  "") ;;                                        # unknown path: check anyway (fail safe)
  *) exit 0 ;;                                  # skip docs/config/.claude
esac

# Unambiguous wallet-drain signals.
patterns='setApprovalForAll|type\(uint256\)\.max|MaxUint256|maxUint256|UINT256_MAX|0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'

if printf '%s' "$input" | grep -E -iq "$patterns"; then
  echo "BLOCKED by security hook: unbounded approval or setApprovalForAll detected. The platform is non-custodial — users may only approve a bounded amount tied to a real deposit. See .claude/rules/security.md." >&2
  exit 2
fi

exit 0
