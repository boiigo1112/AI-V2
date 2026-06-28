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
	gameSvc := services.NewGameService(cfg.JWTSecret)

	ah := handlers.NewAuthHandler(authSvc, cfg)
	uh := handlers.NewUserHandler(userSvc)
	dh := handlers.NewDashboardHandler()
	sh := handlers.NewSettingsHandler()
	ih := handlers.NewInstallHandler(cfg.JWTSecret)
	gh := handlers.NewGameHandler(gameSvc)

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

			game := p.Group("/game")
			{
				game.GET("/status", gh.Status)
				game.POST("/reconnect", gh.Reconnect)
				game.GET("/databases", gh.ListDatabases)
				game.GET("/databases/:db/tables", gh.ListTables)
				game.GET("/databases/:db/tables/all", gh.ListAllTables)
				game.GET("/databases/:db/tables/:table/columns", gh.GetTableColumns)
				game.GET("/players", gh.ListPlayers)
				game.GET("/players/:id", gh.GetPlayer)
				game.GET("/players/:id/characters", gh.GetPlayerCharacters)
				game.POST("/players/:id/block", gh.BlockPlayer)
				game.POST("/players/:id/unblock", gh.UnblockPlayer)
				game.PUT("/characters/:id", gh.UpdateCharacter)
				game.PUT("/players/:id", gh.UpdatePlayer)
				game.GET("/shop", gh.ListShopItems)
				game.POST("/shop", gh.CreateShopItem)
				game.PUT("/shop/:id", gh.UpdateShopItem)
				game.DELETE("/shop/:id", gh.DeleteShopItem)
				game.GET("/characters", gh.ListAllCharacters)
				game.GET("/characters/stats", gh.CharacterStats)
				game.GET("/characters/:id", gh.GetCharacterDetail)
				game.POST("/characters/:id/ban", gh.BanCharacter)
				game.POST("/characters/:id/unban", gh.UnbanCharacter)
				game.GET("/logs/:db", gh.ListLogs)
				game.GET("/gmc/lookup", gh.GmcLookup)
				game.POST("/gmc/send-item", gh.GmcSendItem)
				game.POST("/gmc/update-point", gh.GmcUpdatePoint)
				game.GET("/gmc/history/:id", gh.GmcPlayerHistory)
				game.GET("/gmc/logs", gh.GmcLogs)
				game.POST("/gmc/notice", gh.GmcNotice)
				game.GET("/gmc/item-tracking", gh.GmcItemTracking)
			}
		}
	}

	return r
}
