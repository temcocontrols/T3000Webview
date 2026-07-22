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
 */

import React, { useState, useMemo } from 'react';
import {
  Tooltip,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
  makeStyles,
} from '@fluentui/react-components';
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
} from '@fluentui/react-icons';
import { useHvacDesignerStore } from '../../store/designerStore';
import { NewTool, toolsCategories, selectedTool } from '@/lib/t3-hvac';
import EvtOpt from '@/lib/t3-hvac/Event/EvtOpt';

const toolOpt = EvtOpt.toolOpt;

// Map tool names to the library's ToolOpt methods — matches Vue HandleSidebarToolEvent exactly
const handleToolActivate = (tool: any) => {
  const name = tool.name;
  selectedTool.value = { ...tool, type: 'default' };

  // Build synthetic event at SVG center (same as before)
  const svgArea = document.getElementById('svg-area');
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
    width: '100%',
    height: '100%',
    overflowY: 'auto',
    overflowX: 'hidden',
    backgroundColor: '#fafafa',
    scrollbarWidth: 'thin',
    '&::-webkit-scrollbar': {
      width: '6px',
    },
    '&::-webkit-scrollbar-track': {
      backgroundColor: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: '#c1c1c1',
      borderRadius: '3px',
      '&:hover': {
        backgroundColor: '#a8a8a8',
      },
    },
  },
  accordion: {
    width: '100%',
    '& .fui-AccordionHeader': {
      padding: '0',
      minHeight: '24px',
      fontSize: '11px',
    },
    '& .fui-AccordionHeader__button': {
      padding: '2px 4px',
    },
    '& .fui-AccordionPanel': {
      padding: '0 !important',
      width: '100%',
      margin: '0 !important',
      backgroundColor: '#f9f9f9',
    },
  },
  toolGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '4px',
    padding: '4px',
  },
  toolButton: {
    width: '100%',
    minHeight: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    minWidth: '0',
    padding: '6px',
    borderRadius: '4px',
  },
  emptyMessage: {
    padding: '8px 6px',
    fontSize: '10px',
    color: '#666',
    textAlign: 'center',
    lineHeight: '1.3',
  },
  tooltipContent: {
    fontSize: '10px',
  },
});

export const ToolsPanel: React.FC = () => {
  console.log('🟡 [ToolsPanel] Mounted — left sidebar tools panel is alive');

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
      <Accordion
        className={styles.accordion}
        multiple
        collapsible
        openItems={openItems}
        onToggle={(_event, data) => {
          setOpenItems(data.openItems as string[]);
        }}
      >
        {toolsCategories.map((category) => (
          <AccordionItem key={category} value={category}>
            <AccordionHeader size="small">{category}</AccordionHeader>
            <AccordionPanel>
              {toolsByCategory[category] && toolsByCategory[category].length > 0 ? (
                <div className={styles.toolGrid}>
                  {toolsByCategory[category].map((tool: any) => (
                    <Tooltip
                      key={tool.name}
                      content={{ children: tool.label, className: styles.tooltipContent }}
                      relationship="label"
                      positioning="after"
                    >
                      <div
                        className={styles.toolButton}
                        draggable
                        role="button"
                        tabIndex={0}
                        style={{
                          backgroundColor: selectedToolLocal.name === tool.name ? 'rgba(0,120,212,0.2)' : 'transparent',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleToolClick(tool)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleToolClick(tool); }}
                      >
                        {getToolIcon(tool)}
                      </div>
                    </Tooltip>
                  ))}
                </div>
              ) : (
                <div className={styles.toolGrid}>
                  {category === 'User' ? (
                    <Tooltip
                      content={{ children: 'Add to library', className: styles.tooltipContent }}
                      relationship="label"
                      positioning="after"
                    >
                      <div
                        className={styles.toolButton}
                        role="button"
                        tabIndex={0}
                        style={{ cursor: 'pointer', color: '#666' }}
                      >
                        <span style={{ fontSize: '24px' }}>+</span>
                      </div>
                    </Tooltip>
                  ) : (
                    <div className={styles.emptyMessage}>Coming soon</div>
                  )}
                </div>
              )}
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};
