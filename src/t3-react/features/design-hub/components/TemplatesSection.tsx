/**
 * TemplatesSection — ready-made starter canvases per drawing type.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Tooltip } from '@fluentui/react-components';
import { AddRegular, FlowRegular, BuildingMultipleRegular } from '@fluentui/react-icons';
import { DRAWING_TEMPLATES } from '../templates';
import { getDrawingType } from '../drawingTypes';
import { useDesignHubStore } from '../store/designHubStore';
import { HubIcon } from '../icons';
import styles from '../pages/DesignHubPage.module.css';

export const TemplatesSection: React.FC = () => {
  const navigate = useNavigate();
  const createFromTemplate = useDesignHubStore((s) => s.createFromTemplate);

  const handleCreate = (templateId: string) => {
    const template = DRAWING_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    const project = createFromTemplate(template);
    navigate(project.openPath);
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>
          <HubIcon icon="DocumentAdd" size={18} />
          Templates
        </div>
        <span className={styles.sectionHint}>Start from a ready-made canvas</span>
      </div>

      <div className={styles.typeGrid}>
        {DRAWING_TEMPLATES.map((t) => {
          const type = getDrawingType(t.typeId);
          return (
            <button
              key={t.id}
              className={styles.typeTile}
              onClick={() => handleCreate(t.id)}
            >
              <span
                className={styles.typeTileIcon}
                style={{ background: `linear-gradient(135deg, ${type.accent}, ${type.accent}cc)` }}
              >
                {t.typeId === 'floor-plan' ? (
                  <BuildingMultipleRegular style={{ fontSize: 22 }} />
                ) : t.typeId === 'lcd-ui' ? (
                  <FlowRegular style={{ fontSize: 22 }} />
                ) : (
                  <HubIcon icon={type.icon} size={22} />
                )}
              </span>
              <span className={styles.typeTileName}>{t.name}</span>
              <span className={styles.typeTileDesc}>
                {t.description}
                <br />
                <span style={{ fontSize: 11, color: '#8b97a8' }}>{t.width} × {t.height} · {t.hint}</span>
              </span>
              <span className={styles.typeTileFooter}>
                <Tooltip content="New from template" relationship="label">
                  <span className={styles.formatPill} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <AddRegular style={{ fontSize: 11 }} /> from template
                  </span>
                </Tooltip>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
