import { captureFullPage, blobToDataUrl, makeFilename } from "./capture.js";

const status = document.getElementById("status");
const buttons = [...document.querySelectorAll("button")];

// state："busy"（処理中）、"done"（完了）、"error"（失敗）
function setStatus(text, state = "busy") {
  status.textContent = text;
  status.className = `status ${state}`;
}

async function run({ copy, save }) {
  buttons.forEach((b) => (b.disabled = true));
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.id == null) throw new Error("タブが見つかりません");

    const blob = await captureFullPage(tab.id, (msg) => setStatus(msg));

    if (copy) {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    }
    if (save) {
      await chrome.downloads.download({
        url: await blobToDataUrl(blob),
        filename: makeFilename(tab.url),
        saveAs: false,
      });
    }

    const done = copy && save ? "コピーして保存しました" : copy ? "コピーしました" : "保存しました";
    setStatus(done, "done");
    setTimeout(() => window.close(), 1200);
  } catch (err) {
    console.error(err);
    setStatus(
      /Cannot access|chrome:\/\/|Cannot attach/i.test(String(err))
        ? "このページは撮れません"
        : `失敗しました：${err.message || err}`,
      "error"
    );
    buttons.forEach((b) => (b.disabled = false));
  }
}

const actions = {
  copy: { copy: true, save: false },
  save: { copy: false, save: true },
  both: { copy: true, save: true },
};
for (const [id, opts] of Object.entries(actions)) {
  document.getElementById(id).addEventListener("click", () => run(opts));
}

// キーボードでも選べるようにする
const keys = { c: "copy", s: "save", b: "both" };
document.addEventListener("keydown", (e) => {
  const id = keys[e.key.toLowerCase()];
  if (id && !document.getElementById(id).disabled) run(actions[id]);
});
