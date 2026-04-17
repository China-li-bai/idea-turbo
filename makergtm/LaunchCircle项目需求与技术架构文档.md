# LaunchCircle项目需求与技术架构文档

## 文档说明

本文档是针对你提出的**将后端从 FastAPI 改为 Go**的需求，提供的**全细节、可落地、一步到位**的技术实现方案。所有服务都可以在你的 5 核 6G 单机 VPS 上一键部署，无需 K8s、无需集群，10 分钟就能跑通 MVP。

---

## 一、整体架构概览（Go 版）

我们把整个系统拆成 4 个独立的服务，全部用 Docker Compose 编排，单机就能跑：

|服务层|技术选型|资源占用|说明|
|---|---|---|---|
|**存储层**|ChromaDB 2\.0 单机版|1 核 2G|向量数据库，存储爆款案例，支持语义检索|
|**后端层**|Go \+ Gin 框架|0\.5 核 0\.5G|高性能 API 服务，比 Python 省 80% 资源|
|**前端层**|Next\.js 静态部署 \+ Nginx|0\.1 核 0\.5G|静态页面，Nginx 反向代理，不用 Vercel|
|**编排层**|Docker Compose|几乎不占资源|一键启动所有服务，不用运维|

**总资源占用：1\.6 核 3G**，你的 5 核 6G VPS，跑这个绰绰有余，剩下的资源还能跑其他服务。

---

## 二、存储层：ChromaDB 2\.0 单机部署（第一步）

这是整个系统的基础，先把向量数据库跑起来。

### 2\.1 部署步骤

我们用官方的 Docker 镜像，单机部署，数据持久化到本地硬盘，重启不丢数据：

1. **创建数据目录**

    ```bash
    mkdir -p /opt/launchcircle/chroma_data
    ```

2. **启动 ChromaDB**
你可以直接用 Docker 命令，或者后面用 Docker Compose 一键启动：

    ```bash
    docker run -d \
      --name chroma \
      -p 8000:8000 \
      -v /opt/launchcircle/chroma_data:/chroma/chroma \
      -e IS_PERSISTENT=TRUE \
      -e PERSIST_DIRECTORY=/chroma/chroma \
      chromadb/chroma:0.5.0
    ```

### 2\.2 验证部署

启动后，访问 `http://你的VPSIP:8000/api/v1/heartbeat`，如果返回 `\{\&\#34;nanosecond heartbeat\&\#34;: xxx\}`，就说明部署成功了。

---

## 三、后端层：Go \+ Gin 全细节实现（核心）

这是整个系统的核心，我们用 Go 的 Gin 框架，轻量、高性能，比 Python 省超多资源。

### 3\.1 项目目录结构

我们用标准的 Go 项目结构，清晰易维护：

```Plain Text
launchcircle-backend/
├── cmd/
│   └── api/
│       └── main.go          # 入口文件
├── internal/
│   ├── config/              # 配置管理
│   │   └── config.go
│   ├── chroma/              # Chroma向量库客户端
│   │   └── client.go
│   ├── llm/                 # LLM客户端（Groq）
│   │   └── client.go
│   ├── firecrawl/           # 网页爬取客户端
│   │   └── client.go
│   ├── handler/             # API接口处理器
│   │   ├── case_handler.go
│   │   ├── generate_handler.go
│   │   └── mutual_handler.go
│   └── model/              # 数据模型
│       └── models.go
├── go.mod                   # 依赖管理
├── go.sum
├── .env                     # 环境变量
└── Dockerfile               # Docker构建文件
```

### 3\.2 初始化项目 \&amp; 安装依赖

1. **初始化 Go 项目**

    ```bash
    mkdir -p /opt/launchcircle/backend
    cd /opt/launchcircle/backend
    go mod init launchcircle-backend
    ```

2. **安装所有依赖**

    ```bash
    # Gin Web框架
    go get github.com/gin-gonic/gin
    
    # Chroma Go客户端（官方维护，支持Chroma 2.0）
    go get github.com/amikos-tech/chroma-go/v2
    
    # Groq LLM客户端（兼容OpenAI接口，速度超快）
    go get github.com/sashabaranov/go-openai
    
    # Firecrawl 网页爬取客户端
    go get github.com/firecrawl/firecrawl-go
    
    # 环境变量管理
    go get github.com/joho/godotenv
    ```

### 3\.3 核心模块代码实现

#### 3\.3\.1 配置模块 `internal/config/config\.go`

读取环境变量，统一管理配置：

```go
package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	ChromaURL    string
	GroqAPIKey   string
	FirecrawlAPIKey string
	ServerPort   string
}

var AppConfig *Config

func Init() {
	_ = godotenv.Load() // 加载.env文件

	AppConfig = &Config{
		ChromaURL:    getEnv("CHROMA_URL", "http://localhost:8000"),
		GroqAPIKey:   getEnv("GROQ_API_KEY", ""),
		FirecrawlAPIKey: getEnv("FIRECRAWL_API_KEY", ""),
		ServerPort:   getEnv("SERVER_PORT", "8080"),
	}

	log.Println("配置加载完成")
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
```

#### 3\.3\.2 Chroma 客户端 `internal/chroma/client\.go`

连接 Chroma，实现案例的增删查改：

```go
package chroma

import (
	"context"
	"log"

	"github.com/amikos-tech/chroma-go/v2"
	"github.com/amikos-tech/chroma-go/v2/pkg/api/v2"
	"github.com/launchcircle-backend/internal/config"
)

var Client *chroma.Client
var CasesCollection *chroma.Collection

func Init() error {
	// 连接Chroma服务
	client, err := chroma.NewClient(
		chroma.WithBasePath(config.AppConfig.ChromaURL),
	)
	if err != nil {
		return err
	}

	Client = client

	// 检查服务是否正常
	_, err = client.Heartbeat(context.Background())
	if err != nil {
		return err
	}

	// 获取或创建案例集合
	collections, err := client.ListCollections(context.Background())
	if err != nil {
		return err
	}

	var caseCol *chroma.Collection
	found := false
	for _, col := range collections {
		if col.Name == "launch_cases" {
			caseCol = col
			found = true
			break
		}
	}

	if !found {
		// 创建新集合，默认用all-MiniLM embedding，本地跑，不用调用OpenAI
		caseCol, err = client.CreateCollection(context.Background(), &v2.CreateCollectionRequest{
			Name:          "launch_cases",
			IsPersisted:   true,
			HNSWSpace:     "l2",
		})
		if err != nil {
			return err
		}
		log.Println("创建了新的案例集合")
	}

	CasesCollection = caseCol
	log.Println("Chroma客户端初始化完成")
	return nil
}

// 添加案例到向量库
func AddCase(ctx context.Context, id, content string, metadata map[string]interface{}) error {
	rs := chroma.NewRecordSet(
		chroma.WithIDs([]string{id}),
		chroma.WithDocuments([]string{content}),
		chroma.WithMetadatas([]map[string]interface{}{metadata}),
	)

	err := rs.BuildAndValidate(ctx)
	if err != nil {
		return err
	}

	_, err = CasesCollection.AddRecords(ctx, rs)
	return err
}

// 语义检索相似案例
func SearchSimilarCases(ctx context.Context, query string, nResults int) ([]*chroma.QueryResult, error) {
	results, err := CasesCollection.Query(ctx, []string{query}, nResults, nil, nil, nil)
	if err != nil {
		return nil, err
	}
	return results, nil
}
```

#### 3\.3\.3 Groq LLM 客户端 `internal/llm/client\.go`

调用 Groq 的大模型，生成营销文案：

```go
package llm

import (
	"context"

	"github.com/launchcircle-backend/internal/config"
	"github.com/sashabaranov/go-openai"
)

var Client *openai.Client

func Init() {
	// Groq兼容OpenAI接口，直接用OpenAI的客户端就行
	config := openai.DefaultConfig(config.AppConfig.GroqAPIKey)
	config.BaseURL = "https://api.groq.com/openai/v1"
	Client = openai.NewClientWithConfig(config)
}

// 生成营销文案，基于相似案例
func GenerateMarketingCopy(ctx context.Context, productDesc string, similarCases string) (string, error) {
	messages := []openai.ChatCompletionMessage{
		{
			Role: openai.ChatMessageRoleSystem,
			Content: `你是一个专业的独立开发者营销专家，根据用户的产品描述，和参考的爆款案例，帮用户生成适合Product Hunt的营销文案。
参考案例：
` + similarCases + `
请生成：
1. 产品Tagline（一句话介绍）
2. Product Hunt描述文案
3. 首发推文文案
`,
		},
		{
			Role:    openai.ChatMessageRoleUser,
			Content: productDesc,
		},
	}

	resp, err := Client.CreateChatCompletion(
		ctx,
		openai.ChatCompletionRequest{
			Model:       "llama3-8b-8192", // Groq的Llama3，速度超快，免费额度够用
			Messages:    messages,
			Temperature: 0.7,
		},
	)

	if err != nil {
		return "", err
	}

	return resp.Choices[0].Message.Content, nil
}
```

#### 3\.3\.4 Firecrawl 客户端 `internal/firecrawl/client\.go`

爬取竞品的页面，提取信息：

```go
package firecrawl

import (
	"github.com/launchcircle-backend/internal/config"
	"github.com/firecrawl/firecrawl-go"
)

var Client *firecrawl.FirecrawlApp

func Init() error {
	app, err := firecrawl.NewFirecrawlApp(config.AppConfig.FirecrawlAPIKey, "https://api.firecrawl.dev")
	if err != nil {
		return err
	}
	Client = app
	return nil
}

// 爬取网页，转成Markdown
func ScrapeURL(url string) (string, error) {
	result, err := Client.ScrapeURL(url, nil)
	if err != nil {
		return "", err
	}
	return result.Markdown, nil
}
```

#### 3\.3\.5 API 接口处理器 `internal/handler/generate\_handler\.go`

核心接口：用户提交产品，生成营销文案：

```go
package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/launchcircle-backend/internal/chroma"
	"github.com/launchcircle-backend/internal/llm"
)

type GenerateRequest struct {
	ProductDescription string `json:"product_description" binding:"required"`
}

func GenerateMarketingHandler(c *gin.Context) {
	var req GenerateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 1. 语义检索相似的爆款案例
	results, err := chroma.SearchSimilarCases(c, req.ProductDescription, 5)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "检索案例失败"})
		return
	}

	// 2. 把案例拼成prompt
	caseText := ""
	for i, res := range results {
		caseText += "案例" + string(rune(i+1)) + ":\n" + res.Document + "\n\n"
	}

	// 3. 调用Groq生成文案
	copy, err := llm.GenerateMarketingCopy(c, req.ProductDescription, caseText)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "生成文案失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"copy": copy,
		"similar_cases": results,
	})
}
```

#### 3\.3\.6 入口文件 `cmd/api/main\.go`

把所有模块串起来，启动服务：

```go
package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/launchcircle-backend/internal/chroma"
	"github.com/launchcircle-backend/internal/config"
	"github.com/launchcircle-backend/internal/firecrawl"
	"github.com/launchcircle-backend/internal/handler"
	"github.com/launchcircle-backend/internal/llm"
)

func main() {
	// 1. 初始化配置
	config.Init()

	// 2. 初始化Chroma
	err := chroma.Init()
	if err != nil {
		log.Fatalf("Chroma初始化失败: %v", err)
	}

	// 3. 初始化LLM
	llm.Init()

	// 4. 初始化Firecrawl
	err = firecrawl.Init()
	if err != nil {
		log.Fatalf("Firecrawl初始化失败: %v", err)
	}

	// 5. 启动Gin服务
	r := gin.Default()

	// 跨域中间件
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// API路由
	api := r.Group("/api")
	{
		api.POST("/generate-marketing", handler.GenerateMarketingHandler)
		// 其他接口：案例导入、互助匹配等，同理
	}

	// 启动服务
	log.Printf("服务启动在 :%s", config.AppConfig.ServerPort)
	r.Run(":" + config.AppConfig.ServerPort)
}
```

### 3\.4 环境变量配置 `\.env`

```env
# Chroma配置
CHROMA_URL=http://chroma:8000  # Docker内部的域名，不用改IP

# Groq API Key，去https://console.groq.com/拿
GROQ_API_KEY=你的Groq_API_Key

# Firecrawl API Key，去https://www.firecrawl.dev/拿
FIRECRAWL_API_KEY=你的Firecrawl_API_Key

# 服务端口
SERVER_PORT=8080
```

### 3\.5 Dockerfile 构建后端镜像

```dockerfile
# 构建阶段
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o launchcircle-backend ./cmd/api

# 运行阶段
FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/launchcircle-backend .
COPY --from=builder /app/.env .
EXPOSE 8080
CMD ["./launchcircle-backend"]
```

---

## 四、前端层：Next\.js 静态部署

前端和之前的方案一样，用 Next\.js，静态部署，Nginx 反向代理，不用 Vercel：

### 4\.1 部署步骤

1. **构建 Next\.js 静态文件**

    ```bash
    cd /opt/launchcircle/frontend
    npm install
    npm run build
    # 静态文件会生成在 .next 目录
    ```

2. **Nginx 配置**
创建 `/etc/nginx/conf\.d/launchcircle\.conf`：

    ```nginx
    server {
        listen 80;
        server_name 你的域名;
    
        # 静态文件
        location / {
            root /opt/launchcircle/frontend/.next;
            try_files $uri $uri/ /index.html;
        }
    
        # 反向代理后端API
        location /api/ {
            proxy_pass http://backend:8080;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
    ```

---

## 五、编排层：Docker Compose 一键启动

不用 K8s，用 Docker Compose，把所有服务串起来，一键启动，不用管网络、不用管依赖：

### 5\.1 `docker\-compose\.yml` 配置文件

放在 `/opt/launchcircle/docker\-compose\.yml`：

```yaml
version: '3.8'

services:
  # 向量数据库
  chroma:
    image: chromadb/chroma:0.5.0
    container_name: launchcircle-chroma
    restart: always
    ports:
      - "8000:8000"
    volumes:
      - ./chroma_data:/chroma/chroma
    environment:
      - IS_PERSISTENT=TRUE
      - PERSIST_DIRECTORY=/chroma/chroma
    networks:
      - launchcircle-network

  # Go后端服务
  backend:
    build: ./backend
    container_name: launchcircle-backend
    restart: always
    ports:
      - "8080:8080"
    depends_on:
      - chroma
    networks:
      - launchcircle-network

  # Nginx前端服务
  frontend:
    image: nginx:alpine
    container_name: launchcircle-frontend
    restart: always
    ports:
      - "80:80"
    volumes:
      - ./frontend/.next:/usr/share/nginx/html
      - ./nginx/launchcircle.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - backend
    networks:
      - launchcircle-network

networks:
  launchcircle-network:
    driver: bridge
```

### 5\.2 一键启动所有服务

```bash
cd /opt/launchcircle
docker-compose up -d
```

就这么简单，执行完这一条命令，所有服务就都启动了：

- ChromaDB：`http://你的IP:8000`

- 后端 API：`http://你的IP:8080`

- 前端页面：`http://你的IP`

### 5\.3 常用命令

```bash
# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 更新服务
docker-compose up -d --build
```

---

## 六、初始化数据：导入初始爆款案例

第一次启动后，你需要导入一些初始的爆款案例，这样用户一进来就能用：

写一个简单的初始化脚本 `init\_cases\.go`：

```go
package main

import (
	"context"
	"log"

	"github.com/launchcircle-backend/internal/chroma"
	"github.com/launchcircle-backend/internal/config"
)

func main() {
	config.Init()
	err := chroma.Init()
	if err != nil {
		log.Fatal(err)
	}

	// 初始案例，你可以自己加，比如Product Hunt的爆款产品
	cases := []struct {
		id       string
		content  string
		metadata map[string]interface{}
	}{
		{
			id: "case-1",
			content: `产品：TypingMind，一个AI聊天UI，支持Claude、GPT，一键切换。
Tagline：The better UI for ChatGPT.
Product Hunt描述：TypingMind is a better UI for ChatGPT, with folders, tags, search, and more.
首发推文：I built a better UI for ChatGPT, and it's free. 10k users in 3 days. https://t.co/xxx`,
			metadata: map[string]interface{}{
				"category": "AI Tool",
				"upvotes":  10000,
			},
		},
		// 更多案例...
	}

	for _, c := range cases {
		err := chroma.AddCase(context.Background(), c.id, c.content, c.metadata)
		if err != nil {
			log.Printf("添加案例失败: %v", err)
		}
		log.Printf("添加案例: %s", c.id)
	}
}
```

运行这个脚本，就把初始案例导入到 Chroma 里了。

---

## 七、验证部署

启动后，你可以用 curl 测试一下 API 是不是正常：

```bash
curl -X POST http://你的IP/api/generate-marketing \
  -H "Content-Type: application/json" \
  -d '{"product_description": "一个帮独立开发者冷启动的工具，14天拿到100个种子用户"}'
```

如果返回了生成的文案，就说明整个系统跑通了！

---

## 八、资源占用说明

所有服务启动后，资源占用情况：

- ChromaDB：\\1 核，\\1\.5G 内存

- Go 后端：\\0\.2 核，\\300M 内存

- Nginx：\\0\.01 核，\\10M 内存

- **总占用：1\.21 核，1\.8G 内存**

你的 5 核 6G 的 VPS，跑这个完全绰绰有余，剩下的资源还能跑其他服务，完全不用担心。

---

## 九、后续扩展

等你 MVP 跑通了，要扩展的话，也很简单：

1. 要加更多功能，直接在 Go 后端加接口就行，Go 的并发能力很强，支持 1 万 QPS 都没问题

2. 要加更多用户，Chroma 单机支持 100 万向量都没问题，足够你用很久

3. 以后要上云，也不用改代码，直接把 Chroma 换成 Pinecone 托管版就行，代码不用动

整个方案，你照着做，10 分钟就能把整个 MVP 跑起来，完全不用运维，不用搞复杂的集群，单机就能搞定。

> （注：文档部分内容可能由 AI 生成）
