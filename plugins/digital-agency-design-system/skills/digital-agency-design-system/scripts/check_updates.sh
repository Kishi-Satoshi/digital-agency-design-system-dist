#!/usr/bin/env bash
# スキルに取り込み済みの版（VERSION.json）と、GitHub / npm 上の最新版を比べる。何もダウンロードしない。
# 終了コード: 0 = 最新, 10 = 更新あり, 1 = 確認できなかった
set -uo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ORG="https://github.com/digital-go-jp"
python3 - "$SKILL_DIR/VERSION.json" "$ORG" <<'PY'
import json, subprocess, sys
ver = json.load(open(sys.argv[1]))
org = sys.argv[2]
changed, failed = [], False
print(f"取り込み日: {ver.get('generated_at')}")
for repo, info in ver["repos"].items():
    try:
        out = subprocess.run(["git", "ls-remote", f"{org}/{repo}.git", "HEAD"], capture_output=True, text=True, check=True, timeout=60).stdout
        head = out.split()[0]
    except Exception as e:
        print(f"  ? {repo}: 確認失敗 ({e})"); failed = True; continue
    if head != info.get("commit"):
        changed.append(repo)
        print(f"  ↑ {repo}: 更新あり {info.get('commit','')[:7]} → {head[:7]}")
        print(f"      差分: {org}/{repo}/compare/{info.get('commit','')[:12]}...{head[:12]}")
    else:
        print(f"  = {repo}: 最新 ({head[:7]})")
for pkg, v in ver.get("npm", {}).items():
    try:
        latest = subprocess.run(["npm", "view", pkg, "version"], capture_output=True, text=True, check=True, timeout=60).stdout.strip()
    except Exception as e:
        print(f"  ? {pkg}: 確認失敗 ({e})"); failed = True; continue
    if latest != v:
        changed.append(pkg); print(f"  ↑ {pkg}: {v} → {latest}")
    else:
        print(f"  = {pkg}: 最新 ({v})")
if changed:
    print("更新あり。scripts/update.sh を実行すると取り込めます。"); sys.exit(10)
sys.exit(1 if failed else 0)
PY
