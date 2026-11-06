#!/usr/bin/env bash
# manifest.json の形式と、JS の構文を確かめる（CI と同じ検査）
set -euo pipefail
cd "$(dirname "$0")/.."

node -e '
const fs = require("fs");
const m = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
if (m.manifest_version !== 3) throw new Error("manifest_version が 3 ではない");
const files = [
  m.background?.service_worker,
  m.action?.default_popup,
  ...Object.values(m.icons || {}),
  ...Object.values(m.action?.default_icon || {}),
].filter(Boolean);
for (const f of files) if (!fs.existsSync(f)) throw new Error(`manifest.json にあるファイルがない: ${f}`);
console.log("manifest.json: OK");
'
# background.js と capture.js は ES モジュール、topbar.js はページに差し込む普通のスクリプト
node --input-type=module --check < background.js
node --input-type=module --check < capture.js
node --check topbar.js
echo "JS の構文: OK"
