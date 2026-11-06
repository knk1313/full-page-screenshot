// ページ全体のスクリーンショットを撮る。
// Chrome DevTools Protocol（chrome.debugger）でビューポートの外まで描画させ、
// 縦に分けて撮った画像を OffscreenCanvas でつなぎ、PNG の Blob を返す。

const CHUNK_CSS_HEIGHT = 4000; // 1回に撮る高さ（CSS px）。GPU の上限を避けるために分ける
const MAX_CANVAS_SIDE = 32000; // キャンバスの1辺の上限（px）
const MAX_CANVAS_AREA = 250_000_000; // キャンバスの面積の上限（px）

// hooks.onProgress(text)：進み具合を知らせる
// hooks.beforeShots()：撮る直前に呼ぶ（ページに出している案内を隠す）。終わるまで待つ
// hooks.afterShots()：撮り終わったら呼ぶ（失敗したときも呼ぶ）
export async function captureFullPage(tabId, hooks = {}) {
  const { onProgress = () => {}, beforeShots = async () => {}, afterShots = async () => {} } = hooks;
  const target = { tabId };
  await chrome.debugger.attach(target, "1.3");
  const send = (method, params = {}) =>
    chrome.debugger.sendCommand(target, method, params);

  try {
    onProgress("画像を読み込み中…");
    // 遅延読み込みの画像を読ませるため、一度下までスクロールしてから上に戻す
    await send("Runtime.evaluate", {
      expression: `(${preScroll.toString()})()`,
      awaitPromise: true,
    });

    await send("Emulation.setScrollbarsHidden", { hidden: true });

    const { result } = await send("Runtime.evaluate", {
      expression: "window.devicePixelRatio",
      returnByValue: true,
    });
    const dpr = result.value || 1;

    const metrics = await send("Page.getLayoutMetrics");
    const size = metrics.cssContentSize || metrics.contentSize;
    const width = Math.ceil(size.width);
    const height = Math.ceil(size.height);

    // キャンバスの上限に収まるよう、必要なら縮小する
    const scale = Math.min(
      1,
      MAX_CANVAS_SIDE / (width * dpr),
      MAX_CANVAS_SIDE / (height * dpr),
      Math.sqrt(MAX_CANVAS_AREA / (width * dpr * height * dpr))
    );
    const canvas = new OffscreenCanvas(
      Math.floor(width * dpr * scale),
      Math.floor(height * dpr * scale)
    );
    const ctx = canvas.getContext("2d");

    const total = Math.ceil(height / CHUNK_CSS_HEIGHT);
    await beforeShots();
    try {
      for (let i = 0; i < total; i++) {
        const y = i * CHUNK_CSS_HEIGHT;
        const h = Math.min(CHUNK_CSS_HEIGHT, height - y);
        onProgress(`撮影中… ${Math.round((i / total) * 100)}%`);

        const shot = await send("Page.captureScreenshot", {
          format: "png",
          captureBeyondViewport: true,
          fromSurface: true,
          clip: { x: 0, y, width, height: h, scale },
        });
        const bitmap = await createImageBitmap(base64ToBlob(shot.data, "image/png"));
        ctx.drawImage(bitmap, 0, Math.round(y * dpr * scale));
        bitmap.close();
      }
    } finally {
      await afterShots();
    }

    onProgress("画像を作成中…");
    return await canvas.convertToBlob({ type: "image/png" });
  } finally {
    try {
      await chrome.debugger.detach(target);
    } catch (_) {
      // すでに外れている場合は無視する
    }
  }
}

// ページの中で実行する関数（文字列にして送る）
function preScroll() {
  return new Promise((resolve) => {
    const start = Date.now();
    const step = () => {
      const bottom =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 2;
      if (bottom || Date.now() - start > 10000) {
        window.scrollTo(0, 0);
        setTimeout(resolve, 300);
        return;
      }
      window.scrollBy(0, window.innerHeight);
      setTimeout(step, 150);
    };
    step();
  });
}

function base64ToBlob(b64, type) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

export async function blobToBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

export function makeFilename(url) {
  let host = "page";
  try {
    host = new URL(url).hostname.replace(/[^a-z0-9.-]/gi, "_") || "page";
  } catch (_) {}
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
    d.getHours()
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `screenshot-${host}-${stamp}.png`;
}
