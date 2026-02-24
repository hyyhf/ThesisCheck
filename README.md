<p align="center">
  <img src="https://img.shields.io/badge/ThesisCheck-AI%20Thesis%20Reviewer-8B5CF6?style=for-the-badge&logo=microsoftword&logoColor=white" alt="ThesisCheck" />
</p>

<h1 align="center">ThesisCheck</h1>

<p align="center">
  <strong>AI-Powered Thesis Review Word Add-in</strong>
  <br />
  <em>-- 基于大语言模型的智能论文审查 Word 插件 --</em>
</p>

<p align="center">
  <a href="#features"><img src="https://img.shields.io/badge/Features-Explore-2563EB?style=for-the-badge" alt="Features" /></a>
  <a href="#quick-start"><img src="https://img.shields.io/badge/Quick%20Start-Guide-10B981?style=for-the-badge" alt="Quick Start" /></a>
  <a href="#tech-stack"><img src="https://img.shields.io/badge/Tech%20Stack-View-F59E0B?style=for-the-badge" alt="Tech Stack" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.12+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Office_Add--in-Word-D83B01?style=for-the-badge&logo=microsoftoffice&logoColor=white" alt="Office Add-in" />
</p>

<p align="center">
  <img src="https://img.shields.io/github/license/hyyhf/ThesisCheck?style=for-the-badge&color=8B5CF6" alt="License" />
  <img src="https://img.shields.io/github/last-commit/hyyhf/ThesisCheck?style=for-the-badge&color=10B981" alt="Last Commit" />
  <img src="https://img.shields.io/github/repo-size/hyyhf/ThesisCheck?style=for-the-badge&color=F59E0B" alt="Repo Size" />
  <img src="https://img.shields.io/github/stars/hyyhf/ThesisCheck?style=for-the-badge&color=EF4444" alt="Stars" />
</p>

---

## Overview

**ThesisCheck** 是一款运行在 Microsoft Word 内部的 AI 论文审查插件。它通过大语言模型（LLM）对论文进行智能审查，自动检测格式规范、内容逻辑、语言表达等方面的问题，并生成结构化的审查报告，帮助学生和教师高效完成论文审查工作。

> **无需离开 Word，即可获得 AI 驱动的专业论文审查意见。**

---

<h2 id="features">Features</h2>

### 审查模式

| 模式         | 说明                                                     |
| :----------- | :------------------------------------------------------- |
| **全文审查** | 自动检测论文章节结构，逐章智能审查，实时流式输出审查意见 |
| **选段审查** | 选中论文中任意段落，针对性地进行精细化审查               |
| **总体评语** | 通读全文后生成一份综合性的总体评价意见                   |

### 核心能力

- **智能章节检测** -- 自动识别论文的章节结构（绪论、正文、结论等），逐章进行针对性审查
- **流式实时输出** -- 审查意见以流式方式实时呈现，无需等待全部完成
- **多维度审查** -- 覆盖格式规范、内容逻辑、语言表达、学术规范等多个维度
- **问题分级** -- 审查结果按严重程度分为 `严重问题`、`一般问题`、`改进建议` 三个等级
- **段落定位** -- 每条审查意见精确关联到原文段落，点击即可跳转定位
- **导出报告** -- 一键导出格式精美的 `.docx` 审查报告和总体评语文档
- **自定义 API** -- 支持自定义 API 密钥、基础 URL 和模型名称，兼容各类 OpenAI 兼容接口

---

<h2 id="tech-stack">Tech Stack</h2>

### Frontend (Word Add-in)

| 技术              | 用途              |
| :---------------- | :---------------- |
| **React 18**      | UI 框架           |
| **TypeScript**    | 类型安全          |
| **Tailwind CSS**  | 样式系统          |
| **Fluent UI**     | Office 风格组件库 |
| **Framer Motion** | 动画效果          |
| **Webpack**       | 构建工具          |
| **Office.js**     | Word API 交互     |

### Backend (API Server)

| 技术              | 用途                       |
| :---------------- | :------------------------- |
| **Python 3.12+**  | 运行环境                   |
| **FastAPI**       | Web 框架                   |
| **OpenAI SDK**    | LLM 通信                   |
| **SSE-Starlette** | 服务器推送事件（流式响应） |
| **python-docx**   | Word 文档生成              |
| **uv**            | 包管理与运行               |

---

## Architecture

```
ThesisCheck/
|
|-- frontend/                 # Word Add-in 前端
|   |-- src/
|   |   |-- taskpane/
|   |   |   |-- components/   # UI 组件（StreamingTextPanel 等）
|   |   |   |-- pages/        # 页面（ReviewPage, SettingsPage）
|   |   |   |-- services/     # API 调用、Word 交互、导出服务
|   |   |   |-- hooks/        # React Hooks
|   |   |   +-- styles/       # 全局样式
|   |   +-- commands/         # Office 命令入口
|   |-- manifest.xml          # Office Add-in 清单
|   +-- webpack.config.js
|
|-- backend/                  # FastAPI 后端
|   |-- routers/              # API 路由（review, export）
|   |-- services/             # 业务逻辑（LLM 调用、报告生成）
|   |-- models/               # 数据模型（Pydantic schemas）
|   |-- prompts/              # LLM 提示词模板
|   +-- main.py               # 应用入口
|
+-- .gitignore
```

**工作流程：**

```
Word 文档 --> Office.js 提取段落 --> FastAPI 后端 --> LLM 审查 --> SSE 流式返回 --> 前端实时渲染
```

---

<h2 id="quick-start">Quick Start</h2>

### 环境要求

- **Node.js** >= 18
- **Python** >= 3.12
- **uv**（Python 包管理器）
- **Microsoft Word**（桌面版）

### 1. 克隆仓库

```bash
git clone https://github.com/hyyhf/ThesisCheck.git
cd ThesisCheck
```

### 2. 启动后端

```bash
cd backend
uv sync
uv run main.py
```

后端服务将在 `http://localhost:8000` 启动。

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev-server
```

前端开发服务器将在 `https://localhost:3000` 启动。

### 4. 加载 Word 插件

在 Word 中通过 **插入 > 我的加载项 > 开发加载项** 侧载 `frontend/manifest.xml` 文件。

### 5. 配置 API

在插件设置页面中配置你的 LLM API 信息：

- **API Key** -- 你的 API 密钥
- **Base URL** -- API 基础地址（兼容 OpenAI 接口格式）
- **Model** -- 模型名称

---

## API Endpoints

| 方法   | 路径                         | 说明                     |
| :----- | :--------------------------- | :----------------------- |
| `GET`  | `/`                          | 健康检查                 |
| `POST` | `/api/review`                | 论文段落审查（非流式）   |
| `POST` | `/api/review/stream`         | 论文段落审查（SSE 流式） |
| `POST` | `/api/review/comment/stream` | 总体评语生成（SSE 流式） |
| `POST` | `/api/export/docx`           | 导出审查报告（.docx）    |
| `POST` | `/api/export/comment/docx`   | 导出总体评语（.docx）    |

---

## License

This project is licensed under the [MIT License](./LICENSE).

---

<p align="center">
  <sub>Built with coffee and AI.</sub>
</p>
