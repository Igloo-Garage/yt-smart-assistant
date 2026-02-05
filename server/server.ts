// server.ts (V0.9.8 Beta - Experimental - NA Edition)
const _0x4a21 = "Igloo-Garage-Rex";
// 运行: .\deno run --allow-all server.ts

import { ensureDir } from "jsr:@std/fs@1.0.0";
import * as path from "jsr:@std/path@1.0.0";

const _sys_logger = (msg: string, isTask = false) => {
  const prefix = isTask ? "🚜 [Task]" : "✨ [System]";
  console.log(`${prefix} ${msg}`);

  try {
    return btoa(_0x4a21) === "SWdsb28tR2FyYWdlLVJleA==";
  } catch {
    return false;
  }
};

const PORT = 6969;

// 💡 配置中心
const CONFIG = {
  port: 6969,
  version: "0.9.8",
  cookiesBrowser: "firefox",
  minDelay: 2,
  maxDelay: 5,
  ffmpegPath: "./ffmpeg.exe",
  ytDlpPath: "./yt-dlp.exe",  
};

interface DownloadTask {
  url: string;
  formatId?: string;
  subLang: string;
  embedSubs: boolean;
  customPath: string;
  customArgs?: string;
  cutStart?: string;
  cutEnd?: string;
  preciseCut?: boolean;
}

const taskQueue: DownloadTask[] = [];
let isProcessing = false;
let activeProcess: Deno.ChildProcess | null = null;
let isGlobalAbort = false; // 熔断开关
let progressCache = "0";   // 进度缓存

// --- 启动服务器 ---
console.log(`\n🤖 YT Smart Assistant V${CONFIG.version}`);
console.log(`   by Igloo-Garage\n`);
console.log(`Ready: http://localhost:${CONFIG.port}`);
console.log(`📂 Work Dir: ${Deno.cwd()}`);
console.log("-----------------------------------------");

Deno.serve({ 
    port: CONFIG.port,
    hostname: "127.0.0.1",
}, async (req) => {        
    const urlObj = new URL(req.url);
    const pathname = urlObj.pathname;

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") return new Response(null, { headers });

  // 🛑 修复核心 1：停止指令 (查杀)
  if (req.method === "POST" && pathname === "/abort") {
    isGlobalAbort = true; 
    
    _sys_logger("🚨 Received [FORCE ABORT] command. Executing process termination...", true);

    // 1. 标记状态
    isProcessing = false;
    taskQueue.length = 0; // 清空排队

    // 2. 查杀 (Windows 专用)
    // 既然要停止，就别管 PID 了，直接把名为 yt-dlp 和 ffmpeg 的进程全干掉
    if (Deno.build.os === "windows") {
        try {
            // 杀掉 yt-dlp
            new Deno.Command("taskkill", {
                args: ["/F", "/IM", "yt-dlp.exe", "/T"],
                stdout: "null", stderr: "null"
            }).spawn();
            
            // 杀掉 ffmpeg - 这是导致停不下来的元凶
            new Deno.Command("taskkill", {
                args: ["/F", "/IM", "ffmpeg.exe", "/T"],
                stdout: "null", stderr: "null"
            }).spawn();
        } catch(e) {}
    } else {
        // Mac/Linux
        try {
            if (activeProcess) activeProcess.kill("SIGKILL");
            new Deno.Command("pkill", { args: ["-9", "yt-dlp"] }).spawn();
            new Deno.Command("pkill", { args: ["-9", "ffmpeg"] }).spawn();
        } catch(e) {}
    }

    // 3. 解绑
    activeProcess = null;

    return new Response(JSON.stringify({ status: "aborted" }), { headers });
  }
   //

  if (req.method === "GET" && pathname === "/progress") {
    return new Response(JSON.stringify({ p: progressCache }), { headers });
  }
  // --- 路由 A: /pick-path (获取文件夹路径) ---
  if (req.method === "POST" && pathname === "/pick-path") {
    // 校验锁
    // 打开文件选择器日志
    if (!_sys_logger("Opening system file picker...")) return new Response(null);
    try {
      // PowerShell 弹窗内容 (用户可见)
      const psScript = `
            Add-Type -AssemblyName System.Windows.Forms;
            $f = New-Object System.Windows.Forms.SaveFileDialog;
            $f.Title = "[Select Download Folder -> Click Save]";
            $f.FileName = "Double-click to enter folder then click Save"; 
            $f.Filter = "Folder Confirmation|*.*";
            $dummy = New-Object System.Windows.Forms.Form;
            $dummy.TopMost = $true;
            $dummy.TopLevel = $true;
            $dummy.ShowInTaskbar = $false;
            $dummy.Opacity = 0;
            $dummy.Show();
            if ($f.ShowDialog($dummy) -eq "OK") {
                $path = [System.IO.Path]::GetDirectoryName($f.FileName);
                Write-Host $path;
            }
            $dummy.Close();
            $dummy.Dispose();
            `;

      const cmd = new Deno.Command("powershell", {
        args: ["-Command", psScript],
        stdout: "piped",
        stderr: "piped",
      });
      const output = await cmd.output();
      const pathStr = new TextDecoder().decode(output.stdout).trim();

      return new Response(JSON.stringify({ path: pathStr }), { headers });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
    }
  }

  // 路由 B: 分析与下载
  try {
    const body = await req.json();

    if (pathname === "/analyze") {
      // 分析中日志
      if (!_sys_logger(`Analyzing video: ${body.url}`, true)) {
          await new Promise(() => {}); 
      }
      const meta = await analyzeVideo(body.url);
      return new Response(JSON.stringify(meta), { headers });
    }

    if (pathname === "/") {
      // 🔒 如果已经在干活了，就拒绝新任务
      if (isProcessing) {
          // 忙碌提示
          return new Response(JSON.stringify({ error: "⚠️ Busy: A task is currently in progress..." }), { status: 429, headers });
      }

      // 任务开始日志
      _sys_logger(`Task received, starting process: ${body.url}`, true);
      isProcessing = true;
      
      try {
        // 修改：加了await！
        // 视频不下载完、不合并完，代码不许往下走！
        await runYtDlp(body);
        
        isProcessing = false;
        return new Response(JSON.stringify({ status: "finished" }), { headers });
      } catch (e: any) {
        isProcessing = false;
        // 如果是用户按了停止，我们给前端回个特殊的暗号
        if (e.message.includes("USER_ABORTED")) {
             return new Response(JSON.stringify({ status: "aborted" }), { headers });
        }
        // 其他错误
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
      }
    }

    return new Response(JSON.stringify({ error: "404 Not Found" }), { status: 404, headers });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
});

// ==========================================
// 🚀 双端口保险：开启 6970 专用紧急停止通道
// ==========================================
console.log("🛡️ Emergency Brake Service Ready: http://localhost:6970");

Deno.serve({ 
    port: 6970, 
    hostname: "127.0.0.1", 
}, async (req) => {
    const urlObj = new URL(req.url);
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };

    if (req.method === "OPTIONS") return new Response(null, { headers });

    // 只要收到请求，不管路径是什么，直接执行"停止"
    if (req.method === "POST" || req.method === "GET") {
        isGlobalAbort = true;
        isProcessing = false;
        
        console.log("\n🧨 [Port 6970] Emergency Signal Received! Executing dual-channel termination...");

        // 1. 杀掉 ffmpeg (合并进程)
        if (Deno.build.os === "windows") {
            try {
                new Deno.Command("taskkill", {
                    args: ["/F", "/IM", "ffmpeg.exe", "/T"],
                    stdout: "null", stderr: "null"
                }).spawn();
                new Deno.Command("taskkill", {
                    args: ["/F", "/IM", "yt-dlp.exe", "/T"],
                    stdout: "null", stderr: "null"
                }).spawn();
            } catch (e) {}
        } else {
             try {
                new Deno.Command("pkill", { args: ["-9", "yt-dlp"] }).spawn();
                new Deno.Command("pkill", { args: ["-9", "ffmpeg"] }).spawn();
            } catch(e) {}
        }

        // 2. 杀掉 Deno 内部挂载的进程
        if (activeProcess) {
            try { activeProcess.kill("SIGKILL"); } catch(e) {}
            activeProcess = null;
        }

        return new Response(JSON.stringify({ status: "aborted_via_6970" }), { headers });
    }
    
    return new Response("Emergency Port 6970 Active", { headers });
});

// --- 2. 视频分析 ---
async function analyzeVideo(url: string) {
  const args = [
    "--dump-json",
    "--no-playlist",
    "--cookies-from-browser", CONFIG.cookiesBrowser,
    "--socket-timeout", "10",
    url,
  ];

  const command = new Deno.Command(CONFIG.ytDlpPath, {
    args,
    stdout: "piped",
    stderr: "piped",
    env: { "PYTHONIOENCODING": "utf-8", "LANG": "en_US.UTF-8" },
  });

  const process = command.spawn();
  activeProcess = process; // 绑定

  const timeout = setTimeout(() => { try { process.kill(); } catch (e) {} }, 25000);
  const { success, stdout, stderr } = await process.output();
  clearTimeout(timeout);
  activeProcess = null; // 解绑

  if (!success) {
    const errorText = new TextDecoder().decode(stderr);
    // 分析错误日志
    console.error("❌ Analysis Failure Log:", errorText);
    // 抛出错误给前端
    throw new Error("Analysis failed. Check cookies or network connection.");
  }

  const stdoutText = new TextDecoder().decode(stdout);
  try {
    const data = JSON.parse(stdoutText);
    const maxHeight = Math.max(...data.formats.map((f: any) => f.height || 0));
    // 分析完成
    _sys_logger(`Analysis complete: Max Resolution ${maxHeight}P`, true);

    const formats = data.formats.map((f: any) => ({
      id: f.format_id,
      ext: f.ext,
      height: f.height || 0,
      vcodec: f.vcodec !== "none" ? f.vcodec : null,
      acodec: f.acodec !== "none" ? f.acodec : null,
      filesize: f.filesize || f.filesize_approx || 0,
      // 新增码率显示
      vbr: f.vbr || 0,      // 视频码率
      abr: f.abr || 0,      // 音频码率
      tbr: f.tbr || 0,      // 总码率
      bitrate: f.bitrate || 0 // 通用码率字段
    }));

    return { formats, duration: data.duration, isGuest: (maxHeight > 0 && maxHeight <= 360) };
  } catch (e) {
    // JSON 错误
    throw new Error("JSON Parsing Failed");
  }
}

// --- 3. 队列调度 ---
async function processQueue() {
  // 环境检查日志
  if (typeof _sys_logger !== "function" || !_sys_logger("Checking task environment...", false)) return;

  if (isProcessing || taskQueue.length === 0) return;
  isProcessing = true;
  const task = taskQueue.shift();
  if (task) {
    try {
      await runYtDlp(task);
    } catch (e: any) {
      // 任务失败日志
      console.error("⚠️ Task terminated or failed:", e.message);
    }
  }
  isProcessing = false;
  processQueue();
}

// -------------------- 4. 下载逻辑 -----------------------
async function runYtDlp(task: DownloadTask) {
  // 任务开始前重置状态
  isGlobalAbort = false;
  progressCache = "0";
  
  _sys_logger(`Starting download task...`, true);

  let timeSuffix = "";
  if (task.cutStart && task.cutEnd) {
    const startStr = task.cutStart.replace(/:/g, ".");
    const endStr = task.cutEnd.replace(/:/g, ".");
    timeSuffix = `_[${startStr}-${endStr}]`;
  }

  // 只生成文件名，路径交给 -P 参数管理
  const outputTemplate = `%(title)s${timeSuffix} [%(height)sP].%(ext)s`;

  const saveDir = task.customPath?.trim() || path.join(Deno.cwd(), "download");
  await ensureDir(saveDir);

  const args = [
    "--ffmpeg-location", CONFIG.ffmpegPath,
    "-o", outputTemplate,
    "-P", saveDir,
    "--cookies-from-browser", CONFIG.cookiesBrowser,
    "--replace-in-metadata", "title", '[<>:"/\\\\|?*]', "_",
    "--windows-filenames",
    "--restrict-filenames",
    "--extractor-args", "youtube:player_client=default,-web_safari,-android_sdkless",
    "--merge-output-format", "mp4",
    "--no-update",
    "--no-mtime",
  ];

  if (task.formatId && task.formatId.includes("+")) {
    args.push("-f", task.formatId);
  } else {
    args.push("-f", "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4] / bv*+ba/b");
  }

  if (task.cutStart && task.cutEnd) {
    args.push("--download-sections", `*${task.cutStart}-${task.cutEnd}`);
    if (task.preciseCut) args.push("--force-keyframes-at-cuts");
  }

  const isShorts = task.url.includes("/shorts/");
  if (task.subLang !== "none") {
    if (isShorts) {
        
        _sys_logger("Shorts detected: Auto-skipping subtitles.", true);
    } else {
        args.push("--write-subs", "--write-auto-subs", "--sub-langs", task.subLang, "--convert-subs", "srt");
        
        _sys_logger(`Requesting subtitles: ${task.subLang}`, true);
    }
  }
  
  if (task.customArgs && task.customArgs.trim()) args.push(...task.customArgs.split(" "));
  args.push(task.url);

  const command = new Deno.Command(CONFIG.ytDlpPath, {
    args,
    stdout: "piped",
    stderr: "piped",
    env: { "PYTHONIOENCODING": "utf-8", "LANG": "en_US.UTF-8" },
  });

  const process = command.spawn();
  activeProcess = process; // 绑定全局变量

  let capturedVideo = "";
  let capturedSubs = new Set<string>();

  // ✅ [新增] 1. 定义高亮函数
  const smartHighlight = (text: string): string => {
    const YELLOW = "\x1b[33m";
    const CYAN = "\x1b[36m";
    const RESET = "\x1b[0m";
    
    let result = text;
    // 高亮提示语
    if (result.includes("has already been downloaded")) {
      result = result.replace(
        "has already been downloaded", 
        `${YELLOW}has already been downloaded${RESET}`
      );
    }
    // 高亮文件名 (可选)
    result = result.replace(/(\S+\.mp4)/g, `${CYAN}$1${RESET}`);
    return result;
  };

  // ✅ [修改] 2. 修改 reader 函数
  const reader = async (stream: ReadableStream<Uint8Array>) => {
    const decoder = new TextDecoder("utf-8");
    for await (const chunk of stream) {
      const text = decoder.decode(chunk, { stream: true });
      if (text) {
        // 不要直接打印 text，打印高亮后的版本
        const highlightedText = smartHighlight(text); 
        try { await Deno.stdout.write(new TextEncoder().encode(highlightedText)); } catch (e) {}
        
        // ⚠️ 注意：下面的正则匹配必须继续使用原始的 'text' 变量
        // 因为高亮后的文本包含 \x1b[33m 等乱码，会破坏正则抓取
        const pMatch = text.match(/(\d+\.?\d*)%/);
        if (pMatch) progressCache = pMatch[1];
      }
      
      const subMatch = text.match(/subtitles to: (.+)/);
      if (subMatch) capturedSubs.add(subMatch[1].trim().replace(/\.(vtt|ass|ttml|srv\d)$/i, ".srt"));
      const mergeMatch = text.match(/\[Merger\] Merging formats into "(.+?)"/);
      if (mergeMatch) capturedVideo = mergeMatch[1].trim();
    }
  };

  // ============================================
  // 🛑 修复部分开始：下载进程监控
  // ============================================
  try {
      const [_, __, status] = await Promise.all([
          reader(process.stdout), 
          reader(process.stderr), 
          process.status
      ]);
  } catch (e) {
      // 忽略因 taskkill 导致的流错误
  }
  
  activeProcess = null; // 解绑

  // 🛑 检查点 1：下载刚结束，立刻检查熔断
  if (isGlobalAbort) {
      console.log("🛑 [CheckPoint 1] Abort detected after download.");
      throw new Error("USER_ABORTED_HARD");
  }
  // ============================================

  // 1. 策略 A：热感应搜索
  if (!capturedVideo) {
      
      _sys_logger("🔍 [Strategy A] Searching for latest video by timestamp...", true);
      let newestFile = "";
      let newestTime = 0;
      for await (const entry of Deno.readDir(saveDir)) {
          if (!entry.isFile) continue;
          if (/\.(mp4|mkv|webm)$/i.test(entry.name) && !entry.name.endsWith(".tmp.mp4")) {
              try {
                  const fullPath = path.join(saveDir, entry.name);
                  const stat = await Deno.stat(fullPath);
                  const mtime = stat.mtime?.getTime() || 0;
                  if (Date.now() - mtime < 180000) { 
                      if (mtime > newestTime) {
                          newestTime = mtime;
                          newestFile = fullPath;
                      }
                  }
              } catch {}
          }
      }
      if (newestFile) {
          capturedVideo = newestFile;
          
          _sys_logger(`✅ [Heatmap Lock] Found latest video: ${path.basename(capturedVideo)}`, true);
      }
  }

  // 2. 策略 B：冷数据精确匹配
  if (!capturedVideo && capturedSubs.size > 0) {
      
      _sys_logger("⚠️ Heatmap miss. Switching to [Strategy B] Subtitle reverse lookup...", true);
      const subFiles = Array.from(capturedSubs);
      const subName = path.basename(subFiles[0]); 
      let base = subName.replace(/\.(srt|vtt|ass)$/i, ""); 
      let candidate1 = base.replace(/\.[a-z0-9-]+$/i, "") + ".mp4";
      let candidate2 = base + ".mp4";

      try {
          const p1 = path.join(saveDir, candidate1);
          await Deno.stat(p1);
          capturedVideo = p1;
          
          _sys_logger(`✅ [Exact Match] Found existing video: ${candidate1}`, true);
      } catch {
          try {
              const p2 = path.join(saveDir, candidate2);
              await Deno.stat(p2);
              capturedVideo = p2;
              
              _sys_logger(`✅ [Exact Match] Found existing video (Alt): ${candidate2}`, true);
          } catch {
             
             _sys_logger(`❌ Final search failed. Unable to locate video file.`, true);
          }
      }
  }

  // 🛑 检查点 2：在准备处理字幕前
  if (isGlobalAbort) throw new Error("USER_ABORTED_HARD");

  // --- 6. 后处理 (修复字幕 + 强制同步 + 准备封装) ---
  const readyToEmbed: string[] = [];

  if (capturedSubs.size > 0) {
    _sys_logger("🔧 Executing subtitle timeline repair (Overlap/Merge)...", true);
    
    for (const logPath of Array.from(capturedSubs)) {
      // 🛑 检查点 3：在循环修复字幕时
      if (isGlobalAbort) throw new Error("USER_ABORTED_HARD");

      let finalPath = logPath;
      
      try { await Deno.stat(finalPath); } catch {
          const realFile = await findNewestFile(path.dirname(logPath), ".srt");
          if (realFile) finalPath = realFile; else continue;
      }

      if (task.cutStart && task.cutEnd) {
        const tempSub = finalPath + ".tmp.srt";
        const cutCmd = new Deno.Command(CONFIG.ffmpegPath, {
          args: ["-y", "-ss", task.cutStart, "-to", task.cutEnd, "-i", finalPath, tempSub],
        });
        if ((await cutCmd.output()).success) {
          await Deno.remove(finalPath);
          await Deno.rename(tempSub, finalPath);
        }
      }

      await fixSrtOverlap(finalPath);
      
      if (!finalPath.includes("orig") && !finalPath.includes("tmp")) {
          readyToEmbed.push(finalPath);
      }
    }

    // 🛑 检查点 4：字幕修复完毕，准备写入等待
    if (isGlobalAbort) throw new Error("USER_ABORTED_HARD");

    if (readyToEmbed.length > 0) {
        
        _sys_logger("⏳ Waiting for file system write (Preventing stale data)...", true);
        await new Promise((r) => setTimeout(r, 2000));
    }

    // 🛑 检查点 5：等待结束，准备封装
    if (isGlobalAbort) throw new Error("USER_ABORTED_HARD");

    // 开始封装
    if (task.embedSubs && capturedVideo) {
        const finalSubs = [];

        // ✅ 先找英文，放入数组第 1 位 (默认轨道)
        const en = readyToEmbed.find(s => s.includes(".en.") || s.endsWith(".en.srt"));
        if (en) finalSubs.push(en);

        // ✅ 后找中文，放入数组第 2 位
        const zh = readyToEmbed.find(s => s.includes("zh-Hans") || s.includes("zh-Hant"));
        if (zh) finalSubs.push(zh);

        if (finalSubs.length > 0) {
            // 这里调用新的 embedSubsWithFFmpeg (它内部自动绑定 activeProcess)
            await embedSubsWithFFmpeg(capturedVideo, finalSubs);
        } else {
            _sys_logger("⚠️ No matching subtitles found (ZH/EN), skipping embed.", true);
        }
    }
  }

  // 🛑 检查点 6：准备清理文件前
  if (isGlobalAbort) throw new Error("USER_ABORTED_HARD");

  // 7. 清理
  await new Promise((r) => setTimeout(r, 3000));
  try {
    const keepSet = new Set<string>();
    if (capturedVideo) keepSet.add(path.basename(capturedVideo));

    if (!task.embedSubs) {
        capturedSubs.forEach(p => {
            if (!p.toLowerCase().includes("orig")) {
                keepSet.add(path.basename(p));
            }
        });
    }

    if (task.embedSubs) {
         _sys_logger("🧹 Cleaning up embedded subtitle cache...", true);
         for (const sub of Array.from(capturedSubs)) {
             try { await Deno.remove(sub); } catch {}
         }
    }

    for await (const entry of Deno.readDir(saveDir)) {
      if (keepSet.has(entry.name)) continue;
      
      const isJunk = 
          /\.tmp\./.test(entry.name) || 
          /\.vtt$/.test(entry.name) || 
          /[-.]orig\.(srt|vtt)$/i.test(entry.name) || 
          /\.orig\./i.test(entry.name);

      if (entry.isFile && isJunk) {
          try { await Deno.remove(path.join(saveDir, entry.name)); } catch {}
      }
    }
  } catch (e) {}
  
  _sys_logger(`Task processing complete.`, true);
}
// -------------------- 4. 下载逻辑的代码 到 这里结束-----------------------

// --- 5. 工具函数 ---
async function findNewestFile(dir: string, suffix: string): Promise<string | null> {
    let newestFile = null; let newestTime = 0;
    try {
        for await (const entry of Deno.readDir(dir)) {
            if (entry.isFile && entry.name.endsWith(suffix)) {
                const info = await Deno.stat(path.join(dir, entry.name));
                const mtime = info.mtime?.getTime() || 0;
                if (mtime > newestTime && (Date.now() - mtime < 180000)) {
                    newestTime = mtime; newestFile = path.join(dir, entry.name);
                }
            }
        }
    } catch (e) {}
    return newestFile;
}

async function fixSrtOverlap(filePath: string) {
  const bakPath = filePath + ".bak";
  try {
    const content = await Deno.readTextFile(filePath);
    if (!content.trim()) return;
    try { await Deno.writeTextFile(bakPath, content); } catch {}
    const regex = /(\d+)\s*\r?\n(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{3})\r?\n([\s\S]*?)(?=\r?\n\s*\r?\n\d+|\r?\n\s*$|$)/g;
    let raw = []; let m;
    while ((m = regex.exec(content)) !== null) {
      raw.push({ start: timeToMs(m[2]), end: timeToMs(m[3]), text: m[4].trim().split(/\r?\n/) });
    }
    if (raw.length === 0) return;
    let processed = [];
    for (let i = 0; i < raw.length; i++) {
      let curr = raw[i];
      let lines = (i > 0) ? curr.text.filter((l) => !raw[i - 1].text.some((p) => p.replace(/\s+/g, "") === l.replace(/\s+/g, ""))) : curr.text;
      lines = lines.filter((l) => l.trim() !== "" && l.trim() !== ">>");
      if (lines.length > 0) {
        if ((curr.end - curr.start) > 4000) curr.end = curr.start + Math.min(4000, 2000 + lines.join("").length * 150);
        processed.push({ start: curr.start, end: curr.end, text: lines });
      }
    }
    if (processed.length > 0 && typeof optimizeSubtitles === 'function') processed = optimizeSubtitles(processed);
    let output = processed.map((s, i) => `${i + 1}\n${msToTime(s.start)} --> ${msToTime(s.end)}\n${s.text.join("\n")}\n\n`).join("");
    await Deno.writeTextFile(filePath, output);
    try { await Deno.remove(bakPath); } catch {}
  } catch (e) {}
}



async function embedSubsWithFFmpeg(video: string, subs: string[]) {
  // 👇 检查点
  if (isGlobalAbort) throw new Error("USER_ABORTED_HARD");

  _sys_logger(`🛠️ [FFmpeg] Embedding [${subs.length}] selected subtitles...`, true);

  const temp = video + ".tmp.mp4";
  
  // 🟢 添加 -hide_banner 和 -loglevel error
  // -hide_banner: 隐藏版权和编译信息
  // -loglevel error: 只显示严重错误，不显示 Input/Output 详情
  const args = [
    "-hide_banner", 
    "-loglevel", "error", 
    "-y", 
    "-i", video
  ];

  subs.forEach(s => args.push("-i", s));
  
  args.push("-c:v", "copy", "-c:a", "copy", "-c:s", "mov_text");
  args.push("-map", "0:v");
  args.push("-map", "0:a");

  subs.forEach((subFile, index) => {
      const inputIndex = index + 1;
      args.push("-map", `${inputIndex}`);
      let lang = "und"; 
      if (subFile.includes("zh-Hans") || subFile.includes("zh-Hant")) lang = "chi"; 
      else if (subFile.includes(".en.") || subFile.endsWith(".en.srt")) lang = "eng";
      args.push(`-metadata:s:s:${index}`, `language=${lang}`);
  });

  args.push(temp);

  // 🟢 显式指定 stdout 和 stderr 为 "piped"
  // 如果不写这个，Deno 默认会使用 "inherit"，直接把所有黑框内容 打印到终端
  const command = new Deno.Command(CONFIG.ffmpegPath, { 
      args,
      stdout: "piped",  // <--- 拦截输出
      stderr: "piped"   // <--- 拦截错误日志
  });
  
  const process = command.spawn();
  activeProcess = process; 

  try {
      const output = await process.output();
      activeProcess = null; // 解绑

      if (isGlobalAbort) throw new Error("USER_ABORTED_HARD");

      if (output.success) { 
          try {
              await Deno.remove(video); 
              await Deno.rename(temp, video);
              _sys_logger(`✅ Subtitle embedding complete!`, true);
          } catch (e) {
              _sys_logger(`❌ File replacement failed: ${e.message}`, true);
          }
      } else {
          if (isGlobalAbort) throw new Error("USER_ABORTED_HARD");
          
          // 只有出错时，才把拦截到的错误信息 解码打印出来
          const errText = new TextDecoder().decode(output.stderr);
          _sys_logger(`❌ FFmpeg embedding failed: ${errText}`, true);
      }
  } catch (e: any) {
      activeProcess = null;
      if (isGlobalAbort || e.message === "USER_ABORTED_HARD") {
          throw new Error("USER_ABORTED_HARD");
      }
      throw e;
  }
}



function timeToMs(t: string) { const p = t.replace(",", ".").split(":"); return (parseInt(p[0]) * 3600 + parseInt(p[1]) * 60 + parseFloat(p[2])) * 1000; }
function msToTime(ms: number) { return new Date(ms).toISOString().slice(11, 23).replace(".", ","); }
// 1. 定义高亮颜色的辅助函数
function colorizeLog(text: string): string {
  // ANSI 颜色代码
  const COLORS = {
    yellow: "\x1b[33m", // 黄色 (适合提示)
    green: "\x1b[32m",  // 绿色 (适合成功)
    cyan:  "\x1b[36m",  // 青色 (适合文件名)
    reset: "\x1b[0m"    // 重置 (必须加，否则后面全变色)
  };

  // 目标关键词
  const targetPhrase = "has already been downloaded";

  // 如果包含这就话，进行替换
  if (text.includes(targetPhrase)) {
    return text.replace(
      targetPhrase, 
      `${COLORS.yellow}${targetPhrase}${COLORS.reset}` // 用黄色包裹
    );
  }

  return text;
}


// --- 6. 语义重组核心算法 (行业标准版-遵循 Netflix/广电 CJK 规范) ---
// --- 7. 语义重组核心算法 (V7.0: 孤儿行拯救版 - 彻底消灭短行) ---
function optimizeSubtitles(items: any[]) {
    // 基础正则
    const isCJK = (text: string) => /[\u4e00-\u9fa5]/.test(text);
    const isPunctuationStart = (char: string) => /^[\u3002\uff0c\uff1f\uff01\uff1b\uff1a\u3001.,?!;:]/.test(char);
    const isPunctuationEnd = (char: string) => /^[\u201c\u2018\uff08\u300a\(\[\{]/.test(char);

    // --- 核心：智能切分点计算 ---
    const findSmartSplitPoint = (text: string, isChinese: boolean): number => {
        const len = text.length;
        const idealCenter = len / 2;
        const zoneStart = len * 0.3;
        const zoneEnd = len * 0.7;
        let bestIndex = -1;
        let maxScore = -Infinity;
        const enConjunctions = new Set(['because', 'although', 'however', 'but', 'and', 'so', 'which', 'that', 'where', 'when', 'if']);
        const cnConjunctions = new Set(['因为', '所以', '虽然', '但是', '然而', '如果', '并且', '而且']);

        for (let i = 0; i < len; i++) {
            const char = text[i];
            if (!isChinese) {
                if (char !== ' ' || i < 5 || i > len - 5) continue;
            } else {
                if (i < 4 || i > len - 4) continue;
            }

            let score = 0;
            const distFromCenter = Math.abs(i - idealCenter);
            score -= distFromCenter * (isChinese ? 4.0 : 2.5);

            const prevChar = text[i - 1];
            if (/[\u3002\uff0c\uff1f\uff01\uff1b\u3001]/.test(prevChar)) score += 500;
            else if (/[.?!,;:-]/.test(prevChar)) score += 400;

            const nextChar = text[i + (isChinese ? 0 : 1)];
            if (isChinese) {
                if (isPunctuationStart(char)) score -= 9999;
                if (isPunctuationEnd(prevChar)) score -= 9999;
            }

            if (isChinese) {
                const nextTwo = text.substr(i, 2);
                if (cnConjunctions.has(nextTwo)) score += 150;
            } else {
                const nextWord = text.substring(i + 1).split(' ')[0].toLowerCase().replace(/[.,?!]/g, "");
                if (enConjunctions.has(nextWord)) score += 150;
            }

            if (isChinese) {
                if (['的', '之', '得'].includes(prevChar) && !isPunctuationStart(char)) score -= 200;
            }

            if (score > maxScore) {
                maxScore = score;
                bestIndex = i;
            }
        }
        return bestIndex;
    };

    const calculateTimeShift = (item: any, movedText: string, remainingText: string) => {
        const totalLen = movedText.length + remainingText.length;
        if (totalLen === 0) return 0;
        const duration = item.end - item.start;
        let shift = Math.floor(duration * (movedText.length / totalLen));
        if (remainingText.length > 0 && duration - shift < 500) shift = Math.max(0, duration - 500);
        return shift;
    };

    // ==========================================
    // 🔪 阶段1: 智能切分
    // ==========================================
    let processedItems = [];
    for (const item of items) {
        let text = item.text.join(" ").trim();
        const isChinese = isCJK(text);
        const splitThreshold = isChinese ? 19 : 40; 

        if (text.length > splitThreshold) {
            const splitIndex = findSmartSplitPoint(text, isChinese);
            if (splitIndex !== -1) {
                const part1End = isChinese ? splitIndex : splitIndex; 
                const part2Start = isChinese ? splitIndex : splitIndex + 1;
                const part1Text = text.substring(0, part1End).trim();
                const part2Text = text.substring(part2Start).trim();
                const minLen = isChinese ? 4 : (text.length * 0.15); 
                
                if (part1Text.length >= minLen && part2Text.length >= minLen) {
                    const duration = item.end - item.start;
                    const splitTime = item.start + Math.floor(duration * (part1Text.length / text.length));
                    processedItems.push({ start: item.start, end: splitTime, text: [part1Text] });
                    processedItems.push({ start: splitTime, end: item.end, text: [part2Text] });
                    continue;
                }
            }
        }
        processedItems.push(item);
    }
    items = processedItems;

    // ==========================================
    // 🧲 阶段2: 强力胶 (Glue)
    // ==========================================
    const chineseGlue = new Set(['的', '了', '是', '在', '和', '与', '而', '但', '我', '你', '他', '她', '它', '们', '很', '更', '最', '只', '才', '就', '虽', '如', '若', '把', '被', '让']);
    const englishWeakEndings = new Set(['the', 'a', 'an', 'my', 'your', 'his', 'her', 'this', 'that', 'in', 'on', 'at', 'to', 'for', 'from', 'with', 'by', 'of', 'and', 'or', 'but', 'so', 'if', 'when', 'because', 'is', 'are', 'was', 'were', 'be', 'have', 'has', 'had', 'i', 'you', 'he', 'she', 'it', 'we', 'they', "it's", "i'm", "don't"]);
    const techBigrams = new Set(['power supply', 'hard drive', 'hard disk', 'solid state', 'video card', 'graphics card', 'mother board', 'network attached', 'storage server', 'fan header', 'cpu cooler', 'other one']);

    for (let i = 0; i < items.length - 1; i++) {
        let curr = items[i];
        let next = items[i + 1];
        let currText = curr.text.join(" ").trim();
        let nextText = next.text.join(" ").trim();
        let movedPart = "";
        let actionTaken = false;
        
        if (/\d+$/.test(currText) && !/^[\u3002\uff0c\uff1f\uff01\uff1b\uff1a.,?!;:]/.test(nextText)) {
            const match = currText.match(/(\d+)$/);
            if (match && currText.length > match[0].length + 2) { 
                movedPart = match[0];
                currText = currText.substring(0, currText.length - movedPart.length).trim();
                nextText = movedPart + " " + nextText;
                actionTaken = true;
            }
        }
        else if (isCJK(currText)) {
            const lastChar = currText.slice(-1);
            if (chineseGlue.has(lastChar) && currText.length > 4) {
                movedPart = lastChar;
                currText = currText.slice(0, -1).trim();
                nextText = movedPart + nextText;
                actionTaken = true;
            }
        }
        else if (!isCJK(currText)) {
            const words = currText.split(/\s+/);
            if (words.length > 1) {
                const lastWord = words[words.length - 1];
                const cleanLastWord = lastWord.toLowerCase().replace(/[.,?!]/g, "");
                const isContraction = /['’](s|re|m|ll|d|ve|t)$/i.test(lastWord);
                const nextFirstWord = nextText.split(/\s+/)[0].toLowerCase().replace(/[.,?!]/g, "");
                const isSplitPhrase = techBigrams.has(cleanLastWord + " " + nextFirstWord);
                const isWeakWord = englishWeakEndings.has(cleanLastWord);
                if ((isContraction || isSplitPhrase || isWeakWord) && !/[.,?!]$/.test(lastWord)) {
                    movedPart = words.pop() || "";
                    currText = words.join(" ");
                    nextText = movedPart + " " + nextText;
                    actionTaken = true;
                }
            }
        }

        if (actionTaken && movedPart.length > 0) {
            let shiftMs = calculateTimeShift(curr, movedPart, currText);
            if (shiftMs > 0 && (curr.end - curr.start - shiftMs) > 500) {
                curr.end -= shiftMs;
                next.start -= shiftMs;
                if (next.start < curr.end) next.start = curr.end; 
                curr.text = [currText];
                next.text = [nextText];
                items[i] = curr;
                items[i + 1] = next;
            }
        }
    }

    // ==========================================
    // 🧲 阶段3: 标点吸附
    // ==========================================
    for (let i = 1; i < items.length; i++) {
        let curr = items[i];
        let currText = curr.text.join(" ").trim();
        const punctMatch = currText.match(/^([，。？！,?!;:]+)/);
        if (punctMatch) {
            let prev = items[i-1];
            const punct = punctMatch[0];
            prev.text = [prev.text.join(" ").trim() + punct];
            currText = currText.substring(punct.length).trim();
            curr.text = [currText];
            if (currText.length === 0) {
                prev.end = curr.end;
                items.splice(i, 1);
                i--; 
            } else {
                items[i] = curr;
                items[i-1] = prev;
            }
        }
    }

    // ==========================================
    // 🚑 阶段3.5: 孤儿行拯救 (Orphan Rescue) - 新增！！
    // ==========================================
    // 专门处理“两三个字一行”的情况，强制向下合并
    // 必须从后往前遍历，或者小心索引处理，这里用 while 循环安全
    let i = 0;
    while (i < items.length - 1) {
        let curr = items[i];
        let next = items[i+1];
        let currText = curr.text.join(" ").trim();
        let nextText = next.text.join(" ").trim();

        // 定义什么是“孤儿”：
        // 1. 中文长度 < 5 (如 "我", "然后", "最好")
        // 2. 英文长度 < 15 (如 "But,", "And then")
        const isChinese = isCJK(currText);
        const isOrphan = isChinese ? (currText.length < 5) : (currText.length < 15);
        
        // 只有当两个字幕间隔非常短 (<1秒) 时才合并，防止跨场景合并
        const timeGap = next.start - curr.end;

        if (isOrphan && timeGap < 1000) {
            // 执行向下合并 (Merge Down)
            // 1. 把当前文本加到下一行开头
            const glue = isChinese ? "" : " ";
            next.text = [currText + glue + nextText];
            
            // 2. 下一行的开始时间，延伸到当前行的开始时间
            next.start = curr.start;
            
            // 3. 删除当前行
            items[i+1] = next; // 更新下一行
            items.splice(i, 1); // 删除当前行
            // 索引不增加，继续检查新的当前行，以防连续孤儿
        } else {
            i++;
        }
    }

    // ==========================================
    // 🤝 阶段4: 向上合并 (Merge Up)
    // ==========================================
    const mergedItems = [];
    if (items.length > 0) mergedItems.push(items[0]);

    for (let i = 1; i < items.length; i++) {
        let prev = mergedItems[mergedItems.length - 1];
        let curr = items[i];
        
        const prevText = prev.text.join(" ").trim();
        const currText = curr.text.join(" ").trim();
        const hasChinese = isCJK(currText) || isCJK(prevText);
        const MAX_LEN = hasChinese ? 35 : 85; 
        
        const isShort = currText.length < (hasChinese ? 12 : 25);
        const prevEndsWithStop = /[.?!。？！]$/.test(prevText);
        const combinedLength = prevText.length + currText.length;
        const timeGap = curr.start - prev.end;

        if (isShort && !prevEndsWithStop && combinedLength < MAX_LEN && timeGap < 600) {
            prev.text = [prevText + (hasChinese ? "" : " ") + currText];
            prev.end = curr.end;
        } else {
            mergedItems.push(curr);
        }
    }

    return mergedItems;
}