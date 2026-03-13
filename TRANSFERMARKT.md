# Transfermarkt 数据同步说明

## 为什么这样设计

浏览器直接请求 Transfermarkt 会遇到 CORS 和反爬限制，因此使用本地脚本抓取数据后存储到
`data/players.real.json`，前端直接读取该文件。

## 更新本地json文件步骤
```bash
cd E:\study\transfermarkt-api
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
启用本地 API 服务器后，运行同步脚本：
```bash
 cd E:\study\Football-Player-Guessing-Game
  $env:TM_BASE_URL = "http://localhost:8000"
  $env:TM_COMPETITION_IDS = "GB1,ES1,IT1,L1,FR1"
  node .\scripts\sync-transfermarkt.mjs
```
等待脚本完成后，`data/players.real.json` 将包含最新的球员数据。

## 字段说明

`players.real.json` 中每条记录的字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 球员姓名 |
| `age` | number | 年龄 |
| `position` | string | 位置代码（如 ST、CM、GK） |
| `number` | number | 球衣号码 |
| `club` | string | 俱乐部名称 |
| `league` | string | 联赛名称 |
| `nation` | string | 国籍 |
| `marketValueEur` | number | 身价（欧元），用于身价提示 |

## 同步脚本

文件：`scripts/sync-transfermarkt.mjs`

通过非官方 Transfermarkt API（`transfermarkt-api.fly.dev`）抓取数据，写入 `data/players.real.json`。

### 快速开始（使用默认设置，覆盖五大联赛）

```powershell
node .\scripts\sync-transfermarkt.mjs
```

默认抓取：英超(GB1)、西甲(ES1)、意甲(IT1)、德甲(L1)、法甲(FR1)、乌克兰超(UKR1)、葡超(PO1)

### 只抓取五大联赛（更快）

```powershell
$env:TM_COMPETITION_IDS = "GB1,ES1,IT1,L1,FR1"
node .\scripts\sync-transfermarkt.mjs
```

### 限制球员数量（用于测试）

```powershell
$env:TM_COMPETITION_IDS = "GB1"
$env:TM_LIMIT = "100"
node .\scripts\sync-transfermarkt.mjs
```

## 联赛 ID 参考

| ID | 联赛 |
|----|------|
| GB1 | 英超 Premier League |
| ES1 | 西甲 La Liga |
| IT1 | 意甲 Serie A |
| L1 | 德甲 Bundesliga |
| FR1 | 法甲 Ligue 1 |
| PO1 | 葡超 Primeira Liga |
| NL1 | 荷甲 Eredivisie |
| TR1 | 土超 Süper Lig |
| A3 | 中超 Chinese Super League |
| SA1 | 沙超 Saudi Pro League |
| MLS1 | 美职联 MLS |
| MEX1 | 墨西哥甲 Liga MX |
| UKR1 | 乌克兰超 Ukrainian Premier League |
