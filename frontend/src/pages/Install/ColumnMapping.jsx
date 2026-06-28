import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { GitCompare, ArrowRight, ArrowLeft, Check, Database, SearchX, RotateCcw } from 'lucide-react';
import { installApi } from '../../services/install';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const dbLabels = { RanUser: 'บัญชีผู้เล่น', RanGame1: 'ตัวละคร', RanLog: 'บันทึก', RanShop: 'ร้านค้า' };

function normalize(s) {
  return (s || '').toLowerCase().replace(/[_\-\s]/g, '');
}

function autoMatch(columns, table, standardField) {
  for (const col of columns) {
    if (col.tableName !== table) continue;
    if (normalize(col.column) === normalize(standardField)) return col.column;
    if (normalize(col.column).includes(normalize(standardField))) return col.column;
    if (normalize(standardField).includes(normalize(col.column))) return col.column;
  }
  for (const col of columns) {
    if (normalize(col.column) === normalize(standardField)) return col.column;
  }
  return '';
}

function ColumnMapping({ data, onNext, onBack }) {
  const initialMappings = useMemo(() => {
    const result = {};
    if (data?.mappings) {
      for (const [db, maps] of Object.entries(data.mappings)) {
        if (Array.isArray(maps)) {
          result[db] = maps.map((m) => ({ ...m, actual_column: m.actual_column || '' }));
        }
      }
    }
    return result;
  }, [data]);

  const [mappings, setMappings] = useState(() => JSON.parse(JSON.stringify(initialMappings)));
  const [saving, setSaving] = useState(false);
  const [activeDB, setActiveDB] = useState('RanUser');

  const dbNames = useMemo(() =>
    ['RanUser', 'RanGame1', 'RanLog', 'RanShop'].filter(
      (n) => data?.databases?.[n]?.found
    ), [data]
  );

  const allColumnOptions = useMemo(() => {
    const opts = {};
    for (const [dbName, info] of Object.entries(data?.databases || {})) {
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
  }, [data]);

  const currentMappings = mappings[activeDB] || [];
  const currentOptions = allColumnOptions[activeDB] || [];

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
        const dbOptions = allColumnOptions[db] || [];
        updated[db] = maps.map((m) => ({
          ...m,
          actual_column: m.actual_column || autoMatch(dbOptions, m.table_name, m.standard_field),
        }));
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

  const tabCounts = useMemo(() => {
    const c = {};
    for (const db of dbNames) {
      c[db] = currentMappings
        ? (mappings[db] || []).filter((m) => m.actual_column).length + '/' + (mappings[db] || []).length
        : '0/0';
    }
    return c;
  }, [mappings, dbNames]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-3xl mx-auto"
    >
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gold/15 flex items-center justify-center mx-auto mb-4">
          <GitCompare className="w-8 h-8 text-gold" />
        </div>
        <h2 className="text-2xl font-bold mb-2">ปรับแต่งคอลัมน์</h2>
        <p className="text-muted-foreground text-sm">เลือกคอลัมน์ให้ตรงกับฐานข้อมูลเกมของคุณ</p>
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
          <SearchX className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">ไม่พบฐานข้อมูล RAN Online</p>
          <p className="text-xs text-muted-foreground/60 mt-1">กรุณาตรวจสอบการเชื่อมต่อ MSSQL ในขั้นตอนก่อนหน้า</p>
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
                    ? 'bg-gold text-white shadow-lg shadow-gold/20'
                    : 'bg-white/[0.05] text-muted-foreground hover:text-foreground'
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
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
                <p className="text-muted-foreground text-center py-8">ไม่มีข้อมูลการจับคู่สำหรับฐานข้อมูลนี้</p>
              ) : (
                currentMappings.map((m, i) => {
                  const filtered = currentOptions.filter((c) => c.tableName === m.table_name);
                  const allOpts = filtered.length > 0 ? filtered : currentOptions;

                  return (
                    <div key={i} className={`flex items-center gap-2 p-2.5 rounded-lg transition-colors ${
                      m.actual_column ? 'bg-success/5 border border-success/20' : 'bg-white/[0.03]'
                    }`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {m.standard_field}
                          {m.is_required && <span className="text-danger ml-1">*</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">{m.table_name}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />

                      {allOpts.length > 0 ? (
                        <select
                          value={m.actual_column || ''}
                          onChange={(e) => updateMapping(i, e.target.value)}
                          className="bg-background border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary min-w-[180px] max-w-[240px]"
                        >
                          <option value="">— ไม่ได้จับคู่ —</option>
                          {allOpts.map((col, ci) => (
                            <option key={ci} value={col.column}>
                              {col.column}
                              {col.tableName !== m.table_name ? ` (${col.tableName})` : ''}
                              {' — '}{col.data_type}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={m.actual_column || ''}
                          onChange={(e) => updateMapping(i, e.target.value)}
                          placeholder="พิมพ์ชื่อคอลัมน์..."
                          className="bg-background border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary min-w-[180px]"
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-between pt-6 mt-4 border-t border-white/[0.06]">
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
