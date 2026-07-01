# Web3 市场探测器 Cloud

云端版：电脑关机也能每天生成 Web3 市场探测器、推送飞书，并生成网页详情页。

## 它会做什么

- 抓 BTC / ETH / HYPE 价格
- 抓 DeFiLlama 部分协议数据
- 抓公开 Web3 新闻 RSS
- 生成编号信息：`T00`、`M01`、`M02`、`M03`、`X01`、`X02`、`X03`、`W01`、`W02`、`W03`
- 推送飞书摘要
- 生成 GitHub Pages 详情页

## 本地预览

```powershell
npm run preview
```

生成页面在：

```text
public/index.html
```

## 部署到 GitHub

1. 新建一个 GitHub 仓库，例如 `web3-brief-cloud`
2. 把这个目录推到仓库
3. 在仓库 Settings 里添加 Secret：

```text
FEISHU_WEBHOOK_URL
```

值填你的飞书 Webhook。

4. 在仓库 Settings 里添加 Variable：

```text
SITE_BASE_URL
```

值填你的 Pages 地址，例如：

```text
https://你的用户名.github.io/web3-brief-cloud
```

5. 打开 GitHub Pages：

```text
Settings -> Pages -> Source -> GitHub Actions
```

6. 到 Actions 里手动运行一次 `Daily Web3 Radar`

之后每天北京时间 09:00 自动运行。

## 飞书里的使用方式

飞书只看摘要：

```text
M01｜...
X01｜...
W01｜...
详情页：https://...
```

想看展开，点详情页，页面里按编号展开。
