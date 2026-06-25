package gamedatabase

import "time"

type GameDBConnection struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	DBType    string    `json:"db_type"`
	Host      string    `json:"host"`
	Port      int       `json:"port"`
	Database  string    `json:"database"`
	Username  string    `json:"username"`
	Password  string    `json:"password"`
	Connected bool      `json:"connected"`
	CreatedAt time.Time `json:"created_at"`
}

type GameDBTable struct {
	Catalog  string `json:"catalog"`
	Schema   string `json:"schema"`
	Table    string `json:"table"`
	Type     string `json:"type"`
}

type GameDBColumn struct {
	Catalog    string `json:"catalog"`
	Table      string `json:"table"`
	Column     string `json:"column"`
	DataType   string `json:"data_type"`
	MaxLength  *int   `json:"max_length,omitempty"`
	IsNullable bool   `json:"is_nullable"`
	IsPK       bool   `json:"is_pk"`
	DefaultVal string `json:"default_val,omitempty"`
}

type ColumnMapping struct {
	ID            string `json:"id"`
	DBName        string `json:"db_name"`
	TableName     string `json:"table_name"`
	StandardField string `json:"standard_field"`
	ActualColumn  string `json:"actual_column"`
	DataType      string `json:"data_type"`
	IsRequired    bool   `json:"is_required"`
}

type StandardField struct {
	DBName   string `json:"db_name"`
	Table    string `json:"table"`
	Field    string `json:"field"`
	Label    string `json:"label"`
	Desc     string `json:"desc"`
	Required bool   `json:"required"`
}

var StandardFields = []StandardField{
	// ============================================================
	// RanUser
	// ============================================================

	// UserInfo
	{DBName: "RanUser", Table: "UserInfo", Field: "UserNum", Label: "UserNum (PK)", Desc: "รหัสผู้ใช้", Required: true},
	{DBName: "RanUser", Table: "UserInfo", Field: "UserID", Label: "UserID", Desc: "ไอดีผู้ใช้", Required: true},
	{DBName: "RanUser", Table: "UserInfo", Field: "UserName", Label: "UserName", Desc: "ชื่อผู้ใช้", Required: false},
	{DBName: "RanUser", Table: "UserInfo", Field: "UserPass", Label: "UserPass (plain)", Desc: "รหัสผ่าน (plain)", Required: false},
	{DBName: "RanUser", Table: "UserInfo", Field: "UserPass_N", Label: "UserPass_N (hash)", Desc: "รหัสผ่าน (hash)", Required: false},
	{DBName: "RanUser", Table: "UserInfo", Field: "UserPass2", Label: "UserPass2", Desc: "รหัสผ่าน 2", Required: false},
	{DBName: "RanUser", Table: "UserInfo", Field: "Email", Label: "Email", Desc: "อีเมล", Required: false},
	{DBName: "RanUser", Table: "UserInfo", Field: "RegDate", Label: "RegDate", Desc: "วันที่สมัคร", Required: false},
	{DBName: "RanUser", Table: "UserInfo", Field: "LastLogin", Label: "LastLogin", Desc: "เข้าสู่ระบบล่าสุด", Required: false},
	{DBName: "RanUser", Table: "UserInfo", Field: "LastIP", Label: "LastIP", Desc: "IP ล่าสุด", Required: false},

	// FullUserInfo
	{DBName: "RanUser", Table: "FullUserInfo", Field: "UserNum", Label: "UserNum (PK)", Desc: "รหัสผู้ใช้", Required: true},
	{DBName: "RanUser", Table: "FullUserInfo", Field: "UserID", Label: "UserID", Desc: "ไอดีผู้ใช้", Required: true},
	{DBName: "RanUser", Table: "FullUserInfo", Field: "UserName", Label: "UserName", Desc: "ชื่อผู้ใช้", Required: false},
	{DBName: "RanUser", Table: "FullUserInfo", Field: "UserPass", Label: "UserPass", Desc: "รหัสผ่าน", Required: false},
	{DBName: "RanUser", Table: "FullUserInfo", Field: "Email", Label: "Email", Desc: "อีเมล", Required: false},
	{DBName: "RanUser", Table: "FullUserInfo", Field: "Sex", Label: "Sex", Desc: "เพศ", Required: false},
	{DBName: "RanUser", Table: "FullUserInfo", Field: "SafeId", Label: "SafeId", Desc: "รหัสความปลอดภัย", Required: false},

	// gmc
	{DBName: "RanUser", Table: "gmc", Field: "username", Label: "GM Username", Desc: "ชื่อ GM", Required: true},
	{DBName: "RanUser", Table: "gmc", Field: "session", Label: "Session", Desc: "Session", Required: false},
	{DBName: "RanUser", Table: "gmc", Field: "sesexp", Label: "Session Expiry", Desc: "หมดอายุ session", Required: false},

	// ServerGroup
	{DBName: "RanUser", Table: "ServerGroup", Field: "SGNum", Label: "Server Group Num", Desc: "รหัสกลุ่มเซิร์ฟเวอร์", Required: true},
	{DBName: "RanUser", Table: "ServerGroup", Field: "SGName", Label: "SGName", Desc: "ชื่อกลุ่มเซิร์ฟเวอร์", Required: false},

	// ServerInfo
	{DBName: "RanUser", Table: "ServerInfo", Field: "SGNum", Label: "SGNum (FK)", Desc: "รหัสกลุ่มเซิร์ฟเวอร์", Required: true},
	{DBName: "RanUser", Table: "ServerInfo", Field: "SvrNum", Label: "Server Number", Desc: "หมายเลขเซิร์ฟเวอร์", Required: true},
	{DBName: "RanUser", Table: "ServerInfo", Field: "SvrType", Label: "Server Type", Desc: "ประเภทเซิร์ฟเวอร์", Required: false},

	// BlockAddress
	{DBName: "RanUser", Table: "BlockAddress", Field: "IP", Label: "IP", Desc: "IP ที่ถูกแบน", Required: true},

	// BlockPCID
	{DBName: "RanUser", Table: "BlockPCID", Field: "PCID", Label: "PC ID", Desc: "PC ที่ถูกแบน", Required: true},

	// LogLogin
	{DBName: "RanUser", Table: "LogLogin", Field: "UserNum", Label: "UserNum", Desc: "รหัสผู้ใช้", Required: true},
	{DBName: "RanUser", Table: "LogLogin", Field: "IP", Label: "IP", Desc: "IP ที่เข้าสู่ระบบ", Required: false},
	{DBName: "RanUser", Table: "LogLogin", Field: "LogDate", Label: "LogDate", Desc: "วันที่เข้าสู่ระบบ", Required: false},

	// ============================================================
	// RanGame1
	// ============================================================

	// ChaInfo
	{DBName: "RanGame1", Table: "ChaInfo", Field: "ChaNum", Label: "ChaNum (PK)", Desc: "รหัสตัวละคร", Required: true},
	{DBName: "RanGame1", Table: "ChaInfo", Field: "UserNum", Label: "UserNum (FK)", Desc: "รหัสผู้ใช้", Required: true},
	{DBName: "RanGame1", Table: "ChaInfo", Field: "ChaName", Label: "ChaName", Desc: "ชื่อตัวละคร", Required: true},
	{DBName: "RanGame1", Table: "ChaInfo", Field: "ChaLevel", Label: "ChaLevel", Desc: "เลเวล", Required: true},
	{DBName: "RanGame1", Table: "ChaInfo", Field: "ChaClass", Label: "ChaClass", Desc: "คลาส", Required: false},
	{DBName: "RanGame1", Table: "ChaInfo", Field: "ChaSchool", Label: "ChaSchool", Desc: "สายอาชีพ", Required: false},
	{DBName: "RanGame1", Table: "ChaInfo", Field: "ChaMoney", Label: "ChaMoney", Desc: "เงิน", Required: false},
	{DBName: "RanGame1", Table: "ChaInfo", Field: "ChaExp", Label: "ChaExp", Desc: "ประสบการณ์", Required: false},
	{DBName: "RanGame1", Table: "ChaInfo", Field: "ChaOnline", Label: "ChaOnline", Desc: "สถานะออนไลน์", Required: false},
	{DBName: "RanGame1", Table: "ChaInfo", Field: "ChaDeleted", Label: "ChaDeleted", Desc: "ถูกลบ", Required: false},
	{DBName: "RanGame1", Table: "ChaInfo", Field: "ChaCreateDate", Label: "ChaCreateDate", Desc: "วันที่สร้าง", Required: false},
	{DBName: "RanGame1", Table: "ChaInfo", Field: "ChaReborn", Label: "ChaReborn", Desc: "จำนวน Reborn", Required: false},
	{DBName: "RanGame1", Table: "ChaInfo", Field: "ChaPower", Label: "ChaPower", Desc: "พลัง", Required: false},
	{DBName: "RanGame1", Table: "ChaInfo", Field: "ChaDex", Label: "ChaDex", Desc: "ความคล่องตัว", Required: false},
	{DBName: "RanGame1", Table: "ChaInfo", Field: "ChaSpirit", Label: "ChaSpirit", Desc: "จิตวิญญาณ", Required: false},
	{DBName: "RanGame1", Table: "ChaInfo", Field: "ChaStrong", Label: "ChaStrong", Desc: "ความแข็งแกร่ง", Required: false},
	{DBName: "RanGame1", Table: "ChaInfo", Field: "ChaIntel", Label: "ChaIntel", Desc: "สติปัญญา", Required: false},
	{DBName: "RanGame1", Table: "ChaInfo", Field: "ChaPK", Label: "ChaPK", Desc: "PK count", Required: false},
	{DBName: "RanGame1", Table: "ChaInfo", Field: "ChaInvenLine", Label: "ChaInvenLine", Desc: "จำนวนบรรทัดใน Inventory", Required: false},

	// ChaNameInfo
	{DBName: "RanGame1", Table: "ChaNameInfo", Field: "ChaNum", Label: "ChaNum", Desc: "รหัสตัวละคร", Required: true},
	{DBName: "RanGame1", Table: "ChaNameInfo", Field: "ChaName", Label: "ChaName", Desc: "ชื่อตัวละคร", Required: true},

	// GuildInfo
	{DBName: "RanGame1", Table: "GuildInfo", Field: "GuNum", Label: "GuNum (PK)", Desc: "รหัสกิลด์", Required: true},
	{DBName: "RanGame1", Table: "GuildInfo", Field: "GuName", Label: "GuName", Desc: "ชื่อกิลด์", Required: true},
	{DBName: "RanGame1", Table: "GuildInfo", Field: "GuMaster", Label: "GuMaster", Desc: "หัวหน้ากิลด์", Required: false},
	{DBName: "RanGame1", Table: "GuildInfo", Field: "GuMemberNum", Label: "GuMemberNum", Desc: "จำนวนสมาชิก", Required: false},

	// GameNotice
	{DBName: "RanGame1", Table: "GameNotice", Field: "Subject", Label: "Subject", Desc: "หัวข้อประกาศ", Required: true},
	{DBName: "RanGame1", Table: "GameNotice", Field: "Content", Label: "Content", Desc: "เนื้อหา", Required: false},
	{DBName: "RanGame1", Table: "GameNotice", Field: "EndDate", Label: "EndDate", Desc: "วันสิ้นสุด", Required: false},

	// ============================================================
	// RanLog
	// ============================================================

	// LogAction
	{DBName: "RanLog", Table: "LogAction", Field: "ActionNum", Label: "ActionNum (PK)", Desc: "รหัส action", Required: true},
	{DBName: "RanLog", Table: "LogAction", Field: "ChaNum", Label: "ChaNum", Desc: "รหัสตัวละคร", Required: true},
	{DBName: "RanLog", Table: "LogAction", Field: "Type", Label: "Type", Desc: "ประเภท action", Required: false},
	{DBName: "RanLog", Table: "LogAction", Field: "ActionDate", Label: "ActionDate", Desc: "วันที่ action", Required: false},
	{DBName: "RanLog", Table: "LogAction", Field: "ActionMoney", Label: "ActionMoney", Desc: "เงินที่ใช้", Required: false},

	// GM_Logs
	{DBName: "RanLog", Table: "GM_Logs", Field: "RecordID", Label: "RecordID (PK)", Desc: "รหัสบันทึก", Required: true},
	{DBName: "RanLog", Table: "GM_Logs", Field: "GMCharName", Label: "GM CharName", Desc: "ชื่อ GM", Required: true},
	{DBName: "RanLog", Table: "GM_Logs", Field: "GMCommand", Label: "GM Command", Desc: "คำสั่ง GM", Required: true},
	{DBName: "RanLog", Table: "GM_Logs", Field: "Date", Label: "Date", Desc: "วันที่ใช้คำสั่ง", Required: false},
	{DBName: "RanLog", Table: "GM_Logs", Field: "ItemName", Label: "Item Name", Desc: "ชื่อไอเทม", Required: false},

	// LogItemExchange
	{DBName: "RanLog", Table: "LogItemExchange", Field: "ExchangeNum", Label: "ExchangeNum (PK)", Desc: "รหัสการแลกเปลี่ยน", Required: true},
	{DBName: "RanLog", Table: "LogItemExchange", Field: "MakeType", Label: "MakeType", Desc: "ประเภทการผลิต", Required: false},
	{DBName: "RanLog", Table: "LogItemExchange", Field: "MakeNum", Label: "MakeNum", Desc: "จำนวนที่ผลิต", Required: false},
	{DBName: "RanLog", Table: "LogItemExchange", Field: "ItemAmount", Label: "Item Amount", Desc: "จำนวนไอเทม", Required: false},

	// LogHackProgram
	{DBName: "RanLog", Table: "LogHackProgram", Field: "ChaNum", Label: "ChaNum", Desc: "รหัสตัวละคร", Required: true},
	{DBName: "RanLog", Table: "LogHackProgram", Field: "HackName", Label: "Hack Name", Desc: "ชื่อโปรแกรมต้องสงสัย", Required: false},

	// LogItemRandom
	{DBName: "RanLog", Table: "LogItemRandom", Field: "RandomNum", Label: "RandomNum (PK)", Desc: "รหัส random", Required: true},
	{DBName: "RanLog", Table: "LogItemRandom", Field: "MakeType", Label: "MakeType", Desc: "ประเภท", Required: false},

	// EmperiumSession
	{DBName: "RanLog", Table: "EmperiumSession", Field: "SessionID", Label: "Session ID", Desc: "รหัส session", Required: true},
	{DBName: "RanLog", Table: "EmperiumSession", Field: "SessionDate", Label: "Session Date", Desc: "วันที่", Required: false},

	// ============================================================
	// RanShop
	// ============================================================

	// GameItemShop
	{DBName: "RanShop", Table: "GameItemShop", Field: "idx", Label: "idx (PK)", Desc: "รหัส", Required: true},
	{DBName: "RanShop", Table: "GameItemShop", Field: "ProductNum", Label: "ProductNum", Desc: "รหัสสินค้า", Required: true},
	{DBName: "RanShop", Table: "GameItemShop", Field: "ItemName", Label: "ItemName", Desc: "ชื่อไอเทม", Required: false},
	{DBName: "RanShop", Table: "GameItemShop", Field: "ItemMoney", Label: "ItemMoney", Desc: "ราคา", Required: false},
	{DBName: "RanShop", Table: "GameItemShop", Field: "ItemStock", Label: "ItemStock", Desc: "สต็อก", Required: false},
	{DBName: "RanShop", Table: "GameItemShop", Field: "ShopType", Label: "ShopType", Desc: "ประเภทร้าน", Required: false},

	// ShopPurchase
	{DBName: "RanShop", Table: "ShopPurchase", Field: "PurKey", Label: "PurKey (PK)", Desc: "รหัสการซื้อ", Required: true},
	{DBName: "RanShop", Table: "ShopPurchase", Field: "UserUID", Label: "UserUID", Desc: "รหัสผู้ใช้", Required: true},
	{DBName: "RanShop", Table: "ShopPurchase", Field: "ProductNum", Label: "ProductNum", Desc: "รหัสสินค้า", Required: true},
	{DBName: "RanShop", Table: "ShopPurchase", Field: "PurPrice", Label: "PurPrice", Desc: "ราคาที่ซื้อ", Required: false},
	{DBName: "RanShop", Table: "ShopPurchase", Field: "PurDate", Label: "PurDate", Desc: "วันที่ซื้อ", Required: false},
	{DBName: "RanShop", Table: "ShopPurchase", Field: "PurFlag", Label: "PurFlag", Desc: "สถานะการซื้อ", Required: false},

	// TopUpHistory
	{DBName: "RanShop", Table: "TopUpHistory", Field: "HistoryID", Label: "HistoryID (PK)", Desc: "รหัสประวัติเติมเงิน", Required: true},
	{DBName: "RanShop", Table: "TopUpHistory", Field: "UserUID", Label: "UserUID", Desc: "รหัสผู้ใช้", Required: true},
	{DBName: "RanShop", Table: "TopUpHistory", Field: "Amount", Label: "Amount", Desc: "จำนวนเงิน", Required: true},
	{DBName: "RanShop", Table: "TopUpHistory", Field: "CreditPoint", Label: "Credit Point", Desc: "เครดิตที่ได้", Required: false},
	{DBName: "RanShop", Table: "TopUpHistory", Field: "PayDate", Label: "Pay Date", Desc: "วันที่เติม", Required: false},

	// ItemGiftHistory
	{DBName: "RanShop", Table: "ItemGiftHistory", Field: "GiftID", Label: "GiftID (PK)", Desc: "รหัสของขวัญ", Required: true},
	{DBName: "RanShop", Table: "ItemGiftHistory", Field: "UserUID", Label: "UserUID", Desc: "รหัสผู้ใช้", Required: true},
	{DBName: "RanShop", Table: "ItemGiftHistory", Field: "ProductNum", Label: "ProductNum", Desc: "รหัสสินค้า", Required: false},
	{DBName: "RanShop", Table: "ItemGiftHistory", Field: "GiftedAt", Label: "Gifted At", Desc: "วันที่ส่งของขวัญ", Required: false},

	// ShopPurFlag
	{DBName: "RanShop", Table: "ShopPurFlag", Field: "PurFlag", Label: "PurFlag", Desc: "รหัสสถานะ", Required: true},
	{DBName: "RanShop", Table: "ShopPurFlag", Field: "PurFlagName", Label: "PurFlagName", Desc: "ชื่อสถานะ", Required: false},

	// LogShopPurchase
	{DBName: "RanShop", Table: "LogShopPurchase", Field: "PurKey", Label: "PurKey", Desc: "รหัสการซื้อ", Required: true},
	{DBName: "RanShop", Table: "LogShopPurchase", Field: "UserUID", Label: "UserUID", Desc: "รหัสผู้ใช้", Required: true},
}
