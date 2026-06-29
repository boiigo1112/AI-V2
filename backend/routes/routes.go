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
	couponSvc := services.NewCouponService()
	tenantSvc := services.NewTenantService()
	backupSvc := services.NewBackupService()
	validator := services.NewValidator(gameSvc)
	auditSvc := services.NewAuditService()
	paymentSvc := services.NewPaymentService(tenantSvc)
	subscriptionSvc := services.NewSubscriptionService()
	ah := handlers.NewAuthHandler(authSvc, cfg)
	uh := handlers.NewUserHandler(userSvc)
	dh := handlers.NewDashboardHandler()
	sh := handlers.NewSettingsHandler()
	ih := handlers.NewInstallHandler(cfg.JWTSecret)
	gh := handlers.NewGameHandler(gameSvc, backupSvc, validator, auditSvc)
	ch := handlers.NewCouponHandler(couponSvc)
	invh := handlers.NewInventoryHandler(gameSvc, backupSvc, validator, auditSvc)
	th := handlers.NewTenantHandler(tenantSvc)
	sah := handlers.NewSaasAdminHandler()
	ph := handlers.NewPaymentHandler(paymentSvc)
	sh2 := handlers.NewSubscriptionHandler(subscriptionSvc)

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
		api.POST("/auth/register", ah.Register)
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
				game.GET("/guilds", gh.ListGuilds)
				game.GET("/guilds/stats", gh.GuildStats)
				game.GET("/guilds/:id", gh.GetGuildDetail)
				game.PUT("/guilds/:id", gh.UpdateGuild)
				game.GET("/pets", gh.ListPets)
				game.GET("/pets/stats", gh.PetStats)
				game.GET("/pets/:id", gh.GetPetDetail)
				game.PUT("/pets/:id", gh.UpdatePet)
				game.GET("/pk-ranking", gh.PKRanking)
				game.GET("/pk-ranking/death", gh.PKDeathRanking)
				game.GET("/pk-ranking/stats", gh.PKStats)
				game.GET("/pk-ranking/:id", gh.PKRecordHistory)
				// Player Security
				game.GET("/player-security", gh.GetSecurityInfo)
				game.GET("/player-security/login-logs", gh.GetLoginLogs)
				game.GET("/player-security/device-checks", gh.GetDeviceChecks)
				game.GET("/player-security/block-history", gh.GetBlockHistory)
				game.POST("/player-security/ban-ip", gh.BanIP)
				game.POST("/player-security/ban-pc", gh.BanPC)
				game.POST("/player-security/unban", gh.Unban)
				// Ban Manager
				game.GET("/ban-manager/ip-bans", gh.ListIPBans)
				game.GET("/ban-manager/pc-bans", gh.ListPCBans)
				game.GET("/ban-manager/stats", gh.BanManagerStats)
				game.POST("/ban-manager/ban-ip", gh.BanIP)
				game.POST("/ban-manager/ban-pc", gh.BanPC)
				game.POST("/ban-manager/unban", gh.Unban)
				// Online Map
				game.GET("/online-map/players", gh.ListOnlinePlayers)
				game.GET("/online-map/stats", gh.OnlineMapStats)
				game.GET("/game-stats", gh.GameStats)
				game.GET("/top-points", gh.ListTopPoints)
				game.GET("/top-money", gh.ListTopMoney)
				game.GET("/inventory/:chaNum", invh.GetInventory)
				game.DELETE("/inventory/:chaNum/item/:slotIdx", invh.DeleteInventoryItem)
				game.POST("/inventory/:chaNum/item", invh.AddInventoryItem)
				game.GET("/items/search", invh.SearchItems)
			}

			// Coupon routes
			coupon := p.Group("/coupons")
			{
				coupon.GET("", ch.ListCoupons)
				coupon.GET("/:id", ch.GetCoupon)
				coupon.POST("", ch.CreateCoupon)
				coupon.PUT("/:id", ch.UpdateCoupon)
				coupon.DELETE("/:id", ch.DeleteCoupon)
				coupon.GET("/:id/usage", ch.GetCouponUsage)
				coupon.POST("/redeem", ch.RedeemCoupon)
			}

			// Tenant management routes (superadmin)
			tenants := p.Group("/tenants")
			tenants.Use(middleware.RequirePermission("tenants", "admin"))
			{
				tenants.GET("", th.ListTenants)
				tenants.POST("", th.CreateTenant)
				tenants.GET("/:id", th.GetTenant)
				tenants.PUT("/:id", th.UpdateTenant)
				tenants.DELETE("/:id", th.DeleteTenant)
				tenants.GET("/:id/stats", th.GetTenantStats)
			}

			// Plan routes (authenticated users can list, superadmin can create)
			plans := p.Group("/plans")
			{
				plans.GET("", th.ListPlans)
				plans.POST("", middleware.RequirePermission("plans", "admin"), th.CreatePlan)
			}

			// Payment routes
			payment := p.Group("/payment")
			{
				payment.POST("/create-invoice", ph.CreateInvoice)
				payment.POST("/confirm", middleware.RequirePermission("payment", "admin"), ph.ConfirmPayment)
				payment.GET("/invoices", ph.ListInvoices)
				payment.GET("/invoices/:id", ph.GetInvoiceByID)
				payment.GET("/configs", ph.GetPaymentConfigs)
				payment.PUT("/configs", middleware.RequirePermission("payment", "admin"), ph.UpdatePaymentConfig)
				payment.GET("/stats", middleware.RequirePermission("payment", "admin"), ph.GetRevenueStats)
				payment.GET("/billing", ph.GetBillingHistory)
			}

			// Subscription routes
			subscription := p.Group("/subscription")
			{
				subscription.POST("/activate", middleware.RequirePermission("subscription", "admin"), sh2.ActivateSubscription)
				subscription.POST("/renew", sh2.RenewSubscription)
				subscription.GET("/current", sh2.GetCurrentSubscription)
				subscription.POST("/extend-trial", middleware.RequirePermission("subscription", "admin"), sh2.ExtendTrial)
				subscription.GET("/expiring", middleware.RequirePermission("subscription", "admin"), sh2.ListExpiringSoon)
				subscription.POST("/check-expiry", middleware.RequirePermission("subscription", "admin"), sh2.CheckExpiry)
			}

			// SaaS admin dashboard (superadmin only)
			saas := p.Group("/saas")
			saas.Use(middleware.RequirePermission("saas", "admin"))
			{
				saas.GET("/stats", sah.Stats)
				saas.GET("/tenants", sah.ListTenants)
				saas.PUT("/tenants/:id/status", sah.UpdateTenantStatus)
				saas.POST("/tenants/:id/extend", sah.ExtendTenantExpiry)
			}
		}
	}

	return r
}
