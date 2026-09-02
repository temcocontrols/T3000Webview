/**
 * Design Hub — Create-by-Type Tiles
 * The pluggable type registry rendered as colorful launcher tiles.
 * Clicking a tile opens the New-Drawing dialog to set device/settings first.
 */
import React from 'react';
import { getAllDrawingTypes } from '../drawingTypes';
import { HubIcon } from '../icons';
import type { DrawingType } from '../types';
import styles from '../pages/DesignHubPage.module.css';

export const TypeTiles: React.FC<{ onCreate: (type: DrawingType) => void }> = ({ onCreate }) => {
  const types = getAllDrawingTypes();

  return (
    <div className={styles.typeGrid}>
      {types.map((type) => (
        <button
          key={type.id}
          className={styles.typeTile}
          style={{ ['--tile-accent' as any]: type.accent }}
          onClick={() => onCreate(type)}
        >
          <span className={styles.typeTileIcon}>
            <HubIcon icon={type.icon} size={22} />
          </span>
          <span className={styles.typeTileBody}>
            <span className={styles.typeTileName}>{type.name}</span>
            <span className={styles.typeTileDesc}>{type.description}</span>
          </span>
        </button>
      ))}
    </div>
  );
};
