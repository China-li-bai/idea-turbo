# B2B Lead Generation Tool

Google Maps 爬虫工具，用于抓取目标国家的电脑店、维修店等 B2B 客户信息。

## 快速开始

```bash
# 1. 安装依赖
cd lead-gen
./scripts/setup.sh

# 2. 运行抓取
./scripts/run.sh

# 3. 只抓取特定国家
./scripts/run.sh --countries vietnam russia
```

## 输出文件

抓取结果保存在 `output/` 目录：

| 文件 | 说明 |
|-----|------|
| `leads_*.csv` | 完整客户信息（Excel 可打开） |
| `leads_*.json` | JSON 格式，便于程序处理 |
| `phones_*.txt` | 电话号码列表（可直接导入手机） |

## 配置文件

编辑 `config/keywords.yaml` 自定义：

- 目标城市和坐标
- 搜索关键词（支持多语言）
- 抓取数量限制
- 请求延迟

## 目标市场

| 国家 | 城市 | 关键词语言 |
|-----|------|----------|
| 越南 | 胡志明、河内、岘港 | 越南语、英语 |
| 俄罗斯 | 莫斯科、圣彼得堡 | 俄语、英语 |
| 印尼 | 雅加达、泗水 | 印尼语、英语 |
| 泰国 | 曼谷、清迈 | 泰语、英语 |

## 注意事项

- 首次运行需要下载 Chromium 浏览器（约 150MB）
- 建议控制抓取频率，避免被封 IP
- 如需大规模抓取，建议配置代理
