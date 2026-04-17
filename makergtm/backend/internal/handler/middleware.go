package handler

import (
	"io"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type tokenBucket struct {
	tokens     float64
	maxTokens  float64
 refillRate float64
	lastRefill time.Time
	mu         sync.Mutex
}

func newTokenBucket(maxTokens, refillRate float64) *tokenBucket {
	return &tokenBucket{
		tokens:     maxTokens,
		maxTokens:  maxTokens,
		refillRate: refillRate,
		lastRefill: time.Now(),
	}
}

func (b *tokenBucket) allow() bool {
	b.mu.Lock()
	defer b.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(b.lastRefill).Seconds()
	if elapsed > 0 {
		b.tokens += elapsed * b.refillRate
		if b.tokens > b.maxTokens {
			b.tokens = b.maxTokens
		}
	}
	b.lastRefill = now

	if b.tokens >= 1.0 {
		b.tokens -= 1.0
		return true
	}
	return false
}

var (
	rateLimitBuckets = make(map[string]*tokenBucket)
	rateLimitMu      sync.RWMutex
)

func RateLimitMiddleware(requestsPerMinute int) gin.HandlerFunc {
	refillRate := float64(requestsPerMinute) / 60.0
	return func(c *gin.Context) {
		clientIP := c.ClientIP()

		rateLimitMu.RLock()
		bucket, exists := rateLimitBuckets[clientIP]
		rateLimitMu.RUnlock()

		if !exists {
			rateLimitMu.Lock()
			if b, ok := rateLimitBuckets[clientIP]; ok {
				bucket = b
			} else {
				bucket = newTokenBucket(float64(requestsPerMinute), refillRate)
				rateLimitBuckets[clientIP] = bucket
			}
			rateLimitMu.Unlock()
		}

		if !bucket.allow() {
			c.Header("Retry-After", "60")
			c.AbortWithStatusJSON(429, gin.H{
				"error":       "rate limit exceeded",
				"retry_after": "60s",
				"limit":       requestsPerMinute,
			})
			return
		}

		c.Header("X-RateLimit-Remaining", "1")
		c.Next()
	}
}

func BodySizeLimit(maxBytes int) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Body != nil {
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, int64(maxBytes))
		}
		c.Next()
	}
}

func RequestIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()[:8]
		}
		c.Set("request_id", requestID)
		c.Header("X-Request-ID", requestID)
		c.Next()
	}
}

func LoggingMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		c.Next()

		latency := time.Since(start)
		clientIP := c.ClientIP()
		method := c.Request.Method
		statusCode := c.Writer.Status()

		if raw != "" {
			path = path + "?" + raw
		}

		requestID, _ := c.Get("request_id")

		log.Printf(`{"level":"info","request_id":"%v","method":"%s","path":"%s","status":%d,"latency_ms":%d,"client_ip":"%s"}`,
			requestID, method, path, statusCode, latency.Milliseconds(), clientIP)
	}
}

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Request-ID, Authorization")
		c.Writer.Header().Set("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func RecoveryMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				requestID, _ := c.Get("request_id")
				log.Printf(`{"level":"error","request_id":"%v","panic":"%v","path":"%s"}`,
					requestID, err, c.Request.URL.Path)
				c.AbortWithStatusJSON(500, gin.H{
					"error":   "internal server error",
					"request_id": requestID,
				})
			}
		}()
		c.Next()
	}
}
