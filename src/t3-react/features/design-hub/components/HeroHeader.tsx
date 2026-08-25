/**
 * Design Hub — Hero Header (guide)
 * A short onboarding guide instead of duplicating the create/import actions
 * that already live below ("Create by Type", Folders, Hub Tools).
 */
import React from 'react';
import styles from '../pages/DesignHubPage.module.css';

const GUIDE_STEPS = [
  { n: '1', title: 'Choose a type', text: 'HVAC, LCD UI, LVGL 9.5' },
  { n: '2', title: 'Pick a device', text: 'Bind to device & set settings' },
  { n: '3', title: 'Design & edit', text: 'Your drawing page opens' },
  { n: '4', title: 'Deploy', text: 'Send to device via BACnet/REST' },
];

export const HeroHeader: React.FC = () => {
  return (
    <div className={styles.hero}>
      <div className={styles.heroText}>
        <div className={styles.heroEyebrow}>Design Hub</div>
        <h1 className={styles.heroTitle}>Design for your devices, in one place</h1>
        <p className={styles.heroSubtitle}>
          Create HVAC graphics, thermostat LCD UI and LVGL embedded projects. Pick a
          type below, choose the device it belongs to, and start editing.
        </p>
      </div>
      <div className={styles.heroGuide}>
        {GUIDE_STEPS.map((s, i) => (
          <React.Fragment key={s.n}>
            {i > 0 && <span className={styles.guideArrow}>→</span>}
            <div className={styles.guideStep}>
              <span className={styles.guideStepNum}>{s.n}</span>
              <div className={styles.guideStepBody}>
                <div className={styles.guideStepTitle}>{s.title}</div>
                <div className={styles.guideStepText}>{s.text}</div>
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default HeroHeader;
