#!/usr/bin/env bash
# manifest.json の形式と、JS の構文を確かめる（CI と同じ検査）
set -euo pipefail
cd "$(dirname "$0")/.."

node -e '
const m = JSON.parse(require("fs").readFileSync("manifest.json", "utf8"));
if (m.manifest_version !== 3) throw new Error("manifest_version が 3 ではない");
const fs = require("fs");
const files = [m.action?.default_popup, ...Object.values(m.icons || {}), ...Object.values(m.action?.default_icon || {})].filter(Boolean);
for (const f of files) if (!fs.existsSync(f)) throw new Error(`manifest.json にあるファイルがない: ${f}`);
console.log("manifest.json: OK");
'
node --check capture.js
node --input-type=module --check < popup.js
echo "JS の構文: OK"
