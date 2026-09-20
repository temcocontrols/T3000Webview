/**
 * Tools Panel Component
 * Left sidebar with drawing tools organized in expandable sections.
 *
 * Tool clicks delegate to the t3-hvac library's ToolOpt:
 *   - SelectAct()  → selection / cancel
 *   - StampShapeFromToolAct(event, shapeType, uniShapeType)
 *   - ToolLineAct(lineType, event)
 *   - DrawWall(event)
 *   - ClickSymbolAct(event) / DragDropSymbolAct(event)
 *
 * ## Grouping (2026-09-20)
 *
 * The library holds ~47 tools in seven categories, and this panel is **115 px** wide — as a flat grid that is
 * roughly nine screens of tiles with no way to find anything. So each category is a section: a **28 px sticky
 * header** (small-caps name, tool count, rotating caret) over a two-column grid of **42 px tiles**. Tiles are
 * transparent with a hairline hover; the active tool takes the brand tint and brand icon (was a raw
 * `rgba(0,120,212,0.2)`), and the section holding it keeps a 2 px brand marker, so a folded panel still says
 * where the current tool lives. Folding a section is local state, as the Fluent accordion's `openItems` was;
 * the accordion itself is gone because a sticky header with a count is not something it can express.
 */

import React, { useState, useMemo } from 'react';
import { Tooltip, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import {
  CursorRegular,
  SquareRegular,
  TextFontRegular,
  EmojiRegular,
  ToggleLeftRegular,
  TopSpeedRegular,
  SplitHorizontalRegular,
  NumberSymbolRegular,
  AppsRegular,
  ChevronDownRegular,
  AddRegular,
} from '@fluentui/react-icons';
import { useHvacDesignerStore } from '../../store/designerStore';
import { NewTool, toolsCategories, selectedTool } from '@/lib/t3-hvac';
import EvtOpt from '@/lib/t3-hvac/Event/EvtOpt';
import { AreaIds } from '@/lib/t3-hvac/Data/Constant/AreaIds';

const toolOpt = EvtOpt.toolOpt;

// Map tool names to the library's ToolOpt methods — matches Vue HandleSidebarToolEvent exactly
const handleToolActivate = (tool: any) => {
  const name = tool.name;
  selectedTool.value = { ...tool, type: 'default' };

  // Build synthetic event at SVG center (same as before)
  const svgArea = AreaIds.element('svgArea');
  const rect = svgArea?.getBoundingClientRect();
  const se: any = {
    clientX: rect ? rect.left + rect.width / 2 : 400,
    clientY: rect ? rect.top + rect.height / 2 : 300,
    button: 0,
    preventDefault: () => {},
    stopPropagation: () => {},
  };

  switch (name) {
    // Selection
    case 'Pointer': toolOpt.SelectAct(se); break;
    // Lines
    case 'Line':    toolOpt.ToolLineAct('line', se); break;
    case 'SegLine': toolOpt.ToolLineAct('segLine', se); break;
    case 'Wall':    toolOpt.DrawWall(se); break;
    // Box/Rectangle — Vue uses "Box" / "G_Rectangle"
    case 'Box':
      toolOpt.StampShapeFromToolAct(se, 2, 'Box'); break;
    case 'G_Rectangle':
      toolOpt.StampShapeFromToolAct(se, 2, 'G_Rectangle'); break;
    // Oval
    case 'Oval':
      toolOpt.StampShapeFromToolAct(se, 4, 'Oval'); break;
    // Circle — Vue uses "G_Circle"
    case 'G_Circle':
      toolOpt.StampShapeFromToolAct(se, 9, 'G_Circle'); break;
    // Text
    case 'Text':
      toolOpt.StampShapeFromToolAct(se, 'textLabel', 'Text'); break;
    // Arrows — Vue uses "g_arr_*" names
    case 'ArrowRight':  toolOpt.StampShapeFromToolAct(se, 10, 'g_arr_right'); break;
    case 'ArrowLeft':   toolOpt.StampShapeFromToolAct(se, 11, 'g_arr_left'); break;
    case 'ArrowTop':    toolOpt.StampShapeFromToolAct(se, 12, 'g_arr_top'); break;
    case 'ArrowBottom': toolOpt.StampShapeFromToolAct(se, 13, 'g_arr_bottom'); break;
    // Library tools — use LibToolShape like Vue
    case 'IconBasic':     toolOpt.LibToolShape('Icon', true); break;
    case 'Switch':        toolOpt.LibToolShape('SwitchIcon', true); break;
    case 'LED':           toolOpt.LibToolShape('Led', true); break;
    case 'Temperature':   toolOpt.LibToolShape('Temperature', true); break;
    case 'Boiler':        toolOpt.LibToolShape('Boiler', true); break;
    case 'Heatpump':      toolOpt.LibToolShape('Heatpump', true); break;
    case 'Pump':          toolOpt.LibToolShape('Pump', true); break;
    case 'ValveThreeWay': toolOpt.LibToolShape('ValveThreeWay', true); break;
    case 'ValveTwoWay':   toolOpt.LibToolShape('ValveTwoWay', true); break;
    case 'Fan':           toolOpt.LibToolShape('Fan', true); break;
    case 'CoolingCoil':   toolOpt.LibToolShape('CoolingCoil', true); break;
    case 'HeatingCoil':   toolOpt.LibToolShape('HeatingCoil', true); break;
    case 'Filter':        toolOpt.LibToolShape('Filter', true); break;
    case 'Humidifier':    toolOpt.LibToolShape('Humidifier', true); break;
    case 'Humidity':      toolOpt.LibToolShape('Humidity', true); break;
    case 'Pressure':      toolOpt.LibToolShape('Pressure', true); break;
    case 'Damper':        toolOpt.LibToolShape('Damper', true); break;
    case 'ThermalWheel':  toolOpt.LibToolShape('ThermalWheel', true); break;
    case 'Enthalpy':      toolOpt.LibToolShape('Enthalpy', true); break;
    case 'Flow':          toolOpt.LibToolShape('Flow', true); break;
    case 'RoomHumidity':    toolOpt.LibToolShape('RoomHumidity', true); break;
    case 'RoomTemperature': toolOpt.LibToolShape('RoomTemperature', true); break;
    // NewDuct tools
    case 'Duct1': case 'Duct2': case 'Duct3': case 'Duct4':
    case 'Duct5': case 'Duct7': case 'Duct8': case 'Duct9':
      toolOpt.LibToolShape(name, true); break;
    // Metrics — commented out in Vue, keep as no-op
    case 'Gauge': case 'Dial': case 'Value':
    case 'Icon': case 'Weld':
      break;
    default:
      if (tool.cat) {
        toolOpt.ClickSymbolAct(se);
      } else {
        toolOpt.SelectAct(se);
      }
  }
};

/**
 * Parse svg sprite icon string from NewTool definitions.
 * Format: "svguse:icons.svg#iconName|viewBox"
 * Renders an inline SVG with <use> tag referencing the sprite.
 */
const ToolIcon: React.FC<{ iconDef: string }> = ({ iconDef }) => {
  if (!iconDef || !iconDef.startsWith('svguse:')) {
    return <CursorRegular fontSize={14} />;
  }

  // Parse: "svguse:icons.svg#cursor|0 0 280 200"
  const withoutPrefix = iconDef.replace('svguse:', '');
  const [pathAndFragment, viewBox] = withoutPrefix.split('|');
  const [spritePath, fragmentId] = pathAndFragment.split('#');

  const href = `/${spritePath}#${fragmentId}`;
  const vb = viewBox || '0 0 24 24';

  return (
    <svg
      viewBox={vb}
      width="24"
      height="24"
      style={{ display: 'block', fill: 'currentColor' }}
    >
      <use href={href} />
    </svg>
  );
};

// Fluent UI icons for Basic category tools (no sprite equivalents)
const basicIcons: Record<string, React.ReactNode> = {
  Box: <SquareRegular />,
  Text: <TextFontRegular />,
  IconBasic: <EmojiRegular />,
  Switch: <ToggleLeftRegular />,
  Gauge: <TopSpeedRegular />,
  Dial: <SplitHorizontalRegular />,
  Value: <NumberSymbolRegular />,
  Icon: <AppsRegular />,
};

const getToolIcon = (tool: any) => {
  if (basicIcons[tool.name]) return basicIcons[tool.name];
  if (tool.icon && tool.icon.startsWith('svguse:')) {
    return <ToolIcon iconDef={tool.icon} />;
  }
  return <CursorRegular fontSize={14} />;
};

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    scrollbarWidth: 'thin',
    scrollbarColor: `${tokens.colorNeutralStroke1} transparent`,
    '&::-webkit-scrollbar': { width: '8px' },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: tokens.colorNeutralStroke1,
      borderRadius: '6px',
      border: '2px solid transparent',
      backgroundClip: 'content-box',
    },
  },
  group: {
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  groupHead: {
    position: 'sticky',
    top: 0,
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    // 3 px rhythm, not 4: the panel's default is 104 px and the longest group name (*NewDuct*, 53 px of text)
    // has to fit beside the caret and the count chip — measured, this leaves ~2 px of slack.
    gap: '3px',
    // Inset and rounded like the tiles it heads, so the hover fill reads as a row instead of a bar that runs
    // into the panel's left edge. `margin 3 + padding 3` puts the caret at x = 6 — the tile grid's own inset
    // in this panel. `width` stays explicit: a `<button>`'s `auto` width is shrink-to-fit even when it is a
    // flex container (measured: 76 px for a 28 px header), so the margins have to be subtracted from it.
    width: 'calc(100% - 6px)',
    margin: '0 3px',
    height: '28px',
    padding: '0 3px',
    borderRadius: '4px',
    border: 'none',
    background: tokens.colorNeutralBackground2,
    color: tokens.colorNeutralForeground2,
    fontFamily: 'inherit',
    cursor: 'default',
    textAlign: 'left',
    transitionProperty: 'background-color, color',
    transitionDuration: '0.1s',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      color: tokens.colorNeutralForeground1,
    },
  },
  /** The section that holds the active tool — visible even when it is folded. */
  groupHeadActive: {
    // A rounded pill rather than flexlayout's square `inset 2px 0 0` bar: at the panel's edge the bar ran the
    // full 28 px height and was the only square corner in a panel of rounded tiles.
    '::before': {
      content: '\"\"',
      position: 'absolute',
      left: '1px',
      top: '6px',
      bottom: '6px',
      width: '2px',
      borderRadius: '1px',
      backgroundColor: tokens.colorBrandForeground1,
    },
  },
  caret: {
    display: 'flex',
    flexShrink: 0,
    color: tokens.colorNeutralForeground3,
    transitionProperty: 'transform',
    transitionDuration: '0.12s',
  },
  caretClosed: {
    transform: 'rotate(-90deg)',
  },
  groupName: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: '10px',
    fontWeight: tokens.fontWeightSemibold,
    letterSpacing: '0.3px',
    textTransform: 'uppercase',
  },
  groupNameActive: {
    color: tokens.colorBrandForeground1,
  },
  count: {
    flexShrink: 0,
    minWidth: '12px',
    textAlign: 'center',
    padding: '0 3px',
    borderRadius: '999px',
    backgroundColor: tokens.colorNeutralBackground4,
    color: tokens.colorNeutralForeground3,
    fontSize: '9px',
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: '14px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '5px',
    // 6 px, matching the head's own inset (`margin 3 + padding 3`) so the caret sits over the tiles' edge.
    padding: '2px 6px 8px',
  },
  tile: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    height: '42px',
    border: '1px solid transparent',
    borderRadius: '6px',
    background: 'transparent',
    color: tokens.colorNeutralForeground2,
    cursor: 'default',
    transitionProperty: 'background-color, color, border-color, box-shadow',
    transitionDuration: '0.1s',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1,
      border: `1px solid ${tokens.colorNeutralStroke2}`,
      color: tokens.colorNeutralForeground1,
      boxShadow: tokens.shadow2,
    },
    ':active': {
      backgroundColor: tokens.colorNeutralBackground1Pressed,
    },
  },
  tileActive: {
    backgroundColor: tokens.colorBrandBackground2,
    border: `1px solid ${tokens.colorBrandStroke2}`,
    color: tokens.colorBrandForeground1,
  },
  addTile: {
    border: `1px dashed ${tokens.colorNeutralStroke2}`,
    color: tokens.colorNeutralForeground3,
    ':hover': {
      border: `1px dashed ${tokens.colorBrandForeground1}`,
      color: tokens.colorBrandForeground1,
    },
  },
  empty: {
    padding: '0 8px 8px',
    color: tokens.colorNeutralForeground3,
    fontSize: '10.5px',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: '1.3',
  },
  tooltipContent: {
    fontSize: '10px',
  },
});

export const ToolsPanel: React.FC = () => {
  const styles = useStyles();
  const { setActiveTool } = useHvacDesignerStore();
  const [openItems, setOpenItems] = useState<string[]>(['Basic', 'General', 'Pipe', 'Duct', 'Room', 'Metrics', 'User']);
  const [selectedToolLocal, setSelectedToolLocal] = useState(NewTool[0]);

  // Group tools by category
  const toolsByCategory = useMemo(() => {
    const grouped: { [key: string]: any[] } = {};
    toolsCategories.forEach(cat => {
      grouped[cat] = NewTool.filter((tool: any) => tool.cat.includes(cat));
    });
    return grouped;
  }, []);

  const handleToolClick = (tool: any) => {
    setSelectedToolLocal(tool);
    // Activate the tool through the library's ToolOpt
    handleToolActivate(tool);
    // Sync React state for UI
    setActiveTool(tool.name.toLowerCase() as any);
  };

  return (
    <div className={styles.container}>
      <div className={styles.scroll}>
        {toolsCategories.map((category) => {
          const tools = toolsByCategory[category] ?? [];
          const open = openItems.includes(category);
          // The section holding the active tool keeps a brand marker, so a folded panel still says where
          // the current tool lives.
          const holdsActive = !!selectedToolLocal?.cat?.includes(category);

          return (
            <section key={category} className={styles.group} data-tool-group={category}>
              <button
                type="button"
                title={`${category} — ${tools.length} tool${tools.length === 1 ? '' : 's'}`}
                aria-expanded={open}
                className={mergeClasses(styles.groupHead, holdsActive ? styles.groupHeadActive : '')}
                onClick={() =>
                  setOpenItems((prev) =>
                    prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category]
                  )
                }
              >
                <span className={mergeClasses(styles.caret, open ? '' : styles.caretClosed)}>
                  <ChevronDownRegular fontSize={10} />
                </span>
                <span className={mergeClasses(styles.groupName, holdsActive ? styles.groupNameActive : '')}>
                  {category}
                </span>
                <span className={styles.count}>{tools.length}</span>
              </button>

              {open ? (
                tools.length > 0 ? (
                  <div className={styles.grid}>
                    {tools.map((tool: any) => {
                      const active = selectedToolLocal.name === tool.name;
                      return (
                        <Tooltip
                          key={tool.name}
                          content={{ children: tool.label, className: styles.tooltipContent }}
                          relationship="label"
                          positioning="after"
                        >
                          <div
                            className={mergeClasses(styles.tile, active ? styles.tileActive : '')}
                            draggable
                            role="button"
                            tabIndex={0}
                            aria-pressed={active}
                            aria-label={tool.label}
                            title={tool.label}
                            style={{ cursor: 'default' }}
                            onClick={() => handleToolClick(tool)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleToolClick(tool); }}
                          >
                            {getToolIcon(tool)}
                          </div>
                        </Tooltip>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    <div className={styles.grid}>
                      <Tooltip
                        content={{ children: 'Add to library', className: styles.tooltipContent }}
                        relationship="label"
                        positioning="after"
                      >
                        <div className={mergeClasses(styles.tile, styles.addTile)} role="button" tabIndex={0}>
                          <AddRegular fontSize={18} />
                        </div>
                      </Tooltip>
                    </div>
                    <div className={styles.empty}>
                      Nothing here yet — add the selected shape to your library
                    </div>
                  </>
                )
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
};
