/**
 * Tools Panel Component
 * Left sidebar with drawing tools organized in expandable sections
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

// Map tool names to Fluent UI icons
const getToolIcon = (iconName: string) => {
  // For now, use a default icon - you can map specific icons later
  return <CursorRegular />;
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
  const styles = useStyles();
  const { activeTool, setActiveTool } = useHvacDesignerStore();
  const [openItems, setOpenItems] = useState<string[]>(['Basic', 'General', 'Pipe', 'Duct', 'Room', 'Metrics', 'User']);
  const [selectedToolLocal, setSelectedToolLocal] = useState(NewTool[0]); // Local state for UI

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
    // Update the library's selectedTool (this is what the drawing logic uses)
    selectedTool.value = { ...tool, type: 'default' };
    // Also update the local store for React state
    setActiveTool(tool.name.toLowerCase() as any);
    console.log('🔧 Tool selected:', tool.name);
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
                        icon={getToolIcon(tool.icon)}
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
