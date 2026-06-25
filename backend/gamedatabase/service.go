package gamedatabase

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	"github.com/blacken/admin-panel/database"
)

type GameUserService struct {
	db *sql.DB
}

func NewGameUserService() (*GameUserService, error) {
	var host, port, user, pass, dbname string
	err := database.DB.QueryRow(`
		SELECT host, port, username, password, database_name
		FROM game_connections WHERE is_connected = true
		ORDER BY created_at DESC LIMIT 1
	`).Scan(&host, &port, &user, &pass, &dbname)
	if err != nil {
		return nil, fmt.Errorf("ไม่พบข้อมูลการเชื่อมต่อเกม: %w", err)
	}

	dsn := fmt.Sprintf(
		"server=%s;port=%s;database=%s;user id=%s;password=%s;encrypt=disable;TrustServerCertificate=true",
		host, port, dbname, user, pass,
	)
	db, err := sql.Open("mssql", dsn)
	if err != nil {
		return nil, fmt.Errorf("เชื่อมต่อ MSSQL ไม่สำเร็จ: %w", err)
	}
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("ping MSSQL ไม่สำเร็จ: %w", err)
	}

	log.Println("[gameservice] connected to game database")
	return &GameUserService{db: db}, nil
}

type GameUser struct {
	UserNum   int        `json:"user_num"`
	UserID    string     `json:"user_id"`
	UserName  string     `json:"user_name"`
	Email     string     `json:"email"`
	RegDate   *time.Time `json:"reg_date,omitempty"`
	LastLogin *time.Time `json:"last_login,omitempty"`
	LastIP    string     `json:"last_ip,omitempty"`
	CharCount int        `json:"char_count"`
}

type GameCharacter struct {
	ChaNum       int     `json:"cha_num"`
	UserNum      int     `json:"user_num"`
	ChaName      string  `json:"cha_name"`
	ChaLevel     int     `json:"cha_level"`
	ChaClass     int     `json:"cha_class"`
	ChaSchool    int     `json:"cha_school"`
	ChaMoney     float64 `json:"cha_money"`
	ChaExp       float64 `json:"cha_exp"`
	ChaReborn    int     `json:"cha_reborn"`
	ChaOnline    int     `json:"cha_online"`
	ChaDeleted   int     `json:"cha_deleted"`
	ChaPower     int64   `json:"cha_power"`
	ChaDex       int64   `json:"cha_dex"`
	ChaSpirit    int64   `json:"cha_spirit"`
	ChaStrong    int64   `json:"cha_strong"`
	ChaIntel     int64   `json:"cha_intel"`
	ChaHP        int64   `json:"cha_hp"`
	ChaMP        int64   `json:"cha_mp"`
	ChaPK        int     `json:"cha_pk"`
	UserName     string  `json:"user_name,omitempty"`
	GuildName    string  `json:"guild_name,omitempty"`
}

func (s *GameUserService) ListUsers(search string, page, limit int) ([]GameUser, int, error) {
	offset := (page - 1) * limit
	where := ""
	args := []any{}
	if search != "" {
		where = "WHERE u.UserID LIKE @p1 OR u.UserName LIKE @p2"
		args = append(args, "%"+search+"%", "%"+search+"%")
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM UserInfo u %s", where)
	var total int
	if err := s.db.QueryRow(countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	args = append(args, limit, offset)
	query := fmt.Sprintf(`
		SELECT u.UserNum, u.UserID, u.UserName, ISNULL(u.Email,''),
		       ISNULL(u.RegDate, NULL), ISNULL(u.LastLogin, NULL), ISNULL(u.LastIP,''),
		       ISNULL(cc.CharCount, 0)
		FROM UserInfo u
		LEFT JOIN (
			SELECT UserNum, COUNT(*) as CharCount
			FROM ChaInfo WHERE ChaDeleted = 0
			GROUP BY UserNum
		) cc ON u.UserNum = cc.UserNum
		%s
		ORDER BY u.UserNum DESC
		OFFSET @p%d ROWS FETCH NEXT @p%d ROWS ONLY
	`, where, len(args)-1, len(args))

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var users []GameUser
	for rows.Next() {
		var u GameUser
		var regDate, lastLogin sql.NullTime
		if err := rows.Scan(&u.UserNum, &u.UserID, &u.UserName, &u.Email,
			&regDate, &lastLogin, &u.LastIP, &u.CharCount); err != nil {
			continue
		}
		if regDate.Valid {
			u.RegDate = &regDate.Time
		}
		if lastLogin.Valid {
			u.LastLogin = &lastLogin.Time
		}
		users = append(users, u)
	}
	return users, total, nil
}

func (s *GameUserService) GetUser(userNum int) (*GameUser, error) {
	var u GameUser
	var regDate, lastLogin sql.NullTime
	err := s.db.QueryRow(`
		SELECT u.UserNum, u.UserID, u.UserName, ISNULL(u.Email,''),
		       ISNULL(u.RegDate, NULL), ISNULL(u.LastLogin, NULL), ISNULL(u.LastIP,''),
		       ISNULL(cc.CharCount, 0)
		FROM UserInfo u
		LEFT JOIN (
			SELECT UserNum, COUNT(*) as CharCount
			FROM ChaInfo WHERE ChaDeleted = 0
			GROUP BY UserNum
		) cc ON u.UserNum = cc.UserNum
		WHERE u.UserNum = @p1
	`, userNum).Scan(&u.UserNum, &u.UserID, &u.UserName, &u.Email,
		&regDate, &lastLogin, &u.LastIP, &u.CharCount)
	if err != nil {
		return nil, err
	}
	if regDate.Valid {
		u.RegDate = &regDate.Time
	}
	if lastLogin.Valid {
		u.LastLogin = &lastLogin.Time
	}
	return &u, nil
}

func (s *GameUserService) ListCharacters(search string, page, limit int) ([]GameCharacter, int, error) {
	offset := (page - 1) * limit
	where := ""
	args := []any{}
	if search != "" {
		where = "WHERE c.ChaName LIKE @p1 OR c.ChaNum = @p2"
		args = append(args, "%"+search+"%", 0)
		tryNum := 0
		fmt.Sscanf(search, "%d", &tryNum)
		if tryNum > 0 {
			args[1] = tryNum
		}
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM ChaInfo c %s", where)
	var total int
	if err := s.db.QueryRow(countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	args = append(args, limit, offset)
	query := fmt.Sprintf(`
		SELECT c.ChaNum, c.UserNum, c.ChaName, c.ChaLevel, c.ChaClass,
		       c.ChaSchool, CAST(c.ChaMoney AS FLOAT), CAST(c.ChaExp AS FLOAT),
		       c.ChaReborn, c.ChaOnline, c.ChaDeleted,
		       c.ChaPower, c.ChaDex, c.ChaSpirit, c.ChaStrong, c.ChaIntel,
		       c.ChaHP, c.ChaMP, c.ChaPK,
		       ISNULL(u.UserName,''), ISNULL(g.GuName,'')
		FROM ChaInfo c
		LEFT JOIN UserInfo u ON c.UserNum = u.UserNum
		LEFT JOIN GuildInfo g ON c.GuNum = g.GuNum
		%s
		ORDER BY c.ChaNum DESC
		OFFSET @p%d ROWS FETCH NEXT @p%d ROWS ONLY
	`, where, len(args)-1, len(args))

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var chars []GameCharacter
	for rows.Next() {
		var ch GameCharacter
		if err := rows.Scan(&ch.ChaNum, &ch.UserNum, &ch.ChaName, &ch.ChaLevel,
			&ch.ChaClass, &ch.ChaSchool, &ch.ChaMoney, &ch.ChaExp,
			&ch.ChaReborn, &ch.ChaOnline, &ch.ChaDeleted,
			&ch.ChaPower, &ch.ChaDex, &ch.ChaSpirit, &ch.ChaStrong, &ch.ChaIntel,
			&ch.ChaHP, &ch.ChaMP, &ch.ChaPK,
			&ch.UserName, &ch.GuildName); err != nil {
			continue
		}
		chars = append(chars, ch)
	}
	return chars, total, nil
}

func (s *GameUserService) GetCharacter(chaNum int) (*GameCharacter, error) {
	var ch GameCharacter
	err := s.db.QueryRow(`
		SELECT c.ChaNum, c.UserNum, c.ChaName, c.ChaLevel, c.ChaClass,
		       c.ChaSchool, CAST(c.ChaMoney AS FLOAT), CAST(c.ChaExp AS FLOAT),
		       c.ChaReborn, c.ChaOnline, c.ChaDeleted,
		       c.ChaPower, c.ChaDex, c.ChaSpirit, c.ChaStrong, c.ChaIntel,
		       c.ChaHP, c.ChaMP, c.ChaPK,
		       ISNULL(u.UserName,''), ISNULL(g.GuName,'')
		FROM ChaInfo c
		LEFT JOIN UserInfo u ON c.UserNum = u.UserNum
		LEFT JOIN GuildInfo g ON c.GuNum = g.GuNum
		WHERE c.ChaNum = @p1
	`, chaNum).Scan(&ch.ChaNum, &ch.UserNum, &ch.ChaName, &ch.ChaLevel,
		&ch.ChaClass, &ch.ChaSchool, &ch.ChaMoney, &ch.ChaExp,
		&ch.ChaReborn, &ch.ChaOnline, &ch.ChaDeleted,
		&ch.ChaPower, &ch.ChaDex, &ch.ChaSpirit, &ch.ChaStrong, &ch.ChaIntel,
		&ch.ChaHP, &ch.ChaMP, &ch.ChaPK,
		&ch.UserName, &ch.GuildName)
	if err != nil {
		return nil, err
	}
	return &ch, nil
}

func (s *GameUserService) ListCharactersByUser(userNum int) ([]GameCharacter, error) {
	rows, err := s.db.Query(`
		SELECT c.ChaNum, c.UserNum, c.ChaName, c.ChaLevel, c.ChaClass,
		       c.ChaSchool, CAST(c.ChaMoney AS FLOAT), CAST(c.ChaExp AS FLOAT),
		       c.ChaReborn, c.ChaOnline, c.ChaDeleted,
		       c.ChaPower, c.ChaDex, c.ChaSpirit, c.ChaStrong, c.ChaIntel,
		       c.ChaHP, c.ChaMP, c.ChaPK,
		       ISNULL(u.UserName,''), ISNULL(g.GuName,'')
		FROM ChaInfo c
		LEFT JOIN UserInfo u ON c.UserNum = u.UserNum
		LEFT JOIN GuildInfo g ON c.GuNum = g.GuNum
		WHERE c.UserNum = @p1
		ORDER BY c.ChaLevel DESC
	`, userNum)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var chars []GameCharacter
	for rows.Next() {
		var ch GameCharacter
		if err := rows.Scan(&ch.ChaNum, &ch.UserNum, &ch.ChaName, &ch.ChaLevel,
			&ch.ChaClass, &ch.ChaSchool, &ch.ChaMoney, &ch.ChaExp,
			&ch.ChaReborn, &ch.ChaOnline, &ch.ChaDeleted,
			&ch.ChaPower, &ch.ChaDex, &ch.ChaSpirit, &ch.ChaStrong, &ch.ChaIntel,
			&ch.ChaHP, &ch.ChaMP, &ch.ChaPK,
			&ch.UserName, &ch.GuildName); err != nil {
			continue
		}
		chars = append(chars, ch)
	}
	return chars, nil
}

func (s *GameUserService) UpdateCharacterLevel(chaNum, newLevel int) error {
	_, err := s.db.Exec(`UPDATE ChaInfo SET ChaLevel = @p1 WHERE ChaNum = @p2`, newLevel, chaNum)
	return err
}

func (s *GameUserService) UpdateCharacterMoney(chaNum int, newMoney float64) error {
	_, err := s.db.Exec(`UPDATE ChaInfo SET ChaMoney = @p1 WHERE ChaNum = @p2`, newMoney, chaNum)
	return err
}

func (s *GameUserService) Close() {
	if s.db != nil {
		s.db.Close()
	}
}
