// ツールバーのアイコン（または Alt+Shift+S）で、ページの上にトップバーを出す。
// トップバーのボタンが押されたら、ここでページ全体を撮り、保存する。
// コピーはページの側（topbar.js）で行うため、画像のデータを返す。

import { captureFullPage, blobToBase64, makeFilename } from "./capture.js";

const busyTabs = new Set();

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id == null) return;
  try {
    // すでに出ていれば閉じ、出ていなければ出す（topbar.js の中で切り替える）
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["topbar.js"] });
  } catch (err) {
    // chrome:// のページなど、拡張機能が入れないページ
    console.warn(err);
    await flashBadge(tab.id, "×", "#ce0000");
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== "fps:capture" || sender.tab?.id == null) return false;
  handleCapture(sender.tab, msg)
    .then(sendResponse)
    .catch((err) => {
      console.error(err);
      sendResponse({ ok: false, error: String(err?.message || err) });
    });
  return true; // 返事を後で送る
});

async function handleCapture(tab, { copy, save }) {
  const tabId = tab.id;
  if (busyTabs.has(tabId)) return { ok: false, error: "撮影中です" };
  busyTabs.add(tabId);
  const toTab = (message) => chrome.tabs.sendMessage(tabId, message).catch(() => {});

  try {
    const blob = await captureFullPage(tabId, {
      onProgress: (text) => {
        toTab({ type: "fps:progress", text });
        const m = text.match(/(\d+)%/);
        setBadge(tabId, m ? `${m[1]}%` : "…", "#0017c1");
      },
      // トップバーが写り込まないよう、隠し終わるのを待ってから撮る
      beforeShots: () => toTab({ type: "fps:hide" }),
      afterShots: () => toTab({ type: "fps:show" }),
    });

    const base64 = await blobToBase64(blob);
    if (save) {
      await chrome.downloads.download({
        url: "data:image/png;base64," + base64,
        filename: makeFilename(tab.url),
        saveAs: false,
      });
    }
    return { ok: true, data: copy ? base64 : null };
  } finally {
    busyTabs.delete(tabId);
    setBadge(tabId, "", "#000");
  }
}

async function setBadge(tabId, text, color) {
  try {
    await chrome.action.setBadgeBackgroundColor({ tabId, color });
    await chrome.action.setBadgeText({ tabId, text });
  } catch (_) {
    // タブが閉じられた場合などは無視する
  }
}

async function flashBadge(tabId, text, color) {
  await setBadge(tabId, text, color);
  setTimeout(() => setBadge(tabId, "", "#000"), 2000);
}
