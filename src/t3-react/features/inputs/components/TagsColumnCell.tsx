import React, { useState, useEffect, useCallback } from 'react';
import { TableCellLayout } from '@fluentui/react-components';
import { TagAssignmentDrawer } from '../../haystack/components/TagAssignmentDrawer';
import { API_BASE_URL } from '../../../config/constants';

interface PointTagInfo {
  serial_number: number;
  point_type: string;
  point_index: string;
  point_id: string;
  tag_name: string;
}

interface Props {
  serialNumber: number;
  pointType: 'INPUT' | 'OUTPUT' | 'VARIABLE';
  pointIndex: string;
  pointId: string;
  pointLabel?: string;
  deviceName?: string;
  isEmpty?: boolean;
}

/** Cache of point tags + brick class keyed by device serial_number */
interface CachedEntry { tags: PointTagInfo[]; brickClasses: Record<string, string>; }
const tagCache = new Map<string, CachedEntry>();
let pendingFetch: Promise<void> | null = null;

export async function fetchTagsForDevice(serialNumber: number): Promise<CachedEntry> {
  const key = String(serialNumber);
  if (tagCache.has(key)) return tagCache.get(key)!;

  if (!pendingFetch) {
    pendingFetch = (async () => {
      try {
        const [tagRes, bcRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/haystack/point-tags/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serialNumbers: String(serialNumber) }),
          }).then(r => r.json()),
          fetch(`${API_BASE_URL}/api/haystack/auto-tagging/brick-classes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serialNumbers: [serialNumber] }),
          }).then(r => r.json()).catch(() => ({ entries: [] })),
        ]);
        const tags: PointTagInfo[] = tagRes.entries || [];
        const bcEntries: any[] = bcRes.entries || [];
        const brickClasses: Record<string, string> = {};
        for (const e of bcEntries) {
          const k = `${e.point_type}:${e.point_index}`;
          brickClasses[k] = e.brick_class;
        }
        // Group tags and brick classes by serial
        const bySerial = new Map<string, { tags: PointTagInfo[]; bc: Record<string, string> }>();
        for (const e of tags) {
          const k = String(e.serial_number);
          if (!bySerial.has(k)) bySerial.set(k, { tags: [], bc: {} });
          bySerial.get(k)!.tags.push(e);
        }
        for (const [ptk, bc] of Object.entries(brickClasses)) {
          for (const [k, v] of bySerial.entries()) {
            v.bc[ptk] = bc;
          }
        }
        for (const [k, v] of bySerial) tagCache.set(k, { tags: v.tags, brickClasses: v.bc });
      } catch {
        tagCache.set(key, { tags: [], brickClasses: {} });
      } finally {
        pendingFetch = null;
      }
    })();
  }
  await pendingFetch;
  return tagCache.get(key) || { tags: [], brickClasses: {} };
}

/** Prefix raw tag names for display: haystack tags get "hay:", brick gets "brick:", custom tags stay raw */
function prefixTag(tagName: string, brickClass: string | undefined): string {
  if (brickClass && tagName === brickClass) return `brick:${tagName}`;
  // Known Haystack standard tags
  const HAYSTACK_TAGS = new Set([
    'point','sensor','cmd','sp','his','write','status','alarm',
    'air','water','temp','humidity','pressure','flow','co2','co',
    'occupancy','light','level','speed','power','energy','current',
    'voltage','frequency','resistance','volume','mass','time','counter',
    'percent','position','rate','enable','run','mode','contact',
    'binary','analog','multistate','bool','number','str',
    'outside','inside','zone','space','return','supply','exhaust','discharge',
    'mixed','chilled','hot','condenser','economizer','bypass',
    'fan','pump','damper','valve','coil','filter','compressor','vfd',
    'heat','cool','reheat','preheat','heating','cooling','dewpoint','enthalpy','wetbulb',
    'equip','site','weather','schedule',
  ]);
  if (HAYSTACK_TAGS.has(tagName.toLowerCase())) return `hay:${tagName}`;
  return tagName;
}

function chipStyle(prefix: string): React.CSSProperties {
  if (prefix === 'brick') return { background: '#fdf6e3', color: '#8b6914', border: '1px solid #e6c960' };
  if (prefix === 'hay') return { background: 'var(--colorBrandBackground2)', color: 'var(--colorBrandForeground1)' };
  return { background: 'var(--colorNeutralBackground3)', color: 'var(--colorNeutralForeground2)' };
}

export const TagsColumnCell: React.FC<Props> = ({
  serialNumber, pointType, pointIndex, pointId, pointLabel, deviceName, isEmpty,
}) => {
  const [tags, setTags] = useState<string[]>([]);
  const [brickClass, setBrickClass] = useState<string | undefined>();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (isEmpty) return;
    let cancelled = false;
    fetchTagsForDevice(serialNumber).then((entry) => {
      if (cancelled) return;
      const mine = entry.tags.filter(t => t.point_type === pointType && t.point_index === pointIndex);
      const bcKey = `${pointType}:${pointIndex}`;
      setBrickClass(entry.brickClasses[bcKey]);
      setTags(mine.map(t => t.tag_name));
    });
    return () => { cancelled = true; };
  }, [serialNumber, pointType, pointIndex, isEmpty]);

  const handleSave = useCallback(async () => {
    tagCache.delete(String(serialNumber));
    const entry = await fetchTagsForDevice(serialNumber);
    const mine = entry.tags.filter(t => t.point_type === pointType && t.point_index === pointIndex);
    const bcKey = `${pointType}:${pointIndex}`;
    setBrickClass(entry.brickClasses[bcKey]);
    setTags(mine.map(t => t.tag_name));
  }, [serialNumber, pointType, pointIndex]);

  if (isEmpty) return <TableCellLayout>—</TableCellLayout>;

  // Build display list: brick class first if present, then tags
  const displayItems: string[] = [];
  if (brickClass) displayItems.push(`brick:${brickClass}`);
  for (const t of tags) {
    if (t !== brickClass) displayItems.push(prefixTag(t, brickClass));
  }
  const shown = displayItems.slice(0, 3);
  const extra = displayItems.length - 3;

  return (
    <>
      <TableCellLayout
        onClick={(e) => { e.stopPropagation(); setDrawerOpen(true); }}
        style={{ cursor: 'pointer', minWidth: 120 }}
      >
        {displayItems.length === 0 ? (
          <span style={{ color: 'var(--colorNeutralForeground3)', fontStyle: 'italic', fontSize: 12 }}>+ Add tags</span>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {shown.map((tag) => {
              const pfx = tag.startsWith('brick:') ? 'brick' : tag.startsWith('hay:') ? 'hay' : '';
              const label = tag.startsWith('brick:') ? tag.slice(6) : tag.startsWith('hay:') ? tag.slice(4) : tag;
              return (
                <span key={tag} style={{ padding: '1px 7px', borderRadius: 10, fontSize: 11, whiteSpace: 'nowrap', ...chipStyle(pfx) }}>
                  {label}
                </span>
              );
            })}
            {extra > 0 && <span style={{ fontSize: 11, color: 'var(--colorNeutralForeground3)' }}>+{extra} more</span>}
          </div>
        )}
      </TableCellLayout>

      {drawerOpen && (
        <TagAssignmentDrawer
          deviceName={deviceName}
          pointLabel={pointLabel}
          pointId={pointId}
          serialNumber={serialNumber}
          pointType={pointType}
          pointIndex={pointIndex}
          currentTags={tags}
          currentBrickClass={brickClass}
          onClose={() => setDrawerOpen(false)}
          onSaved={handleSave}
        />
      )}
    </>
  );
};
