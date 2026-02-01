// server.ts (V1.0 - International Edition)
// Run: deno run --allow-net --allow-run --allow-read --allow-write --allow-env server.ts

import { ensureDir } from "https://deno.land/std@0.220.0/fs/mod.ts";
import * as path from "https://deno.land/std@0.220.0/path/mod.ts";

const PORT = 6969;
const CONFIG = { cookiesBrowser: "firefox", minDelay: 2, maxDelay: 8 };

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

console.log(`🚀 Service started at: http://localhost:${PORT}`);
console.log(`✨ Mode: Smart Analysis | Time-Range Cut | Auto-Muxing`);

Deno.serve({ port: PORT }, async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
  }

  if (req.method === "POST") {
    const urlObj = new URL(req.url);
    
    // API: Pick Folder
    if (urlObj.pathname === "/pick-path") {
        const selectedPath = await pickSystemFolder();
        return new Response(JSON.stringify({ path: selectedPath }), { headers: { "Access-Control-Allow-Origin": "*" } });
    }
    
    // API: Analyze
    if (urlObj.pathname === "/analyze") {
        try {
            const body = await req.json();
            console.log(`🔍 Analyzing: ${body.url}`);
            const meta = await analyzeVideo(body.url);
            return new Response(JSON.stringify(meta), { headers: { "Access-Control-Allow-Origin": "*" } });
        } catch (e) {
            console.error("Analysis failed:", e);
            return new Response(JSON.stringify({ error: "Analysis failed" }), { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
        }
    }

    // API: Queue Task
    try {
      const body = await req.json();
      if (!body.url) return new Response("No URL", { status: 400 });
      taskQueue.push(body);
      console.log(`➕ Queued: ${body.url}`);
      processQueue();
      return new Response(JSON.stringify({ status: "queued", queueLength: taskQueue.length }), { headers: { "Access-Control-Allow-Origin": "*" } });
    } catch (e) {
      return new Response("Error", { status: 500 });
    }
  }
  return new Response("Server Running", { status: 200 });
});

async function analyzeVideo(url: string) {
    const args = ["--dump-json", "--no-playlist", "--cookies-from-browser", CONFIG.cookiesBrowser, "--extractor-args", "youtube:player-client=default", url];
    const command = new Deno.Command("./yt-dlp.exe", { args, stdout: "piped", stderr: "inherit" });
    const output = await command.output();
    if (!output.success) throw new Error("yt-dlp execution failed");
    const data = JSON.parse(new TextDecoder().decode(output.stdout));
    
    const formats = data.formats.map((f: any) => ({
        id: f.format_id,
        ext: f.ext,
        height: f.height,
        vcodec: f.vcodec !== 'none' ? f.vcodec : null,
        acodec: f.acodec !== 'none' ? f.acodec : null,
        filesize: f.filesize || f.filesize_approx || 0
    }));
    return { formats, duration: data.duration };
}

async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;
  while (taskQueue.length > 0) {
    const task = taskQueue.shift();
    if (!task) break;
    const delay = Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1) + CONFIG.minDelay);
    console.log(`⏳ Cooldown: ${delay}s...`);
    await new Promise(resolve => setTimeout(resolve, delay * 1000));
    await runYtDlp(task);
  }
  isProcessing = false;
  console.log("💤 Idle...");
}

async function runYtDlp(task: DownloadTask) {
  const args = [];
  const saveDir = task.customPath && task.customPath.trim() !== "" ? task.customPath.trim() : path.join(Deno.cwd(), "download");
  try { await ensureDir(saveDir); } catch (e) {}

  args.push("-P", saveDir);
  args.push("--cookies-from-browser", CONFIG.cookiesBrowser);
  args.push("--extractor-args", "youtube:player-client=default");
  args.push("--progress");
  
  if (task.formatId) args.push("-f", task.formatId);
  else args.push("-f", "bv*+ba/b");

  args.push("--merge-output-format", "mp4");

  const isCutting = task.cutStart && task.cutEnd;
  
  if (isCutting) {
      const section = `*${task.cutStart}-${task.cutEnd}`;
      console.log(`✂️ Cutting: ${section} (Precise: ${task.preciseCut})`);
      args.push("--download-sections", section);
      if (task.preciseCut) args.push("--force-keyframes-at-cuts");
      console.log("⚠️ Subtitle download disabled in cut mode.");
  } else {
      let finalSubLang = task.subLang;
      if (task.subLang !== "none") {
          finalSubLang = finalSubLang.replace(/en\.\*/g, "en");
          args.push("--write-subs", "--write-auto-subs", "--sub-langs", finalSubLang, "--convert-subs", "srt");
      }
  }

  args.push("-o", "%(title)s [%(height)sP][%(vcodec)s].%(ext)s");
  args.push("--ignore-errors");
  if (task.customArgs) args.push(...task.customArgs.trim().split(/\s+/));
  args.push(task.url);

  console.log(`▶️ Downloading: ${task.url}`);
  
  const command = new Deno.Command("./yt-dlp.exe", { args, stdout: "piped", stderr: "piped", env: { "PYTHONUTF8": "1" } });
  const process = command.spawn();
  
  const capturedSubs = new Set<string>();
  let capturedVideo = ""; 

  const safePrint = async (stream: ReadableStream<Uint8Array>) => {
      const reader = stream.getReader();
      const decoder = new TextDecoder("utf-8");
      try {
          while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const text = decoder.decode(value, { stream: true });
              await Deno.stdout.write(new TextEncoder().encode(text));
              
              const subMatch = text.match(/Writing video subtitles to: (.+)/);
              if (subMatch) capturedSubs.add(subMatch[1].trim());

              const mergeMatch = text.match(/\[Merger\] Merging formats into "(.+)"/);
              const directMatch = text.match(/\[download\] Destination: (.+mp4)/);
              if (mergeMatch) capturedVideo = mergeMatch[1].trim();
              else if (directMatch && !text.includes(".f")) capturedVideo = directMatch[1].trim();
          }
      } catch (e) {}
  };

  await Promise.all([safePrint(process.stdout), safePrint(process.stderr), process.status]);

  if (!isCutting && capturedSubs.size > 0) {
      console.log(`⚡️ Fixing subtitles...`);
      for (const subPath of capturedSubs) await fixSrtOverlap(subPath, 0);
      
      if (task.embedSubs && capturedVideo) {
          console.log(`📦 Muxing subtitles into MP4...`);
          await embedSubsWithFFmpeg(capturedVideo, Array.from(capturedSubs));
      }
  } else {
      console.log(`✅ Task Finished`);
  }
}

async function embedSubsWithFFmpeg(videoPath: string, subPaths: string[]) {
    const tempPath = videoPath + ".temp.mp4";
    const args = ["-y", "-i", videoPath];
    subPaths.forEach(sub => args.push("-i", sub));
    args.push("-c", "copy", "-c:s", "mov_text", "-map", "0");
    subPaths.forEach((_, idx) => args.push("-map", `${idx + 1}`));
    args.push(tempPath);
    const cmd = new Deno.Command("ffmpeg", { args, stdout: "null", stderr: "piped" });
    if ((await cmd.output()).success) {
        await Deno.remove(videoPath);
        await Deno.rename(tempPath, videoPath);
        console.log(`✅ Muxing complete`);
    }
}

async function fixSrtOverlap(filePath: string, gapMs: number = 0) {
    try {
        const content = await Deno.readTextFile(filePath);
        const regex = /(\d+)\r?\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\r?\n([\s\S]*?)(?=\r?\n\r?\n\d+|$)/g;
        const subs = [];
        let match;
        while ((match = regex.exec(content)) !== null) {
            subs.push({ index: parseInt(match[1]), startMs: timeToMs(match[2]), endMs: timeToMs(match[3]), text: match[4].trim() });
        }
        if (subs.length === 0) return;
        for (let i = 0; i < subs.length - 1; i++) {
            const current = subs[i]; const next = subs[i+1];
            if (current.text === next.text) { current.endMs = next.endMs; subs.splice(i + 1, 1); i--; continue; }
            if (next.text.startsWith(current.text)) { const cleanText = next.text.replace(current.text, "").trim(); if (cleanText.length > 0) next.text = cleanText; }
        }
        let newContent = "";
        subs.forEach((sub, idx) => { newContent += `${idx + 1}\n${msToTime(sub.startMs)} --> ${msToTime(sub.endMs)}\n${sub.text}\n\n`; });
        await Deno.writeTextFile(filePath, newContent);
    } catch (e) {}
}

async function pickSystemFolder(): Promise<string> {
    const psCommand = `Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.ShowNewFolderButton=$true; if($f.ShowDialog() -eq 'OK'){Write-Host $f.SelectedPath}else{Write-Host ''}`;
    const command = new Deno.Command("powershell", { args: ["-Command", psCommand], stdout: "piped" });
    const output = await command.output();
    return new TextDecoder().decode(output.stdout).trim();
}

function timeToMs(t:string){const[h,m,s,ms]=t.replace(',','.').replace(':','.').split('.').map(Number); return(h*3600+m*60+s)*1000+(ms||0);}
function msToTime(ms:number){const d=new Date(0,0,0,0,0,0,ms);return`${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')},${d.getMilliseconds().toString().padStart(3,'0')}`;}