import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { GitCompare, ArrowRight, ArrowLeft, Check, Database, SearchX, RotateCcw, Loader2 } from 'lucide-react';
import { installApi } from '../../services/install';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';

const dbLabels = { RanUser: 'บัญชีผู้เล่น', RanGame1: 'ตัวละคร', RanLog: 'บันทึก', RanShop: 'ร้านค้า' };

const COMPATIBLE_TYPES = {
  varchar: ['varchar', 'nvarchar', 'char', 'nchar', 'text', 'ntext'],
  nvarchar: ['varchar', 'nvarchar', 'char', 'nchar', 'text', 'ntext'],
  int: ['int', 'bigint', 'smallint', 'tinyint'],
  bigint: ['int', 'bigint'],
  decimal: ['decimal', 'numeric', 'float', 'real', 'money'],
  datetime: ['datetime', 'datetime2', 'date', 'smalldatetime'],
  bit: ['bit'],
};

function normalize(s) {
  return (s || '').toLowerCase().replace(/[_\-\s]/g, '');
}

function areTypesCompatible(sourceType, targetType) {
  if (!sourceType || !targetType) return true;
  const s = sourceType.toLowerCase();
  const t = targetType.toLowerCase();
  if (s === t) return true;
  for (const [, compatible] of Object.entries(COMPATIBLE_TYPES)) {
    if (compatible.includes(s) && compatible.includes(t)) return true;
  }
  return false;
}

function ColumnMapping({ data, onNext, onBack }) {
  const [fetchedData, setFetchedData] = useState(null);
  const [fetching, setFetching] = useState(() => {
    return !(data && (data.databases || data.mappings));
  });

  useEffect(() => {
    const hasData = data && (data.databases || data.mappings);
    if (hasData) return;
    setFetching(true);
    installApi.pending()
      .then((res) => {
        if (res.data?.has_connection) {
          setFetchedData(res.data);
        }
      })
      .catch(() => {
        toast.error('ไม่สามารถโหลดข้อมูลการตั้งค่า');
      })
      .finally(() => setFetching(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const effectiveData = fetchedData || data;

  const initialMappings = useMemo(() => {
    const result = {};
    if (effectiveData?.mappings) {
      for (const [db, maps] of Object.entries(effectiveData.mappings)) {
        if (Array.isArray(maps)) {
          result[db] = maps.map((m) => ({ ...m, actual_column: m.actual_column || '' }));
        }
      }
    }
    return result;
  }, [effectiveData]);

  const [mappings, setMappings] = useState(() => JSON.parse(JSON.stringify(initialMappings)));
  const [saving, setSaving] = useState(false);
  const [activeDB, setActiveDB] = useState('RanUser');

  useEffect(() => {
    if (initialMappings && Object.keys(initialMappings).length > 0) {
      setMappings(JSON.parse(JSON.stringify(initialMappings)));
    }
  }, [initialMappings]);

  const dbNames = useMemo(() =>
    ['RanUser', 'RanGame1', 'RanLog', 'RanShop'].filter(
      (n) => effectiveData?.databases?.[n]?.found
    ), [effectiveData]
  );

  const allColumnOptions = useMemo(() => {
    const opts = {};
    for (const [dbName, info] of Object.entries(effectiveData?.databases || {})) {
      if (!info.found) continue;
      const cols = [];
      for (const tbl of info.tables || []) {
        for (const col of tbl.columns || []) {
          cols.push({ ...col, tableName: tbl.name });
        }
      }
      opts[dbName] = cols;
    }
    return opts;
  }, [effectiveData]);

  const columnsByTable = useMemo(() => {
    const grouped = {};
    for (const [dbName, cols] of Object.entries(allColumnOptions)) {
      grouped[dbName] = {};
      for (const col of cols) {
        if (!grouped[dbName][col.tableName]) {
          grouped[dbName][col.tableName] = [];
        }
        grouped[dbName][col.tableName].push(col);
      }
    }
    return grouped;
  }, [allColumnOptions]);

  const tabCounts = useMemo(() => {
    const c = {};
    for (const db of dbNames) {
      const dbMaps = mappings[db] || [];
      const matched = dbMaps.filter((m) => m.actual_column).length;
      c[db] = `${matched}/${dbMaps.length}`;
    }
    return c;
  }, [mappings, dbNames]);

  if (fetching) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-3xl mx-auto flex flex-col items-center justify-center py-20"
      >
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-sm text-muted">กำลังโหลดข้อมูลโครงสร้างฐานข้อมูล...</p>
      </motion.div>
    );
  }

  const currentMappings = mappings[activeDB] || [];
  const currentOptions = allColumnOptions[activeDB] || [];
  const currentGrouped = columnsByTable[activeDB] || {};

  const matchedCount = currentMappings.filter((m) => m.actual_column).length;
  const totalCount = currentMappings.length;

  const updateMapping = (index, value) => {
    setMappings((prev) => {
      const updated = { ...prev };
      const arr = [...(updated[activeDB] || [])];
      arr[index] = { ...arr[index], actual_column: value };
      updated[activeDB] = arr;
      return updated;
    });
  };

  const autoFillAll = () => {
    setMappings((prev) => {
      const updated = { ...prev };
      for (const [db, maps] of Object.entries(prev)) {
        const dbOpts = allColumnOptions[db] || [];
        updated[db] = maps.map((m) => {
          const matched = dbOpts.find(
            (c) => c.tableName === m.table_name && normalize(c.column) === normalize(m.standard_field)
          );
          if (matched) return { ...m, actual_column: matched.column };
          const partial = dbOpts.find(
            (c) => c.tableName === m.table_name && normalize(c.column).includes(normalize(m.standard_field))
          );
          if (partial) return { ...m, actual_column: partial.column };
          return m;
        });
      }
      return updated;
    });
    toast.success('จับคู่อัตโนมัติเรียบร้อย');
  };

  const resetAll = () => {
    setMappings(JSON.parse(JSON.stringify(initialMappings)));
    toast.info('คืนค่า default แล้ว');
  };

  const handleSave = async () => {
    for (const [db, maps] of Object.entries(mappings)) {
      for (const m of maps) {
        if (m.is_required && !m.actual_column) {
          toast.error(`กรุณาจับคู่ "${m.standard_field}" ใน ${db}`);
          setActiveDB(db);
          return;
        }
      }
    }
    setSaving(true);
    try {
      await installApi.saveMappings(mappings);
      toast.success('บันทึกการตั้งค่าเรียบร้อย');
      onNext();
    } catch (err) {
      toast.error(err.response?.data?.error || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const getTypeWarning = (mapping) => {
    if (!mapping.actual_column || !mapping.data_type) return null;
    const matchedCol = currentOptions.find(
      (c) => c.column === mapping.actual_column && c.tableName === mapping.table_name
    );
    if (!matchedCol) return null;
    if (!areTypesCompatible(matchedCol.data_type, mapping.data_type)) {
      return `⚠️ ${matchedCol.data_type} → ${mapping.data_type}`;
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-3xl mx-auto"
    >
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-4">
          <GitCompare className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">ปรับแต่งคอลัมน์</h2>
        <p className="text-muted text-sm">เลือกคอลัมน์ให้ตรงกับฐานข้อมูลเกมของคุณ</p>
        <div className="flex items-center justify-center gap-3 mt-3">
          <Button variant="outline" size="sm" onClick={autoFillAll}>
            <GitCompare className="w-3.5 h-3.5" /> จับคู่อัตโนมัติทั้งหมด
          </Button>
          <Button variant="ghost" size="sm" onClick={resetAll}>
            <RotateCcw className="w-3.5 h-3.5" /> คืนค่า default
          </Button>
        </div>
      </div>

      {dbNames.length === 0 ? (
        <Card className="p-8 text-center">
          <SearchX className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-muted font-medium">ไม่พบฐานข้อมูล RAN Online</p>
          <p className="text-xs text-muted/60 mt-1">
            {effectiveData?.has_connection
              ? 'เชื่อมต่ออยู่แต่ไม่พบฐานข้อมูลเกม ตรวจสอบว่า MSSQL มีฐานข้อมูล RanUser, RanGame1, RanLog, RanShop'
              : 'กรุณาตรวจสอบการเชื่อมต่อ MSSQL ในขั้นตอนก่อนหน้า'}
          </p>
          <Button variant="outline" size="sm" onClick={onBack} className="mt-4">
            <ArrowLeft className="w-4 h-4" /> กลับไปเชื่อมต่อใหม่
          </Button>
        </Card>
      ) : (
        <>
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {dbNames.map((name) => (
              <button
                key={name}
                onClick={() => setActiveDB(name)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeDB === name
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'bg-hover text-muted hover:text-text'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                {name}
                <span className="text-xs opacity-70">{dbLabels[name]}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeDB === name ? 'bg-white/15' : 'bg-border/50'
                }`}>
                  {tabCounts[name]}
                </span>
              </button>
            ))}
          </div>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm text-muted">
                <Database className="w-4 h-4" />
                {activeDB} — จับคู่ {matchedCount}/{totalCount}
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                matchedCount === totalCount ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
              }`}>
                {matchedCount === totalCount ? 'ครบทุกฟิลด์' : 'ยังไม่ครบ'}
              </span>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {currentMappings.length === 0 ? (
                <p className="text-muted text-center py-8">ไม่มีข้อมูลการจับคู่สำหรับฐานข้อมูลนี้</p>
              ) : (
                currentMappings.map((m, i) => {
                  const tableCols = currentGrouped[m.table_name] || [];
                  const otherCols = currentOptions.filter(
                    (c) => c.tableName !== m.table_name
                  );
                  const typeWarning = getTypeWarning(m);

                  return (
                    <div key={i} className={`p-2.5 rounded-lg transition-colors ${
                      m.actual_column ? 'bg-success/5 border border-success/20' : 'bg-hover/30'
                    }`}>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {m.standard_field}
                            {m.is_required && <span className="text-danger ml-1">*</span>}
                          </p>
                          <p className="text-xs text-muted">{m.table_name}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted flex-shrink-0" />

                        {(tableCols.length > 0 || otherCols.length > 0) ? (
                          <select
                            value={m.actual_column || ''}
                            onChange={(e) => updateMapping(i, e.target.value)}
                            className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-primary cursor-pointer min-w-[180px] max-w-[240px]"
                          >
                            <option value="">— ไม่ได้จับคู่ —</option>
                            {tableCols.length > 0 && (
                              <optgroup label={`📋 ${m.table_name} (ตารางเดียวกัน)`}>
                                {tableCols.map((col, ci) => (
                                  <option key={ci} value={col.column}>
                                    {col.column} — {col.data_type}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            {otherCols.length > 0 && (
                              <optgroup label="📎 ตารางอื่น">
                                {otherCols.map((col, ci) => (
                                  <option key={`o-${ci}`} value={col.column}>
                                    {col.column} ({col.tableName}) — {col.data_type}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={m.actual_column || ''}
                            onChange={(e) => updateMapping(i, e.target.value)}
                            placeholder="พิมพ์ชื่อคอลัมน์..."
                            className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-primary min-w-[180px]"
                          />
                        )}
                      </div>
                      {typeWarning && (
                        <p className="text-xs text-warning mt-1 ml-6">{typeWarning}</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-between pt-6 mt-4 border-t border-border">
              <Button variant="outline" onClick={onBack}><ArrowLeft className="w-4 h-4" /> ย้อนกลับ</Button>
              <Button onClick={handleSave} disabled={saving}>
                <Check className="w-4 h-4" /> {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </>
      )}
    </motion.div>
  );
}

export default ColumnMapping;
