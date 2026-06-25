package middleware

import (
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
)

var (
	htmlTagRegex = regexp.MustCompile(`<[^>]*>`)
	uuidRegex    = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)
)

func SanitizeInput() gin.HandlerFunc {
	return func(c *gin.Context) {
		if strings.HasPrefix(c.ContentType(), "application/json") {
			body, err := c.GetRawData()
			if err == nil {
				sanitized := htmlTagRegex.ReplaceAllString(string(body), "")
				c.Request.Body = &readCloser{strings.NewReader(sanitized)}
			}
		}
		c.Next()
	}
}

func IsValidUUID(id string) bool {
	return uuidRegex.MatchString(strings.ToLower(id))
}

type readCloser struct {
	*strings.Reader
}

func (rc *readCloser) Close() error {
	return nil
}
