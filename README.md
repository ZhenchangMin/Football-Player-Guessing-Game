# Football-Player-Guessing-Game

一个参考 Transfermarkt「Who am I」玩法的网页小游戏：

- 系统随机挑选一位现役球员作为谜底；
- 玩家在限定次数内提交猜测；
- 每次猜测都会反馈年龄、位置、号码、俱乐部、联赛、国籍是否匹配；
- 数值字段（年龄、号码）会给出“偏大 / 偏小”提示。

## 当前实现

- 前端技术：原生 HTML + CSS + JavaScript
- 数据：外部真实球员数据库（`data/players.real.json`）
- 交互：自动补全输入、猜测历史表格、游戏胜负状态

## 数据库说明

- 游戏会在启动时异步加载 `data/players.real.json`。
- 每条球员记录字段：`name`、`age`、`position`、`number`、`club`、`league`、`nation`。
- 如果数据文件为空或字段不完整，页面会提示“数据库加载失败”。
- 扩充数据库时，按现有 JSON 结构追加对象即可，无需改动业务逻辑。

## 本地运行方式（重要）

由于页面会通过 `fetch` 加载 `data/players.real.json`，请不要直接双击 `index.html`（`file://` 协议下通常会导致数据库加载失败，输入建议和提交按钮看起来都“没有反应”）。

请在项目根目录启动本地静态服务器，例如：

```bash
python3 -m http.server 8000
```

然后在浏览器访问：`http://localhost:8000`。
