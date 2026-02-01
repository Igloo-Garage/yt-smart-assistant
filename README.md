# YT-Smart-Assistant 🤖

**[English]** A full-stack media archiving solution bridging browser interactions and local CLI power.  
**[中文]** 一个基于 Deno 全栈架构的流媒体智能归档与处理助手。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Runtime](https://img.shields.io/badge/Runtime-Deno-black)
![Language](https://img.shields.io/badge/Language-TypeScript-blue)
![Frontend](https://img.shields.io/badge/Frontend-Tampermonkey-green)

---

## 📖 Introduction (简介)

**YT-Smart-Assistant** is a full-stack media management tool designed to bridge the gap between browser interactions and local CLI power. Unlike simple downloaders, it acts as an intelligent assistant that analyzes video streams, calculates precise file sizes, and handles complex post-processing tasks like subtitle muxing and time-range cutting.

**YT-Smart-Assistant (YT 智能媒体助手)** 是一个为了突破浏览器限制而生的全栈工具。它不仅仅是一个下载器，更是一个能够智能分析视频流、精准计算文件大小，并自动处理字幕封装、片段截取等复杂任务的“媒体管家”。

## ✨ Key Features (核心功能)

* **🔍 Smart Analysis (智能侦察)**
    * Analyzes available streams (AV1/VP9/H.264) and prioritizes high-efficiency codecs for 2K/4K+ resolutions.
    * *智能识别编码格式，高分辨率下自动优先匹配 AV1/VP9 等高效编码。*

* **✂️ Precise Clip / Smart Cut (精准截取)**
    * Supports time-range downloading. Option to re-encode at cut points for frame-perfect accuracy.
    * *支持毫秒级的时间片段截取，并提供“精准重编码”模式，确保关键帧对齐。*

* **📦 Auto-Muxing (完美封装)**
    * Automatically fixes subtitle timestamps and muxes them into MP4 containers losslessly.
    * *自动修复字幕时间轴错位，并无损封装进 MP4 容器，单文件易于管理。*

* **💾 State Persistence (状态记忆)**
    * Remembers your download paths and preferences locally.
    * *本地记忆下载路径与偏好设置，无需重复配置。*

* **🌐 i18n Support (双语支持)**
    * One-click switch between English and Chinese interfaces.
    * *内置中英双语界面，可根据需求自由切换。*

## 🛠️ Tech Stack (技术栈)

* **Backend**: [Deno](https://deno.com/) (TypeScript) - Secure & Modern Runtime.
* **Frontend**: Tampermonkey / GreaseMonkey Script.
* **Core Engine**: `yt-dlp` & `ffmpeg`.

## 🚀 Installation (安装指南)

### Prerequisites (前置要求)
Since this is a portable solution, you need to manually download the core binaries.
*(由于是绿色免安装版，请手动下载以下核心组件。)*

1.  **Download the following 3 binaries (下载以下 3 个文件):**
    * **yt-dlp.exe**: [Download from GitHub](https://github.com/yt-dlp/yt-dlp/releases/latest)
    * **ffmpeg.exe**: [Download from gyan.dev](https://www.gyan.dev/ffmpeg/builds/) (Download the "essentials" build)
    * **deno.exe**: [Download from Deno.land](https://github.com/denoland/deno/releases/latest) (Download the `deno-x86_64-pc-windows-msvc.zip` and extract)

2.  **Place them correctly (放置文件):**
    * Move `yt-dlp.exe`, `ffmpeg.exe`, and `deno.exe` into the **`server/`** directory.
    * *(请将这三个 .exe 文件全部放入项目的 `server/` 文件夹中。)*

> **File Structure Check (目录结构检查):**
> * `root/Start.bat`
> * `root/server/deno.exe`
> * `root/server/yt-dlp.exe`
> * `root/server/ffmpeg.exe`
> * `root/server/server.ts`

---

### Step 1: Start Backend (启动后端)

Simply double-click the **`Start.bat`** file in the root directory.
*(直接双击根目录下的 `Start.bat` 脚本。)*

* A terminal window will open showing: `🚀 Service started at: http://localhost:6969`
* *(终端窗口会出现，显示服务已启动。请保持此窗口开启。)*


### Step 2: Install Frontend Script (安装前端脚本)

1.  Open the file `client/script.js` with a text editor.
    *(用记事本打开 `client/script.js`。)*
2.  Copy all the code.
    *(复制所有代码。)*
3.  Create a new script in the **Tampermonkey** browser extension and paste the code.
    *(在浏览器油猴插件中新建脚本并粘贴。)*
4.  Save and enable.
    *(保存并启用。)*

### Step 3: Enjoy (开始使用)

Open any YouTube video page, and you will see a "⬇️" floating button in the bottom-right corner.
*(打开任意 YouTube 视频页面，屏幕右下角会出现一个 "⬇️" 悬浮按钮。)*



## ⚙️ Configuration (配置)
To switch the interface language, modify the top variable in the Tampermonkey script:
// 'zh' for Chinese, 'en' for English
const LANGUAGE = 'en';



## ⚠️ Disclaimer (免责声明)
This project is for educational and technical research purposes only (demonstrating Deno runtime and local server interactions).

Please respect copyright laws and platform Terms of Service.

Do not use this tool to distribute copyrighted content.

The author assumes no responsibility for how this tool is used.

本项目仅用于技术研究与教育目的（展示 Deno 运行时与本地交互技术）。请遵守相关法律法规及平台服务条款，切勿用于侵犯版权的行为。