// ==UserScript==
// @name         YT-Smart-Assistant (YT智能助手)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  支持中英双语切换 + 智能排序 + 全功能完全体
// @author       Igloo-Garage (Rex)
// @match        https://www.youtube.com/*
// @connect      localhost
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    // 🔥 设置语言: 'zh' (中文) 或 'en' (English)
    const LANGUAGE = 'en';

    const LOCAL_SERVER = "http://localhost:6969";
    console.log(`🔥 V1.0 i18n版 loaded (${LANGUAGE})`);

    // --- 字典配置 (Dictionary) ---
    const TEXT = {
        zh: {
            panelTitle: "📥 YT智能助手",
            step1: "🔍 第一步: 分析视频格式",
            step1Analyzing: "⏳ 分析中...",
            step1Status: "正在获取视频流...",
            labelRes: "1. 分辨率",
            labelVCodec: "2. 视频编码",
            labelACodec: "3. 音频编码",
            cutToggle: "✂️ 截取片段",
            estimated: "预计:",
            cutStart: "开始 (00:00:00)",
            cutEnd: "结束 (00:05:00)",
            preciseCut: "精准剪辑 (重新编码, 速度较慢)",
            path: "📂 保存路径",
            pathPlace: "路径 (默认 ./download)",
            subTitle: "📝 字幕",
            subEnZh: "中英双语 (推荐)",
            subZh: "仅中文",
            subEn: "仅英文",
            subNone: "无字幕",
            embed: " 封装字幕 (修复后封装)",
            advCmd: "🛠️ 高级命令 ▼",
            btnAction: "🚀 立即下载",
            btnWait: "请先点击分析...",
            statusSent: "发送指令...",
            statusDone: "✅ 已开始下载",
            errConnect: "❌ 连接失败",
            errRetry: "❌ 重试分析",
            unknown: "未知"
        },
        en: {
            panelTitle: "📥 YT Smart Assistant",
            step1: "🔍 Step 1: Analyze Video",
            step1Analyzing: "⏳ Analyzing...",
            step1Status: "Fetching streams...",
            labelRes: "1. Resolution",
            labelVCodec: "2. Video Codec",
            labelACodec: "3. Audio Codec",
            cutToggle: "✂️ Clip Video",
            estimated: "Est. Size:",
            cutStart: "Start (00:00:00)",
            cutEnd: "End (00:05:00)",
            preciseCut: "Precise Cut (Re-encode, Slower)",
            path: "📂 Save Path",
            pathPlace: "Path (Default ./download)",
            subTitle: "📝 Subtitles",
            subEnZh: "Eng & Chs (Rec.)",
            subZh: "Chinese Only",
            subEn: "English Only",
            subNone: "No Subtitles",
            embed: " Embed Subs (Auto-Mux)",
            advCmd: "🛠️ Advanced Args ▼",
            btnAction: "🚀 Download Now",
            btnWait: "Analyze First...",
            statusSent: "Sending...",
            statusDone: "✅ Download Started",
            errConnect: "❌ Connection Failed",
            errRetry: "❌ Retry Analysis",
            unknown: "Unknown"
        }
    };

    const T = TEXT[LANGUAGE];

    let lastUrl = window.location.href;
    let savedSubState = { value: 'en.*,zh-Hans.*', embed: false };

    function injectStyles() {
        if (document.getElementById('yt-local-css')) return;
        const css = `
            #yt-local-dl-panel {
                position: fixed; bottom: 110px; right: 40px;
                background: rgba(31, 31, 31, 0.98);
                color: white;
                padding: 20px; padding-top: 30px;
                border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.9);
                z-index: 2147483647; font-family: Roboto, Arial, sans-serif;
                border: 1px solid #555; width: 380px;
                display: none; backdrop-filter: blur(8px);
            }
            #yt-panel-close { position: absolute; top: 10px; right: 15px; cursor: pointer; color: #aaa; font-weight: bold; font-size: 24px; }
            #yt-panel-close:hover { color: white; }

            #yt-panel-reset {
                position: absolute; top: 14px; right: 50px;
                cursor: pointer; color: #4caf50; font-size: 20px;
                transition: transform 0.3s;
            }
            #yt-panel-reset:hover { transform: rotate(180deg); color: #81c784; }

            .dl-row { margin-bottom: 12px; display: flex; flex-direction: column; }
            .dl-label { font-size: 14px; color: #ccc; margin-bottom: 5px; font-weight: 500; }
            .dl-select { width: 100%; padding: 10px; background: #222; border: 1px solid #555; color: white; border-radius: 6px; font-size: 14px; cursor: pointer; }
            .dl-select:disabled { background: #111; color: #555; border-color: #333; cursor: not-allowed; }
            .dl-input { width: 100%; padding: 10px; background: #222; border: 1px solid #555; color: #4caf50; border-radius: 6px; box-sizing: border-box; font-size: 14px; }

            #dl-btn-analyze { width: 100%; background: #2196F3; color: white; border: none; padding: 14px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 15px; margin-bottom: 12px; }
            #dl-btn-analyze:hover { background: #1976D2; transform: translateY(-1px); transition: 0.2s; }

            #dl-btn-action { width: 100%; background: #cc0000; color: white; border: none; padding: 14px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 16px; margin-top: 10px; letter-spacing: 1px; }
            #dl-btn-action:disabled { background: #555; cursor: not-allowed; transform: none; }

            #dl-cut-panel { display: none; background: #222; padding: 10px; border-radius: 8px; border: 1px dashed #666; margin-bottom: 12px; }
            .dl-cut-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
            .dl-cut-input { width: 48%; padding: 8px; background: #111; border: 1px solid #444; color: #ffeb3b; border-radius: 4px; text-align: center; }

            #dl-toggle-btn { position: fixed; bottom: 40px; right: 40px; z-index: 2147483647; background: #cc0000; color: white; width: 65px; height: 65px; border-radius: 50%; text-align: center; line-height: 65px; font-size: 32px; cursor: pointer; box-shadow: 0 6px 20px rgba(0,0,0,0.7); transition: transform 0.2s; }
            #dl-toggle-btn:hover { transform: scale(1.15); }
        `;
        const style = document.createElement('style');
        style.id = 'yt-local-css';
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
    }

    function createEl(tag, props = {}, children = []) {
        const el = document.createElement(tag);
        for (const key in props) {
            if (key === 'style') Object.assign(el.style, props.style);
            else if (key === 'dataset') Object.assign(el.dataset, props.dataset);
            else el[key] = props[key];
        }
        children.forEach(c => typeof c === 'string' ? el.appendChild(document.createTextNode(c)) : el.appendChild(c));
        return el;
    }

    function formatSize(bytes) {
        if (!bytes || bytes === 0) return T.unknown;
        const k = 1024; const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function createUI() {
        if (document.getElementById('yt-local-dl-panel')) return;
        injectStyles();

        const toggleBtn = createEl('div', { id: 'dl-toggle-btn', title: 'Download' }, ['⬇️']);
        document.body.appendChild(toggleBtn);

        const panel = createEl('div', { id: 'yt-local-dl-panel' });

        const closeBtn = createEl('div', { id: 'yt-panel-close', title: 'Close' }, ['×']);
        const resetBtn = createEl('div', { id: 'yt-panel-reset', title: 'Reset' }, ['🔄']);

        panel.appendChild(closeBtn);
        panel.appendChild(resetBtn);
        panel.appendChild(createEl('h3', { style: { margin: '0 0 15px 0', color: '#ff4e45', fontSize: '18px', fontWeight: 'bold' } }, [T.panelTitle]));

        const analyzeBtn = createEl('button', { id: 'dl-btn-analyze' }, [T.step1]);
        panel.appendChild(analyzeBtn);

        const optionsContainer = createEl('div', { id: 'dl-options-container', style: { display: 'none' } });

        optionsContainer.appendChild(createEl('div', { className: 'dl-row' }, [
            createEl('span', { className: 'dl-label' }, [T.labelRes]),
            createEl('select', { id: 'dl-res-select', className: 'dl-select' })
        ]));

        optionsContainer.appendChild(createEl('div', { className: 'dl-row' }, [
            createEl('span', { className: 'dl-label' }, [T.labelVCodec]),
            createEl('select', { id: 'dl-vcodec-select', className: 'dl-select' })
        ]));

        optionsContainer.appendChild(createEl('div', { className: 'dl-row' }, [
            createEl('span', { className: 'dl-label' }, [T.labelACodec]),
            createEl('select', { id: 'dl-acodec-select', className: 'dl-select' })
        ]));

        const sizeRow = createEl('div', { className: 'dl-row', style: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } });
        const cutWrapper = createEl('div', { style: { display: 'flex', alignItems: 'center' } }, [
            createEl('input', { type: 'checkbox', id: 'dl-cut-toggle', style: { transform: 'scale(1.2)', marginRight: '6px' } }),
            createEl('label', { htmlFor: 'dl-cut-toggle', style: { fontSize: '13px', cursor: 'pointer', color: '#ffeb3b' } }, [T.cutToggle])
        ]);
        const totalSizeText = createEl('div', { id: 'dl-total-size', className: 'dl-info-text', style: { fontWeight: 'bold', fontSize: '14px' } }, [`${T.estimated} -`]);
        sizeRow.appendChild(cutWrapper);
        sizeRow.appendChild(totalSizeText);
        optionsContainer.appendChild(sizeRow);

        const cutPanel = createEl('div', { id: 'dl-cut-panel' }, [
            createEl('div', { className: 'dl-cut-row' }, [
                createEl('input', { id: 'dl-cut-start', className: 'dl-cut-input', placeholder: T.cutStart }),
                createEl('span', { style: { color: '#aaa' } }, ['➜']),
                createEl('input', { id: 'dl-cut-end', className: 'dl-cut-input', placeholder: T.cutEnd })
            ]),
            createEl('div', { style: { fontSize: '12px', color: '#aaa' } }, [
                createEl('input', { type: 'checkbox', id: 'dl-cut-precise', style: { marginRight: '5px' } }),
                createEl('label', { htmlFor: 'dl-cut-precise' }, [T.preciseCut])
            ])
        ]);
        optionsContainer.appendChild(cutPanel);

        const pathInput = createEl('input', { id: 'dl-custom-path', className: 'dl-input', placeholder: T.pathPlace });
        const savedPath = localStorage.getItem('yt_dl_local_path');
        if (savedPath) pathInput.value = savedPath;

        const pickBtn = createEl('button', { id: 'dl-btn-pick', innerText: '📂', style: { marginLeft: '8px', cursor: 'pointer', background: '#444', color: 'white', border: '1px solid #666', borderRadius: '6px', width: '40px' } });

        panel.appendChild(createEl('div', { className: 'dl-row', style: { marginTop: '5px' } }, [
            createEl('span', { className: 'dl-label' }, [T.path]),
            createEl('div', { style: { display: 'flex' } }, [pathInput, pickBtn])
        ]));

        const subSelect = createEl('select', { id: 'dl-subs', className: 'dl-select' }, [
            createEl('option', { value: 'en.*,zh-Hans.*' }, [T.subEnZh]),
            createEl('option', { value: 'zh-Hans.*' }, [T.subZh]),
            createEl('option', { value: 'en.*' }, [T.subEn]),
            createEl('option', { value: 'none' }, [T.subNone])
        ]);
        panel.appendChild(createEl('div', { className: 'dl-row' }, [
            createEl('span', { className: 'dl-label' }, [T.subTitle]),
            subSelect
        ]));

        const embedCheck = createEl('input', { type: 'checkbox', id: 'dl-embed-subs', checked: false, style: { transform: 'scale(1.3)', marginRight: '8px' } });
        const embedLabel = createEl('label', { htmlFor: 'dl-embed-subs', id: 'dl-embed-label', style: { cursor: 'pointer' } }, [T.embed]);
        panel.appendChild(createEl('div', { style: { fontSize: '13px', marginBottom: '8px', display: 'flex', alignItems: 'center' } }, [
            embedCheck, embedLabel
        ]));

        const toggleCmd = createEl('div', {
            style: { fontSize: '13px', color: '#aaa', cursor: 'pointer', marginTop: '8px', borderTop: '1px solid #444', paddingTop: '8px' }
        }, [T.advCmd]);
        const cmdInput = createEl('textarea', {
            id: 'dl-custom-args', className: 'dl-input',
            style: { display: 'none', height: '50px', fontFamily: 'monospace', color: '#ffcc00', marginTop: '8px' },
            placeholder: '--write-thumbnail --proxy ...'
        });
        panel.appendChild(toggleCmd);
        panel.appendChild(cmdInput);

        const actionBtn = createEl('button', { id: 'dl-btn-action', disabled: true }, [T.btnWait]);
        const statusDiv = createEl('div', { id: 'dl-status', style: { marginTop: '8px', fontSize: '13px', textAlign: 'center', color: '#888' } });

        panel.appendChild(actionBtn);
        panel.appendChild(statusDiv);
        document.body.appendChild(panel);
        panel.appendChild(optionsContainer);

        const el = (id) => document.getElementById(id);

        el('dl-btn-analyze').addEventListener('click', (e) => {
            e.stopPropagation();
            const btn = el('dl-btn-analyze');
            btn.disabled = true; btn.textContent = T.step1Analyzing;
            el('dl-status').textContent = T.step1Status;

            GM_xmlhttpRequest({
                method: "POST", url: LOCAL_SERVER + "/analyze",
                data: JSON.stringify({ url: window.location.href }),
                headers: { "Content-Type": "application/json" },
                onload: (res) => {
                    try {
                        const data = JSON.parse(res.responseText);
                        if (data.error) throw new Error(data.error);
                        renderOptions(data);
                        btn.style.display = 'none';
                        el('dl-options-container').style.display = 'block';
                        el('dl-btn-action').textContent = T.btnAction;
                        el('dl-btn-action').disabled = false;
                        el('dl-status').textContent = "";
                    } catch(err) {
                        btn.textContent = T.errRetry; btn.disabled = false;
                    }
                },
                onerror: () => { btn.textContent = T.errConnect; btn.disabled = false; }
            });
        });

        function renderOptions(data) {
            const videoFormats = data.formats.filter(f => f.vcodec && f.vcodec !== 'none' && !f.acodec);
            const audioFormats = data.formats.filter(f => f.acodec && f.acodec !== 'none' && !f.vcodec);

            const resSelect = el('dl-res-select'); resSelect.textContent = '';
            let heights = [...new Set(videoFormats.map(f => f.height))].sort((a, b) => b - a);
            const highRes = heights.filter(h => h >= 360); if (highRes.length > 0) heights = highRes;
            heights.forEach(h => resSelect.appendChild(createEl('option', { value: h }, [`${h}P`])));

            const acSelect = el('dl-acodec-select'); acSelect.textContent = '';
            const bestOpus = audioFormats.filter(f => !f.acodec.includes('mp4a')).sort((a, b) => b.filesize - a.filesize)[0];
            const bestAac = audioFormats.filter(f => f.acodec.includes('mp4a')).sort((a, b) => b.filesize - a.filesize)[0];
            const finalList = []; if (bestAac) finalList.push(bestAac); if (bestOpus) finalList.push(bestOpus);
            finalList.forEach(f => {
                const name = f.acodec.includes('mp4a') ? 'AAC' : 'Opus';
                let bitrate = '??'; if (data.duration && f.filesize) bitrate = Math.round((f.filesize * 8) / (data.duration * 1000));
                const opt = createEl('option', { value: f.id }, [`${name} ${bitrate}Kbps [${formatSize(f.filesize)}]`]);
                opt.dataset.size = f.filesize; acSelect.appendChild(opt);
            });
            if (finalList.length > 0) acSelect.value = finalList[0].id;

            const updateVList = () => {
                const h = parseInt(resSelect.value);
                const vSelect = el('dl-vcodec-select'); vSelect.textContent = '';
                let avail = videoFormats.filter(f => f.height === h);
                if (h >= 1440) {
                    avail.sort((a, b) => {
                        const getScore = (c) => c.includes('av01') ? 3 : (c.includes('vp9') ? 2 : 1);
                        const sA = getScore(a.vcodec); const sB = getScore(b.vcodec);
                        return sA !== sB ? sB - sA : b.filesize - a.filesize;
                    });
                } else {
                    avail.sort((a, b) => b.filesize - a.filesize);
                }
                avail.forEach(f => {
                    let name = 'H.264'; if (f.vcodec.includes('av01')) name = 'AV1'; else if (f.vcodec.includes('vp9')) name = 'VP9';
                    const opt = createEl('option', { value: f.id }, [`${name} [${formatSize(f.filesize)}]`]);
                    opt.dataset.size = f.filesize; vSelect.appendChild(opt);
                });
                updateSize();
            };
            resSelect.addEventListener('change', updateVList);
            el('dl-vcodec-select').addEventListener('change', updateSize);
            acSelect.addEventListener('change', updateSize);
            updateVList();

            savedSubState.value = el('dl-subs').value;
            savedSubState.embed = el('dl-embed-subs').checked;
        }

        function updateSize() {
            const v = el('dl-vcodec-select').selectedOptions[0];
            const a = el('dl-acodec-select').selectedOptions[0];
            let total = 0; if (v) total += parseFloat(v.dataset.size || 0); if (a) total += parseFloat(a.dataset.size || 0);
            el('dl-total-size').textContent = `${T.estimated} ${formatSize(total)}`;
        }

        el('dl-cut-toggle').addEventListener('change', (e) => {
            const isCut = e.target.checked;
            const cutPanel = el('dl-cut-panel');
            const subSelect = el('dl-subs');
            const embedCheck = el('dl-embed-subs');

            if (isCut) {
                cutPanel.style.display = 'block';
                savedSubState.value = subSelect.value;
                savedSubState.embed = embedCheck.checked;
                subSelect.value = 'none'; subSelect.disabled = true;
                embedCheck.checked = false; embedCheck.disabled = true;
                el('dl-embed-label').style.color = '#555';
            } else {
                cutPanel.style.display = 'none';
                subSelect.disabled = false; subSelect.value = savedSubState.value;
                embedCheck.disabled = false; embedCheck.checked = savedSubState.embed;
                el('dl-embed-label').style.color = '#fff';
            }
        });

        el('dl-custom-path').addEventListener('input', (e) => {
            localStorage.setItem('yt_dl_local_path', e.target.value);
        });

        el('dl-btn-pick').addEventListener('click', (e) => {
            e.stopPropagation();
            GM_xmlhttpRequest({
                method: "POST", url: LOCAL_SERVER + "/pick-path",
                onload: (res) => {
                    const d = JSON.parse(res.responseText);
                    if (d.path) {
                        el('dl-custom-path').value = d.path;
                        localStorage.setItem('yt_dl_local_path', d.path);
                    }
                }
            });
        });

        toggleCmd.addEventListener('click', () => {
            const area = el('dl-custom-args'); area.style.display = area.style.display === 'none' ? 'block' : 'none';
        });

        el('dl-btn-action').addEventListener('click', (e) => {
            e.stopPropagation();
            const formatId = `${el('dl-vcodec-select').value}+${el('dl-acodec-select').value}`;

            const data = {
                url: window.location.href,
                formatId: formatId,
                subLang: el('dl-subs').value,
                embedSubs: el('dl-embed-subs').checked,
                customPath: el('dl-custom-path').value,
                customArgs: el('dl-custom-args').value,
                cutStart: el('dl-cut-toggle').checked ? el('dl-cut-start').value : null,
                cutEnd: el('dl-cut-toggle').checked ? el('dl-cut-end').value : null,
                preciseCut: el('dl-cut-toggle').checked ? el('dl-cut-precise').checked : false
            };

            el('dl-status').textContent = T.statusSent;
            el('dl-btn-action').disabled = true;

            GM_xmlhttpRequest({
                method: "POST", url: LOCAL_SERVER,
                data: JSON.stringify(data),
                headers: { "Content-Type": "application/json" },
                onload: (res) => {
                    el('dl-status').textContent = T.statusDone;
                    setTimeout(() => {
                        el('yt-local-dl-panel').style.display = 'none';
                        el('dl-btn-action').disabled = false;
                    }, 2000);
                }
            });
        });

        el('dl-toggle-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const p = el('yt-local-dl-panel');
            p.style.display = (p.style.display === 'block') ? 'none' : 'block';
        });

        el('yt-panel-close').addEventListener('click', (e) => {
            e.stopPropagation();
            el('yt-local-dl-panel').style.display = 'none';
        });

        function resetPanel() {
            el('dl-btn-analyze').style.display = 'block';
            el('dl-btn-analyze').disabled = false;
            el('dl-btn-analyze').textContent = T.step1;
            el('dl-options-container').style.display = 'none';
            el('dl-btn-action').disabled = true;
            el('dl-btn-action').textContent = T.btnWait;
            el('dl-status').textContent = '';

            el('dl-cut-toggle').checked = false;
            el('dl-cut-panel').style.display = 'none';
            el('dl-cut-start').value = '';
            el('dl-cut-end').value = '';
            el('dl-cut-precise').checked = false;

            el('dl-subs').disabled = false;
            el('dl-embed-subs').disabled = false;
            el('dl-embed-label').style.color = '#fff';
        }

        el('yt-panel-reset').addEventListener('click', (e) => {
            e.stopPropagation();
            resetPanel();
        });
        window.ytDlReset = resetPanel;
    }

    setInterval(() => {
        const currentUrl = window.location.href;
        if (currentUrl.includes("watch?v=")) createUI();
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            if (window.ytDlReset) window.ytDlReset();
        }
    }, 1000);
})();