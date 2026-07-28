# Momenta LPA 可视化工作平台 · 部署与需求文档

**项目代号：** reception-next  
**版本：** v2.0  
**最后更新：** 2026-07-21  
**部署地址：** https://reception-next.vercel.app  
**技术负责人：** Tako Liu

---

## 目录

1. [系统概述](#1-系统概述)
2. [模块清单](#2-模块清单)
3. [落地协议模块详细说明](#3-落地协议模块详细说明)
4. [技术架构](#4-技术架构)
5. [数据库结构](#5-数据库结构)
6. [环境变量配置](#6-环境变量配置)
7. [本地开发部署](#7-本地开发部署)
8. [Vercel 生产部署](#8-vercel-生产部署)
9. [首次运行初始化](#9-首次运行初始化)
10. [角色与权限说明](#10-角色与权限说明)
11. [API 接口文档](#11-api-接口文档)
12. [已知限制与注意事项](#12-已知限制与注意事项)

---

## 1. 系统概述

本系统是一套面向魔门塔（苏州）内部使用的综合性工作管理平台，主要包含以下核心功能：

- **政府接待管理**：记录、追踪、通知所有政府接待事务
- **落地协议追踪**：苏州高铁新城管委会 2024-2028 年商务合作协议 KPI 进度追踪
- **数据大屏**：可视化汇报用全屏大屏
- **重大项目**（开发中）
- **党员关系**（开发中）

系统部署于 Vercel，数据库使用 Neon（PostgreSQL Serverless），文件存储使用 Supabase Storage。

---

## 2. 模块清单

| 路由 | 模块名称 | 状态 | 权限要求 |
|---|---|---|---|
| `/receptions` | 政府接待管理 | ✅ 已上线 | viewer+ |
| `/landing` | 落地协议追踪 | ✅ 已上线 | viewer+ |
| `/data-center` | 数据中台（录入） | ✅ 已上线 | editor+ |
| `/screen` | 数据大屏 | ✅ 已上线 | viewer+ |
| `/settings` | 系统设置 | ✅ 已上线 | admin |
| `/users` | 用户管理 | ✅ 已上线 | admin |
| `/custom-fields` | 自定义字段 | ✅ 已上线 | admin |
| `/major-projects` | 重大项目 | 🚧 开发中 | — |
| `/party` | 党员关系 | 🚧 开发中 | — |
| `/honors` | 荣誉资质 | 📋 规划中 | — |
| `/talent-welfare` | 人才福利 | 📋 规划中 | — |

---

## 3. 落地协议模块详细说明

### 3.1 背景

魔门塔（苏州）与苏州高铁新城管委会签署了为期五年（2024—2028）的商务合作协议，协议含量化 KPI 考核及定性义务合规要求，补贴发放与 KPI 完成率挂钩：

- **≥ 90%**：全额补贴
- **70%–90%**：按比例折扣拨付
- **< 70%**：零补贴

### 3.2 功能页面

#### `/landing` — 落地协议主页

**Hero 横幅（顶部）**
- 综合履约分 SVG 圆环图（0–100 分，加权平均）
- 年度选择（2024–2028）
- KPI 状态徽章（全额达标 / 打折区间 / 零补贴风险 / 待录入）
- 距年度考核截止倒计时
- 「录入数据」快捷跳转 → `/data-center`
- 「数据大屏」入口 → `/screen`

**Tab 1：量化 KPI 追踪**

7 项 KPI 卡片横排展示，每张卡片包含：
- 指标名称、单位
- 当年 YTD 实绩 / 目标
- 完成率进度条（颜色：绿 / 黄 / 红）
- 状态标签
- 距 90% 全额补贴线的差距

点击任一卡片 → 展开五年阶梯对赌详情面板，显示 2024–2028 每年：
- 目标值
- 当前年度：实际进度条 + 完成率（带 90% 参考线）
- 未来年份：灰色展示目标值

底部「全额补贴缺口汇总」面板：列出所有未达标 KPI 的差距值。

**Tab 2：定性义务合规**

12 条定性义务清单（来源：协议原文）：
- 合规率进度条
- 每条义务显示：名称、条款编号、合规状态（已合规 / 进行中 / 待处理 / 存在风险）
- 已上传支撑材料链接
- admin/editor 可点击「编辑」修改状态、填写说明、上传支撑材料附件

**Tab 3：协议文件**

协议原件及相关文件管理：
- 分类筛选：协议原文 / 补充协议 / 审计报告 / 年度报告 / 其他
- 上传文件（base64 直接存入 PostgreSQL，支持 PDF / Word / Excel / 图片，单文件 ≤ 10MB）
- 每个文件卡片：类型图标识别、文件名、分类标签、大小、上传时间
- 「查看」（浏览器内联预览）和「下载」操作
- 文件访问鉴权：URL 自动附带 JWT Token 参数

---

#### `/data-center` — 数据中台

月度数据录入界面，录入后 KPI 进度 T+0 自动更新。

**月份选择器**：DatePicker（月），默认当前月前一个月

**三个录入 Tab**（每个 Tab 顶部显示已填/总字段数徽章）：

| Tab | 关联 KPI | 字段类型 |
|---|---|---|
| 经营与财务 | 营业收入 · 综合税收 · 个税金额 | 月度增量 |
| 人才与团队 | 社保人数 · 国家级人才 · 产业链引进 | 截至当月末累计 |
| 研发与知识产权 | 发明专利申请 | 截至当月末累计 |

**自定义字段功能**（本页核心特色）：
- 右上角「配置字段」按钮进入配置模式
- 每个字段右侧出现 Switch 开关，可独立启用/禁用
- `必填` 标签：直接关联协议 KPI 的核心字段
- `KPI` 标签：该字段值会参与 KPI 计算
- 配置保存在浏览器 `localStorage`，刷新后保留
- 关闭的字段：灰显、不可输入、保存时跳过该字段

**上月数据对比**：切换月份后自动拉取上月数据，若本月值与上月不同，字段卡片显示橙色「较上月：X → Y」提示。

**综合税收自动计算**：增值税实缴苏州 + 企业所得税实缴苏州，实时显示万元及亿元换算。

---

#### `/screen` — 数据大屏

汇报专用全屏可视化，不经过 AppLayout（独立路由）。

**布局（三列）**：
- **左列**：综合履约分环形图 + 状态分类统计 + 12条定性义务多段环形图 + 倒计时 + 协议关键节点时间线
- **中列**：7项 KPI 小环形进度图 + 营业收入月度折线图（月度 + YTD 双线）+ 综合税收 / 社保人数月度折线图
- **右列**：7项 KPI 横向进度条（含 90% 参考线）+ 五年营收目标对赌柱状图 + 补贴预测三档估算

**技术特点**：纯 SVG + CSS 实现所有图表（无第三方图表库），60 秒自动刷新，右上角实时时钟，背景浅蓝色渐变。

---

### 3.3 七项量化 KPI 配置

| KPI | 2024 目标 | 2025 目标 | 2026 目标 | 2027 目标 | 2028 目标 | 单位 | 考核权重 |
|---|---|---|---|---|---|---|---|
| 营业收入 | 5 | 8 | 12 | 18 | 25 | 亿元 | 40% |
| 综合税收 | 0.3 | 0.5 | 0.7 | 1.0 | 1.5 | 亿元 | 20% |
| 个税金额 | 0.05 | 0.08 | 0.12 | 0.18 | 0.25 | 亿元 | 10% |
| 社保人数 | 200 | 280 | 380 | 500 | 650 | 人 | 15% |
| 国家级人才 | 1 | 2 | 3 | 5 | 8 | 人 | 5% |
| 发明专利申请 | 50 | 80 | 120 | 180 | 250 | 件 | 5% |
| 产业链引进 | 1 | 2 | 3 | 5 | 8 | 家 | 5% |

> **综合税收计算**：增值税实缴苏州 + 企业所得税实缴苏州（单位换算：万元 ÷ 10000 = 亿元）  
> **个税计算**：个人所得税苏州代扣（单位换算：万元 ÷ 10000 = 亿元）

---

### 3.4 十二条定性义务

| 编号 | 义务名称 | 协议条款 | 状态选项 |
|---|---|---|---|
| 1 | 总部架构合规 | 第1.1.3条(1) | 已合规 / 进行中 / 待处理 / 存在风险 |
| 2 | 营收归集 | 第1.1.3条(2) | 同上 |
| 3 | IPO 目标（2027-12-31 前） | 第1.1.3条(3) | 同上 |
| 4 | 上市架构 | 第1.1.3条(4) | 同上 |
| 5 | 核心人员（苏州劳动关系 ≥ 300 人） | 第1.1.3条(5) | 同上 |
| 6 | 产业链主 | 第1.1.3条(6) | 同上 |
| 7 | 总部大楼（2029-12-31 前启动） | 第1.1.3条(7) | 同上 |
| 8 | 专款专用 | 第1.1.3条(8) | 同上 |
| 9 | 股东减持 | 第1.1.3条(9) | 同上 |
| 10 | 持续经营（≥ 8 年） | 第1.1.3条(10) | 同上 |
| 11 | 变更告知（提前 30 日） | 第1.1.3条(11) | 同上 |
| 12 | 配合审查 | 第1.1.3条(12) | 同上 |

---

## 4. 技术架构

```
技术栈
├── 前端：Next.js 14.2（App Router）· React 18 · Ant Design 5.18
├── 后端：Next.js API Routes（Route Handlers）
├── 数据库：PostgreSQL via Prisma 5.14（Neon Serverless）
├── 文件存储：
│   ├── 接待照片：Supabase Storage（photos bucket）
│   └── 协议文件：PostgreSQL（base64 存入 AgreementFile.data 字段）
├── 认证：JWT（jsonwebtoken 9）· bcryptjs 密码哈希
├── 定时任务：Vercel Cron（每天 01:00 UTC 发送飞书提醒）
└── 部署：Vercel（Hobby 计划）
```

**重要限制（Vercel Hobby）**：
- Serverless Function 请求体上限：**4.5 MB**（影响 multipart 文件上传）
- 因此协议文件改用前端 FileReader 读 base64 → JSON POST（无 multipart 限制）
- Server Actions bodySizeLimit 已在 `next.config.js` 调为 50MB

---

## 5. 数据库结构

### 核心业务表

#### `User` — 用户表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | Int PK | 自增主键 |
| username | String UNIQUE | 登录用户名 |
| password | String | bcrypt 哈希 |
| name | String | 显示名称 |
| role | String | viewer / editor / admin |
| createdAt | DateTime | |

#### `Reception` — 接待记录表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | Int PK | |
| startTime / endTime | DateTime | 接待时间段 |
| title | String | 接待标题 |
| level | String | 板块/省级/市级/区级/企业院所/其他 |
| form | String | 展厅/参会/调研/其他 |
| host | String | 接待负责人 |
| dressCode | String | 着装要求 |
| purpose | String | 接待目的 |
| status | String | 正常/取消/待确认 |
| location / locationKey | String? | 地点及地图 key |
| leaders | String? | JSON 数组：领导列表 |
| minutes | String? | 会议纪要文本 |
| minuteFiles | String? | JSON：附件文件列表 |
| photos | String? | JSON：照片 URL 列表 |
| todos | String? | JSON：待办事项列表 |
| remark | String? | 备注 |
| customFields | String? | JSON：自定义字段键值对 |
| createdById | Int FK | → User |

#### `AgreementData` — 协议月度数据表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | Int PK | |
| period | String | "YYYY-MM"，如 "2024-06" |
| category | String | finance / hr / ip |
| payload | String | JSON，存储该月该分类所有字段值 |
| submittedBy | Int? | 提交人 userId |
| lockedAt | DateTime? | 锁定时间（锁定后不可修改） |
| UNIQUE | | (period, category) 联合唯一 |

**finance payload 字段说明：**

| 字段 key | 中文名 | 单位 | 是否影响 KPI |
|---|---|---|---|
| revenue | 营业收入 | 亿元 | ✅ REVENUE |
| revenueSuzhou | 其中：苏州确认收入 | 亿元 | 参考 |
| vatPaidSuzhou | 增值税实缴苏州 | 万元 | ✅ TAX_TOTAL |
| citPaidSuzhou | 企业所得税实缴苏州 | 万元 | ✅ TAX_TOTAL |
| pitSuzhou | 个人所得税苏州代扣 | 万元 | ✅ PERSONAL_TAX |
| vatPayable | 增值税应缴 | 万元 | 参考 |
| citPayable | 企业所得税应缴 | 万元 | 参考 |
| rdExpense | 研发投入 | 万元 | 高企申报 |

**hr payload 字段说明：**

| 字段 key | 中文名 | 单位 | 是否影响 KPI |
|---|---|---|---|
| socialInsuranceCount | 苏州社保参保人数 | 人 | ✅ SOCIAL_INSURANCE |
| nationalTalentCount | 国家级人才申报人数 | 人 | ✅ NATIONAL_TALENT |
| industryChainCount | 已引进产业链企业数 | 家 | ✅ INDUSTRY_CHAIN |
| coreStaffCount | 核心岗位苏州劳动关系 | 人 | 参考 |
| executiveCount | 其中：高管人数 | 人 | 参考 |
| highEarnerCount | 年薪50万以上员工数 | 人 | 个税奖励计算 |

**ip payload 字段说明：**

| 字段 key | 中文名 | 单位 | 是否影响 KPI |
|---|---|---|---|
| inventionPatentApplied | 发明专利申请（累计） | 件 | ✅ INVENTION_PATENT |
| inventionPatentGranted | 发明专利授权（累计） | 件 | 高企申报 |
| utilityPatent | 实用新型专利（累计） | 件 | 高企申报 |
| softwareCopyright | 软件著作权（累计） | 件 | 高企申报 |

#### `QualitativeObligation` — 定性义务表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | Int PK | |
| code | String UNIQUE | 唯一标识，如 "IPO_TARGET" |
| name | String | 义务名称 |
| articleRef | String | 协议条款编号 |
| requirement | String | 要求描述 |
| status | String | compliant / in_progress / pending / at_risk |
| description | String? | 当前状态说明 |
| evidenceUrls | String? | JSON 数组，支撑材料链接列表 |
| updatedById | Int? | 最后更新人 |

#### `AgreementFile` — 协议附件表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | Int PK | |
| name | String | 文件显示名称 |
| url | String? | 外部存储 URL（预留，当前不使用） |
| data | String? | base64 文件内容（存入 DB） |
| size | Int? | 文件大小（bytes） |
| mimeType | String? | MIME 类型 |
| category | String | contract / supplement / audit / report / other |
| year | Int? | 关联年份 |
| remark | String? | 备注 |
| uploadedBy | Int | 上传人 userId |

#### `SubsidyApplication` — 补贴申请表（预留）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | Int PK | |
| code | String | 申请编号，如 "2024-001" |
| policyItem | String | 政策项目名称 |
| year | Int | 申请年度 |
| appliedAmount | Float? | 申请金额（万元） |
| status | String | draft / submitted / reviewing / approved / paid |
| paidAmount / paidAt | | 实际拨付信息 |

---

## 6. 环境变量配置

以下变量需在 Vercel 项目设置 → Environment Variables 中配置：

| 变量名 | 必需 | 说明 | 示例 |
|---|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL 连接串（推荐 Neon）| `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require` |
| `JWT_SECRET` | ✅ | JWT 签名密钥，至少 32 位随机字符串 | `your-secret-32chars-minimum` |
| `CRON_SECRET` | ✅ | Vercel Cron 鉴权 Token | `any-random-string` |
| `SUPABASE_URL` | 接待照片上传时必需 | Supabase 项目 URL | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | 接待照片上传时必需 | Supabase service_role 密钥 | `eyJ...` |
| `FEISHU_WEBHOOK_URL` | 飞书通知时必需 | 飞书机器人 Webhook | `https://open.feishu.cn/open-apis/bot/v2/hook/xxx` |
| `FEISHU_APP_ID` | 飞书 Bitable 导入时必需 | 飞书应用 App ID | `cli_xxx` |
| `FEISHU_APP_SECRET` | 飞书 Bitable 导入时必需 | 飞书应用 App Secret | `xxx` |
| `NEXT_PUBLIC_APP_URL` | 可选 | 飞书通知卡片中的跳转链接 | `https://reception-next.vercel.app` |

> **注意**：若不需要接待照片上传或飞书功能，`SUPABASE_*` 和 `FEISHU_*` 变量可留空，不影响落地协议模块。

---

## 7. 本地开发部署

### 前置依赖

- Node.js ≥ 18
- npm ≥ 9
- PostgreSQL 数据库（或 Neon 云数据库账号）

### 步骤

```bash
# 1. 克隆项目
git clone <repo-url>
cd reception-next

# 2. 安装依赖
npm install

# 3. 配置环境变量
# 在项目根目录创建 .env.local 文件：
cat > .env.local << 'EOF'
DATABASE_URL="postgresql://user:pass@localhost:5432/reception_db"
JWT_SECRET="your-local-dev-secret-at-least-32-chars"
CRON_SECRET="local-cron-secret"
EOF

# 4. 同步数据库 schema
npx prisma db push

# 5. 初始化基础用户
node prisma/seed.js
# 默认账号：admin / admin123

# 6. 初始化落地协议定性义务（12条）
node prisma/seed-agreement.js

# 7. 启动开发服务器
npm run dev
# 访问 http://localhost:3000
```

---

## 8. Vercel 生产部署

### 方式一：通过 Vercel CLI（推荐）

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 首次部署（关联项目）
vercel --prod

# 后续部署
vercel --prod --yes
```

### 方式二：通过 GitHub 自动部署

1. 将代码推送到 GitHub 仓库
2. 在 Vercel Dashboard → New Project → 选择仓库
3. 在 Environment Variables 填入所有必需变量
4. Deploy

### Build 命令说明

`package.json` 中 `build` 脚本为：

```
prisma generate && prisma db push && next build
```

- `prisma generate`：生成 Prisma Client
- `prisma db push`：同步 schema 到数据库（自动创建/更新表，无需手动迁移）
- `next build`：编译 Next.js

每次部署自动执行，schema 变更会自动同步到 Neon 数据库。

---

## 9. 首次运行初始化

部署成功后，**必须执行以下初始化步骤**：

### 步骤 1：初始化管理员账号

```bash
# 本地运行（需要配置 DATABASE_URL）
node prisma/seed.js
```

或通过 Vercel 的 Functions 日志确认 build 时已执行（build 脚本会 db push 但不会 seed）。

**默认账号：** `admin` / `admin123`，**首次登录后请立即在系统设置中修改密码**。

### 步骤 2：初始化落地协议定性义务数据

**方法 A**（推荐）：调用 Seed API（无需本地环境）

```bash
# 1. 登录获取 token
TOKEN=$(curl -s -X POST https://your-domain.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# 2. 执行种子数据
curl -X POST https://your-domain.vercel.app/api/agreement/seed \
  -H "Authorization: Bearer $TOKEN"
```

**方法 B**：本地执行

```bash
DATABASE_URL="your-neon-connection-string" node prisma/seed-agreement.js
```

成功返回：`{"ok":true,"created":12,"skipped":0,"message":"新增 12 条，跳过 0 条"}`

### 步骤 3：创建操作用户

进入 `/users`（管理员后台），创建实际操作人员账号，分配对应角色。

---

## 10. 角色与权限说明

| 角色 | viewer | editor | admin |
|---|---|---|---|
| 查看所有模块 | ✅ | ✅ | ✅ |
| 录入/编辑接待记录 | ❌ | ✅ | ✅ |
| 录入月度 KPI 数据 | ❌ | ✅ | ✅ |
| 编辑定性义务状态 | ❌ | ✅ | ✅ |
| 上传协议文件 | ❌ | ✅ | ✅ |
| 删除文件/记录 | ❌ | ✅ | ✅ |
| 执行 seed API | ❌ | ❌ | ✅ |
| 系统设置 / 用户管理 | ❌ | ❌ | ✅ |

---

## 11. API 接口文档

所有接口均需 `Authorization: Bearer <jwt_token>` 请求头，除 `/api/auth/login`。

### 11.1 认证

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/auth/login` | 登录，返回 `{token, user}` |

**请求体：**
```json
{ "username": "admin", "password": "admin123" }
```

**响应：**
```json
{
  "token": "eyJ...",
  "user": { "id": 1, "username": "admin", "name": "管理员", "role": "admin" }
}
```

---

### 11.2 落地协议 — 数据录入

#### GET `/api/agreement/data`

查询月度数据。

**Query 参数：**
| 参数 | 必需 | 说明 |
|---|---|---|
| year | ✅ | 年份，如 2024 |
| category | ✅ | finance / hr / ip |

**响应：**
```json
[
  {
    "id": 1,
    "period": "2024-06",
    "category": "finance",
    "payload": { "revenue": 3.8, "vatPaidSuzhou": 800, "citPaidSuzhou": 2000, "pitSuzhou": 400 },
    "updatedAt": "2024-07-01T08:00:00Z"
  }
]
```

#### POST `/api/agreement/data`

保存月度数据（upsert，已存在则覆盖）。需 `editor` 角色。

**请求体：**
```json
{
  "period": "2024-06",
  "category": "finance",
  "payload": {
    "revenue": 3.8,
    "vatPaidSuzhou": 800,
    "citPaidSuzhou": 2000,
    "pitSuzhou": 400,
    "rdExpense": 5000
  }
}
```

---

### 11.3 落地协议 — Dashboard

#### GET `/api/agreement/dashboard`

获取聚合 Dashboard 数据（KPI 进度、综合履约分、月度趋势）。

**Query 参数：**
| 参数 | 必需 | 说明 |
|---|---|---|
| year | ✅ | 年份 |

**响应结构：**
```json
{
  "year": 2024,
  "overallScore": 76.0,
  "daysToDeadline": 164,
  "kpis": [
    {
      "key": "REVENUE",
      "label": "营业收入",
      "unit": "亿元",
      "precision": 2,
      "actual": 3.8,
      "target": 5,
      "completionRate": 0.76,
      "status": "warning",
      "gap90": 0.7,
      "weight": 0.4
    }
  ],
  "allYearTargets": {
    "REVENUE": [
      { "year": 2024, "target": 5 },
      { "year": 2025, "target": 8 }
    ]
  },
  "qualitative": [
    {
      "id": 1,
      "code": "IPO_TARGET",
      "name": "IPO目标",
      "status": "in_progress",
      "description": "正在推进上市辅导...",
      "evidenceUrls": []
    }
  ],
  "monthly": {
    "revenue":    [{ "month": 1, "value": null }, { "month": 6, "value": 0.65 }],
    "revenueYTD": [{ "month": 1, "value": null }, { "month": 6, "value": 3.8 }],
    "tax":        [{ "month": 6, "value": 0.028 }],
    "social":     [{ "month": 6, "value": 168 }]
  },
  "maxGapKpi": { "key": "REVENUE", "gap90": 0.7 }
}
```

---

### 11.4 落地协议 — 定性义务

#### GET `/api/agreement/qualitative`
返回全部 12 条，`evidenceUrls` 已解析为数组。

#### PATCH `/api/agreement/qualitative/:id`
更新义务状态。需 `editor` 角色。

**请求体：**
```json
{
  "status": "compliant",
  "description": "已完成上市架构搭建...",
  "evidenceUrls": [
    { "url": "/api/agreement/files/5/view", "name": "架构图.pdf", "size": 204800 }
  ]
}
```

---

### 11.5 落地协议 — 文件管理

#### GET `/api/agreement/files`
获取文件列表（**不含** `data` 字段）。

**Query 参数：**`category`（可选）、`year`（可选）

#### POST `/api/agreement/upload`
上传文件（base64 存入 DB）。需 `editor` 角色。

**请求体（JSON）：**
```json
{
  "name": "苏州高铁新城商务合作协议.pdf",
  "data": "<base64 编码的文件内容>",
  "size": 2048000,
  "mimeType": "application/pdf",
  "category": "contract",
  "year": 2024,
  "remark": "协议原件扫描版"
}
```

**限制：** 文件原始大小 ≤ 10MB（base64 后约 13MB，仍在 PostgreSQL TEXT 字段范围内）

#### GET `/api/agreement/files/:id/view`
查看/下载文件内容（二进制流）。

**Query 参数：**
- `token`：JWT Token（浏览器直接访问时使用）
- `download=1`：触发下载（Content-Disposition: attachment）

#### DELETE `/api/agreement/files/:id`
删除文件记录。需 `editor` 角色。

---

### 11.6 落地协议 — 初始化

#### POST `/api/agreement/seed`
写入 12 条定性义务初始数据（幂等，已存在则跳过）。需 `admin` 角色。

**响应：**
```json
{ "ok": true, "created": 12, "skipped": 0, "message": "新增 12 条，跳过 0 条" }
```

---

## 12. 已知限制与注意事项

### 文件存储

- 协议文件（PDF/Word/Excel）存储在 **PostgreSQL** 数据库中（base64 字段），而非外部存储服务
- 单文件限制：**≤ 10MB**（原始大小）
- 接待照片上传使用 **Supabase Storage**（photos bucket），需配置 SUPABASE_* 环境变量
- 若 Supabase 未配置，接待照片上传功能不可用，但不影响落地协议模块

### 数据库注意事项

- 使用 `prisma db push` 而非 `prisma migrate`，表结构变更直接同步，**不生成迁移历史文件**
- 生产环境 schema 变更通过重新部署触发（build 时自动执行 `prisma db push`）
- `AgreementFile.data` 为 PostgreSQL `TEXT` 类型，存储大量 base64 文件会增大数据库体积，建议定期清理无用文件

### 性能限制（Vercel Hobby 计划）

| 限制项 | 值 |
|---|---|
| Serverless Function 执行超时 | 10 秒（默认）/ 60 秒（upload/view 接口已配置） |
| 请求体大小 | 4.5 MB（含 headers）|
| 并发执行数 | 无硬性限制，但冷启动较慢 |

- 因此协议文件上传改用 **JSON + base64**（绕过 multipart 4.5MB 限制）
- 大文件预览（view 接口）使用 **ReadableStream 流式响应**，分 64KB 块输出

### 首次部署常见问题

**Q：`prisma db push` 报错 `DATABASE_URL` 为空**  
A：确认 Vercel 环境变量已正确设置，注意不要有多余空格或引号。

**Q：登录后 token 失效**  
A：检查 `JWT_SECRET` 是否在 Vercel 上配置，默认 fallback 值 `reception2024secret` 仅用于开发。

**Q：定性义务列表为空**  
A：需手动调用 `/api/agreement/seed`（POST，需 admin token）进行初始化。

**Q：上传文件报错**  
A：检查文件是否超过 10MB，或 base64 转换失败；查看浏览器 Network 面板中的具体错误信息。

---

## 附录 A：目录结构

```
reception-next/
├── app/
│   ├── layout.js              # 根 HTML 布局
│   ├── page.js                # 重定向 → /receptions
│   ├── login/page.js
│   ├── receptions/page.js     # 政府接待（表格/卡片/看板）
│   ├── landing/page.js        # 落地协议追踪主页
│   ├── data-center/page.js    # 数据中台录入
│   ├── screen/page.js         # 全屏数据大屏
│   ├── settings/page.js
│   ├── users/page.js
│   ├── custom-fields/page.js
│   └── api/
│       ├── auth/login/        # 登录
│       ├── receptions/        # 接待 CRUD
│       ├── agreement/
│       │   ├── dashboard/     # KPI 聚合计算
│       │   ├── data/          # 月度数据录入
│       │   ├── qualitative/   # 定性义务
│       │   ├── upload/        # 文件上传（base64 → DB）
│       │   ├── files/         # 文件列表/删除
│       │   │   └── [id]/
│       │   │       ├── route.js   # PUT/DELETE
│       │   │       └── view/      # GET 查看/下载
│       │   └── seed/          # 初始化义务数据
│       ├── upload/            # 接待照片上传（Supabase）
│       ├── users/             # 用户管理
│       ├── config/            # 系统配置
│       └── cron/              # 定时飞书通知
├── components/
│   ├── AppLayout.js           # 侧边栏导航布局
│   ├── ReceptionForm.js       # 接待记录表单
│   ├── ReceptionDetail.js     # 接待详情抽屉
│   ├── ReceptionCards.js      # 接待卡片视图
│   ├── ReceptionKanban.js     # 接待看板视图
│   ├── NotifyModal.js         # 飞书通知弹窗
│   └── FeishuImport.js        # 飞书 Bitable 导入
├── lib/
│   ├── prisma.js              # Prisma 单例
│   ├── auth.js                # JWT 认证工具
│   ├── api.js                 # 前端 fetch 封装
│   └── agreement-config.js   # KPI 目标/权重配置（hardcode）
├── prisma/
│   ├── schema.prisma          # 数据库 Schema
│   ├── seed.js                # 初始化管理员账号
│   └── seed-agreement.js      # 初始化定性义务数据
├── next.config.js             # bodySize 50MB
├── vercel.json                # Cron 配置（每天01:00UTC）
└── package.json
```

---

## 附录 B：KPI 计算逻辑

```
// lib/agreement-config.js

YTD 营业收入   = Σ finance.revenue        (每月累加，单位：亿元)
YTD 综合税收   = Σ (vatPaidSuzhou + citPaidSuzhou) / 10000  (万→亿)
YTD 个税金额   = Σ pitSuzhou / 10000       (万→亿)
社保人数       = 最新一条 hr.socialInsuranceCount
国家级人才     = 最新一条 hr.nationalTalentCount
发明专利申请   = 最新一条 ip.inventionPatentApplied（YTD累计值）
产业链引进     = 最新一条 hr.industryChainCount

KPI 完成率     = actual / target
KPI 状态       = compliant (≥0.9) / warning (≥0.7) / risk (<0.7) / no_data (无数据)
全额缺口       = max(0, target × 0.9 - actual)
综合履约分     = Σ (min(completionRate, 1) × weight) × 100    (0-100分)
```

---

*文档由 Claude Code 自动生成，基于 2026-07-21 版本代码库。如有疑问请联系 Tako Liu。*
