package services

import (
	"database/sql"
	"fmt"
	"log"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/blacken/admin-panel/database"
	"github.com/blacken/admin-panel/gamedatabase"
)

var safeIntRegex = regexp.MustCompile(`^[0-9]+$`)

func sanitizeInt(s string) string {
	if safeIntRegex.MatchString(s) {
		return s
	}
	return "0"
}

func sanitizeSearch(s string) string {
	s = strings.ReplaceAll(s, "'", "''")
	s = strings.ReplaceAll(s, ";", "")
	s = strings.ReplaceAll(s, "--", "")
	return s
}

type GameService struct {
	mu     sync.RWMutex
	gameDB *gamedatabase.GameDB
	cfg    *gameServiceConfig
}

type gameServiceConfig struct {
	JWTSecret string
}

func NewGameService(jwtSecret string) *GameService {
	svc := &GameService{
		cfg: &gameServiceConfig{JWTSecret: jwtSecret},
	}
	svc.reconnect()
	return svc
}

func (s *GameService) reconnect() {
	var connID, host, username, password, dbName string
	var port int

	err := database.DB.QueryRow(`
		SELECT id, host, port, username, password, database_name
		FROM game_connections WHERE is_connected = true
		ORDER BY created_at DESC LIMIT 1
	`).Scan(&connID, &host, &port, &username, &password, &dbName)
	if err != nil {
		log.Printf("[game] no saved connection: %v", err)
		return
	}

	decryptedPass, err := gamedatabase.DecryptPassword(password, s.cfg.JWTSecret)
	if err != nil {
		log.Printf("[game] failed to decrypt password: %v", err)
		return
	}

	gamedb, err := gamedatabase.Connect(gamedatabase.GameDBConnection{
		ID:       connID,
		Host:     host,
		Port:     port,
		Database: dbName,
		Username: username,
		Password: decryptedPass,
	})
	if err != nil {
		log.Printf("[game] reconnect failed: %v", err)
		database.DB.Exec(`UPDATE game_connections SET is_connected = false WHERE id = $1`, connID)
		return
	}

	s.mu.Lock()
	s.gameDB = gamedb
	s.mu.Unlock()
	log.Printf("[game] reconnected to %s:%d", host, port)
}

func (s *GameService) GetDB() *gamedatabase.GameDB {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.gameDB
}

func (s *GameService) IsConnected() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.gameDB == nil {
		return false
	}
	return s.gameDB.DB.Ping() == nil
}

func (s *GameService) GetConnectionInfo() map[string]interface{} {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.gameDB == nil || s.gameDB.Config == nil {
		return nil
	}
	return map[string]interface{}{
		"host":      s.gameDB.Config.Host,
		"port":      s.gameDB.Config.Port,
		"database":  s.gameDB.Config.Database,
		"connected": s.IsConnected(),
	}
}

// ======================== GMC Services ========================

func (s *GameService) GmcLookup(q string) (map[string]interface{}, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, fmt.Errorf("game database not connected")
	}

	var where string
	if safeIntRegex.MatchString(q) {
		where = "[UserNum] = " + sanitizeInt(q)
	} else {
		where = "[UserID] = '" + sanitizeSearch(q) + "'"
	}

	query := fmt.Sprintf("SELECT [UserNum],[UserID],[UserName],[UserFullName],[UserEmail],[UserPoint],[UserVIP],[VotePoint],[UserAge],[UserBlock],[UserAvailable],[UserType],[LastLoginDate],[LastIP],[CreateDate] FROM [RanUser]..[UserInfo] WHERE %s", where)
	rows, err := gdb.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, fmt.Errorf("ไม่พบผู้เล่น")
	}

	columns, _ := rows.Columns()
	values := make([]interface{}, len(columns))
	valuePtrs := make([]interface{}, len(columns))
	for i := range values {
		valuePtrs[i] = &values[i]
	}
	if err := rows.Scan(valuePtrs...); err != nil {
		return nil, err
	}

	account := make(map[string]interface{})
	for i, col := range columns {
		val := values[i]
		if b, ok := val.([]byte); ok {
			account[col] = string(b)
		} else {
			account[col] = val
		}
	}

	charQuery := fmt.Sprintf("SELECT [ChaNum],[ChaName],[ChaLevel],[ChaClass],[ChaSchool],[ChaReborn],[ChaMoney],[ChaExp],[ChaPower],[ChaOnline],[ChaDeleted],[ChaInvenLine] FROM [RanGame1]..[ChaInfo] WHERE [UserNum] = %v", account["UserNum"])
	charRows, err := gdb.DB.Query(charQuery)
	if err == nil {
		defer charRows.Close()
		charCols, _ := charRows.Columns()
		var chars []map[string]interface{}
		for charRows.Next() {
			cValues := make([]interface{}, len(charCols))
			cPtrs := make([]interface{}, len(charCols))
			for i := range cValues {
				cPtrs[i] = &cValues[i]
			}
			if err := charRows.Scan(cPtrs...); err != nil {
				continue
			}
			char := make(map[string]interface{})
			for i, col := range charCols {
				val := cValues[i]
				if b, ok := val.([]byte); ok {
					char[col] = string(b)
				} else {
					char[col] = val
				}
			}
			chars = append(chars, char)
		}
		account["characters"] = chars
	}
	if account["characters"] == nil {
		account["characters"] = []map[string]interface{}{}
	}

	return account, nil
}

func (s *GameService) GmcSendItem(targetType, targetID string, productNum, quantity int) (map[string]interface{}, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, fmt.Errorf("game database not connected")
	}

	result := map[string]interface{}{"success": 0, "failed": 0}

	insertBoth := func(userNum int) {
		gdb.DB.Exec("INSERT INTO [RanShop]..[ShopPurchase] ([UserUID], [ProductNum], [PurPrice], [PurFlag], [PurDate], [GiftedBy]) VALUES (" +
			fmt.Sprintf("%d", userNum) + ", " + fmt.Sprintf("%d", productNum) + ", 0, 0, GETDATE(), 'GMC')")
		gdb.DB.Exec("INSERT INTO [RanShop]..[ItemGiftHistory] ([UserUID], [ProductNum], [EligibleAmt], [GiftedAt], [GiftCategory]) VALUES (" +
			fmt.Sprintf("%d", userNum) + ", " + fmt.Sprintf("%d", productNum) + ", " + fmt.Sprintf("%d", quantity) + ", GETDATE(), 'GMC')")
	}

	switch targetType {
	case "id":
		if targetID == "" {
			return nil, fmt.Errorf("กรุณาระบุ UserID")
		}
		safeID := sanitizeSearch(targetID)
		var userNum int
		err := gdb.DB.QueryRow("SELECT [UserNum] FROM [RanUser]..[UserInfo] WHERE [UserID] = '"+safeID+"'").Scan(&userNum)
		if err != nil {
			return nil, fmt.Errorf("ไม่พบผู้ใช้")
		}
		insertBoth(userNum)
		result["success"] = 1

	case "online":
		rows, err := gdb.DB.Query("SELECT [UserNum] FROM [RanUser]..[UserInfo] WHERE [UserNum] IN (SELECT [UserNum] FROM [RanGame1]..[ChaInfo] WHERE [ChaOnline] = 1)")
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var userNum int
				rows.Scan(&userNum)
				insertBoth(userNum)
			}
			result["success"] = 1
		}

	case "all":
		rows, err := gdb.DB.Query("SELECT [UserNum] FROM [RanUser]..[UserInfo]")
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var userNum int
				rows.Scan(&userNum)
				insertBoth(userNum)
			}
			result["success"] = 1
		}
	}

	return result, nil
}

func (s *GameService) GmcUpdatePoint(targetType, targetID, pointType string, amount int, mode string) (map[string]interface{}, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, fmt.Errorf("game database not connected")
	}

	allowedPoints := map[string]bool{
		"UserPoint": true, "UserVIP": true, "VotePoint": true,
		"ExchangeItemPoints": true, "UserAge": true,
	}
	if !allowedPoints[pointType] {
		return nil, fmt.Errorf("ประเภทพ้อยท์ไม่ถูกต้อง")
	}

	operation := "+"
	if mode == "subtract" {
		operation = "-"
	}

	result := map[string]interface{}{"affected": 0}

	switch targetType {
	case "id":
		safeID := sanitizeSearch(targetID)
		var userNum string
		err := gdb.DB.QueryRow("SELECT [UserNum] FROM [RanUser]..[UserInfo] WHERE [UserID] = '" + safeID + "'").Scan(&userNum)
		if err != nil {
			return nil, fmt.Errorf("ไม่พบผู้ใช้")
		}
		query := fmt.Sprintf("UPDATE [RanUser]..[UserInfo] SET [%s] = [%s] %s %d WHERE [UserNum] = %s", pointType, pointType, operation, amount, userNum)
		res, err := gdb.DB.Exec(query)
		if err == nil {
			rows, _ := res.RowsAffected()
			result["affected"] = rows
		}

	case "online":
		query := fmt.Sprintf("UPDATE [RanUser]..[UserInfo] SET [%s] = [%s] %s %d WHERE [UserNum] IN (SELECT [UserNum] FROM [RanGame1]..[ChaInfo] WHERE [ChaOnline] = 1)", pointType, pointType, operation, amount)
		res, err := gdb.DB.Exec(query)
		if err == nil {
			rows, _ := res.RowsAffected()
			result["affected"] = rows
		}

	case "all":
		query := fmt.Sprintf("UPDATE [RanUser]..[UserInfo] SET [%s] = [%s] %s %d", pointType, pointType, operation, amount)
		res, err := gdb.DB.Exec(query)
		if err == nil {
			rows, _ := res.RowsAffected()
			result["affected"] = rows
		}
	}

	return result, nil
}

func (s *GameService) GmcPlayerHistory(id, logType string) ([]map[string]interface{}, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, fmt.Errorf("game database not connected")
	}

	var userNum string
	if safeIntRegex.MatchString(id) {
		userNum = sanitizeInt(id)
	} else {
		err := gdb.DB.QueryRow("SELECT [UserNum] FROM [RanUser]..[UserInfo] WHERE [UserID] = '"+sanitizeSearch(id)+"'").Scan(&userNum)
		if err != nil {
			return nil, fmt.Errorf("ไม่พบผู้ใช้")
		}
	}

	if userNum == "0" {
		return nil, fmt.Errorf("invalid id")
	}

	var allHistory []map[string]interface{}
	appendLogs := func(db, query string) {
		rows, err := gdb.DB.Query(query)
		if err != nil {
			return
		}
		defer rows.Close()
		cols, _ := rows.Columns()
		for rows.Next() {
			vals := make([]interface{}, len(cols))
			ptrs := make([]interface{}, len(cols))
			for i := range vals {
				ptrs[i] = &vals[i]
			}
			if err := rows.Scan(ptrs...); err != nil {
				continue
			}
			row := map[string]interface{}{"source": db}
			for i, col := range cols {
				val := vals[i]
				if b, ok := val.([]byte); ok {
					row[col] = string(b)
				} else {
					row[col] = val
				}
			}
			allHistory = append(allHistory, row)
		}
	}

	if logType == "" || logType == "login" {
		appendLogs("LogLogin", fmt.Sprintf("SELECT TOP 20 * FROM [RanUser]..[LogLogin] WHERE [UserNum] = %s ORDER BY [LogDate] DESC", userNum))
	}
	if logType == "" || logType == "point" {
		appendLogs("PointConsumeLog", fmt.Sprintf("SELECT TOP 20 * FROM [RanUser]..[PointConsumeLog] WHERE [UserNum] = %s ORDER BY [Date] DESC", userNum))
	}
	if logType == "" || logType == "shop" {
		appendLogs("GISPurchaseLog", fmt.Sprintf("SELECT TOP 20 * FROM [RanShop]..[GISPurchaseLog] WHERE [UserID] = (SELECT [UserID] FROM [RanUser]..[UserInfo] WHERE [UserNum] = %s) ORDER BY [Date] DESC", userNum))
	}
	if logType == "" || logType == "logaction" {
		appendLogs("LogAction", fmt.Sprintf("SELECT TOP 20 a.* FROM [RanLog]..[LogAction] a WHERE [ChaNum] IN (SELECT [ChaNum] FROM [RanGame1]..[ChaInfo] WHERE [UserNum] = %s) ORDER BY [ActionDate] DESC", userNum))
	}
	if logType == "" || logType == "itemexchange" {
		appendLogs("LogItemExchange", fmt.Sprintf("SELECT TOP 20 * FROM [RanLog]..[LogItemExchange] WHERE NIDMain IN (SELECT [ChaNum] FROM [RanGame1]..[ChaInfo] WHERE [UserNum] = %s) ORDER BY [ExchangeDate] DESC", userNum))
	}
	if logType == "" || logType == "gmcmd" {
		appendLogs("LogGmCmd", fmt.Sprintf("SELECT TOP 20 * FROM [RanUser]..[LogGmCmd] WHERE [UserNum] = %s ORDER BY [LogDate] DESC", userNum))
	}

	if allHistory == nil {
		allHistory = []map[string]interface{}{}
	}
	return allHistory, nil
}

func (s *GameService) GmcLogs(limit, offset int) ([]map[string]interface{}, int, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, 0, fmt.Errorf("game database not connected")
	}

	var total int
	countQuery := "SELECT COUNT(*) FROM [RanLog]..[GM_Logs]"
	if err := gdb.DB.QueryRow(countQuery).Scan(&total); err != nil {
		total = 0
	}

	query := fmt.Sprintf("SELECT * FROM [RanLog]..[GM_Logs] ORDER BY [Date] DESC OFFSET %d ROWS FETCH NEXT %d ROWS ONLY", offset, limit)
	rows, err := gdb.DB.Query(query)
	if err != nil {
		return []map[string]interface{}{}, total, nil
	}
	defer rows.Close()

	cols, _ := rows.Columns()
	var allLogs []map[string]interface{}
	for rows.Next() {
		vals := make([]interface{}, len(cols))
		ptrs := make([]interface{}, len(cols))
		for i := range vals {
			ptrs[i] = &vals[i]
		}
		if err := rows.Scan(ptrs...); err != nil {
			continue
		}
		row := make(map[string]interface{})
		for i, col := range cols {
			val := vals[i]
			if b, ok := val.([]byte); ok {
				row[col] = string(b)
			} else {
				row[col] = val
			}
		}
		allLogs = append(allLogs, row)
	}

	if allLogs == nil {
		allLogs = []map[string]interface{}{}
	}
	return allLogs, total, nil
}

func (s *GameService) GmcNotice(subject, content string) error {
	gdb := s.GetDB()
	if gdb == nil {
		return fmt.Errorf("game database not connected")
	}

	safeMessage := sanitizeSearch(subject + " - " + content)

	query := fmt.Sprintf("INSERT INTO [RanGame1]..[GameNotice] ([Message], [DaySunday], [DayMonday], [DayTuesday], [DayWednesday], [DayThursday], [DayFriday], [DaySaturday], [Type], [Hour], [Minute]) VALUES ('%s', 1,1,1,1,1,1,1, 0, 0, 0)", safeMessage)
	_, err := gdb.DB.Exec(query)
	return err
}

func (s *GameService) GmcItemTracking(uid string) (map[string]interface{}, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, fmt.Errorf("game database not connected")
	}

	uid = sanitizeSearch(uid)
	result := map[string]interface{}{"items": []map[string]interface{}{}, "total": 0, "received": 0, "pending": 0, "failed": 0}

	var userNum int
	var lastLogin sql.NullTime
	err := gdb.DB.QueryRow("SELECT [UserNum],[LastLoginDate] FROM [RanUser]..[UserInfo] WHERE [UserID] = '"+uid+"'").Scan(&userNum, &lastLogin)
	if err != nil {
		return result, nil
	}

	userNumStr := fmt.Sprintf("%d", userNum)
	var items []map[string]interface{}
	received, pending, failed := 0, 0, 0
	now := time.Now()

	// ShopPurchase — items sent via shop/GM
	shopRows, err := gdb.DB.Query("SELECT [PurKey],[ProductNum],[PurPrice],[PurFlag],[PurDate],[PurChgDate],[GiftedBy] FROM [RanShop]..[ShopPurchase] WHERE [UserUID] = " + userNumStr + " ORDER BY [PurDate] DESC")
	if err == nil {
		defer shopRows.Close()
		for shopRows.Next() {
			var purKey, productNum, purPrice, purFlag int
			var purDate, purChgDate sql.NullTime
			var giftedBy sql.NullString
			if err := shopRows.Scan(&purKey, &productNum, &purPrice, &purFlag, &purDate, &purChgDate, &giftedBy); err != nil {
				continue
			}
			status := "pending"
			if purFlag == 1 {
				status = "received"
				received++
			} else if purFlag == 2 {
				status = "failed"
				failed++
			} else {
				pending++
			}
			items = append(items, map[string]interface{}{
				"source":     "ShopPurchase",
				"ref_id":     purKey,
				"product_num": productNum,
				"price":      purPrice,
				"pur_flag":   purFlag,
				"sent_date":  purDate.Time,
				"received_date": purChgDate.Time,
				"sent_by":    giftedBy.String,
				"status":     status,
			})
		}
	}

	// ItemGiftHistory — items sent via GMC
	giftRows, err := gdb.DB.Query("SELECT [GiftID],[ProductNum],[EligibleAmt],[GiftedAt] FROM [RanShop]..[ItemGiftHistory] WHERE [UserUID] = " + userNumStr + " ORDER BY [GiftedAt] DESC")
	if err == nil {
		defer giftRows.Close()
		for giftRows.Next() {
			var giftID, productNum, eligibleAmt int
			var giftedAt time.Time
			if err := giftRows.Scan(&giftID, &productNum, &eligibleAmt, &giftedAt); err != nil {
				continue
			}
			status := "pending"
			if lastLogin.Valid && lastLogin.Time.After(giftedAt) {
				status = "received"
				received++
			} else if now.Sub(giftedAt) > 7*24*time.Hour {
				status = "failed"
				failed++
			} else {
				pending++
			}
			items = append(items, map[string]interface{}{
				"source":      "ItemGiftHistory",
				"ref_id":      giftID,
				"product_num": productNum,
				"quantity":    eligibleAmt,
				"sent_date":   giftedAt,
				"status":      status,
			})
		}
	}

	result["items"] = items
	result["total"] = len(items)
	result["received"] = received
	result["pending"] = pending
	result["failed"] = failed
	return result, nil
}

// ======================== Guild Services ========================

func (s *GameService) ListGuilds(search string, limit, offset int) ([]map[string]interface{}, int, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, 0, fmt.Errorf("game database not connected")
	}

	where := ""
	if search != "" {
		safe := sanitizeSearch(search)
		where = " WHERE [GuName] LIKE '%" + safe + "%'"
	}

	var total int
	gdb.DB.QueryRow("SELECT COUNT(*) FROM [RanGame1]..[GuildInfo]" + where).Scan(&total)

	query := fmt.Sprintf("SELECT [GuNum],[GuName],[GuMaster],[GuMemberNum],[GuMoney],[GuMakeTime],[GuBattleWin],[GuBattleLose],[GuBattleDraw],[GuMarkVer] FROM [RanGame1]..[GuildInfo]%s ORDER BY [GuMemberNum] DESC OFFSET %d ROWS FETCH NEXT %d ROWS ONLY", where, offset, limit)
	rows, err := gdb.DB.Query(query)
	if err != nil {
		return []map[string]interface{}{}, total, nil
	}
	defer rows.Close()

	cols, _ := rows.Columns()
	var results []map[string]interface{}
	for rows.Next() {
		vals := make([]interface{}, len(cols))
		ptrs := make([]interface{}, len(cols))
		for i := range vals {
			ptrs[i] = &vals[i]
		}
		if err := rows.Scan(ptrs...); err != nil {
			continue
		}
		row := make(map[string]interface{})
		for i, col := range cols {
			val := vals[i]
			if b, ok := val.([]byte); ok {
				row[col] = string(b)
			} else {
				row[col] = val
			}
		}
		results = append(results, row)
	}
	return results, total, nil
}

func (s *GameService) GetGuildDetail(guNum string) (map[string]interface{}, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, fmt.Errorf("game database not connected")
	}

	guNum = sanitizeInt(guNum)
	if guNum == "0" {
		return nil, fmt.Errorf("invalid guild id")
	}

	query := fmt.Sprintf("SELECT * FROM [RanGame1]..[GuildInfo] WHERE [GuNum] = %s", guNum)
	rows, err := gdb.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, fmt.Errorf("ไม่พบกิลด์")
	}

	cols, _ := rows.Columns()
	vals := make([]interface{}, len(cols))
	ptrs := make([]interface{}, len(cols))
	for i := range vals {
		ptrs[i] = &vals[i]
	}
	if err := rows.Scan(ptrs...); err != nil {
		return nil, err
	}

	guild := make(map[string]interface{})
	for i, col := range cols {
		val := vals[i]
		if b, ok := val.([]byte); ok {
			guild[col] = string(b)
		} else {
			guild[col] = val
		}
	}

	// Get members
	var members []map[string]interface{}
	memberRows, err := gdb.DB.Query("SELECT [ChaNum],[ChaName],[ChaLevel],[ChaClass],[ChaGuName],[GuPosition],[ChaOnline] FROM [RanGame1]..[ChaInfo] WHERE [GuNum] = " + guNum + " AND [GuPosition] > 0 ORDER BY [ChaLevel] DESC")
	if err == nil {
		defer memberRows.Close()
		mCols, _ := memberRows.Columns()
		for memberRows.Next() {
			mVals := make([]interface{}, len(mCols))
			mPtrs := make([]interface{}, len(mCols))
			for i := range mVals {
				mPtrs[i] = &mVals[i]
			}
			if err := memberRows.Scan(mPtrs...); err != nil {
				continue
			}
			mem := make(map[string]interface{})
			for i, col := range mCols {
				val := mVals[i]
				if b, ok := val.([]byte); ok {
					mem[col] = string(b)
				} else {
					mem[col] = val
				}
			}
			members = append(members, mem)
		}
	}
	guild["members"] = members
	return guild, nil
}

func (s *GameService) UpdateGuild(guNum string, fields map[string]interface{}) error {
	gdb := s.GetDB()
	if gdb == nil {
		return fmt.Errorf("game database not connected")
	}

	guNum = sanitizeInt(guNum)
	if guNum == "0" {
		return fmt.Errorf("invalid guild id")
	}

	allowedFields := map[string]bool{
		"GuName": true, "GuNotice": true, "GuRank": true,
		"GuMoney": true, "GuIncomeMoney": true,
	}

	var setClauses []string
	for key, val := range fields {
		if !allowedFields[key] {
			continue
		}
		switch v := val.(type) {
		case string:
			setClauses = append(setClauses, fmt.Sprintf("[%s] = '%s'", key, sanitizeSearch(v)))
		case float64:
			setClauses = append(setClauses, fmt.Sprintf("[%s] = %d", key, int(v)))
		case int:
			setClauses = append(setClauses, fmt.Sprintf("[%s] = %d", key, v))
		}
	}

	if len(setClauses) == 0 {
		return fmt.Errorf("no valid fields to update")
	}

	query := fmt.Sprintf("UPDATE [RanGame1]..[GuildInfo] SET %s WHERE [GuNum] = %s", strings.Join(setClauses, ", "), guNum)
	_, err := gdb.DB.Exec(query)
	return err
}

func (s *GameService) GuildStats() (map[string]interface{}, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, fmt.Errorf("game database not connected")
	}

	var total, totalMembers int
	gdb.DB.QueryRow("SELECT COUNT(*) FROM [RanGame1]..[GuildInfo]").Scan(&total)
	gdb.DB.QueryRow("SELECT COUNT(*) FROM [RanGame1]..[ChaInfo] WHERE [GuPosition] > 0").Scan(&totalMembers)

	avgMembers := 0
	if total > 0 {
		avgMembers = totalMembers / total
	}
	return map[string]interface{}{
		"total_guilds":  total,
		"total_members": totalMembers,
		"avg_members":   avgMembers,
	}, nil
}

func (s *GameService) ListGuildWarriors(guNum string) ([]map[string]interface{}, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, fmt.Errorf("game database not connected")
	}

	guNum = sanitizeInt(guNum)
	if guNum == "0" {
		return nil, nil
	}

	rows, err := gdb.DB.Query("SELECT [ChaNum],[ChaName],[ChaLevel],[ChaClass],[ChaGuName],[GuPosition],[ChaOnline] FROM [RanGame1]..[ChaInfo] WHERE [GuNum] = " + guNum + " AND [GuPosition] > 0 ORDER BY [ChaLevel] DESC")
	if err != nil {
		return nil, nil
	}
	defer rows.Close()

	cols, _ := rows.Columns()
	var list []map[string]interface{}
	for rows.Next() {
		vals := make([]interface{}, len(cols))
		ptrs := make([]interface{}, len(cols))
		for i := range vals {
			ptrs[i] = &vals[i]
		}
		if err := rows.Scan(ptrs...); err != nil {
			continue
		}
		row := make(map[string]interface{})
		for i, col := range cols {
			val := vals[i]
			if b, ok := val.([]byte); ok {
				row[col] = string(b)
			} else {
				row[col] = val
			}
		}
		list = append(list, row)
	}
	return list, nil
}

// ======================== Pet Services ========================

func (s *GameService) ListPets(search string, limit, offset int) ([]map[string]interface{}, int, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, 0, fmt.Errorf("game database not connected")
	}

	where := ""
	if search != "" {
		safe := sanitizeSearch(search)
		where = " WHERE [PetName] LIKE '%" + safe + "%' OR [PetChaNum] IN (SELECT [ChaNum] FROM [RanGame1]..[ChaInfo] WHERE [ChaName] LIKE '%" + safe + "%')"
	}

	var total int
	gdb.DB.QueryRow("SELECT COUNT(*) FROM [RanGame1]..[PetInfo]" + where).Scan(&total)

	query := fmt.Sprintf("SELECT p.[PetNum],p.[PetName],p.[PetChaNum],p.[PetType],p.[PetStyle],p.[PetColor],p.[PetFull],p.[PetDeleted],p.[PetCreateDate],c.[ChaName] as owner_name FROM [RanGame1]..[PetInfo] p LEFT JOIN [RanGame1]..[ChaInfo] c ON p.[PetChaNum] = c.[ChaNum]%s ORDER BY p.[PetCreateDate] DESC OFFSET %d ROWS FETCH NEXT %d ROWS ONLY", where, offset, limit)
	rows, err := gdb.DB.Query(query)
	if err != nil {
		return []map[string]interface{}{}, total, nil
	}
	defer rows.Close()

	cols, _ := rows.Columns()
	var results []map[string]interface{}
	for rows.Next() {
		vals := make([]interface{}, len(cols))
		ptrs := make([]interface{}, len(cols))
		for i := range vals {
			ptrs[i] = &vals[i]
		}
		if err := rows.Scan(ptrs...); err != nil {
			continue
		}
		row := make(map[string]interface{})
		for i, col := range cols {
			val := vals[i]
			if b, ok := val.([]byte); ok {
				row[col] = string(b)
			} else {
				row[col] = val
			}
		}
		results = append(results, row)
	}
	return results, total, nil
}

func (s *GameService) GetPetDetail(petNum string) (map[string]interface{}, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, fmt.Errorf("game database not connected")
	}

	petNum = sanitizeInt(petNum)
	if petNum == "0" {
		return nil, fmt.Errorf("invalid pet id")
	}

	query := fmt.Sprintf("SELECT * FROM [RanGame1]..[PetInfo] WHERE [PetNum] = %s", petNum)
	rows, err := gdb.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	if !rows.Next() {
		return nil, fmt.Errorf("not found")
	}

	cols, _ := rows.Columns()
	vals := make([]interface{}, len(cols))
	ptrs := make([]interface{}, len(cols))
	for i := range vals {
		ptrs[i] = &vals[i]
	}
	if err := rows.Scan(ptrs...); err != nil {
		return nil, err
	}
	pet := make(map[string]interface{})
	for i, col := range cols {
		val := vals[i]
		if b, ok := val.([]byte); ok {
			pet[col] = string(b)
		} else {
			pet[col] = val
		}
	}

	var ownerName string
	gdb.DB.QueryRow("SELECT [ChaName] FROM [RanGame1]..[ChaInfo] WHERE [ChaNum] = %v", pet["PetChaNum"]).Scan(&ownerName)
	pet["owner_name"] = ownerName

	// Get inventory
	invenRows, err := gdb.DB.Query("SELECT [PetInvenNum],[PetNum],[PetInvenType],[PetInvenMID],[PetInvenSID],[PetInvenCMID],[PetInvenCSID],[PetInvenAvailable] FROM [RanGame1]..[PetInven] WHERE [PetNum] = " + petNum)
	if err == nil {
		defer invenRows.Close()
		invCols, _ := invenRows.Columns()
		var inven []map[string]interface{}
		for invenRows.Next() {
			iv := make([]interface{}, len(invCols))
			ip := make([]interface{}, len(invCols))
			for i := range iv {
				ip[i] = &iv[i]
			}
			if err := invenRows.Scan(ip...); err != nil {
				continue
			}
			item := make(map[string]interface{})
			for i, col := range invCols {
				val := iv[i]
				if b, ok := val.([]byte); ok {
					item[col] = string(b)
				} else {
					item[col] = val
				}
			}
			inven = append(inven, item)
		}
		pet["inventory"] = inven
	}
	return pet, nil
}

func (s *GameService) UpdatePet(petNum string, fields map[string]interface{}) error {
	gdb := s.GetDB()
	if gdb == nil {
		return fmt.Errorf("game database not connected")
	}

	petNum = sanitizeInt(petNum)
	if petNum == "0" {
		return fmt.Errorf("invalid pet id")
	}

	allowedFields := map[string]bool{
		"PetName": true, "PetType": true, "PetStyle": true,
		"PetColor": true, "PetFull": true, "PetSkinScale": true,
	}

	var setClauses []string
	for key, val := range fields {
		if !allowedFields[key] {
			continue
		}
		switch v := val.(type) {
		case string:
			setClauses = append(setClauses, fmt.Sprintf("[%s] = '%s'", key, sanitizeSearch(v)))
		case float64:
			setClauses = append(setClauses, fmt.Sprintf("[%s] = %d", key, int(v)))
		case int:
			setClauses = append(setClauses, fmt.Sprintf("[%s] = %d", key, v))
		default:
			setClauses = append(setClauses, fmt.Sprintf("[%s] = '%s'", key, sanitizeSearch(fmt.Sprintf("%v", v))))
		}
	}

	if len(setClauses) == 0 {
		return fmt.Errorf("no valid fields")
	}

	query := fmt.Sprintf("UPDATE [RanGame1]..[PetInfo] SET %s WHERE [PetNum] = %s", strings.Join(setClauses, ", "), petNum)
	_, err := gdb.DB.Exec(query)
	return err
}

func (s *GameService) PetStats() (map[string]interface{}, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, fmt.Errorf("game database not connected")
	}

	var total, available, deleted int
	gdb.DB.QueryRow("SELECT COUNT(*) FROM [RanGame1]..[PetInfo]").Scan(&total)
	gdb.DB.QueryRow("SELECT COUNT(*) FROM [RanGame1]..[PetInfo] WHERE [PetDeleted] = 0").Scan(&available)
	gdb.DB.QueryRow("SELECT COUNT(*) FROM [RanGame1]..[PetInfo] WHERE [PetDeleted] = 1").Scan(&deleted)

	return map[string]interface{}{
		"total":     total,
		"available": available,
		"deleted":   deleted,
	}, nil
}

// ======================== PK Ranking Services ========================

func (s *GameService) PKRanking(limit, offset int) ([]map[string]interface{}, int, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, 0, fmt.Errorf("game database not connected")
	}

	var total int
	gdb.DB.QueryRow("SELECT COUNT(*) FROM [RanGame1]..[ChaInfo] WHERE [ChaPKScore] > 0").Scan(&total)

	query := fmt.Sprintf("SELECT [ChaNum],[ChaName],[ChaLevel],[ChaClass],[ChaPK],[ChaPKScore],[ChaPKDeath],[ChaOnline] FROM [RanGame1]..[ChaInfo] WHERE [ChaPKScore] > 0 ORDER BY [ChaPKScore] DESC OFFSET %d ROWS FETCH NEXT %d ROWS ONLY", offset, limit)
	rows, err := gdb.DB.Query(query)
	if err != nil {
		return []map[string]interface{}{}, total, nil
	}
	defer rows.Close()

	cols, _ := rows.Columns()
	var results []map[string]interface{}
	for rows.Next() {
		vals := make([]interface{}, len(cols))
		ptrs := make([]interface{}, len(cols))
		for i := range vals {
			ptrs[i] = &vals[i]
		}
		if err := rows.Scan(ptrs...); err != nil {
			continue
		}
		row := make(map[string]interface{})
		for i, col := range cols {
			val := vals[i]
			if b, ok := val.([]byte); ok {
				row[col] = string(b)
			} else {
				row[col] = val
			}
		}
		results = append(results, row)
	}
	return results, total, nil
}

func (s *GameService) PKDeathRanking(limit, offset int) ([]map[string]interface{}, int, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, 0, fmt.Errorf("game database not connected")
	}

	var total int
	gdb.DB.QueryRow("SELECT COUNT(*) FROM [RanGame1]..[ChaInfo] WHERE [ChaPKDeath] > 0").Scan(&total)

	query := fmt.Sprintf("SELECT [ChaNum],[ChaName],[ChaLevel],[ChaClass],[ChaPK],[ChaPKScore],[ChaPKDeath],[ChaOnline] FROM [RanGame1]..[ChaInfo] WHERE [ChaPKDeath] > 0 ORDER BY [ChaPKDeath] DESC OFFSET %d ROWS FETCH NEXT %d ROWS ONLY", offset, limit)
	rows, err := gdb.DB.Query(query)
	if err != nil {
		return []map[string]interface{}{}, total, nil
	}
	defer rows.Close()

	cols, _ := rows.Columns()
	var results []map[string]interface{}
	for rows.Next() {
		vals := make([]interface{}, len(cols))
		ptrs := make([]interface{}, len(cols))
		for i := range vals {
			ptrs[i] = &vals[i]
		}
		if err := rows.Scan(ptrs...); err != nil {
			continue
		}
		row := make(map[string]interface{})
		for i, col := range cols {
			val := vals[i]
			if b, ok := val.([]byte); ok {
				row[col] = string(b)
			} else {
				row[col] = val
			}
		}
		results = append(results, row)
	}
	return results, total, nil
}

func (s *GameService) PKStats() (map[string]interface{}, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, fmt.Errorf("game database not connected")
	}

	var totalPlayers, totalPK int
	gdb.DB.QueryRow("SELECT COUNT(*) FROM [RanGame1]..[ChaInfo]").Scan(&totalPlayers)
	gdb.DB.QueryRow("SELECT COUNT(*) FROM [RanGame1]..[ChaInfo] WHERE [ChaPKScore] > 0").Scan(&totalPK)

	var avgPK, maxPK float64
	gdb.DB.QueryRow("SELECT ISNULL(AVG(CAST([ChaPKScore] AS FLOAT)), 0) FROM [RanGame1]..[ChaInfo] WHERE [ChaPKScore] > 0").Scan(&avgPK)
	gdb.DB.QueryRow("SELECT ISNULL(MAX([ChaPKScore]), 0) FROM [RanGame1]..[ChaInfo]").Scan(&maxPK)

	return map[string]interface{}{
		"total_players": totalPlayers,
		"total_pk":      totalPK,
		"avg_pk_score":  int(avgPK),
		"max_pk_score":  int(maxPK),
	}, nil
}

func (s *GameService) PKRecordHistory(chaNum string, limit, offset int) ([]map[string]interface{}, int, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, 0, fmt.Errorf("game database not connected")
	}

	chaNum = sanitizeInt(chaNum)
	if chaNum == "0" {
		return nil, 0, nil
	}

	var total int
	gdb.DB.QueryRow("SELECT COUNT(*) FROM [RanGame1]..[PKRecord] WHERE [ChaNum] = " + chaNum).Scan(&total)

	query := fmt.Sprintf("SELECT [PKRecordNum],[ChaKillNum],[ChaKillName],[ChaPKRecord] FROM [RanGame1]..[PKRecord] WHERE [ChaNum] = %s ORDER BY [PKRecordNum] DESC OFFSET %d ROWS FETCH NEXT %d ROWS ONLY", chaNum, offset, limit)
	rows, err := gdb.DB.Query(query)
	if err != nil {
		return []map[string]interface{}{}, total, nil
	}
	defer rows.Close()

	cols, _ := rows.Columns()
	var results []map[string]interface{}
	for rows.Next() {
		vals := make([]interface{}, len(cols))
		ptrs := make([]interface{}, len(cols))
		for i := range vals {
			ptrs[i] = &vals[i]
		}
		if err := rows.Scan(ptrs...); err != nil {
			continue
		}
		row := make(map[string]interface{})
		for i, col := range cols {
			val := vals[i]
			if b, ok := val.([]byte); ok {
				row[col] = string(b)
			} else {
				row[col] = val
			}
		}
		results = append(results, row)
	}
	return results, total, nil
}

func (s *GameService) ListAllCharacters(search, classFilter, levelMin, levelMax, onlineOnly string, limit, offset int) ([]map[string]interface{}, int, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, 0, fmt.Errorf("game database not connected")
	}

	whereClauses := []string{}
	if search != "" {
		safeSearch := sanitizeSearch(search)
		whereClauses = append(whereClauses, fmt.Sprintf("([ChaName] LIKE '%%%%%s%%%%' OR CAST([ChaNum] AS VARCHAR) LIKE '%%%%%s%%%%')", safeSearch, safeSearch))
	}
	if classFilter != "" {
		safeClass := sanitizeInt(classFilter)
		whereClauses = append(whereClauses, fmt.Sprintf("[ChaClass] = %s", safeClass))
	}
	if levelMin != "" && levelMin != "0" {
		whereClauses = append(whereClauses, fmt.Sprintf("[ChaLevel] >= %s", sanitizeInt(levelMin)))
	}
	if levelMax != "" && levelMax != "999" {
		whereClauses = append(whereClauses, fmt.Sprintf("[ChaLevel] <= %s", sanitizeInt(levelMax)))
	}
	if onlineOnly == "1" {
		whereClauses = append(whereClauses, "[ChaOnline] = 1")
	} else if onlineOnly == "0" {
		whereClauses = append(whereClauses, "[ChaOnline] = 0")
	}

	whereStr := ""
	if len(whereClauses) > 0 {
		whereStr = "WHERE " + strings.Join(whereClauses, " AND ")
	}

	var total int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM [RanGame1]..[ChaInfo] %s", whereStr)
	if err := gdb.DB.QueryRow(countQuery).Scan(&total); err != nil {
		return nil, 0, err
	}

	dataQuery := fmt.Sprintf("SELECT [ChaNum],[ChaName],[ChaLevel],[ChaClass],[ChaSchool],[ChaTribe],[ChaReborn],[ChaMoney],[ChaExp],[ChaPower],[ChaOnline],[UserNum] FROM [RanGame1]..[ChaInfo] %s ORDER BY [ChaLevel] DESC OFFSET %d ROWS FETCH NEXT %d ROWS ONLY", whereStr, offset, limit)
	rows, err := gdb.DB.Query(dataQuery)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	columns, _ := rows.Columns()
	var results []map[string]interface{}
	for rows.Next() {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}
		if err := rows.Scan(valuePtrs...); err != nil {
			continue
		}
		row := make(map[string]interface{})
		for i, col := range columns {
			val := values[i]
			if b, ok := val.([]byte); ok {
				row[col] = string(b)
			} else {
				row[col] = val
			}
		}
		results = append(results, row)
	}
	return results, total, nil
}

func (s *GameService) GetCharacterDetail(chanum string) (map[string]interface{}, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, fmt.Errorf("game database not connected")
	}

	chanum = sanitizeInt(chanum)
	if chanum == "0" {
		return nil, fmt.Errorf("invalid character id")
	}

	query := fmt.Sprintf("SELECT * FROM [RanGame1]..[ChaInfo] WHERE [ChaNum] = %s", chanum)
	rows, err := gdb.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, fmt.Errorf("character not found")
	}

	columns, _ := rows.Columns()
	values := make([]interface{}, len(columns))
	valuePtrs := make([]interface{}, len(columns))
	for i := range values {
		valuePtrs[i] = &values[i]
	}
	if err := rows.Scan(valuePtrs...); err != nil {
		return nil, err
	}

	row := make(map[string]interface{})
	for i, col := range columns {
		val := values[i]
		if b, ok := val.([]byte); ok {
			row[col] = string(b)
		} else {
			row[col] = val
		}
	}
	return row, nil
}

func (s *GameService) CharacterStats() (map[string]interface{}, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, fmt.Errorf("game database not connected")
	}

	var total, online, buster, tempster, engineer, prowler, forceGunner, defender int
	gdb.DB.QueryRow("SELECT COUNT(*) FROM [RanGame1]..[ChaInfo]").Scan(&total)
	gdb.DB.QueryRow("SELECT COUNT(*) FROM [RanGame1]..[ChaInfo] WHERE [ChaOnline] = 1").Scan(&online)
	gdb.DB.QueryRow("SELECT COUNT(*) FROM [RanGame1]..[ChaInfo] WHERE [ChaClass] = 1").Scan(&buster)
	gdb.DB.QueryRow("SELECT COUNT(*) FROM [RanGame1]..[ChaInfo] WHERE [ChaClass] = 2").Scan(&tempster)
	gdb.DB.QueryRow("SELECT COUNT(*) FROM [RanGame1]..[ChaInfo] WHERE [ChaClass] = 3").Scan(&engineer)
	gdb.DB.QueryRow("SELECT COUNT(*) FROM [RanGame1]..[ChaInfo] WHERE [ChaClass] = 4").Scan(&prowler)
	gdb.DB.QueryRow("SELECT COUNT(*) FROM [RanGame1]..[ChaInfo] WHERE [ChaClass] = 5").Scan(&forceGunner)
	gdb.DB.QueryRow("SELECT COUNT(*) FROM [RanGame1]..[ChaInfo] WHERE [ChaClass] = 6").Scan(&defender)

	return map[string]interface{}{
		"total":       total,
		"online":      online,
		"offline":     total - online,
		"buster":      buster,
		"tempster":    tempster,
		"engineer":    engineer,
		"prowler":     prowler,
		"force_gunner": forceGunner,
		"defender":    defender,
	}, nil
}

func (s *GameService) BanCharacter(chanum, reason string) error {
	gdb := s.GetDB()
	if gdb == nil {
		return fmt.Errorf("game database not connected")
	}

	chanum = sanitizeInt(chanum)
	if chanum == "0" {
		return fmt.Errorf("invalid character id")
	}

	var exists int
	if err := gdb.DB.QueryRow("SELECT COUNT(*) FROM [RanGame1]..[ChaInfo] WHERE [ChaNum] = " + chanum).Scan(&exists); err != nil || exists == 0 {
		return fmt.Errorf("ไม่พบตัวละคร")
	}

	query := fmt.Sprintf("UPDATE [RanGame1]..[ChaInfo] SET [ChaDeleted] = 1 WHERE [ChaNum] = %s", chanum)
	_, err := gdb.DB.Exec(query)
	return err
}

func (s *GameService) UnbanCharacter(chanum string) error {
	gdb := s.GetDB()
	if gdb == nil {
		return fmt.Errorf("game database not connected")
	}

	chanum = sanitizeInt(chanum)
	if chanum == "0" {
		return fmt.Errorf("invalid character id")
	}

	query := fmt.Sprintf("UPDATE [RanGame1]..[ChaInfo] SET [ChaDeleted] = 0 WHERE [ChaNum] = %s", chanum)
	result, err := gdb.DB.Exec(query)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("character not found")
	}
	return nil
}

type ColumnInfo struct {
	StandardField string `json:"standard_field"`
	ActualColumn  string `json:"actual_column"`
	DataType      string `json:"data_type"`
	TableName     string `json:"table_name"`
	IsRequired    bool   `json:"is_required"`
}

func (s *GameService) GetColumnMappings(dbName string) (map[string][]ColumnInfo, error) {
	s.mu.RLock()
	connID := ""
	if s.gameDB != nil && s.gameDB.Config != nil {
		connID = s.gameDB.Config.ID
	}
	s.mu.RUnlock()

	if connID == "" {
		return nil, fmt.Errorf("no game connection")
	}

	rows, err := database.DB.Query(`
		SELECT table_name, standard_field, actual_column, data_type, is_required
		FROM column_mappings WHERE connection_id = $1 AND db_name = $2
		ORDER BY table_name, standard_field
	`, connID, dbName)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string][]ColumnInfo)
	for rows.Next() {
		var c ColumnInfo
		if err := rows.Scan(&c.TableName, &c.StandardField, &c.ActualColumn, &c.DataType, &c.IsRequired); err != nil {
			continue
		}
		result[c.TableName] = append(result[c.TableName], c)
	}
	return result, nil
}

func (s *GameService) GetActualColumn(tableName, standardField string) (string, error) {
	mappings, err := s.GetColumnMappings("RanUser")
	if err != nil {
		return "", err
	}
	if cols, ok := mappings[tableName]; ok {
		for _, c := range cols {
			if c.StandardField == standardField {
				return c.ActualColumn, nil
			}
		}
	}

	mappings, err = s.GetColumnMappings("RanGame1")
	if err == nil {
		if cols, ok := mappings[tableName]; ok {
			for _, c := range cols {
				if c.StandardField == standardField {
					return c.ActualColumn, nil
				}
			}
		}
	}

	return "", fmt.Errorf("column mapping not found: %s.%s", tableName, standardField)
}

func (s *GameService) Query(dbName, query string, args ...interface{}) ([]map[string]interface{}, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, fmt.Errorf("game database not connected")
	}

	safeDB := gamedatabase.SanitizeDBName(dbName)
	fullQuery := fmt.Sprintf("USE [%s]; %s", safeDB, query)

	rows, err := gdb.DB.Query(fullQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("query error: %w", err)
	}
	defer rows.Close()

	columns, err := rows.Columns()
	if err != nil {
		return nil, err
	}

	var results []map[string]interface{}
	for rows.Next() {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}
		if err := rows.Scan(valuePtrs...); err != nil {
			continue
		}
		row := make(map[string]interface{})
		for i, col := range columns {
			val := values[i]
			if b, ok := val.([]byte); ok {
				row[col] = string(b)
			} else {
				row[col] = val
			}
		}
		results = append(results, row)
	}
	return results, nil
}

func (s *GameService) ListPlayers(tableName, searchCol, search string, limit, offset int) ([]map[string]interface{}, int, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, 0, fmt.Errorf("game database not connected")
	}

	userNumCol, _ := s.GetActualColumn(tableName, "UserNum")
	userIDCol, _ := s.GetActualColumn(tableName, "UserID")

	if userNumCol == "" {
		userNumCol = "UserNum"
	}
	if userIDCol == "" {
		userIDCol = "UserID"
	}

	var total int
	var rows *sql.Rows
	var err error

	tableRef := fmt.Sprintf("[RanUser]..[%s]", tableName)

	if search != "" {
		countQuery := fmt.Sprintf("SELECT COUNT(*) FROM %s WHERE [%s] LIKE '%%"+search+"%%'", tableRef, userIDCol)
		if e := gdb.DB.QueryRow(countQuery).Scan(&total); e != nil {
			return nil, 0, e
		}
		dataQuery := fmt.Sprintf("SELECT * FROM %s WHERE [%s] LIKE '%%"+search+"%%' ORDER BY [%s] DESC", tableRef, userIDCol, userNumCol)
		rows, err = gdb.DB.Query(dataQuery)
	} else {
		countQuery := fmt.Sprintf("SELECT COUNT(*) FROM %s", tableRef)
		if e := gdb.DB.QueryRow(countQuery).Scan(&total); e != nil {
			return nil, 0, e
		}
		dataQuery := fmt.Sprintf("SELECT * FROM %s ORDER BY [%s] DESC", tableRef, userNumCol)
		rows, err = gdb.DB.Query(dataQuery)
	}
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	columns, _ := rows.Columns()
	var results []map[string]interface{}
	count := 0
	for rows.Next() && count < offset+limit {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}
		if err := rows.Scan(valuePtrs...); err != nil {
			continue
		}
		if count >= offset {
			row := make(map[string]interface{})
			for i, col := range columns {
				val := values[i]
				if b, ok := val.([]byte); ok {
					row[col] = string(b)
				} else {
					row[col] = val
				}
			}
			results = append(results, row)
		}
		count++
	}
	return results, total, nil
}

func (s *GameService) GetPlayer(tableName string, usernum interface{}) (map[string]interface{}, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, fmt.Errorf("game database not connected")
	}

	userNumCol, _ := s.GetActualColumn(tableName, "UserNum")
	if userNumCol == "" {
		userNumCol = "UserNum"
	}

	query := fmt.Sprintf("SELECT * FROM [RanUser]..[%s] WHERE [%s] = '%v'", tableName, userNumCol, usernum)
	rows, err := gdb.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, fmt.Errorf("player not found")
	}

	columns, _ := rows.Columns()
	values := make([]interface{}, len(columns))
	valuePtrs := make([]interface{}, len(columns))
	for i := range values {
		valuePtrs[i] = &values[i]
	}
	if err := rows.Scan(valuePtrs...); err != nil {
		return nil, err
	}

	row := make(map[string]interface{})
	for i, col := range columns {
		val := values[i]
		if b, ok := val.([]byte); ok {
			row[col] = string(b)
		} else {
			row[col] = val
		}
	}
	return row, nil
}

func (s *GameService) ListCharacters(usernum interface{}) ([]map[string]interface{}, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, fmt.Errorf("game database not connected")
	}

	userNumCol, _ := s.GetActualColumn("ChaInfo", "UserNum")
	if userNumCol == "" {
		userNumCol = "UserNum"
	}

	query := fmt.Sprintf("SELECT * FROM [RanGame1]..[ChaInfo] WHERE [%s] = '%v' ORDER BY ChaLevel DESC", userNumCol, usernum)
	rows, err := gdb.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	columns, _ := rows.Columns()
	var results []map[string]interface{}
	for rows.Next() {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}
		if err := rows.Scan(valuePtrs...); err != nil {
			continue
		}
		row := make(map[string]interface{})
		for i, col := range columns {
			val := values[i]
			if b, ok := val.([]byte); ok {
				row[col] = string(b)
			} else {
				row[col] = val
			}
		}
		results = append(results, row)
	}
	return results, nil
}

func (s *GameService) ListLogs(dbName, tableName string, limit, offset int) ([]map[string]interface{}, int, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, 0, fmt.Errorf("game database not connected")
	}

	safeDB := gamedatabase.SanitizeDBName(dbName)
	safeTable := gamedatabase.SanitizeTableName(tableName)

	dateCol := "LogDate"
	for _, c := range []string{"LogDate", "ActionDate", "Date", "SessionDate", "PayDate", "GiftedAt", "CreatedDate"} {
		cols, _ := s.getColumnNames(gdb, safeDB, safeTable)
		for _, col := range cols {
			if strings.EqualFold(col, c) {
				dateCol = col
				break
			}
		}
	}

	var total int
	tableRef := fmt.Sprintf("[%s]..[%s]", safeDB, safeTable)
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM %s", tableRef)
	if err := gdb.DB.QueryRow(countQuery).Scan(&total); err != nil {
		return nil, 0, err
	}

	dataQuery := fmt.Sprintf("SELECT * FROM %s ORDER BY [%s] DESC", tableRef, dateCol)
	rows, err := gdb.DB.Query(dataQuery)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	columns, _ := rows.Columns()
	var results []map[string]interface{}
	for rows.Next() {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}
		if err := rows.Scan(valuePtrs...); err != nil {
			continue
		}
		row := make(map[string]interface{})
		for i, col := range columns {
			val := values[i]
			if b, ok := val.([]byte); ok {
				row[col] = string(b)
			} else {
				row[col] = val
			}
		}
		results = append(results, row)
	}
	return results, total, nil
}

func (s *GameService) getColumnNames(gdb *gamedatabase.GameDB, dbName, tableName string) ([]string, error) {
	query := fmt.Sprintf("SELECT TOP 1 * FROM [%s]..[%s]", dbName, tableName)
	rows, err := gdb.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return rows.Columns()
}

func (s *GameService) ListTables(dbName string) ([]string, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, fmt.Errorf("game database not connected")
	}

	safeDB := gamedatabase.SanitizeDBName(dbName)
	query := fmt.Sprintf("SELECT TABLE_NAME FROM [%s].INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME", safeDB)

	rows, err := gdb.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			continue
		}
		tables = append(tables, name)
	}
	return tables, nil
}

func (s *GameService) GetTableColumns(dbName, tableName string) ([]map[string]interface{}, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, fmt.Errorf("game database not connected")
	}

	safeDB := gamedatabase.SanitizeDBName(dbName)
	safeTable := gamedatabase.SanitizeTableName(tableName)
	query := fmt.Sprintf(`
		SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
		FROM [%s].INFORMATION_SCHEMA.COLUMNS
		WHERE TABLE_NAME = '%s'
		ORDER BY ORDINAL_POSITION
	`, safeDB, safeTable)

	rows, err := gdb.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cols []map[string]interface{}
	for rows.Next() {
		var name, dataType string
		var maxLen sql.NullInt64
		var nullable string
		if err := rows.Scan(&name, &dataType, &maxLen, &nullable); err != nil {
			continue
		}
		col := map[string]interface{}{
			"name":       name,
			"data_type":  dataType,
			"is_nullable": nullable == "YES",
		}
		if maxLen.Valid {
			col["max_length"] = maxLen.Int64
		}
		cols = append(cols, col)
	}
	return cols, nil
}

func (s *GameService) BlockPlayer(tableName, usernum, reason string) error {
	gdb := s.GetDB()
	if gdb == nil {
		return fmt.Errorf("game database not connected")
	}

	usernum = sanitizeInt(usernum)
	if usernum == "0" {
		return fmt.Errorf("ไม่พบผู้เล่น")
	}

	reason = sanitizeSearch(reason)
	if reason == "" {
		reason = "Banned by admin"
	}

	var userBlock int
	if err := gdb.DB.QueryRow("SELECT [UserBlock] FROM [RanUser]..[UserInfo] WHERE [UserNum] = " + usernum).Scan(&userBlock); err != nil {
		return fmt.Errorf("ไม่พบผู้เล่น")
	}
	if userBlock == 1 {
		return fmt.Errorf("ผู้เล่นนี้ถูกบล็อกอยู่แล้ว")
	}

	if _, err := gdb.DB.Exec("UPDATE [RanUser]..[UserInfo] SET [UserBlock] = 1, [UserBlockDate] = GETDATE() WHERE [UserNum] = " + usernum); err != nil {
		return fmt.Errorf("ไม่สามารถบล็อกได้: %v", err)
	}

	var cnt int
	gdb.DB.QueryRow("SELECT COUNT(*) FROM [RanUser]..[BlockAddress] WHERE [BlockAddress] = '" + usernum + "'").Scan(&cnt)
	if cnt == 0 {
		gdb.DB.Exec("INSERT INTO [RanUser]..[BlockAddress] ([BlockAddress], [BlockReason], [BlockDate]) VALUES ('" + usernum + "', '" + reason + "', GETDATE())")
	}

	return nil
}

func (s *GameService) UnblockPlayer(tableName, usernum string) error {
	gdb := s.GetDB()
	if gdb == nil {
		return fmt.Errorf("game database not connected")
	}

	usernum = sanitizeInt(usernum)
	if usernum == "0" {
		return fmt.Errorf("ไม่พบผู้เล่น")
	}

	var userBlock int
	if err := gdb.DB.QueryRow("SELECT [UserBlock] FROM [RanUser]..[UserInfo] WHERE [UserNum] = " + usernum).Scan(&userBlock); err != nil {
		return fmt.Errorf("ไม่พบผู้เล่น")
	}
	if userBlock == 0 {
		return fmt.Errorf("ผู้เล่นนี้ไม่ได้ถูกบล็อก")
	}

	if _, err := gdb.DB.Exec("UPDATE [RanUser]..[UserInfo] SET [UserBlock] = 0 WHERE [UserNum] = " + usernum); err != nil {
		return fmt.Errorf("ไม่สามารถปลดบล็อกได้: %v", err)
	}

	gdb.DB.Exec("DELETE FROM [RanUser]..[BlockAddress] WHERE [BlockAddress] = '" + usernum + "'")
	return nil
}

func (s *GameService) UpdateCharacter(chanum string, field string, value interface{}) error {
	gdb := s.GetDB()
	if gdb == nil {
		return fmt.Errorf("game database not connected")
	}

	allowedFields := map[string]bool{
		"ChaLevel": true, "ChaMoney": true, "ChaExp": true,
		"ChaPower": true, "ChaDex": true, "ChaSpirit": true,
		"ChaStrong": true, "ChaIntel": true, "ChaReborn": true,
	}
	if !allowedFields[field] {
		return fmt.Errorf("field '%s' is not editable", field)
	}

	query := fmt.Sprintf("UPDATE [RanGame1]..[ChaInfo] SET [%s] = '%v' WHERE ChaNum = '%s'", field, value, chanum)
	result, err := gdb.DB.Exec(query)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("character not found")
	}
	return nil
}

func (s *GameService) UpdatePlayer(usernum string, fields map[string]interface{}) error {
	gdb := s.GetDB()
	if gdb == nil {
		return fmt.Errorf("game database not connected")
	}

	usernum = sanitizeInt(usernum)
	if usernum == "0" {
		return fmt.Errorf("invalid user id")
	}

	allowedFields := map[string]bool{
		"UserFullName": true, "UserEmail": true, "UserPoint": true,
		"UserVIP": true, "VotePoint": true, "UserAge": true,
	}

	var setClauses []string
	for key, val := range fields {
		if !allowedFields[key] {
			continue
		}
		safeVal := sanitizeSearch(fmt.Sprintf("%v", val))
		setClauses = append(setClauses, fmt.Sprintf("[%s] = '%s'", key, safeVal))
	}

	if len(setClauses) == 0 {
		return fmt.Errorf("no valid fields to update")
	}

	query := fmt.Sprintf("UPDATE [RanUser]..[UserInfo] SET %s WHERE [UserNum] = %s",
		strings.Join(setClauses, ", "), usernum)

	result, err := gdb.DB.Exec(query)
	if err != nil {
		return fmt.Errorf("update failed: %v", err)
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("player not found")
	}
	return nil
}

func (s *GameService) ListShopItems(tableName string, limit, offset int) ([]map[string]interface{}, int, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, 0, fmt.Errorf("game database not connected")
	}

	tableRef := fmt.Sprintf("[RanShop]..[%s]", tableName)

	var total int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM %s", tableRef)
	if err := gdb.DB.QueryRow(countQuery).Scan(&total); err != nil {
		return nil, 0, err
	}

	dataQuery := fmt.Sprintf("SELECT * FROM %s ORDER BY 1 OFFSET %d ROWS FETCH NEXT %d ROWS ONLY", tableRef, offset, limit)
	rows, err := gdb.DB.Query(dataQuery)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	columns, _ := rows.Columns()
	var results []map[string]interface{}
	for rows.Next() {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}
		if err := rows.Scan(valuePtrs...); err != nil {
			continue
		}
		row := make(map[string]interface{})
		for i, col := range columns {
			val := values[i]
			if b, ok := val.([]byte); ok {
				row[col] = string(b)
			} else {
				row[col] = val
			}
		}
		results = append(results, row)
	}
	return results, total, nil
}

func (s *GameService) CreateShopItem(name string, price, stock, main, sub int, category string, section int) error {
	gdb := s.GetDB()
	if gdb == nil {
		return fmt.Errorf("game database not connected")
	}

	safeName := sanitizeSearch(name)
	safeCategory := sanitizeSearch(category)
	query := fmt.Sprintf(
		"INSERT INTO [RanShop]..[ShopItemMap] ([ItemName], [ItemPrice], [ItemStock], [ItemMain], [ItemSub], [Category], [ItemSection]) VALUES ('%s', %d, %d, %d, %d, '%s', %d)",
		safeName, price, stock, main, sub, safeCategory, section,
	)
	_, err := gdb.DB.Exec(query)
	return err
}

func (s *GameService) UpdateShopItem(id string, fields map[string]interface{}) error {
	gdb := s.GetDB()
	if gdb == nil {
		return fmt.Errorf("game database not connected")
	}

	id = sanitizeInt(id)
	if id == "0" {
		return fmt.Errorf("invalid item id")
	}

	allowedFields := map[string]bool{
		"ItemName": true, "ItemMoney": true, "ItemStock": true,
		"ItemMain": true, "ItemSub": true, "ItemPrice": true,
		"ItemSection": true, "ItemCurrency": true, "ItemDiscount": true,
		"Category": true, "ItemComment": true,
	}

	var setClauses []string
	for key, val := range fields {
		if !allowedFields[key] {
			continue
		}
		switch v := val.(type) {
		case string:
			setClauses = append(setClauses, fmt.Sprintf("[%s] = '%s'", key, sanitizeSearch(v)))
		case float64:
			setClauses = append(setClauses, fmt.Sprintf("[%s] = %d", key, int(v)))
		case int:
			setClauses = append(setClauses, fmt.Sprintf("[%s] = %d", key, v))
		default:
			setClauses = append(setClauses, fmt.Sprintf("[%s] = '%s'", key, sanitizeSearch(fmt.Sprintf("%v", v))))
		}
	}

	if len(setClauses) == 0 {
		return fmt.Errorf("no valid fields to update")
	}

	query := fmt.Sprintf("UPDATE [RanShop]..[ShopItemMap] SET %s WHERE [ProductNum] = %s",
		strings.Join(setClauses, ", "), id)

	result, err := gdb.DB.Exec(query)
	if err != nil {
		return fmt.Errorf("update failed: %v", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("item not found")
	}
	return nil
}

func (s *GameService) DeleteShopItem(id string) error {
	gdb := s.GetDB()
	if gdb == nil {
		return fmt.Errorf("game database not connected")
	}

	id = sanitizeInt(id)
	if id == "0" {
		return fmt.Errorf("invalid item id")
	}

	query := fmt.Sprintf("DELETE FROM [RanShop]..[ShopItemMap] WHERE [ProductNum] = %s", id)
	result, err := gdb.DB.Exec(query)
	if err != nil {
		return fmt.Errorf("delete failed: %v", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("item not found")
	}
	return nil
}

func (s *GameService) Reconnect(host string, port int, username, password string) error {
	gdb, err := gamedatabase.Connect(gamedatabase.GameDBConnection{
		ID:       "reconnect-" + host,
		Host:     host,
		Port:     port,
		Database: "master",
		Username: username,
		Password: password,
	})
	if err != nil {
		return err
	}

	s.mu.Lock()
	if s.gameDB != nil {
		s.gameDB.DB.Close()
	}
	s.gameDB = gdb
	s.mu.Unlock()

	database.DB.Exec(`UPDATE game_connections SET is_connected = true, host = $1, port = $2, username = $3 WHERE is_connected = true`, host, port, username)

	encryptedPass, encErr := gamedatabase.EncryptPassword(password, s.cfg.JWTSecret)
	if encErr == nil {
		database.DB.Exec(`UPDATE game_connections SET password = $1 WHERE is_connected = true`, encryptedPass)
	}

	return nil
}
