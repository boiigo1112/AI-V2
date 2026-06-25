package gamedatabase

import "strings"

func AutoDetectMappings(dbName string, allColumns []GameDBColumn) []ColumnMapping {
	mappings := make([]ColumnMapping, 0)

	tableColumns := make(map[string][]GameDBColumn)
	for _, col := range allColumns {
		tableColumns[col.Table] = append(tableColumns[col.Table], col)
	}

	for _, std := range StandardFields {
		if std.DBName != dbName {
			continue
		}

		m := ColumnMapping{
			DBName:        std.DBName,
			TableName:     std.Table,
			StandardField: std.Field,
			IsRequired:    std.Required,
		}

		cols := tableColumns[std.Table]
		if cols == nil {
			for t, tcols := range tableColumns {
				if strings.EqualFold(t, std.Table) {
					cols = tcols
					break
				}
			}
		}

		if cols != nil {
			for _, col := range cols {
				if strings.EqualFold(col.Column, std.Field) {
					m.ActualColumn = col.Column
					m.DataType = col.DataType
					break
				}
			}
			if m.ActualColumn == "" {
				for _, col := range cols {
					if strings.Contains(strings.ToLower(col.Column), strings.ToLower(std.Field)) {
						m.ActualColumn = col.Column
						m.DataType = col.DataType
						break
					}
				}
			}
			if m.ActualColumn == "" && len(cols) > 0 {
				m.ActualColumn = cols[0].Column
				m.DataType = cols[0].DataType
			}
		}

		mappings = append(mappings, m)
	}

	return mappings
}
