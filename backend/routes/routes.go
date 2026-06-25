package routes

import (
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"github.com/blacken/admin-panel/config"
	"github.com/blacken/admin-panel/handlers"
	"github.com/blacken/admin-panel/middleware"
	"github.com/blacken/admin-panel/services"
)

func Setup(cfg *config.Config) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	r.Use(middleware.SecurityHeaders())
	r.Use(middleware.MaxBodySize(1 << 20)) // 1MB max

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	authSvc := services.NewAuthService(cfg)
	userSvc := services.NewUserService()

	ah := handlers.NewAuthHandler(authSvc, cfg)
	uh := handlers.NewUserHandler(userSvc)
	dh := handlers.NewDashboardHandler()
	sh := handlers.NewSettingsHandler()
	ih := handlers.NewInstallHandler(cfg.JWTSecret)

	loginLimiter := middleware.NewRateLimiter(5, time.Minute)

	api := r.Group("/api")
	{
		api.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok"})
		})

		install := api.Group("/install")
		{
			install.GET("/status", ih.Status)
			install.GET("/pending", ih.PendingScan)
			install.POST("/connect", ih.ConnectGameDB)
			install.POST("/mappings", ih.SaveMappings)
			install.POST("/complete", ih.CompleteInstall)
			install.POST("/reset", ih.ResetInstall)
		}

		api.POST("/auth/login", middleware.RateLimit(loginLimiter), ah.Login)
		api.GET("/auth/google", ah.GoogleLogin)
		api.GET("/auth/google/callback", ah.GoogleCallback)
		api.GET("/auth/github", ah.GithubLogin)
		api.GET("/auth/github/callback", ah.GithubCallback)

		p := api.Group("")
		p.Use(middleware.AuthRequired(cfg))
		{
			p.GET("/me", ah.Me)
			p.GET("/dashboard/stats", dh.Stats)

			p.GET("/users", middleware.RequirePermission("users", "read"), uh.List)
			p.POST("/users", middleware.RequirePermission("users", "create"), uh.Create)
			p.GET("/users/:id", middleware.RequirePermission("users", "read"), uh.Get)
			p.PUT("/users/:id", middleware.RequirePermission("users", "update"), uh.Update)
			p.DELETE("/users/:id", middleware.RequirePermission("users", "delete"), uh.Delete)

			p.GET("/roles", middleware.RequirePermission("roles", "read"), uh.ListRoles)
			p.PUT("/settings/profile", sh.UpdateProfile)
			p.PUT("/settings/password", sh.ChangePassword)
		}
	}

	return r
}
