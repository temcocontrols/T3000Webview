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
  ToolbarButton,
  Tooltip,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
  makeStyles,
} from '@fluentui/react-components';
import {
  CursorRegular,
} from '@fluentui/react-icons';
import { useHvacDesignerStore } from '../../store/designerStore';
import { NewTool, toolsCategories, selectedTool } from '@/lib/t3-hvac';
import EvtOpt from '@/lib/t3-hvac/Event/EvtOpt';

const toolOpt = EvtOpt.toolOpt;

// Map tool names to the library's ToolOpt methods (exact shapeType numbers from EvtOpt.ts)
const handleToolActivate = (tool: any) => {
  const name = tool.name;

  selectedTool.value = { ...tool, type: 'default' };

  // Build a synthetic mouse event at SVG center — some library paths read
  // clientX/clientY from the event even if they're not used for positioning.
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
    case 'Pointer': toolOpt.SelectAct(se); break;
    case 'Line':    toolOpt.ToolLineAct('line', se); break;
    case 'ArcLine': toolOpt.ToolLineAct('arcLine', se); break;
    case 'SegLine': toolOpt.ToolLineAct('segLine', se); break;
    case 'Wall':    toolOpt.DrawWall(se); break;
    // Rectangle shapes
    case 'Rect':
    case 'Box':
    case 'G_Rectangle':
      toolOpt.StampShapeFromToolAct(se, 2, 'Rect'); break;
    // Oval/Ellipse shapes
    case 'Oval':
      toolOpt.StampShapeFromToolAct(se, 4, 'Oval'); break;
    // Circle shapes
    case 'Circle':
    case 'G_Circle':
      toolOpt.StampShapeFromToolAct(se, 9, 'Circle'); break;
    case 'Text':    toolOpt.StampShapeFromToolAct(se, 'textLabel', 'Text'); break;
    case 'Image':   toolOpt.StampShapeFromToolAct(se, 1, 'Image'); break;
    // Arrows
    case 'ArrowRight': toolOpt.StampShapeFromToolAct(se, 10, 'ArrR'); break;
    case 'ArrowLeft':  toolOpt.StampShapeFromToolAct(se, 11, 'ArrL'); break;
    case 'ArrowTop':   toolOpt.StampShapeFromToolAct(se, 12, 'ArrT'); break;
    case 'ArrowBottom':toolOpt.StampShapeFromToolAct(se, 13, 'ArrB'); break;
    // Library/symbol tools — try ClickSymbolAct for all non-basic tools
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
      width="16"
      height="16"
      style={{ display: 'block', fill: 'currentColor' }}
    >
      <use href={href} />
    </svg>
  );
};

// Map tool names to Fluent UI icons (fallback for non-svguse icons)
const getToolIcon = (tool: any) => {
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
    gap: '1px',
    padding: '0',
    margin: '10px',
  },
  toolButton: {
    width: '100%',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    minWidth: '0',
    padding: '4px',
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
        onToggle={(event, data) => {
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
                      <ToolbarButton
                        icon={getToolIcon(tool)}
                        appearance={selectedToolLocal.name === tool.name ? 'primary' : 'subtle'}
                        onClick={() => handleToolClick(tool)}
                        className={styles.toolButton}
                      />
                    </Tooltip>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyMessage}>
                  {category === 'User' ? (
                    <>
                      Library is empty.<br />
                      Select objects and save<br />
                      to library to reuse.
                    </>
                  ) : (
                    <>Coming soon</>
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
