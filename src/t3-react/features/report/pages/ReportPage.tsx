/**
 * Report an Issue.
 *
 * The flow a customer walks through from Help → Report an Issue:
 *   1. Describe  — what happened, in their own words, plus which screen they were on.
 *   2. Self-check — the backend rule table answers "is this already known / is this me?" and
 *                   points at documentation. Either exit is fine; the form is always reachable.
 *   3. Attach    — screenshot (captured by the T3000 host), pasted image, runtime log.
 *   4. Review    — editable title/body, then one of the routes (GitHub, e-mail, forum, bundle).
 *   5. Done      — what happened, and where the local copy lives.
 *
 * A bundle is written to disk *before* anything is sent, so a failed send never loses the
 * screenshot or the log.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Button,
  Dialog,
  DialogSurface,
  Divider,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  Dropdown,
  Field,
  Input,
  Link,
  Option,
  OverlayDrawer,
  Spinner,
  Switch,
  Textarea,
  Tooltip,
} from '@fluentui/react-components';
import {
  CameraRegular,
  CheckmarkCircleRegular,
  ClipboardPasteRegular,
  CopyRegular,
  DismissRegular,
  DocumentTextRegular,
  EditRegular,
  ErrorCircleRegular,
  OpenRegular,
  SearchRegular,
  SendRegular,
  SettingsRegular,
  WarningRegular,
} from '@fluentui/react-icons';

import reportApi from '../services/reportApi';
import { draftWithAi } from '../services/aiDraft';
import { useReportCommands } from '../services/reportCommands';
import { ReportNotice } from '../components/ReportNotice';
import { REPORT_HISTORY_HASH } from '../services/reportRoutes';
import { SettingsDrawer } from '../../ai-chat/components/SettingsDrawer';
import type { AiProviderSettings } from '../../ai-chat/components/SettingsDrawer';
import {
  loadProviderCache,
  loadSettings,
  saveSettings,
} from '../../ai-chat/services/aiSettingsStore';
import type { ProviderCache } from '../../ai-chat/services/aiSettingsStore';
import {
  captureScreen,
  copyScreenshotToClipboard,
  getContext,
  getRuntimeLogs,
  inT3000,
} from '../services/webviewBridge';
import type {
  BundleResult,
  CaptureResult,
  ClientContext,
  DraftResult,
  ReportKind,
  ReportStep,
  SendResult,
  StoredReport,
  Suggestion,
} from '../types';
import styles from './ReportPage.module.css';

const AREAS = [
  'Inputs',
  'Outputs',
  'Variables',
  'Programs',
  'Schedules',
  'Holidays',
  'PID Loops',
  'Trend Logs',
  'Graphics',
  'Alarms',
  'Network',
  'Database',
  'Installation',
  'Something else',
];

const KIND_LABEL: Record<ReportKind, string> = {
  bug: 'Something is broken',
  feature: 'I want a new feature',
  support: 'I need help using T3000',
};

const KIND_HINT: Record<ReportKind, string> = {
  bug: 'A screen, a button or a device did not do what it should.',
  feature: 'Ask for something T3000 cannot do yet.',
  support: 'Ask how to set something up, or how to read a value.',
};

const STEP_LABEL: Record<ReportStep, string> = {
  describe: 'Describe',
  'self-check': 'Self-check',
  attach: 'Attach',
  review: 'Review',
  done: 'Send',
};

const STEP_ORDER: ReportStep[] = ['describe', 'self-check', 'attach', 'review', 'done'];

const severityIcon = (severity: string) => {
  if (severity === 'critical') {
    return <ErrorCircleRegular className={styles.sevCritical} />;
  }
  if (severity === 'warning') {
    return <WarningRegular className={styles.sevWarning} />;
  }
  return <DocumentTextRegular className={styles.sevInfo} />;
};

const severityBadge = (severity: string) => {
  const color = severity === 'critical' ? 'danger' : severity === 'warning' ? 'warning' : 'informative';
  return <Badge appearance="tint" color={color}>{severity}</Badge>;
};

const DOCS_ROOT = '#/t3000/documentation';
const DOCS_SITE = 'https://temcocontrols.github.io/temco-learn';
const FORUM_ROOT = 'https://forums.temcocontrols.com';

/** How many saved reports the details drawer lists before pointing at the history page. */
const HISTORY_PREVIEW = 3;

/* ── Unfinished-report draft ──
   Text only. Screenshots and the runtime log are re-read from T3000 on demand, so there is nothing
   large or private to keep here. */
const DRAFT_KEY = 't3.report.draft';

interface StoredDraft {
  step?: ReportStep;
  kind?: ReportKind;
  summary?: string;
  details?: string;
  steps?: string;
  expected?: string;
  area?: string;
  title?: string;
  body?: string;
}

const loadStoredDraft = (): StoredDraft => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as StoredDraft;
    // 'done' is an outcome, not a place to come back to.
    return parsed.step === 'done' ? { ...parsed, step: 'review' } : parsed;
  } catch {
    return {};
  }
};

const saveStoredDraft = (draft: StoredDraft) => {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {}
};

const clearStoredDraft = () => {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
};

/**
 * The documentation page routes by path (`/t3000/documentation/<path>`), while the API hands out
 * docs ids like `t3000/guides/trend-logs`. Strip the collection prefix the route already carries.
 */
const docLink = (suggestion: Suggestion): string | null => {
  const id = suggestion.doc_id?.trim();
  if (id) {
    return `${DOCS_ROOT}/${id.replace(/^t3000\//, '')}`;
  }
  return suggestion.doc_url ?? null;
};

interface Shot {
  path: string;
  dataUrl?: string;
  width: number;
  height: number;
}

const emptyContext = (): ClientContext => ({
  deviceSerial: null,
  deviceCount: null,
  area: '',
  message: '',
  exeVersion: '',
  windowsVersion: '',
  building: '',
  panel: 0,
  logText: '',
});

export const ReportPage: React.FC = () => {
  /* The form is restored from the last session: with the menu bar on screen, leaving the page
     (Help, another menu, a reload) is one click away and must not throw the draft away. */
  const restore = useMemo(loadStoredDraft, []);
  const [step, setStep] = useState<ReportStep>(restore.step ?? 'describe');
  const [kind, setKind] = useState<ReportKind>(restore.kind ?? 'bug');
  const [summary, setSummary] = useState(restore.summary ?? '');
  const [details, setDetails] = useState(restore.details ?? '');
  const [steps, setSteps] = useState(restore.steps ?? '');
  const [expected, setExpected] = useState(restore.expected ?? '');
  const [area, setArea] = useState(restore.area ?? AREAS[0]);
  const [context, setContext] = useState<ClientContext>(emptyContext);
  const [contextReady, setContextReady] = useState(false);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searched, setSearched] = useState(0);
  const [checking, setChecking] = useState(false);

  const [shots, setShots] = useState<Shot[]>([]);
  const [failedShots, setFailedShots] = useState<string[]>([]);
  const [previewShot, setPreviewShot] = useState<{ shot: Shot; label: string } | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [captureError, setCaptureError] = useState('');
  const [logText, setLogText] = useState('');
  const [logSaved, setLogSaved] = useState('');
  const [includeLogs, setIncludeLogs] = useState(true);

  const [draft, setDraft] = useState<DraftResult | null>(null);
  const [title, setTitle] = useState(restore.title ?? '');
  const [body, setBody] = useState(restore.body ?? '');
  const [bundle, setBundle] = useState<BundleResult | null>(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [sendError, setSendError] = useState('');
  const [clipboardNote, setClipboardNote] = useState('');

  const [error, setError] = useState('');
  const [reports, setReports] = useState<StoredReport[]>([]);
  const [reportsDir, setReportsDir] = useState('');
  const [loadingReports, setLoadingReports] = useState(true);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [aiSettings, setAiSettings] = useState<AiProviderSettings>(loadSettings);
  const [providerCache, setProviderCache] = useState<ProviderCache>(loadProviderCache);

  const pageRef = useRef<HTMLDivElement>(null);

  // ── environment ──

  const loadEnvironment = useCallback(async () => {
    const host = await getContext();
    const logs = await getRuntimeLogs(200);
    setContext((prev) => ({
      ...prev,
      exeVersion: host?.version ?? '',
      windowsVersion: host?.windows ?? '',
      building: host?.building ?? '',
      panel: host?.panel ?? 0,
      deviceSerial: host?.device_serial ?? null,
      logText: logs.text,
    }));
    setLogText(logs.text);
    setLogSaved(logs.saved);
    setContextReady(true);
  }, []);

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const res = await reportApi.list();
      setReports(res.reports);
      setReportsDir(res.dir);
    } catch {
      setReports([]);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    void loadEnvironment();
    void loadReports();
  }, [loadEnvironment, loadReports]);

  const buildInput = useMemo(
    () => () => ({
      kind,
      summary,
      details,
      expected,
      steps,
      context: { ...context, area, message: summary, logText },
      logText,
      includeLogs,
      screenshotPaths: shots.filter((s) => s.path).map((s) => s.path),
      screenshotDataUrls: shots.filter((s) => s.dataUrl).map((s) => s.dataUrl as string),
    }),
    [kind, summary, details, expected, steps, context, area, logText, includeLogs, shots]
  );

  // ── step 1 → 2 ──

  const runSelfCheck = async () => {
    if (!summary.trim()) {
      setError('Please describe what happened first — one sentence is enough.');
      return;
    }
    setError('');
    setChecking(true);
    try {
      const result = await reportApi.selfCheck({
        ...context,
        area,
        message: `${summary} ${details}`,
        logText,
      });
      setSuggestions(result.suggestions);
      setSearched(result.documents_searched);
      setStep('self-check');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Self-check failed');
    } finally {
      setChecking(false);
    }
  };

  // ── step 3: capture ──

  const addShot = (shot: Shot) => setShots((prev) => [...prev, shot]);

  /** A pasted image carries its bytes; a host capture carries only a path, so the card
      streams it back through `/api/report/image`. */
  const shotSrc = (shot: Shot) => shot.dataUrl || (shot.path ? reportApi.imageUrl(shot.path) : '');

  const removeShot = (index: number) => {
    setShots((prev) => prev.filter((_, i) => i !== index));
    setFailedShots([]);
    setPreviewShot(null);
  };

  const clearShots = () => {
    setShots([]);
    setFailedShots([]);
    setPreviewShot(null);
    setCaptureError('');
  };

  const capture = async () => {
    setCaptureError('');
    setCapturing(true);
    try {
      const result: CaptureResult = await captureScreen(true);
      if (!result.ok) {
        setCaptureError(result.error || 'The screen could not be captured.');
        return;
      }
      addShot({
        path: result.path,
        dataUrl: result.dataUrl,
        width: result.width,
        height: result.height,
      });
    } finally {
      setCapturing(false);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const items = Array.from(event.clipboardData?.items ?? []);
    const image = items.find((i) => i.type.startsWith('image/'));
    if (!image) {
      return;
    }
    const file = image.getAsFile();
    if (!file) {
      return;
    }
    event.preventDefault();
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (dataUrl) {
        addShot({ path: '', dataUrl, width: 0, height: 0 });
      }
    };
    reader.readAsDataURL(file);
  };

  // ── step 4: review + send ──

  const openReview = async () => {
    setError('');
    try {
      const result = await reportApi.draft(buildInput());
      setDraft(result);
      setTitle(result.title);
      setBody(result.body);
      setStep('review');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not prepare the report');
    }
  };

  const saveBundle = async (): Promise<BundleResult | null> => {
    if (bundle) {
      return bundle;
    }
    const created = await reportApi.bundle(buildInput());
    setBundle(created);
    void loadReports();
    return created;
  };

  const send = async () => {
    setError('');
    setSendError('');
    setSending(true);
    try {
      const saved = await saveBundle();
      const result = await reportApi.send({
        kind,
        title,
        body,
        labels: draft?.labels ?? [],
        bundleId: saved?.id ?? null,
      });
      setSendResult(result);
      setStep('done');
      clearStoredDraft();
      if (result.url) {
        window.open(result.url, '_blank', 'noopener,noreferrer');
      }
      if (saved && shots.length > 0) {
        setClipboardNote(
          'The screenshot is in your report folder. Copy it to the clipboard and paste it into the issue with Ctrl+V.'
        );
      }
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'The report could not be sent');
    } finally {
      setSending(false);
    }
  };

  const saveBundleOnly = async () => {
    setError('');
    setSending(true);
    try {
      const saved = await saveBundle();
      if (saved) {
        setSendResult({
          ok: true,
          route: 'bundle',
          message: `Saved to ${saved.dir}`,
        });
        setStep('done');
      }
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'The report could not be saved');
    } finally {
      setSending(false);
    }
  };

  const copyShotToClipboard = async (path: string) => {
    const ok = await copyScreenshotToClipboard(path);
    setClipboardNote(
      ok ? 'Screenshot copied — paste it into the issue with Ctrl+V.' : 'Could not copy the screenshot.'
    );
  };

  const copyFirstShot = async () => {
    const shot = shots.find((s) => Boolean(s.path));
    if (!shot?.path) {
      setClipboardNote('That screenshot came from the clipboard, so there is nothing to copy back to it.');
      return;
    }
    await copyShotToClipboard(shot.path);
  };

  /** Ask the local model for a first draft, then leave the text in the editor for the user to edit. */
  const runAiDraft = async () => {
    if (!summary.trim()) {
      setAiError('Describe what happened first — one sentence is enough.');
      return;
    }
    setAiError('');
    setAiBusy(true);
    try {
      if (!draft) {
        await openReview();
      }
      setBody('');
      let streamed = '';
      const result = await draftWithAi(
        { kind, area, summary, details, steps, expected, context: { ...context, logText } },
        (chunk) => {
          streamed += chunk;
          setBody(streamed);
        }
      );
      if (!result.text.trim()) {
        throw new Error('The model returned an empty answer');
      }
      setStep('review');
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'The AI draft failed');
    } finally {
      setAiBusy(false);
    }
  };

  const restart = () => {
    setStep('describe');
    setDraft(null);
    setBundle(null);
    setSendResult(null);
    setSendError('');
    setSuggestions([]);
    setShots([]);
    setFailedShots([]);
    setCaptureError('');
    setClipboardNote('');
    setSummary('');
    setDetails('');
    setSteps('');
    setExpected('');
    setTitle('');
    setBody('');
    clearStoredDraft();
  };

  const stepIndex = STEP_ORDER.indexOf(step);

  /* The user's own words double as the search term for the forum. */
  const searchWords = (summary.trim() || details.trim()).slice(0, 120);
  const forumHref = searchWords
    ? `${FORUM_ROOT}/?q=${encodeURIComponent(searchWords)}`
    : FORUM_ROOT;

  /* The command bar sits above this page (see ReportLayout), so the two talk through
     ReportCommandsProvider: the page registers what the buttons do, and publishes the state that
     decides which of them are enabled. Re-registering on every render keeps the handlers current. */
  const { register, publish } = useReportCommands();

  useEffect(() => {
    register({
      capture: () => void capture(),
      copyShot: () => void copyFirstShot(),
      check: () => void runSelfCheck(),
      draft: () => void runAiDraft(),
      clearShots: () => clearShots(),
      toggleDetails: () => setDetailsOpen((open) => !open),
      aiSettings: () => setAiSettingsOpen(true),
    });
  });

  useEffect(() => {
    publish({
      hasScreenshots: shots.length > 0,
      busy: capturing || checking || aiBusy || sending,
      canDraft: summary.trim().length > 0,
      detailsOpen,
      insideT3000: inT3000(),
    });
  }, [shots.length, capturing, checking, aiBusy, sending, summary, detailsOpen, publish]);

  // Keep the draft on disk while the user types, without writing on every keystroke. An empty
  // "describe" step means there is nothing worth restoring, so the key is removed instead.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const untouched =
        step === 'describe' && !summary && !details && !steps && !expected && !title && !body;
      if (untouched) {
        clearStoredDraft();
      } else {
        saveStoredDraft({ step, kind, summary, details, steps, expected, area, title, body });
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [step, kind, summary, details, steps, expected, area, title, body]);

  // ── render ──

  return (
    <div className={styles.container} ref={pageRef} onPaste={handlePaste}>
      <div className={styles.main}>
        <div className={styles.intro}>
          Tell us what happened. T3000 attaches its version, the runtime log and a screenshot, so you
          do not have to describe them. Nothing is sent until you press Send.
        </div>

        <div className={styles.stepper}>
          {STEP_ORDER.map((name, index) => (
            <button
              key={name}
              type="button"
              className={[
                styles.stepChip,
                index === stepIndex ? styles.stepChipActive : '',
                index < stepIndex ? styles.stepChipDone : '',
              ].join(' ')}
              onClick={() => setStep(name)}
              aria-current={index === stepIndex ? 'step' : undefined}
              title={`Go to step ${index + 1}: ${STEP_LABEL[name]}`}
            >
              <span className={styles.stepNumber}>{index + 1}</span>
              <span>{STEP_LABEL[name]}</span>
            </button>
          ))}
        </div>

        {error ? (
          <ReportNotice intent="error" className={styles.pageMessage} title={error} />
        ) : null}

        {aiError ? (
          <ReportNotice
            intent="brand"
            className={styles.pageMessage}
            action={
              <Tooltip content="Open the AI settings" relationship="label">
                <Button
                  appearance="subtle"
                  size="small"
                  icon={<SettingsRegular />}
                  onClick={() => setAiSettingsOpen(true)}
                  aria-label="Open the AI settings"
                />
              </Tooltip>
            }
          >
            AI draft unavailable — {aiError}
          </ReportNotice>
        ) : null}

        {/* ── 1. Describe ── */}
        {step === 'describe' ? (
          <div className={styles.panel}>
            <div className={styles.kindRow}>
              {(Object.keys(KIND_LABEL) as ReportKind[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={[styles.kindCard, kind === option ? styles.kindCardActive : ''].join(' ')}
                  onClick={() => setKind(option)}
                >
                  <div className={styles.kindTitle}>{KIND_LABEL[option]}</div>
                  <div className={styles.kindHint}>{KIND_HINT[option]}</div>
                </button>
              ))}
            </div>

            <Field
              label={{ children: 'What happened?', className: styles.fieldLabel }}
              required
              hint="One sentence is enough — the rest can wait until the review step."
            >
              <Textarea
                value={summary}
                onChange={(_, data) => setSummary(data.value)}
                resize="vertical"
                rows={3}
                placeholder="Example: the trend log for AHU-1 shows no history after I enabled it."
              />
            </Field>

            <Field
              label={{ children: 'Details (optional)', className: styles.fieldLabel }}
              hint="What you clicked, what you saw, what changed afterwards."
            >
              <Textarea
                value={details}
                onChange={(_, data) => setDetails(data.value)}
                resize="vertical"
                rows={4}
                placeholder="Example: I changed the setpoint to 22 and it jumped back to 18."
              />
            </Field>

            <Field label={{ children: 'Where were you?', className: styles.fieldLabel }}>
              <Dropdown
                className={styles.areaDropdown}
                listbox={{ className: styles.areaListbox }}
                value={area}
                selectedOptions={[area]}
                onOptionSelect={(_, data) => setArea(data.optionValue ?? AREAS[0])}
              >
                {AREAS.map((option) => (
                  <Option key={option} value={option}>
                    {option}
                  </Option>
                ))}
              </Dropdown>
            </Field>

            <div className={styles.actions}>
              <Button appearance="primary" onClick={() => void runSelfCheck()} disabled={checking}>
                {checking ? <Spinner size="tiny" /> : null}
                {checking ? ' Checking…' : 'Check for a known answer first'}
              </Button>
              <Button appearance="subtle" onClick={() => setStep('attach')}>
                Skip the check
              </Button>
            </div>
            {!contextReady ? <div className={styles.muted}>Reading T3000 details…</div> : null}
          </div>
        ) : null}

        {/* ── 2. Self-check ── */}
        {step === 'self-check' ? (
          <div className={styles.panel}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionTitle}>
                  {suggestions.length > 0 ? 'Things worth trying first' : 'No known answer found'}
                </div>
                <div className={styles.muted}>
                  Checked {searched} documentation pages and the built-in rule table
                  {suggestions.length > 0 ? ` · ${suggestions.length} suggestion${suggestions.length === 1 ? '' : 's'}` : ''}
                </div>
              </div>
            </div>

            {suggestions.length === 0 ? (
              <ReportNotice intent="info" title="This does not look like a known problem">
                Nothing matched, so please describe it in your own words — that is exactly the
                report we need. You can still attach a screenshot and the log.
              </ReportNotice>
            ) : (
              <ul className={styles.checkList}>
                {suggestions.map((suggestion, index) => {
                  const href = docLink(suggestion);
                  return (
                    <li
                      key={`${suggestion.rule_id}-${index}`}
                      className={styles.checkItem}
                      data-severity={suggestion.severity}
                    >
                      <div className={styles.checkHead}>
                        {severityIcon(suggestion.severity)}
                        <span className={styles.checkTitle}>{suggestion.title}</span>
                        {severityBadge(suggestion.severity)}
                      </div>
                      <div className={styles.checkDetail}>{suggestion.detail}</div>
                      <div className={styles.checkAction}>
                        <strong>Try this:</strong> {suggestion.action}
                      </div>
                      {href ? (
                        <Link href={href} target="_blank" rel="noreferrer" className={styles.checkDoc}>
                          <DocumentTextRegular />
                          {suggestion.doc_title || 'Open the documentation'}
                        </Link>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}

            <div className={styles.helpRow}>
              <span className={styles.helpLabel}>Nothing here helps?</span>
              <Link href={DOCS_SITE} target="_blank" rel="noreferrer" className={styles.helpLink}>
                <SearchRegular />
                Look through the documentation
              </Link>
              <Link href={forumHref} target="_blank" rel="noreferrer" className={styles.helpLink}>
                <SearchRegular />
                Search the forum
              </Link>
            </div>

            <div className={styles.actions}>
              <Button appearance="primary" onClick={() => setStep('attach')}>
                Still a problem — continue
              </Button>
              <Button appearance="subtle" onClick={() => setStep('describe')}>
                Back
              </Button>
            </div>
          </div>
        ) : null}

        {/* ── 3. Attach ── */}
        {step === 'attach' ? (
          <div className={styles.panel}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionTitle}>Attach what T3000 already knows</div>
                <div className={styles.muted}>
                  Screenshots and the last 200 runtime messages. You can paste an image with Ctrl+V.
                </div>
              </div>
              <div className={styles.headerActions}>
                {shots.length > 0 ? (
                  <Tooltip content="Remove every screenshot from this report" relationship="label">
                    <Button appearance="subtle" icon={<DismissRegular />} onClick={clearShots}>
                      Clear all
                    </Button>
                  </Tooltip>
                ) : null}
                <Button
                  icon={capturing ? <Spinner size="tiny" /> : <CameraRegular />}
                  onClick={() => void capture()}
                  disabled={capturing}
                >
                  {capturing ? 'Capturing…' : 'Capture screen'}
                </Button>
              </div>
            </div>

            {captureError ? (
              <ReportNotice intent="warning" title="Screen capture failed">
                {captureError} You can paste an image instead, or continue without one.
              </ReportNotice>
            ) : null}

            <div className={styles.shotGrid}>
              {shots.length === 0 ? (
                <div className={styles.emptyShot}>
                  <ClipboardPasteRegular className={styles.emptyIcon} />
                  <div>No screenshot yet</div>
                  <div className={styles.muted}>
                    Press Capture screen, or paste an image from the clipboard.
                  </div>
                </div>
              ) : (
                shots.map((shot, index) => {
                  const key = `${shot.path}-${index}`;
                  const label = shot.path ? shot.path.split(/[\\/]/).pop() || shot.path : 'Pasted image';
                  const broken = failedShots.includes(key);
                  const src = broken ? '' : shotSrc(shot);
                  return (
                    <div key={key} className={styles.shotCard}>
                      {src ? (
                        <button
                          type="button"
                          className={styles.shotOpen}
                          onClick={() => setPreviewShot({ shot, label })}
                          aria-label={`View screenshot ${index + 1} larger`}
                        >
                          <img
                            className={styles.shotImage}
                            src={src}
                            alt={`Screenshot ${index + 1}`}
                            onError={() =>
                              setFailedShots((prev) => (prev.includes(key) ? prev : [...prev, key]))
                            }
                          />
                          <span className={styles.shotZoom} aria-hidden="true">
                            <OpenRegular />
                          </span>
                        </button>
                      ) : (
                        <div className={styles.shotPlaceholder}>
                          <CameraRegular />
                          <span>
                            {broken ? 'Preview not available' : `${shot.width} x ${shot.height}`}
                          </span>
                          {broken ? <span>Copy it into the issue instead</span> : null}
                        </div>
                      )}
                      <div className={styles.shotMeta}>
                        <span className={styles.shotPath} title={shot.path || 'from clipboard'}>
                          {label}
                        </span>
                        {shot.path ? (
                          <Tooltip content="Copy to clipboard so you can paste it into the issue" relationship="label">
                            <Button
                              size="small"
                              appearance="subtle"
                              icon={<CopyRegular />}
                              onClick={() => void copyShotToClipboard(shot.path)}
                            />
                          </Tooltip>
                        ) : null}
                        <Tooltip content="Remove this screenshot" relationship="label">
                          <Button
                            size="small"
                            appearance="subtle"
                            icon={<DismissRegular />}
                            onClick={() => removeShot(index)}
                          />
                        </Tooltip>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <Divider />

            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionTitle}>Runtime log</div>
                <div className={styles.muted}>
                  {logText ? `${logText.split('\n').length} recent messages` : 'Nothing captured in this session'}
                  {logSaved ? ` · saved to ${logSaved}` : ''}
                </div>
              </div>
              <Switch
                checked={includeLogs}
                onChange={(_, data) => setIncludeLogs(data.checked)}
                label="Include the log"
              />
            </div>

            {logText ? (
              <pre className={styles.logPreview}>{logText.slice(-2500)}</pre>
            ) : (
              <ReportNotice intent="info" title="No runtime messages">
                Reproduce the problem once, then come back — the last messages will be attached
                automatically.
              </ReportNotice>
            )}

            <Field label={{ children: 'Steps to reproduce (optional)', className: styles.fieldLabel }}>
              <Textarea
                value={steps}
                onChange={(_, data) => setSteps(data.value)}
                resize="vertical"
                rows={3}
                placeholder="1. Open Trend Logs…"
              />
            </Field>

            <Field
              label={{
                children: 'What did you expect to happen? (optional)',
                className: styles.fieldLabel,
              }}
            >
              <Textarea
                value={expected}
                onChange={(_, data) => setExpected(data.value)}
                resize="vertical"
                rows={2}
              />
            </Field>

            <div className={styles.actions}>
              <Button appearance="primary" onClick={() => void openReview()} disabled={sending}>
                Review the report
              </Button>
              <Button appearance="subtle" onClick={() => setStep('self-check')}>
                Back
              </Button>
            </div>
          </div>
        ) : null}

        {/* ── 4. Review ── */}
        {step === 'review' ? (
          <div className={styles.panel}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionTitle}>Check what will be sent</div>
                <div className={styles.muted}>
                  This text goes to whoever reads the report. Edit anything that is wrong.
                </div>
              </div>
              <div className={styles.labelRow}>
                {(draft?.labels ?? []).map((label) => (
                  <Badge key={label} appearance="tint" color="informative">
                    {label}
                  </Badge>
                ))}
              </div>
            </div>

            <Field label={{ children: 'Title', className: styles.fieldLabel }}>
              <Input value={title} onChange={(_, data) => setTitle(data.value)} />
            </Field>

            <Field label={{ children: 'Report', className: styles.fieldLabel }}>
              <Textarea
                value={body}
                onChange={(_, data) => setBody(data.value)}
                resize="vertical"
                rows={16}
                className={styles.bodyTextarea}
              />
            </Field>

            <div className={styles.sendRow}>
              <Button
                appearance="primary"
                icon={<SendRegular />}
                onClick={() => void send()}
                disabled={sending || !title.trim()}
                title={!title.trim() ? 'Add a title before sending' : undefined}
              >
                {sending ? 'Sending…' : 'Send report'}
              </Button>
              <Button
                icon={aiBusy ? <Spinner size="tiny" /> : <EditRegular />}
                onClick={() => void runAiDraft()}
                disabled={sending || aiBusy}
              >
                {aiBusy ? 'Drafting…' : 'Draft with AI'}
              </Button>
              <Button
                icon={<DocumentTextRegular />}
                onClick={() => void saveBundleOnly()}
                disabled={sending}
              >
                Save a copy only
              </Button>
              <Button appearance="subtle" onClick={() => setStep('attach')}>
                Back
              </Button>
            </div>

            {sendError ? (
              <ReportNotice intent="error" title="The report was not sent">
                {sendError} It is saved locally, so nothing is lost — try again or save the copy.
              </ReportNotice>
            ) : null}

            {draft ? (
              <div className={styles.altRoutes}>
                <span className={styles.muted}>Other ways to send the same report:</span>
                <Link href={draft.github_url} target="_blank" rel="noreferrer">
                  GitHub <OpenRegular />
                </Link>
                <Link href={draft.mailto_url}>E-mail support</Link>
                <Link href={draft.forum_url} target="_blank" rel="noreferrer">
                  Forum <OpenRegular />
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ── 5. Done ── */}
        {step === 'done' ? (
          <div className={styles.panel}>
            {!sendResult ? (
              <ReportNotice intent="info" title="Nothing sent yet">
                Fill in the earlier steps and press Send in the Review step — the result, the local
                copy and the issue link all appear here.
              </ReportNotice>
            ) : sendResult.ok ? (
              <ReportNotice
                intent="success"
                title={
                  sendResult.route === 'github' && sendResult.issue_number
                    ? `Report filed as issue #${sendResult.issue_number}`
                    : sendResult.route === 'browser'
                      ? 'Finish in your browser'
                      : 'Saved'
                }
              >
                {sendResult.message}
                {sendResult.issue_url ? (
                  <>
                    {' '}
                    <Link href={sendResult.issue_url} target="_blank" rel="noreferrer">
                      Open the issue
                    </Link>
                  </>
                ) : null}
                {sendResult.url && !sendResult.issue_url ? (
                  <>
                    {' '}
                    <Link href={sendResult.url} target="_blank" rel="noreferrer">
                      Open the prefilled report
                    </Link>
                  </>
                ) : null}
              </ReportNotice>
            ) : (
              <ReportNotice intent="error" title="The report was not sent">
                {sendError || 'Unknown error'}
              </ReportNotice>
            )}

            {clipboardNote ? <ReportNotice intent="info">{clipboardNote}</ReportNotice> : null}

            {bundle ? (
              <div className={styles.bundleBox}>
                <div className={styles.sectionTitle}>
                  <CheckmarkCircleRegular className={styles.sevInfo} /> Local copy
                </div>
                <div className={styles.muted}>{bundle.dir}</div>
                <ul className={styles.fileList}>
                  {bundle.files.map((file) => (
                    <li key={file} className={styles.fileItem}>
                      {file.split(/[\\/]/).pop()}
                    </li>
                  ))}
                </ul>
                {bundle.attachments.length > 0 && inT3000() ? (
                  <Button
                    size="small"
                    icon={<CopyRegular />}
                    onClick={() => void copyShotToClipboard(bundle.attachments[0])}
                  >
                    Copy the screenshot to paste into the issue
                  </Button>
                ) : null}
              </div>
            ) : null}

            <div className={styles.actions}>
              {!sendResult ? (
                <Button appearance="primary" onClick={() => setStep('review')}>
                  Back to review
                </Button>
              ) : null}
              <Button appearance={sendResult ? 'primary' : 'subtle'} onClick={restart}>
                Report something else
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* ── details drawer ── */}
      <OverlayDrawer
        open={detailsOpen}
        onOpenChange={(_, data) => setDetailsOpen(data.open)}
        position="end"
        className={styles.drawer}
      >
        <DrawerHeader>
          <DrawerHeaderTitle>Details</DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody className={styles.drawerBody}>
          <div className={styles.sideTitle}>Environment</div>
          <ul className={styles.envList}>
            <li>
              <span>Version</span>
              <span>{context.exeVersion || 'not captured'}</span>
            </li>
            <li>
              <span>Windows</span>
              <span>{context.windowsVersion || 'not captured'}</span>
            </li>
            <li>
              <span>Building</span>
              <span>{context.building || '(none)'}</span>
            </li>
            <li>
              <span>Panel</span>
              <span>{context.panel || '(none)'}</span>
            </li>
            <li>
              <span>Device</span>
              <span>{context.deviceSerial ?? '(none selected)'}</span>
            </li>
            <li>
              <span>Runtime log</span>
              <span>{logText ? `${logText.split('\n').length} lines` : 'empty'}</span>
            </li>
            <li>
              <span>Screenshots</span>
              <span>{shots.length}</span>
            </li>
          </ul>

          <Divider />

          <div className={styles.sideTitleRow}>
            <span className={styles.sideTitle}>My reports</span>
            {reports.length > HISTORY_PREVIEW ? (
              <Link href={REPORT_HISTORY_HASH} className={styles.sideLink}>
                Show all {reports.length}
              </Link>
            ) : null}
          </div>
          <div className={styles.muted}>{reportsDir || 'Reports are saved next to T3000'}</div>
          {loadingReports ? (
            <Spinner size="tiny" />
          ) : reports.length === 0 ? (
            <div className={styles.emptySide}>
              Nothing saved yet. Every report keeps a local copy, even when sending fails.
            </div>
          ) : (
            <ul className={styles.reportList}>
              {reports.slice(0, HISTORY_PREVIEW).map((report) => (
                <li key={report.id} className={styles.reportItem}>
                  <div className={styles.reportTitle}>{report.title}</div>
                  <div className={styles.muted}>
                    {report.kind} · {report.created.slice(0, 19).replace('T', ' ')}
                    {report.send?.issue_number ? ` · issue #${report.send.issue_number}` : ''}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <Divider />

          <div className={styles.sideTitle}>Before you send</div>
          <ul className={styles.tipList}>
            <li>Attach the screenshot — it answers most questions on its own.</li>
            <li>Say which panel and which screen you were on.</li>
            <li>Never include passwords or customer names.</li>
          </ul>
        </DrawerBody>
      </OverlayDrawer>

      {/* ── AI provider settings ── */}
      <SettingsDrawer
        open={aiSettingsOpen}
        settings={aiSettings}
        providerCache={providerCache}
        onSave={(next) => {
          saveSettings(next);
          setAiSettings(next);
          setProviderCache(loadProviderCache());
          setAiSettingsOpen(false);
          setAiError('');
        }}
        onClose={() => setAiSettingsOpen(false)}
      />

      {/* ── Screenshot preview ── */}
      <Dialog
        open={previewShot !== null}
        onOpenChange={(_, data) => {
          if (!data.open) {
            setPreviewShot(null);
          }
        }}
      >
        <DialogSurface
          className={styles.previewSurface}
          aria-label={previewShot ? `Screenshot ${previewShot.label}` : 'Screenshot'}
        >
          <div className={styles.previewBody}>
            <div className={styles.previewBar}>
              {previewShot?.shot.path ? (
                <Tooltip content="Copy to clipboard" relationship="label">
                  <Button
                    size="small"
                    appearance="subtle"
                    icon={<CopyRegular />}
                    onClick={() => void copyShotToClipboard(previewShot.shot.path)}
                  />
                </Tooltip>
              ) : null}
              <Tooltip content="Close" relationship="label">
                <Button
                  size="small"
                  appearance="subtle"
                  icon={<DismissRegular />}
                  onClick={() => setPreviewShot(null)}
                />
              </Tooltip>
            </div>
            {previewShot ? (
              <img
                className={styles.previewImage}
                src={shotSrc(previewShot.shot)}
                alt={previewShot.label}
              />
            ) : null}
          </div>
        </DialogSurface>
      </Dialog>
    </div>
  );
};

export default ReportPage;
