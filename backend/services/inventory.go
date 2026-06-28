package services

import (
	"bufio"
	"encoding/binary"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

var (
	itemNameDB map[string]string
	itemMu     sync.RWMutex
	itemLoaded bool
)

type InvSlot struct {
	Slot    int    `json:"slot"`
	Main    int    `json:"item_main"`
	Sub     int    `json:"item_sub"`
	Count   int    `json:"count"`
	Eff1    int    `json:"eff1"`
	Name    string `json:"name"`
	IsEmpty bool   `json:"is_empty"`
}

func LoadItemNames(path string) error {
	itemMu.Lock()
	defer itemMu.Unlock()
	if itemLoaded {
		return nil
	}
	if path == "" {
		candidates := []string{
			"Item/item.txt",
			"../Item/item.txt",
			"./Item/item.txt",
			"/home/dev-web/เอกสาร/AI-V2/backend/Item/item.txt",
		}
		if execPath, err := os.Executable(); err == nil {
			candidates = append(candidates, filepath.Join(filepath.Dir(execPath), "Item", "item.txt"))
		}
		for _, p := range candidates {
			if _, err := os.Stat(p); err == nil {
				path = p
				break
			}
		}
		if path == "" {
			return fmt.Errorf("item.txt not found")
		}
	}
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()
	itemNameDB = make(map[string]string)
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "IN_") {
			continue
		}
		parts := strings.SplitN(line, "\t", 2)
		if len(parts) < 2 {
			continue
		}
		name := strings.TrimSpace(parts[1])
		if name == "" {
			continue
		}
		code := strings.TrimPrefix(parts[0], "IN_")
		var main, sub int
		if _, err := fmt.Sscanf(code, "%d_%d", &main, &sub); err != nil {
			continue
		}
		itemNameDB[fmt.Sprintf("%d:%d", main, sub)] = name
	}
	itemLoaded = true
	return nil
}

func GetItemName(main, sub int) string {
	itemMu.RLock()
	name, ok := itemNameDB[fmt.Sprintf("%d:%d", main, sub)]
	itemMu.RUnlock()
	if ok {
		return name
	}
	return ""
}

func SearchItems(query string, limit int) []map[string]string {
	itemMu.RLock()
	defer itemMu.RUnlock()
	if limit <= 0 || limit > 200 { limit = 50 }
	query = strings.ToLower(strings.TrimSpace(query))
	if query == "" { return nil }
	var results []map[string]string
	for key, name := range itemNameDB {
		if !strings.Contains(strings.ToLower(name), query) { continue }
		parts := strings.SplitN(key, ":", 2)
		if len(parts) != 2 { continue }
		results = append(results, map[string]string{"main": parts[0], "sub": parts[1], "name": name})
		if len(results) >= limit { break }
	}
	return results
}

func UnmarshalEquip(data []byte) []InvSlot {
	if len(data) < 4 { return nil }
	nSlots := len(data) / 4
	slots := make([]InvSlot, 0, nSlots)
	seen := make(map[string]bool)
	for i := 0; i < nSlots; i++ {
		off := i * 4
		if off+4 > len(data) { break }
		main := int(binary.LittleEndian.Uint16(data[off : off+2]))
		sub := int(binary.LittleEndian.Uint16(data[off+2 : off+4]))
		if main <= 0 || main > 500 || sub <= 0 || sub > 2000 {
			slots = append(slots, InvSlot{Slot: i, IsEmpty: true}); continue
		}
		name := GetItemName(main, sub)
		if name == "" { slots = append(slots, InvSlot{Slot: i, IsEmpty: true}); continue }
		key := fmt.Sprintf("%d:%d", main, sub)
		if seen[key] { slots = append(slots, InvSlot{Slot: i, IsEmpty: true}); continue }
		seen[key] = true
		slots = append(slots, InvSlot{Slot: i, Main: main, Sub: sub, Count: 1, Name: name})
	}
	return slots
}

func UnmarshalInven(data []byte) []InvSlot {
	if len(data) < 4 { return nil }
	nSlots := len(data) / 4
	slots := make([]InvSlot, 0, nSlots)
	seen := make(map[string]bool)
	for i := 0; i < nSlots; i++ {
		off := i * 4
		if off+4 > len(data) { break }
		main := int(binary.LittleEndian.Uint16(data[off : off+2]))
		sub := int(binary.LittleEndian.Uint16(data[off+2 : off+4]))
		if main <= 0 || main > 500 || sub <= 0 || sub > 2000 {
			slots = append(slots, InvSlot{Slot: i, IsEmpty: true}); continue
		}
		name := GetItemName(main, sub)
		if name == "" { slots = append(slots, InvSlot{Slot: i, IsEmpty: true}); continue }
		key := fmt.Sprintf("%d:%d", main, sub)
		if seen[key] { slots = append(slots, InvSlot{Slot: i, IsEmpty: true}); continue }
		seen[key] = true
		slots = append(slots, InvSlot{Slot: i, Main: main, Sub: sub, Count: 1, Name: name})
	}
	return slots
}

func (s *GameService) GetInventory(chaNum string) (map[string]interface{}, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, fmt.Errorf("game database not connected")
	}
	chaNum = sanitizeInt(chaNum)
	if chaNum == "0" {
		return nil, fmt.Errorf("invalid character id")
	}
	if !itemLoaded {
		if err := LoadItemNames(""); err != nil {
			return nil, fmt.Errorf("item names not loaded: %w", err)
		}
	}
	var equipData, invenData []byte
	var invenLine int
	query := fmt.Sprintf("SELECT [ChaPutOnItems],[ChaInven],[ChaInvenLine] FROM [RanGame1]..[ChaInfo] WHERE [ChaNum] = %s", chaNum)
	err := gdb.DB.QueryRow(query).Scan(&equipData, &invenData, &invenLine)
	if err != nil {
		return nil, fmt.Errorf("character not found: %w", err)
	}
	return map[string]interface{}{
		"equipment":  UnmarshalEquip(equipData),
		"inventory":  UnmarshalInven(invenData),
		"inven_line": invenLine,
	}, nil
}

func (s *GameService) DeleteInventoryItem(chaNum, col string, slotIdx int) error {
	gdb := s.GetDB()
	if gdb == nil { return fmt.Errorf("game database not connected") }
	chaNum = sanitizeInt(chaNum)
	if chaNum == "0" { return fmt.Errorf("invalid character id") }

	colName := "ChaPutOnItems"
	if col == "inven" { colName = "ChaInven" }

	query := fmt.Sprintf("SELECT [%s] FROM [RanGame1]..[ChaInfo] WHERE [ChaNum] = %s", colName, chaNum)
	var data []byte
	if err := gdb.DB.QueryRow(query).Scan(&data); err != nil {
		return fmt.Errorf("character not found: %w", err)
	}
	off := slotIdx * 4
	if off+4 > len(data) { return fmt.Errorf("slot out of range") }
	for i := 0; i < 4; i++ { data[off+i] = 0 }

	hexStr := fmt.Sprintf("%x", data)
	updateQuery := fmt.Sprintf("UPDATE [RanGame1]..[ChaInfo] SET [%s] = 0x%s WHERE [ChaNum] = %s", colName, hexStr, chaNum)
	_, err := gdb.DB.Exec(updateQuery)
	return err
}

func (s *GameService) AddInventoryItem(chaNum, col string, main, sub, count int) (int, error) {
	gdb := s.GetDB()
	if gdb == nil { return 0, fmt.Errorf("game database not connected") }
	chaNum = sanitizeInt(chaNum)
	if chaNum == "0" { return 0, fmt.Errorf("invalid character id") }

	colName := "ChaPutOnItems"
	if col == "inven" { colName = "ChaInven" }

	query := fmt.Sprintf("SELECT [%s] FROM [RanGame1]..[ChaInfo] WHERE [ChaNum] = %s", colName, chaNum)
	var data []byte
	if err := gdb.DB.QueryRow(query).Scan(&data); err != nil {
		return 0, fmt.Errorf("character not found: %w", err)
	}

	if count <= 0 { count = 1 }

	// Find first empty slot (4 zero bytes)
	slotIdx := -1
	for i := 0; i+4 <= len(data); i += 4 {
		isEmpty := true
		for j := 0; j < 4; j++ {
			if data[i+j] != 0 { isEmpty = false; break }
		}
		if isEmpty { slotIdx = i / 4; break }
	}
	if slotIdx < 0 { return 0, fmt.Errorf("no empty slot available") }

	off := slotIdx * 4
	binary.LittleEndian.PutUint16(data[off:off+2], uint16(main))
	binary.LittleEndian.PutUint16(data[off+2:off+4], uint16(sub))

	hexStr := fmt.Sprintf("%x", data)
	updateQuery := fmt.Sprintf("UPDATE [RanGame1]..[ChaInfo] SET [%s] = 0x%s WHERE [ChaNum] = %s", colName, hexStr, chaNum)
	_, err := gdb.DB.Exec(updateQuery)
	if err != nil { return 0, err }
	return slotIdx, nil
}
