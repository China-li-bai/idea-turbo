抓取实体店与维修店）
目标客户：河内/曼谷/莫斯科的电脑维修店、网吧、独立装机店。
逻辑：这些店联系方式公开，且对“高利润”的廉价SSD（锐储）有极强的需求。
推荐开源项目
google-maps-scraper (基于 Python/Selenium)
GitHub关键词：gosom/google-maps-scraper 或 content-pizza/google-maps-scraper
核心功能：输入关键词（如 Computer Store Hanoi），自动导出 Excel，包含：店名、电话（极重要）、网站、评论数。
落地工作流
部署：在你的本地电脑或 VPS 上拉取该项目。
关键词策略（多语言）：
越南：Cửa hàng máy tính (电脑店), Sửa chữa laptop (笔记本维修)
俄罗斯：Компьютерный магазин (电脑店), Сервисный центр ПК (PC服务中心)
印尼：Toko Komputer
运行抓取：
设置坐标参数（Coordinates），让脚本在目标城市跑一圈。
筛选技巧：只保留**“有电话号码”且“评论数 > 50”**的店铺（说明活得久，有稳定客流）。
下一步动作：拿到电话号码列表，导入手机通讯录，检查哪些注册了 WhatsApp (东南亚) 或 Telegram (俄罗斯)，直接发招呼。
战场二：Shopee / Lazada / AliExpress（抓取竞品分销商）
目标客户：正在卖金士顿、三星、或者其他杂牌SSD的中小卖家。
逻辑：他们已经是渠道商了。你的目标是告诉他们：“卖锐储，比卖金士顿每单多赚$5。”
推荐开源项目
Scrapy (Python爬虫框架之王)
GitHub关键词：scrapy/scrapy
Crawlee (Node.js 爬虫，对反爬处理得很好)
GitHub关键词：apify/crawlee
落地工作流 (配合 Cursor/AI 使用)
由于电商平台页面结构常变，直接找现成的脚本很难用，建议用 Cursor 现写一个简单的 Scrapy 爬虫：
指令给 AI：
"写一个基于 Scrapy 的爬虫，目标是 Shopee Vietnam。
搜索关键词 'SSD 512GB'。
抓取前 10 页的商品信息。
提取字段：店铺名称 (Shop Name)、月销量 (Monthly Sales)、商品价格、店铺聊天链接。
过滤掉官方旗舰店 (Mall)，只保留个人店铺或普通企业店。"
数据分析：
导出 CSV。
找到那些月销量大（>100单），但价格卖得比较贵的卖家。
下一步动作：
通过电商平台的“聊一聊”功能（Chat），或者根据店铺名去 Google/Facebook 搜他们的真实联系方式。
话术：“我是源头工厂供应链，看你SSD销量不错，我这有同款方案，进货价便宜20%，有兴趣聊聊吗？”
战场三：LinkedIn & 公司官网（抓取B端采购经理）
目标客户：中大型系统集成商、地区总代理。
逻辑：这些是大鱼，不能靠群发，要精准找到 Purchasing Manager (采购经理) 的邮箱。
推荐开源项目
theHarvester (信息收集工具)
GitHub关键词：laramies/theHarvester
功能：输入一个域名（例如某俄罗斯分销商 dns-shop.ru），它会搜集该域名下暴露在搜索引擎、PGP服务器、LinkedIn 上的所有邮箱地址。
LinkedIn-Jobs-Scraper (需魔改)
替代方案：建议使用浏览器插件 Instant Data Scraper (非开源但免费好用) 配合 Google 搜索指令 (Dorks)。
落地工作流
Google Dorking (搜索指令)：
在 Google 搜索：site:linkedin.com/in/ "Purchasing Manager" "Computer Hardware" "Vietnam"
批量提取：
打开搜索结果页，使用 Instant Data Scraper 插件一键把所有人的名字和职位抓下来。
猜测/验证邮箱：
如果你知道对方公司域名是 abc.com，名字叫 John Doe。
使用开源工具 email-verifier (GitHub搜这个关键词) 来验证 john.doe@abc.com 是否真实存在。
战场四：数据清洗与管理（CRM）
抓来的一堆 Excel 表格如果不管理，就是垃圾。你需要一个开源 CRM。
推荐开源项目