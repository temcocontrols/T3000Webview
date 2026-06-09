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

/** Cache of point tags keyed by device serial_number */
const tagCache = new Map<string, PointTagInfo[]>();
let pendingFetch: Promise<void> | null = null;

async function fetchTagsForDevice(serialNumber: number): Promise<PointTagInfo[]> {
  const key = String(serialNumber);
  if (tagCache.has(key)) return tagCache.get(key)!;

  if (!pendingFetch) {
    pendingFetch = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/haystack/point-tags/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serialNumbers: String(serialNumber) }),
        });
        const data = await res.json();
        const entries: PointTagInfo[] = data.entries || [];
        // Group by serial
        const bySerial = new Map<string, PointTagInfo[]>();
        for (const e of entries) {
          const k = String(e.serial_number);
          if (!bySerial.has(k)) bySerial.set(k, []);
          bySerial.get(k)!.push(e);
        }
        for (const [k, v] of bySerial) tagCache.set(k, v);
      } catch {
        tagCache.set(key, []);
      } finally {
        pendingFetch = null;
      }
    })();
  }
  await pendingFetch;
  return tagCache.get(key) || [];
}

export const TagsColumnCell: React.FC<Props> = ({
  serialNumber,
  pointType,
  pointIndex,
  pointId,
  pointLabel,
  deviceName,
  isEmpty,
}) => {
  const [tags, setTags] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (isEmpty) return;
    let cancelled = false;
    fetchTagsForDevice(serialNumber).then((all) => {
      if (cancelled) return;
      const mine = all.filter(
        (t) => t.point_type === pointType && t.point_index === pointIndex
      );
      setTags(mine.map((t) => t.tag_name));
    });
    return () => { cancelled = true; };
  }, [serialNumber, pointType, pointIndex, isEmpty]);

  const handleSave = useCallback(
    async () => {
      // Drawer already handled the POST; just invalidate cache & re-fetch
      tagCache.delete(String(serialNumber));
      const all = await fetchTagsForDevice(serialNumber);
      const mine = all.filter(
        (t) => t.point_type === pointType && t.point_index === pointIndex
      );
      setTags(mine.map((t) => t.tag_name));
    },
    [serialNumber, pointType, pointIndex]
  );

  if (isEmpty) {
    return <TableCellLayout>—</TableCellLayout>;
  }

  const displayTags = tags.slice(0, 3);
  const extraCount = tags.length - 3;

  return (
    <>
      <TableCellLayout
        onClick={(e) => { e.stopPropagation(); setDrawerOpen(true); }}
        style={{ cursor: 'pointer', minWidth: 120 }}
      >
        {tags.length === 0 ? (
          <span style={{ color: 'var(--colorNeutralForeground3)', fontStyle: 'italic', fontSize: 12 }}>
            + Add tags
          </span>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {displayTags.map((tag) => (
              <span
                key={tag}
                style={{
                  padding: '1px 7px',
                  borderRadius: 10,
                  fontSize: 11,
                  background: 'var(--colorBrandBackground2)',
                  color: 'var(--colorBrandForeground1)',
                  whiteSpace: 'nowrap',
                }}
              >
                {tag}
              </span>
            ))}
            {extraCount > 0 && (
              <span style={{ fontSize: 11, color: 'var(--colorNeutralForeground3)' }}>
                +{extraCount} more
              </span>
            )}
          </div>
        )}
      </TableCellLayout>

      {drawerOpen && (
        <TagAssignmentDrawer
          deviceName={deviceName}
          pointLabel={pointLabel || `${pointType} ${pointIndex}`}
          pointId={pointId}
          serialNumber={serialNumber}
          pointType={pointType}
          pointIndex={pointIndex}
          currentTags={tags}
          onClose={() => setDrawerOpen(false)}
          onSaved={handleSave}
        />
      )}
    </>
  );
};
