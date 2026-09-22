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
 * header** (small-caps name, tool count, rotating caret) over a two-column grid of **42 px tiles**. The section
 * holding the active tool keeps a 2 px brand marker, so a folded panel still says where the current tool lives.
 * Folding a section is local state, as the Fluent accordion's `openItems` was; the accordion itself is gone
 * because a sticky header with a count is not something it can express.
 *
 * ## Items — parity with the origin's left panel (2026-09-22)
 *
 * The reference is `ToolsSidebar2.vue` (`/#/hvac/t2`, 105 px wide, same 49 tools): its items are flat
 * (`45 x 38`, no radius) and every icon is the **tool's own 24 px glyph tinted with the primary colour**;
 * selection is a surface change (`#353C44` there), never a glyph change. Matched here in the two places that
 * read as "not the same tool item":
 *   - `getToolIcon` draws `tool.icon` itself (Material ligature or the `icons.svg` sprite) at 24 px — the
 *     eight Fluent substitutes that rendered at 14 px are gone (see the note above `ICON_SIZE`);
 *   - an idle tile's icon is brand blue (`colorBrandForeground1`) and hover is a flat tint
 *     (`colorBrandBackground2`, no border, no shadow) — the white chip + hairline + `shadow2` hover it had
 *     looked like a different kind of control from the origin's flat items;
 *   - `WHITE_SPRITE_ICONS` re-draws the two sprite glyphs that are hard-coded white in `icons.svg`
 *     (`line`, `segLine`) from their own geometry in the section's black, because white-on-dark artwork
 *     disappears on a light panel and no CSS rule can recolour a `<use>` clone.
 * Not changed (deliberately, pending a decision): tile metrics (`39 x 42`, radius 6 px) and the group heads
 * (28 px sticky, small-caps + count chip) still follow the designer shell's own rhythm.
 */

import React, { useState, useMemo } from 'react';
import { Tooltip, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { CursorRegular, ChevronDownRegular, AddRegular } from '@fluentui/react-icons';
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
    return <CursorRegular fontSize={ICON_SIZE} />;
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

/**
 * Every tool icon is drawn at **24 px**, whichever form `tool.icon` takes.
 *
 * `ToolsSidebar2.vue` (the origin's left panel) renders `<q-icon :name="tool.icon" size="sm" />` for
 * every model entry — one glyph at 24 px whatever form `tool.icon` takes: a Material ligature for a bare
 * name (`square`, `title`, `emoji_emotions`, `toggle_off`, `speed`, …), the sprite for `svguse:…`, and a
 * CSS class list when the name has spaces (`Icon with title` carries `fa-solid fa-icons`, and FontAwesome
 * is in the page too — `extras: ['material-icons', 'fontawesome-v6']`). An earlier pass here substituted
 * Fluent icons for the eight tools whose `icon` is a bare name; Fluent's `*Regular` family is the 20 px cut
 * and renders at `1em`, so those tiles drew **14 px outline** glyphs beside 24 px sprite ones — two sizes
 * and two glyph styles in one grid (measured live 2026-09-22).
 */
const ICON_SIZE = 24;

/**
 * Sprite symbols whose artwork is authored for the **dark** drawer and is therefore invisible here.
 *
 * `public/icons.svg` paints `line` (:1043) and `segLine` (:1062) with `fill="#ffffff" stroke="#ffffff"` —
 * a *white* glyph, which is right on `ToolsSidebar2.vue`'s `#2a2a2a` panel and white-on-white on the
 * designer's light one. The tile's colour cannot reach them: `<use>` clones the symbol into a shadow tree
 * and the clone's `<g>` carries its own `stroke="#ffffff"` presentation attribute, so no CSS rule can win
 * (shadow content matches no selector, and an attribute on the element beats an inherited value). Measured
 * with the glyph forced to `#0F6CBD`, `#424242` and `#ffffff`: identical, blank, in all three.
 *
 * So the two are re-drawn from the sprite's own geometry — same paths, same viewBox, same clipping — in the
 * **section's own black** (`#000000`, the colour `rectangle` / `circle` / `oval` and the arrows already use).
 * On a light surface the artwork's counterpart of the origin's white-on-dark line is black, not the panel's
 * blue: the General group then reads as one set, and the *tile* carries hover/selection exactly as it does for
 * those glyphs. `icons.svg` is left alone because the origin still needs its white-on-dark artwork.
 * Any future symbol added to the sprite with hard-coded white belongs in this map.
 */
const WHITE_SPRITE_ICONS: Record<string, React.ReactNode> = {
  // <path d="M0,0 L66.667,0" stroke-width="2"/> in a group translated by y=12.
  line: (
    <svg viewBox="0 0 24 24" width={ICON_SIZE} height={ICON_SIZE} style={{ display: 'block' }}>
      <path d="M0,12 L66.667,12" fill="none" stroke="#000000" strokeWidth={2} />
    </svg>
  ),
  // <path d="M0,41.667 L25,41.667 L25,0 L50,0" stroke-width="3"/> in the symbol's own 60x60 box.
  segLine: (
    <svg viewBox="0 0 60 60" width={ICON_SIZE} height={ICON_SIZE} style={{ display: 'block' }}>
      <path d="M0,41.667 L25,41.667 L25,0 L50,0" fill="none" stroke="#000000" strokeWidth={3} />
    </svg>
  ),
};

const getToolIcon = (tool: any) => {
  const icon: unknown = tool.icon;

  if (typeof icon !== 'string' || !icon) {
    return <CursorRegular fontSize={ICON_SIZE} />;
  }

  // Quasar's `q-icon` name resolution, which is what the origin feeds it. Order matters: an svguse name
  // carries spaces too (`svguse:icons.svg#cursor|0 0 280 200`), so the prefix has to be tested before the
  // class-list rule.
  if (icon.startsWith('svguse:')) {
    const fragmentId = icon.slice('svguse:'.length).split('|')[0].split('#')[1];
    return WHITE_SPRITE_ICONS[fragmentId] ?? <ToolIcon iconDef={icon} />;
  }

  // A multi-token name is a CSS class list (the library has one: `fa-solid fa-icons`).
  if (icon.includes(' ')) {
    return <i className={icon} aria-hidden="true" style={{ fontSize: ICON_SIZE, lineHeight: 1 }} />;
  }

  return (
    <i
      className="material-icons"
      aria-hidden="true"
      // Explicit size: this app's own `.material-icons` rule is overridden to 13 px somewhere in the
      // bundle, so the ligature would otherwise inherit the panel's base font size.
      style={{ fontSize: ICON_SIZE, lineHeight: 1 }}
    >
      {icon}
    </i>
  );
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
    // The origin tints EVERY tool icon with the primary colour (`text-primary` sits on the tile grid in
    // `ToolsSidebar2.vue`) and lets the tile — not the glyph — carry the state, so an idle item is blue
    // here too and only its surface changes on hover/select.
    color: tokens.colorBrandForeground1,
    cursor: 'default',
    transitionProperty: 'background-color, color, border-color',
    transitionDuration: '0.1s',
    ':hover': {
      // A tint, not a chip: the reference item is flat (no border, no shadow) and only the colour under
      // the pointer changes.
      backgroundColor: tokens.colorBrandBackground2,
    },
    ':active': {
      backgroundColor: tokens.colorBrandBackground2Pressed,
    },
  },
  tileActive: {
    // One ramp step deeper than the hover tint, so "hovered" and "selected" can never read the same.
    backgroundColor: tokens.colorBrandBackground2Pressed,
    border: `1px solid ${tokens.colorBrandStroke2}`,
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
