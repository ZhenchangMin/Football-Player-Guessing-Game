# Transfermarkt 数据同步说明

## 为什么这样设计

浏览器直接请求 Transfermarkt 会遇到 CORS 和反爬限制，因此使用本地脚本抓取数据后存储到
`data/players.real.json`，前端直接读取该文件。

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
| `marketValueEur` | number | 身价（欧元），可选，用于身价提示 |

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

### 如果使用需要认证的 API 代理

```powershell
$env:TM_BASE_URL = "https://your-api-provider.example.com"
$env:TM_AUTH_HEADER = "x-rapidapi-key"
$env:TM_AUTH_VALUE = "YOUR_API_KEY"
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

## 注意事项

- 完整同步五大联赛约需 10-20 分钟（约 100 支球队 × 25 人）
- 脚本已内置请求延迟和自动重试，减少被限速的可能
- 若脚本报错 `No valid players parsed`，检查网络是否能访问 `transfermarkt-api.fly.dev`
- 可手动编辑 `data/players.real.json` 补充或修正数据
