// ==UserScript==
// @name         YT-Smart-Assistant
// @namespace    https://space.bilibili.com/447933613
// @version      0.9.8
// @description  🤖YT智能助手 (修复封装字幕时间轴问题，优化下载界面)
// @author       Igloo-Garage (Rex)
// @match        *://www.youtube.com/*
// @match        *://youtu.be/*
// @connect      localhost
// @connect      127.0.0.1
// @grant        GM_xmlhttpRequest
// @run-at       document-end

// @updateURL    https://raw.githubusercontent.com/Igloo-Garage/YT-Smart-Assistant/main/client/script.user.js
// @downloadURL  https://raw.githubusercontent.com/Igloo-Garage/YT-Smart-Assistant/main/client/script.user.js
// ==/UserScript==

(function() {
    'use strict';
    if (window.self !== window.top) return;

    let lastUrl = location.href;
    const LANGUAGE = localStorage.getItem('yt_assistant_lang') || 'en';
    const LOCAL_SERVER = "http://localhost:6969";

    let isAnalyzing = false;
    let isDownloading = false;

    const TEXT = {
        zh: {
            panelTitle: "📥 YT智能助手",
            resetTitle: "重置选项",
            step1: "🔍 第一步: 分析视频格式",
            step1Analyzing: "🛑 停止分析 (工作中...)",
            step1Done: "✅ 分析完成",
            loginWarning: "⚠️ 未登录状态: 仅能获取 360P。请在火狐登录以解锁高清。",
            labelRes: "1. 分辨率",
            labelVCodec: "2. 视频编码",
            labelACodec: "3. 音频编码",
            cutToggle: "✂️ 截取片段",
            estimated: "预计:",
            preciseCut: "精准剪辑",
            path: "📂 保存路径",
            pathPlace: "路径 (默认 ./download)",
            subTitle: "📝 字幕选择",
            subEnZh: "中英双语 (推荐)",
            subZh: "仅中文 (zh-Hans)",
            subEn: "仅英文 (en)",
            subNone: "无字幕",
            embed: " 封装字幕 (修复后封装)",
            advCmd: "🛠️ 高级参数设定 ▼",
            advCmdHide: "🛠️ 收起高级参数 ▲",
            uiScale: "📏 界面缩放",
            btnAction: "🚀 立即下载",
            btnDownloading: "🛑 停止下载",
            btnDone: "✅ 全部搞定",
            btnWait: "等待分析数据...",
            statusSent: "正在发送指令到后端...",
            statusDone: "✅ 任务已归档，请检查黑框",
            statusAborted: "⚠️ 任务已手动中止",
            unknown: "未知"
        },
        en: {
            panelTitle: "📥 YT Smart Assistant",
            resetTitle: "Reset Options",
            step1: "🔍 Step 1: Analyze Video",
            step1Analyzing: "🛑 Stop Analysis...",
            step1Done: "✅ Analysis Complete",
            loginWarning: "⚠️ Not Logged In: Only 360P available. Login via Firefox to unlock HD.",
            labelRes: "1. Resolution",
            labelVCodec: "2. Video Codec",
            labelACodec: "3. Audio Codec",
            cutToggle: "✂️ Cut Clip",
            estimated: "Est:",
            preciseCut: "Precise Cut",
            path: "📂 Save Path",
            pathPlace: "Path (Default ./download)",
            subTitle: "📝 Subtitles",
            subEnZh: "Bilingual (En/Zh)",
            subZh: "Chinese Only",
            subEn: "English Only",
            subNone: "None",
            embed: " Embed Subtitles",
            advCmd: "🛠️ Advanced Settings ▼",
            advCmdHide: "🛠️ Hide Advanced Settings ▲",
            uiScale: "📏 UI Scale",
            btnAction: "🚀 Download Now",
            btnDownloading: "🛑 Stop Download",
            btnDone: "✅ All Done",
            btnWait: "Waiting for data...",
            statusSent: "Sending command...",
            statusDone: "✅ Task archived, check console",
            statusAborted: "⚠️ Task Aborted",
            unknown: "Unknown"
        }
    };

    const T = TEXT[LANGUAGE];

    // ✅ 修复点：改用普通字符串拼接，解决 'Unterminated template' 报错
    function injectStyles() {
        if (document.getElementById('yt-local-css')) return;
        const css =
              '#yt-local-dl-panel { position: fixed; bottom: 120px; right: 40px; background: rgba(28, 28, 30, 0.94); color: white; padding: 26px; padding-top: 35px; padding-bottom: 30px; border-radius: 28px; box-shadow: 0 30px 70px rgba(0,0,0,0.6); z-index: 2147483647; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif; border: 1px solid rgba(255, 255, 255, 0.1); width: 410px; backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px); display: block !important; visibility: hidden; opacity: 0; transform: scale(0.4) translateY(60px); transform-origin: bottom right; transition: opacity 0.4s cubic-bezier(0.23, 1, 0.32, 1), transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275), visibility 0.4s; max-height: 80vh; overflow-y: auto; overflow-x: hidden; will-change: transform; } ' +
              '#yt-local-dl-panel.is-active { visibility: visible; opacity: 1; transform: scale(0.9) translateY(0); } ' +
              '#yt-panel-close { position: absolute; top: 18px; right: 22px; cursor: pointer; color: #8e8e93; font-size: 24px; z-index: 10; } ' +
              '#yt-panel-reset { position: absolute; top: 19px; right: 60px; cursor: pointer; color: rgba(52, 199, 89, 0.6); font-size: 19px; z-index: 10; } ' +
              '#dl-login-warning { display: none; color: #ff5252; font-size: 13px; margin-bottom: 18px; font-weight: bold; border: 1px solid rgba(255, 82, 82, 0.3); padding: 10px; border-radius: 14px; text-align: center; background: rgba(255, 82, 82, 0.1); } ' +
              '.dl-label, #dl-toggle-cmd { font-size: 16px !important; color: #FFFFFF; font-weight: 700 !important; display: block; } ' +
              '#dl-toggle-cmd { margin-top: 25px; margin-bottom: 15px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; text-align: center; cursor: pointer; color: #8e8e93; } ' +
              '.apple-switch { position: relative; width: 51px !important; height: 31px !important; appearance: none !important; -webkit-appearance: none !important; background: rgba(120, 120, 128, 0.32); border-radius: 16px; cursor: pointer; transition: background 0.3s; outline: none; border: none !important; } ' +
              '.apple-switch:checked { background: #34C759 !important; } ' +
              '.apple-switch::after { content: ""; position: absolute; top: 2px; left: 2px; width: 27px; height: 27px; background: white; border-radius: 50%; box-shadow: 0 3px 8px rgba(0,0,0,0.15); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); } ' +
              '.apple-switch:checked::after { transform: translateX(20px); } ' +
              '.dl-row-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; } ' +
              '.dl-row { margin-bottom: 22px; } ' +
              '.dl-select, .dl-input { width: 100%; height: 46px; padding: 0 16px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.05); color: white; border-radius: 14px; font-size: 15px; outline: none; box-sizing: border-box; } ' +
              '.dl-select option { background-color: #1C1C1E; color: white; } ' +
              '#dl-custom-path { flex: 1; height: 48px; font-size: 15px !important; color: #34C759; border-radius: 14px 0 0 14px; font-family: "SF Mono", monospace; border: none; background: rgba(255, 255, 255, 0.1); padding: 0 16px;} ' +
              '#dl-btn-pick { width: 55px; height: 48px; background: rgba(60, 60, 62, 1); border: none; border-radius: 0 14px 14px 0; cursor: pointer; font-size: 20px; display: flex; align-items: center; justify-content: center; } ' +
              '#dl-adv-container { max-height: 0; overflow: hidden; opacity: 0; transition: max-height 0.4s ease, opacity 0.3s ease; background: rgba(0, 0, 0, 0.2); border-radius: 16px; } ' +
              '#dl-adv-container.is-open { max-height: 400px; opacity: 1; margin-top: 15px; padding: 15px; margin-bottom: 15px; } ' +
              '#dl-custom-args { height: 80px; width: 100%; background: rgba(0,0,0,0.3); color: #FFD60A; border-radius: 14px; padding: 12px; font-size: 14px; font-family: "SF Mono", monospace; border: none; resize: none; } ' +
              '#dl-btn-analyze { width: 100%; background: #007AFF; color: white; border: none; padding: 16px; border-radius: 16px; font-weight: 600; font-size: 17px; margin-bottom: 15px; cursor: pointer; } ' +
              '#dl-btn-action { width: 100%; background: #FF3B30; color: white; border: none; padding: 18px; border-radius: 16px; font-weight: 700; font-size: 18px; cursor: pointer; } ' +
              '#dl-btn-action:disabled { background: #3a3a3c; color: #8e8e93; } ' +
              '@keyframes breathe { 0% { box-shadow: 0 0 10px rgba(255, 59, 48, 0.4); } 50% { box-shadow: 0 0 25px rgba(255, 59, 48, 0.7); } 100% { box-shadow: 0 0 10px rgba(255, 59, 48, 0.4); } } ' +
              '#dl-toggle-btn { position: fixed; bottom: 40px; right: 40px; z-index: 2147483647; background: #FF3B30; color: white; width: 65px; height: 65px; border-radius: 33px; text-align: center; line-height: 65px; font-size: 32px; cursor: pointer; animation: breathe 3s infinite; } ' +
              '.scale-slider { width: 110px; height: 4px; appearance: none; background: rgba(255,255,255,0.2); border-radius: 2px; } ' +
              '.scale-slider::-webkit-slider-thumb { appearance: none; width: 16px; height: 16px; background: #007AFF; border-radius: 50%; } ' +
              '.scale-slider.at-center::-webkit-slider-thumb { background: #34C759 !important; } ' +
              '#yt-local-dl-panel::-webkit-scrollbar { width: 5px; } ' +
              '#yt-local-dl-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; } ' +
              '#dl-cut-panel { background: rgba(0, 0, 0, 0.2); padding: 16px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 20px; } ' +
              '.dl-cut-row { display: flex !important; justify-content: space-between; align-items: center; margin-bottom: 15px; width: 100%; } ' +
              '.dl-cut-input { width: 44% !important; padding: 10px; background: rgba(255,255,255,0.05); border: none; color: #FFD60A; border-radius: 10px; text-align: center; font-weight: bold; }';

        const style = document.createElement('style');
        style.id = 'yt-local-css';
        style.textContent = css;
        document.head.appendChild(style);
    }

    function createEl(tag, props = {}, children = []) {
        const el = document.createElement(tag);
        for (const key in props) {
            if (key === 'style') Object.assign(el.style, props.style);
            else if (key === 'className' || key === 'class') { el.className = props[key]; el.setAttribute('class', props[key]); }
            else el[key] = props[key];
        }
        children.forEach(c => { if (typeof c === 'string') el.appendChild(document.createTextNode(c)); else if (c) el.appendChild(c); });
        return el;
    }

    function formatSize(bytes) {
        if (!bytes || bytes === 0) return T.unknown;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function createUI() {
        if (document.getElementById('yt-local-dl-panel')) return;
        if (!document.body) return; // 确保Body存在

        injectStyles();

        const toggleBtn = createEl('div', { id: 'dl-toggle-btn' }, ['⬇️']);
        document.body.appendChild(toggleBtn);

        const panel = createEl('div', { id: 'yt-local-dl-panel' });
        const closeBtn = createEl('div', { id: 'yt-panel-close' }, ['×']);
        const resetBtn = createEl('div', { id: 'yt-panel-reset', title: T.resetTitle }, ['🔄']);
        panel.appendChild(closeBtn); panel.appendChild(resetBtn);

        const titleEl = createEl('h3', {
            style: { margin: '0 0 20px 0', color: '#ff4e45', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }
        }, [T.panelTitle]);

        titleEl.onclick = () => {
            const newLang = (localStorage.getItem('yt_assistant_lang') || 'zh') === 'zh' ? 'en' : 'zh';
            localStorage.setItem('yt_assistant_lang', newLang);
            location.reload();
        };

        panel.appendChild(titleEl);
        panel.appendChild(createEl('button', { id: 'dl-btn-analyze' }, [T.step1]));

        const dynamicArea = createEl('div', { id: 'dl-dynamic-options' });
        dynamicArea.appendChild(createEl('div', { id: 'dl-login-warning' }, [T.loginWarning]));

        dynamicArea.appendChild(createEl('div', { className: 'dl-row' }, [createEl('span', { className: 'dl-label' }, [T.labelRes]), createEl('select', { id: 'dl-res-select', className: 'dl-select' })]));
        dynamicArea.appendChild(createEl('div', { className: 'dl-row' }, [createEl('span', { className: 'dl-label' }, [T.labelVCodec]), createEl('select', { id: 'dl-vcodec-select', className: 'dl-select' })]));
        dynamicArea.appendChild(createEl('div', { className: 'dl-row' }, [createEl('span', { className: 'dl-label' }, [T.labelACodec]), createEl('select', { id: 'dl-acodec-select', className: 'dl-select' })]));

        dynamicArea.appendChild(createEl('div', { className: 'dl-row-flex' }, [createEl('span', { className: 'dl-label' }, [T.cutToggle]), createEl('input', { type: 'checkbox', id: 'dl-cut-toggle', className: 'apple-switch' })]));
        const cutPanel = createEl('div', { id: 'dl-cut-panel', style: { display: 'none' } }, [
            createEl('div', { className: 'dl-cut-row' }, [createEl('input', { id: 'dl-cut-start', className: 'dl-cut-input', placeholder: '00:00:00' }), createEl('span', { style: { color: '#8e8e93' } }, ['➜']), createEl('input', { id: 'dl-cut-end', className: 'dl-cut-input', placeholder: '00:05:00' })]),
            createEl('div', { className: 'dl-row-flex', style: { marginTop: '12px' } }, [createEl('span', { className: 'dl-label', style: { fontSize: '14px' } }, [T.preciseCut]), createEl('input', { type: 'checkbox', id: 'dl-cut-precise', className: 'apple-switch' })])
        ]);
        dynamicArea.appendChild(cutPanel);
        dynamicArea.appendChild(createEl('div', { id: 'dl-total-size', style: { textAlign: 'right', fontWeight: 'bold', fontSize: '14px', marginBottom: '15px', color: '#8e8e93' } }, [`${T.estimated} -`]));
        panel.appendChild(dynamicArea);

        const pathInput = createEl('input', { id: 'dl-custom-path', className: 'dl-input', placeholder: T.pathPlace });
        const savedPath = localStorage.getItem('yt_dl_local_path'); if (savedPath) pathInput.value = savedPath;
        panel.appendChild(createEl('div', { className: 'dl-row', style: { marginTop: '10px' } }, [createEl('span', { className: 'dl-label' }, [T.path]), createEl('div', { style: { display: 'flex' } }, [pathInput, createEl('button', { id: 'dl-btn-pick' }, ['📂'])])]));
        panel.appendChild(createEl('div', { className: 'dl-row' }, [createEl('span', { className: 'dl-label' }, [T.subTitle]), createEl('select', { id: 'dl-subs', className: 'dl-select' }, [createEl('option', { value: 'en.*,zh-Hans.*' }, [T.subEnZh]), createEl('option', { value: 'zh-Hans.*' }, [T.subZh]), createEl('option', { value: 'en.*' }, [T.subEn]), createEl('option', { value: 'none' }, [T.subNone])])]));
        panel.appendChild(createEl('div', { className: 'dl-row-flex' }, [createEl('span', { className: 'dl-label' }, [T.embed]), createEl('input', { type: 'checkbox', id: 'dl-embed-subs', className: 'apple-switch', checked: false })]));

        const toggleCmd = createEl('div', { id: 'dl-toggle-cmd' }, [T.advCmd]);
        const advContainer = createEl('div', { id: 'dl-adv-container' }, [
            createEl('div', { className: 'dl-row-flex', style: { marginBottom: '15px' } }, [createEl('span', { className: 'dl-label', style: { fontSize: '13px' } }, [T.uiScale]), createEl('input', { type: 'range', id: 'dl-ui-scale', className: 'scale-slider', min: '0.6', max: '1.1', step: '0.05', value: localStorage.getItem('yt_panel_scale') || '0.75' })]),
            createEl('textarea', { id: 'dl-custom-args', placeholder: '--proxy 127.0.0.1:7890 ...' })
        ]);
        panel.appendChild(toggleCmd); panel.appendChild(advContainer);

        const actionBtn = createEl('button', { id: 'dl-btn-action', disabled: true }, [T.btnWait]);
        const statusDiv = createEl('div', { id: 'dl-status', style: { marginTop: '10px', fontSize: '12px', textAlign: 'center', color: '#8e8e93' } });
        panel.appendChild(actionBtn); panel.appendChild(statusDiv);
        document.body.appendChild(panel);

        const el = (id) => document.getElementById(id);

        const abortCall = (btn, originalText, color, resetFlag) => {
            btn.textContent = (LANGUAGE === 'zh' ? "🛑 正在停止..." : "🛑 Stopping...");
            GM_xmlhttpRequest({
                method: "POST", url: LOCAL_SERVER + "/abort",
                onload: () => {
                    resetFlag();
                    btn.textContent = T.statusAborted;
                    btn.style.backgroundColor = "orange";
                    setTimeout(() => { btn.textContent = originalText; btn.style.backgroundColor = color; }, 5000);
                }
            });
        };

        const ytDlReset = () => {
            isAnalyzing = false;
            isDownloading = false;
            el('dl-btn-analyze').disabled = false; el('dl-btn-analyze').style.backgroundColor = ""; el('dl-btn-analyze').textContent = T.step1;
            el('dl-btn-action').disabled = true; el('dl-btn-action').style.backgroundColor = ""; el('dl-btn-action').textContent = T.btnWait;
            el('dl-res-select').textContent = ''; el('dl-vcodec-select').textContent = '';
            el('dl-acodec-select').textContent = ''; el('dl-status').textContent = '';
            el('dl-cut-toggle').checked = false; el('dl-cut-panel').style.display = 'none';
            el('dl-login-warning').style.display = 'none';
        };

        el('dl-toggle-btn').onclick = () => panel.classList.toggle('is-active');
        closeBtn.onclick = () => panel.classList.remove('is-active');
        resetBtn.onclick = ytDlReset;
        el('dl-toggle-cmd').onclick = () => {
            advContainer.classList.toggle('is-open');
            el('dl-toggle-cmd').textContent = advContainer.classList.contains('is-open') ? T.advCmdHide : T.advCmd;
        };

        const applyScale = (s) => {
            if (s > 0.96 && s < 1.04) { s = 1.0; el('dl-ui-scale').classList.add('at-center'); }
            else { el('dl-ui-scale').classList.remove('at-center'); }
            panel.style.transform = `scale(${s})`; localStorage.setItem('yt_panel_scale', s);
        };
        applyScale(localStorage.getItem('yt_panel_scale') || 0.75);
        el('dl-ui-scale').oninput = (e) => applyScale(e.target.value);

        el('dl-btn-analyze').onclick = () => {
            if (isAnalyzing) {
                abortCall(el('dl-btn-analyze'), T.step1, "#007AFF", () => isAnalyzing = false);
                return;
            }
            isAnalyzing = true;
            el('dl-btn-analyze').disabled = false;
            el('dl-btn-analyze').textContent = T.step1Analyzing;
            el('dl-btn-analyze').style.backgroundColor = "#ff3b30";

            GM_xmlhttpRequest({
                method: "POST", url: LOCAL_SERVER + "/analyze",
                data: JSON.stringify({ url: window.location.href }),
                headers: { "Content-Type": "application/json" },
                onload: (res) => {
                    if (!isAnalyzing) return;
                    isAnalyzing = false;
                    el('dl-btn-analyze').style.backgroundColor = "";
                    try { const data = JSON.parse(res.responseText); renderOptions(data); el('dl-btn-analyze').textContent = T.step1Done; el('dl-btn-analyze').disabled = false; el('dl-btn-action').disabled = false; el('dl-btn-action').textContent = T.btnAction; } catch(e) { el('dl-btn-analyze').disabled = false; el('dl-btn-analyze').textContent = T.step1; }
                },
                onerror: () => {
                    isAnalyzing = false;
                    el('dl-btn-analyze').textContent = T.step1;
                    el('dl-btn-analyze').style.backgroundColor = "";
                }
            });
        };

        el('dl-btn-pick').onclick = () => {
            const btn = el('dl-btn-pick');
            if (btn.dataset.picking === "true") return;

            const oldText = btn.innerText;
            btn.innerText = "⏳";
            btn.dataset.picking = "true";
            btn.style.cursor = "not-allowed";

            GM_xmlhttpRequest({
                method: "POST",
                url: LOCAL_SERVER + "/pick-path",
                onload: (res) => {
                    btn.innerText = oldText;
                    btn.dataset.picking = "false";
                    btn.style.cursor = "pointer";
                    try {
                        const d = JSON.parse(res.responseText);
                        if (d.path) {
                            el('dl-custom-path').value = d.path;
                            localStorage.setItem('yt_dl_local_path', d.path);
                            el('dl-custom-path').dispatchEvent(new Event('input'));
                        }
                    } catch (e) { console.error("解析路径失败", e); }
                },
                onerror: (err) => {
                    btn.innerText = "❌";
                    btn.dataset.picking = "false";
                    btn.style.cursor = "pointer";
                    setTimeout(() => btn.innerText = oldText, 2000);
                }
            });
        };


        el('dl-btn-action').onclick = () => {
            // ===========================================
            // 🛑 场景 A：点击停止 (走 6970 专用通道)
            // ===========================================
            if (isDownloading) {
                el('dl-btn-action').disabled = true;
                el('dl-btn-action').textContent = LANGUAGE === 'zh' ? "🛑 正在暴力拔线..." : "🛑 Hard Stopping...";
                el('dl-btn-action').style.background = "darkred";

                GM_xmlhttpRequest({
                    method: "POST",
                    url: "http://127.0.0.1:6970/abort", // 强制 IP
                    timeout: 2000,
                    onload: () => {
                        isDownloading = false;
                        el('dl-status').textContent = LANGUAGE === 'zh' ? "⚠️ 任务已强杀" : "⚠️ Task Force Killed";
                        el('dl-btn-action').textContent = LANGUAGE === 'zh' ? "🚫 已中止" : "🚫 Aborted";
                        setTimeout(resetBtnState, 2000);
                    },
                    onerror: () => {
                        isDownloading = false;
                        el('dl-btn-action').textContent = LANGUAGE === 'zh' ? "🚫 强制重置" : "🚫 Force Reset";
                        setTimeout(resetBtnState, 1000);
                    }
                });
                return;
            }

            // ===========================================
            // 🚀 场景 B：点击开始下载 (强制 IPv4 直连)
            // ===========================================
            isDownloading = true;

            const body = {
                url: window.location.href,
                formatId: `${el('dl-vcodec-select').value}+${el('dl-acodec-select').value}`,
                subLang: el('dl-subs').value,
                embedSubs: el('dl-embed-subs').checked,
                customPath: el('dl-custom-path').value,
                customArgs: el('dl-custom-args').value,
                cutStart: el('dl-cut-toggle').checked ? el('dl-cut-start').value : null,
                cutEnd: el('dl-cut-toggle').checked ? el('dl-cut-end').value : null,
                preciseCut: el('dl-cut-toggle').checked ? el('dl-cut-precise').checked : false
            };

            el('dl-btn-action').textContent = LANGUAGE === 'zh' ? "⏳ 处理中..." : "⏳ Processing...";
            el('dl-status').textContent = LANGUAGE === 'zh' ? "后端正在狂奔，请耐心等待..." : "Backend is working, please wait...";

            GM_xmlhttpRequest({
                method: "POST",
                // 👇👇👇 关键修改：强制使用 127.0.0.1，解决 Windows 下 localhost 的 IPv6 解析延迟问题
                url: "http://127.0.0.1:6969",

                data: JSON.stringify(body),
                headers: { "Content-Type": "application/json" },

                // 👇👇👇 关键修改：设置 1 小时超时，防止大文件下载中断
                timeout: 3600000,

                onload: (res) => {
                    if (!isDownloading) return;
                    console.log("🔥 [后端回复]", res.responseText);

                    try {
                        const json = JSON.parse(res.responseText);

                        if (json.status === "aborted") {
                            el('dl-status').textContent = T.statusAborted || (LANGUAGE === 'zh' ? "⚠️ 任务已中断" : "⚠️ Task Aborted");
                            el('dl-btn-action').textContent = LANGUAGE === 'zh' ? "🚫 已中止" : "🚫 Aborted";
                        } else {
                            el('dl-btn-action').textContent = T.btnDone || "✅ All Done";
                            el('dl-btn-action').style.background = "#34C759";
                            el('dl-status').textContent = LANGUAGE === 'zh' ? "✅ 下载与封装已完成" : "✅ Download & Embed Complete";
                        }
                    } catch(e) {
                        console.warn("JSON解析异常", e);
                        el('dl-btn-action').textContent = LANGUAGE === 'zh' ? "✅ 完成 (请检查文件)" : "✅ Done (Check File)";
                        el('dl-btn-action').style.background = "#34C759";
                    }

                    setTimeout(() => {
                        if (isDownloading) {
                            isDownloading = false;
                            resetBtnState();
                        }
                    }, 4000);
                },

                onerror: (e) => {
                    isDownloading = false;
                    console.error("连接错误详情:", e); // 按F12看Console能看到具体原因
                    el('dl-btn-action').disabled = false;

                    // 给更具体的提示
                    el('dl-btn-action').textContent = LANGUAGE === 'zh' ? "❓ 连接被拒绝" : "❓ Connection Refused";
                    el('dl-status').textContent = LANGUAGE === 'zh'
                        ? "无法连接！请检查黑框(Server)是否开启"
                    : "Cannot connect! Is Server running?";
                },

                ontimeout: () => {
                    isDownloading = false;
                    el('dl-btn-action').disabled = false;
                    el('dl-btn-action').textContent = LANGUAGE === 'zh' ? "⚠️ 请求超时" : "⚠️ Timeout";
                    el('dl-status').textContent = LANGUAGE === 'zh'
                        ? "任务超 1 小时，脚本停止等待"
                    : "Task timed out (>1h)";
                }
            });
        };

        function resetBtnState() {
            const btn = document.getElementById('dl-btn-action');
            if (btn) {
                btn.disabled = false;
                btn.textContent = T.btnAction;
                btn.style.background = "";
            }
        }

        el('dl-cut-toggle').onchange = (e) => { el('dl-cut-panel').style.display = e.target.checked ? 'block' : 'none'; };
    }

    function renderOptions(data) {
        const el = (id) => document.getElementById(id);
        const formats = data.formats || [];
        const videoFormats = formats.filter(f => f.height >= 360 && f.vcodec);
        const pureAudioFormats = formats.filter(f => !f.vcodec && f.acodec);
        const resSelect = el('dl-res-select'); const vSelect = el('dl-vcodec-select'); const acSelect = el('dl-acodec-select');

        // ✨ 新增一个小工具函数：自动转换码率单位
        const fmtRate = (val) => {
            if (!val) return '';
            // 如果大于等于 1000 Kbps，转换为 Mbps (保留1位小数)
            if (val >= 1000) return ` - ${(val / 1000).toFixed(1)}Mbps`;
            // 否则显示 Kbps
            return ` - ${Math.round(val)}Kbps`;
        };

        const maxRes = Math.max(...videoFormats.map(f => f.height || 0));
        el('dl-login-warning').style.display = (maxRes <= 360) ? 'block' : 'none';

        resSelect.textContent = ''; acSelect.textContent = '';
        let heights = [...new Set(videoFormats.map(f => f.height))].sort((a, b) => b - a);
        if (heights.length === 0) resSelect.appendChild(new Option("360P", "360"));
        else heights.forEach(h => resSelect.appendChild(new Option(`${h}P`, h)));

        // ============ 音频部分 ============
        const bestAudios = {};
        pureAudioFormats.forEach(f => {
            const type = f.acodec && f.acodec.includes('mp4a') ? 'AAC' : 'Opus';
            if (!bestAudios[type] || (f.filesize || 0) > (bestAudios[type].filesize || 0)) bestAudios[type] = f;
        });

        Object.keys(bestAudios).sort((a, b) => a === 'AAC' ? -1 : 1).forEach(type => {
            const f = bestAudios[type];
            // 使用新函数格式化码率
            const bitrate = fmtRate(f.abr || f.tbr || f.bitrate || f.average_bitrate);

            const opt = new Option(`${type} [${formatSize(f.filesize)}]${bitrate}`, f.id);
            opt.dataset.size = f.filesize;
            acSelect.appendChild(opt);
        });

        // ============ 视频部分 ============
        const updateVList = () => {
            const h = parseInt(resSelect.value);
            vSelect.textContent = '';

            let avail = videoFormats.filter(f => f.height === h).sort((a, b) => (b.filesize || 0) - (a.filesize || 0));

            avail.forEach(f => {
                if (!f.filesize) return;

                let name = f.vcodec.includes('av01') ? 'AV1' : (f.vcodec.includes('vp9') ? 'VP9' : 'H.264');

                // 优先取 vbr，取不到取 tbr，使用新函数格式化
                const bitrate = fmtRate(f.vbr || f.tbr || f.bitrate || f.average_bitrate);

                const opt = new Option(`${name} [${formatSize(f.filesize)}]${bitrate}`, f.id);
                opt.dataset.size = f.filesize;
                vSelect.appendChild(opt);
            });

            if (vSelect.options.length === 0) vSelect.appendChild(new Option("无有效流", ""));

            updateSize();
        };

        const updateSize = () => {
            const vs = vSelect.selectedOptions[0]; const as = acSelect.selectedOptions[0];
            let total = 0; if (vs) total += parseFloat(vs.dataset.size || 0); if (as) total += parseFloat(as.dataset.size || 0);
            el('dl-total-size').textContent = `${T.estimated} ${formatSize(total)}`;
        };

        resSelect.onchange = updateVList; vSelect.onchange = updateSize; acSelect.onchange = updateSize;
        updateVList();
    }

    // 自动重置逻辑
    setInterval(() => {
        const currentUrl = window.location.href;
        if (currentUrl.match(/(watch\?v=|shorts\/)/)) {
            createUI();
            if (currentUrl !== lastUrl) {
                lastUrl = currentUrl;
                const resetBtn = document.getElementById('yt-panel-reset');
                if (resetBtn) resetBtn.click();
            }
        }
    }, 1000);
})();