// ページの上に浮かせて出すトップバー。background.js が chrome.scripting で差し込む。
// ページの CSS の影響を受けないよう、Shadow DOM の中に作る。
// 見た目はデジタル庁デザインシステム（DADS）のトークンに合わせている
// （値は knk1313/workspace-ui-template-dads の src/tokens/ から取っている）。

(() => {
  // もう一度アイコンが押されたら、出ているバーを閉じる
  if (window.__fullPageScreenshotBar) {
    window.__fullPageScreenshotBar.toggle();
    return;
  }

  const CSS = `
    :host {
      color-scheme: light dark;

      --color-surface: #ffffff;
      --color-text: #333333;
      --color-text-strong: #1a1a1a;
      --color-text-muted: #666666;
      --color-border: #949494;
      --color-primary: #0017c1;
      --color-primary-hover: #00118f;
      --color-primary-active: #000060;
      --color-text-on-primary: #ffffff;
      --color-primary-outline-hover: #c5d7fb;
      --color-primary-outline-active: #9db7f9;
      --color-primary-surface: #e8f1fe;
      --color-success: #197a4b;
      --color-error: #ce0000;
      --color-disabled: #b3b3b3;
      --color-on-disabled: #f2f2f2;
      --color-focus: #000000;
      --color-focus-ring: #ffd43d;
      --shadow: 0 4px 16px 2px rgba(0, 0, 0, 0.12), 0 2px 6px 0 rgba(0, 0, 0, 0.3);

      --font-sans: "Noto Sans JP Variable", "Noto Sans JP", -apple-system, BlinkMacSystemFont,
        "Hiragino Sans", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif;
      --font-mono: "Noto Sans Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    @media (prefers-color-scheme: dark) {
      :host {
        --color-surface: #1a1a1a;
        --color-text: #f2f2f2;
        --color-text-strong: #ffffff;
        --color-text-muted: #b3b3b3;
        --color-border: #767676;
        --color-primary: #9db7f9;
        --color-primary-hover: #c5d7fb;
        --color-primary-active: #d9e6ff;
        --color-text-on-primary: #000000;
        --color-primary-outline-hover: #000071;
        --color-primary-outline-active: #00118f;
        --color-primary-surface: #000060;
        --color-success: #71c598;
        --color-error: #ff9696;
        --color-disabled: #4d4d4d;
        --color-on-disabled: #949494;
        --color-focus: #ffd43d;
        --color-focus-ring: #000000;
        --shadow: 0 4px 16px 2px rgba(0, 0, 0, 0.5), 0 2px 6px 0 rgba(0, 0, 0, 0.6);
      }
    }

    * { box-sizing: border-box; }

    .bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 12px;
      padding: 10px 10px 10px 16px;
      border: 1px solid var(--color-border);
      border-radius: 16px;
      background: var(--color-surface);
      box-shadow: var(--shadow);
      color: var(--color-text);
      font-family: var(--font-sans);
      font-size: 16px;
      line-height: 1.5;
      text-align: left;
      pointer-events: auto;
      animation: enter 0.2s cubic-bezier(0.2, 0, 0, 1);
    }
    .bar:focus { outline: none; }
    @keyframes enter {
      from { opacity: 0; transform: translateY(-8px); }
    }
    @media (prefers-reduced-motion: reduce) {
      .bar { animation: none; }
    }

    .title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      color: var(--color-text-strong);
      font-size: 16px;
      font-weight: 700;
      white-space: nowrap;
    }
    .title svg { flex: none; width: 24px; height: 24px; color: var(--color-primary); }

    .actions, .status { display: flex; align-items: center; gap: 8px; }
    .status { min-height: 40px; margin: 0; padding: 0 4px; font-size: 16px; font-weight: 700; }
    .bar:not([data-state="idle"]) .actions { display: none; }
    .bar[data-state="idle"] .status { display: none; }
    .bar[data-state="done"] .status { color: var(--color-success); }
    .bar[data-state="error"] .status { color: var(--color-error); }
    .bar[data-state="busy"] .status::before {
      content: "";
      flex: none;
      width: 18px;
      height: 18px;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* DADS ボタン（size sm 相当：高さ 40px）。角丸は 12px にしている */
    button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 40px;
      margin: 0;
      padding: 6px 12px;
      border-radius: 12px;
      font-family: inherit;
      font-size: 16px;
      font-weight: 700;
      line-height: 1;
      letter-spacing: 0.02em;
      white-space: nowrap;
      cursor: pointer;
      transition: background-color 0.15s, color 0.15s;
    }
    /* 塗り（プライマリー）。枠が 4px あるので、枠線のボタン（1px）と中身の位置がそろうよう余白を 3px 減らす */
    .solid {
      padding: 3px 9px;
      border: 4px double transparent;
      background: var(--color-primary);
      color: var(--color-text-on-primary);
    }
    .solid:hover { background: var(--color-primary-hover); }
    .solid:active { background: var(--color-primary-active); }
    /* 枠線（セカンダリー） */
    .outline {
      border: 1px solid currentColor;
      background: var(--color-surface);
      color: var(--color-primary);
    }
    .outline:hover { background: var(--color-primary-outline-hover); color: var(--color-primary-hover); }
    .outline:active { background: var(--color-primary-outline-active); color: var(--color-primary-active); }

    /* hover で文字にだけ下線を引く（キーの案内には引かない） */
    .label { text-underline-offset: 3px; }
    button:hover .label { text-decoration: underline 1px; }
    button:active .label { text-decoration: underline; }

    /* 閉じる（アイコンだけのボタン） */
    .close {
      justify-content: center;
      width: 40px;
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--color-text-muted);
    }
    .close:hover { background: var(--color-primary-surface); color: var(--color-text-strong); }
    .close svg { width: 20px; height: 20px; }

    button:focus-visible {
      outline: 4px solid var(--color-focus);
      outline-offset: 2px;
      box-shadow: 0 0 0 2px var(--color-focus-ring);
    }

    kbd {
      min-width: 22px;
      padding: 3px 5px;
      border: 1px solid currentColor;
      border-radius: 4px;
      font-family: var(--font-mono);
      font-size: 13px;
      font-weight: 400;
      line-height: 1;
      text-align: center;
      opacity: 0.85;
    }

    .spacer { flex: 1 0 0; min-width: 0; }

    /* 幅が狭いときは、閉じるボタンを右上に固定し、ボタンは折り返す */
    .actions { flex-wrap: wrap; }
    @media (max-width: 640px) {
      .bar { position: relative; padding-right: 56px; }
      .close { position: absolute; top: 8px; right: 8px; }
      .spacer { display: none; }
    }
  `;

  const HTML = `
    <div class="bar" role="dialog" aria-label="ページ全体をスクショ" data-state="idle" tabindex="-1">
      <p class="title">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M9 3.5h6a1.5 1.5 0 0 1 1.4 1L17 6h2.5A2.5 2.5 0 0 1 22 8.5v10a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 18.5v-10A2.5 2.5 0 0 1 4.5 6H7l.6-1.5a1.5 1.5 0 0 1 1.4-1ZM12 9a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Zm0 2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z"/></svg>
        ページ全体をスクショ
      </p>
      <div class="actions">
        <button class="solid" data-action="copy" type="button"><span class="label">コピー</span><kbd>C</kbd></button>
        <button class="outline" data-action="save" type="button"><span class="label">保存</span><kbd>S</kbd></button>
        <button class="outline" data-action="both" type="button"><span class="label">コピーして保存</span><kbd>B</kbd></button>
      </div>
      <p class="status" role="status" aria-live="polite"></p>
      <span class="spacer"></span>
      <button class="close" type="button" aria-label="閉じる（Esc）">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>
  `;

  const ACTIONS = {
    copy: { copy: true, save: false },
    save: { copy: false, save: true },
    both: { copy: true, save: true },
  };
  const KEYS = { c: "copy", s: "save", b: "both" };

  // ページの CSS に負けないよう、置き場所は !important で決める
  const host = document.createElement("full-page-screenshot-bar");
  host.style.cssText = [
    "all: initial",
    "position: fixed",
    "top: 16px",
    "left: 16px",
    "right: 16px",
    "z-index: 2147483647",
    "display: flex",
    "justify-content: center",
    // バーの外側（左右の空き）はページを操作できるようにする
    "pointer-events: none",
  ].map((d) => d + " !important").join(";");

  const root = host.attachShadow({ mode: "closed" });
  root.innerHTML = `<style>${CSS}</style>${HTML}`;
  const bar = root.querySelector(".bar");
  const status = root.querySelector(".status");

  let closeTimer = null;
  let pendingBlob = null; // コピーに失敗したとき、もう一度試すために持っておく

  function setState(state, text = "") {
    bar.dataset.state = state;
    status.textContent = text;
  }

  function close() {
    clearTimeout(closeTimer);
    chrome.runtime.onMessage.removeListener(onMessage);
    host.remove();
    delete window.__fullPageScreenshotBar;
  }

  async function writeClipboard(blob) {
    if (!navigator.clipboard?.write) throw new Error("このページではコピーできません（https ではないページなど）");
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
  }

  async function run({ copy, save }) {
    if (bar.dataset.state === "busy") return;
    clearTimeout(closeTimer);
    setState("busy", "準備中…");

    const res = await chrome.runtime.sendMessage({ type: "fps:capture", copy, save }).catch((err) => ({
      ok: false,
      error: String(err?.message || err),
    }));
    if (!res?.ok) {
      setState("error", errorText(res?.error));
      return;
    }

    if (copy) {
      const blob = base64ToBlob(res.data, "image/png");
      try {
        await writeClipboard(blob);
      } catch (err) {
        // ページが手前にないとコピーできない。ボタンを押してもらえばコピーできる
        pendingBlob = blob;
        setState("error", save ? "保存しました。コピーはできませんでした" : "コピーできませんでした");
        showRetry();
        return;
      }
    }

    setState("done", copy && save ? "コピーして保存しました" : copy ? "コピーしました" : "保存しました");
    closeTimer = setTimeout(close, 2500);
  }

  function errorText(error = "") {
    if (/Cannot attach|Cannot access|chrome:\/\/|chrome-extension:\/\//i.test(error)) return "このページは撮れません";
    if (/Another debugger|already attached/i.test(error)) return "開発者ツールを閉じてから、もう一度試してください";
    if (error === "撮影中です") return error;
    return `失敗しました（${error || "原因不明"}）`;
  }

  function showRetry() {
    const btn = document.createElement("button");
    btn.className = "solid";
    btn.type = "button";
    btn.innerHTML = '<span class="label">もう一度コピー</span>';
    btn.addEventListener("click", async () => {
      try {
        await writeClipboard(pendingBlob);
        pendingBlob = null;
        btn.remove();
        setState("done", "コピーしました");
        closeTimer = setTimeout(close, 2500);
      } catch (err) {
        status.textContent = String(err?.message || "コピーできませんでした");
      }
    });
    status.after(btn);
    btn.focus();
  }

  // background.js からの知らせ（進み具合、撮る間だけ隠す）
  function onMessage(msg, _sender, sendResponse) {
    if (msg?.type === "fps:progress") {
      setState("busy", msg.text);
    } else if (msg?.type === "fps:hide") {
      host.style.setProperty("display", "none", "important");
      // 隠した状態が描画されてから撮らせる
      requestAnimationFrame(() => requestAnimationFrame(() => sendResponse(true)));
      return true;
    } else if (msg?.type === "fps:show") {
      host.style.setProperty("display", "flex", "important");
    }
    return false;
  }

  root.addEventListener("click", (e) => {
    const btn = e.target.closest?.("button");
    if (!btn) return;
    if (btn.classList.contains("close")) close();
    else if (btn.dataset.action) run(ACTIONS[btn.dataset.action]);
  });

  // キー操作は、フォーカスがバーの中にあるときだけ受け取る（ページへの入力を横取りしない）
  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      if (bar.dataset.state !== "busy") close();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const action = KEYS[e.key.toLowerCase()];
    if (action && bar.dataset.state === "idle") {
      e.preventDefault();
      e.stopPropagation();
      run(ACTIONS[action]);
    }
  });

  function base64ToBlob(b64, type) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type });
  }

  chrome.runtime.onMessage.addListener(onMessage);
  document.documentElement.appendChild(host);
  bar.focus();

  window.__fullPageScreenshotBar = {
    toggle() {
      if (bar.dataset.state !== "busy") close();
    },
  };
})();
