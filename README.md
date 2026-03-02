# YT-Smart-Assistant
**Current Version:** V1.0.3 
(This is a massive milestone update)

https://github.com/user-attachments/assets/3e530969-429c-429b-94b0-dd165222e63d

## 📖 Introduction (简介)
**YT-Smart-Assistant** is a full-stack media management tool designed to bridge the gap between browser interactions and regular users. A high-performance, privacy-focused downloading suite powered by Deno, yt-dlp, and FFmpeg.
一个基于 Deno 全栈架构的流媒体智能归档与处理助手。

Unlike simple downloaders, it acts as an intelligent **"Media Archiver"**. It runs a local Deno server to handle complex tasks that browsers cannot perform: analyzing 4K streams, fixing subtitle timestamps, batch cleaning junk files, and strictly muxing tracks into clean MP4 containers.

**YT-Smart-Assistant (YT智能助手)** 是一个为了突破浏览器限制而生的全栈工具。它不仅仅是一个下载器，更是一个部署在本地的**“媒体归档管家”**。通过油猴脚本与本地 Deno 后端的配合，它能实现 4K 视频流分析、字幕时间轴自动修复、垃圾文件自动清理以及无损封装等复杂功能。

<p align="center">
  <img src="ytassistant/audio codec with flags.jpg" alt="YT-Assistant Interface" width="800">
</p>

<p align="center">
  <img src="ytassistant/multi-subtitles with flags.jpg" alt="YT-Assistant Interface" width="800">
</p>

<p align="center">
  <img src="ytassistant/settings.jpg" alt="YT-Assistant Interface" width="800">
</p>

<p align="center">
  <img src="ytassistant/backend display.jpg" alt="YT-Assistant Interface" width="800">
</p>

------------------

🛡️ Security & Privacy (Zero Trust Architecture)
This project is built with a "Paranoid-First" approach. We believe software should be powerful without being intrusive.

100% Localhost Execution: The entire stack (Frontend script + Backend server) runs strictly on 127.0.0.1. Zero data is sent to third-party servers. Your cookies and credentials never leave your machine.

XSS Immune (No innerHTML): To ensure maximum security, the UI code strictly forbids the use of innerHTML. All DOM manipulations use secure text-node methods, eliminating risks from malicious metadata injection.

No Auto-Updates (Anti-Supply-Chain): There are intentionally no background update checks or "phoning home" scripts. You are in total control. To upgrade, simply download the latest release manually.

Bring Your Own Binaries: You manage your core dependencies. To update yt-dlp or FFmpeg, just replace the files in your local folder with the official versions.

The Bottom Line: If there is a "security" alert, it is a vulnerability within your browser or local OS environment, not this tool. The code is open-source—audit it yourself.

✨ Key Features
🎥 Core Downloading
🔍 Smart Analysis & Filtering: Automatically strips away low-resolution "noise" (144p/240p). The highest quality options (4K/8K + AV1/VP9) are intelligently prioritized at the top.

✂️ Precise Clip Slicing: Supports frame-perfect time-range downloads.

🎯 Subtitle Slicing (Unique): Unlike other tools, this automatically slices and repairs subtitle tracks to match your specific video clip duration. No more out-of-sync full-length captions for a 5-minute clip.

🧠 Intelligent Subtitle Pipeline NEW
Auto-Fix & De-Duplicate: Built-in algorithms fix timestamp overlaps and merge fragmented lines for a smooth reading experience.

Hot-Search Logic: Uses a modification-time heuristic to accurately locate downloaded files, bypassing errors caused by OS filename character mangling (e.g., ? becoming _).

Clean Muxing: Automatically filters out junk tracks (und, orig), keeping only high-quality English and Chinese tracks with correct metadata tags.

Zero-Trace Cleanup: Instantly deletes .srt, .orig, and .tmp files after muxing is complete. Your folder stays clean.

🎨 Advanced UX & Customization
🖥️ Adaptive UI Scaling: A dynamic scaling slider allows you to resize the interface for anything from a 13" laptop to a massive 4K monitor.

⚡ Native Command Injection: A dedicated input for raw yt-dlp arguments (e.g., --proxy, --limit-rate). These are injected with the highest priority, allowing power users to override default behaviors instantly.

🛠️ Tech Stack
Backend: [Deno] (TypeScript) - Secure, modern, and lightweight runtime.

Frontend: Tampermonkey / GreaseMonkey (JavaScript).

Core Engines: yt-dlp & FFmpeg.

=======================================================
🚀 Installation

Step 1:
Go to the Releases page.
Download the lastest YT-Assistant-Full.zip.
Unzip to any folder.

Step 2: Install Tampermonkey:
Go to your browser's extension store (Firefox, Chrome or Edge), search for the Tampermonkey extension, and install it.

=======================================================
Maintain the following file structure:
Plaintext
Root/
├── YT-Smart-Assistant.bat
├── script.user.js
├── server.bundle.js
├── deno.exe
├── ffmpeg.exe
├── ffprobe.exe
└── yt-dlp.exe

🎮 Usage
Step 1: Launch Backend

Double-click YT-Smart-Assistant.bat.

Firewall Note: If Windows asks, click "Allow Access" for Deno.
Keep the terminal window open: 🚀 Service started at: http://localhost:6969.

Step 2: Install Frontend
Open Tampermonkey Dashboard.
Drag and drop script.user.js into the dashboard and click Install.

Ensure "Allow access to file URLs" is enabled in your browser's extension settings if you are loading the script locally.

Step 3: Download
Open any YouTube video. The floating panel will appear. Adjust your settings and click "🚀 Download Now".

⚙️ Configuration & Troubleshooting
🍪 The Cookie Issue (Unlocking 4K/8K)
By default, the engine attempts to use Firefox cookies to bypass YouTube's age/login restrictions.

If you see a "Failed to fetch" or "Cookie error": Open the Advanced Settings (⚙️) in the UI panel.

Change Browser: Select your actual browser (Chrome/Edge/Firefox).

Custom Path: If you use a Portable Browser, you can specify the profile path (find it via about:support in Firefox) directly in the UI.

🌐 Proxy & VPN (Clash / V2Ray)
If you are in a restricted region:

Enable System Proxy: Ensure "System Proxy" is ON in your VPN client.

TUN Mode: If downloads fail, enable TUN Mode in Clash/V2Ray for a more stable connection.

Command Injection: You can also manually input --proxy "http://127.0.0.1:YOUR_PORT" in the UI's command box.

⚠️ Disclaimer
This project is for educational and technical research purposes only. Please respect copyright laws and the platform's Terms of Service. The author assumes no responsibility for any misuse of this tool.

本项目仅用于技术研究与教育目的（展示 Deno 运行时、FFmpeg 流映射与本地全栈交互技术）。请遵守相关法律法规及平台服务条款，切勿用于侵犯版权的行为。




