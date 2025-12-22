/**
 * Tools Panel Component
 * Left sidebar with drawing tools organized in expandable sections
 */

import React, { useState } from 'react';
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
  NavigationRegular,
  LineRegular,
  RectangleLandscapeRegular,
  CircleRegular,
  SquareRegular,
  ShapesRegular,
  DrawShapeRegular,
  TextTRegular,
  ImageRegular,
  LibraryRegular,
} from '@fluentui/react-icons';
import { useHvacDesignerStore } from '../../store/designerStore';
import { ToolType } from '../../types/tool.types';

interface Tool {
  type: ToolType;
  icon: JSX.Element;
  label: string;
}

interface ToolCategory {
  name: string;
  tools: Tool[];
}

const toolCategories: ToolCategory[] = [
  {
    name: 'Basic',
    tools: [
      { type: 'select', icon: <CursorRegular />, label: 'Select' },
      { type: 'pan', icon: <NavigationRegular />, label: 'Pan' },
      { type: 'line', icon: <LineRegular />, label: 'Line' },
      { type: 'rectangle', icon: <RectangleLandscapeRegular />, label: 'Rectangle' },
    ],
  },
  {
    name: 'General',
    tools: [
      { type: 'circle', icon: <CircleRegular />, label: 'Circle' },
      { type: 'ellipse', icon: <CircleRegular />, label: 'Ellipse' },
      { type: 'polygon', icon: <ShapesRegular />, label: 'Polygon' },
      { type: 'polyline', icon: <DrawShapeRegular />, label: 'Polyline' },
      { type: 'text', icon: <TextTRegular />, label: 'Text' },
      { type: 'image', icon: <ImageRegular />, label: 'Image' },
    ],
  },
  {
    name: 'Pipe',
    tools: [
      // Empty for now - will add pipe-specific tools
    ],
  },
  {
    name: 'Duct',
    tools: [
      // Empty for now - will add duct-specific tools
    ],
  },
  {
    name: 'Room',
    tools: [
      // Empty for now - will add room-specific tools
    ],
  },
  {
    name: 'Metrics',
    tools: [
      // Empty for now - will add metrics-specific tools
    ],
  },
  {
    name: 'User',
    tools: [
      // Empty for now - will be populated with user objects
    ],
  },
];

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
        {toolCategories.map((category) => (
          <AccordionItem key={category.name} value={category.name}>
            <AccordionHeader size="small">{category.name}</AccordionHeader>
            <AccordionPanel>
              {category.tools.length > 0 ? (
                <div className={styles.toolGrid}>
                  {category.tools.map((tool) => (
                    <Tooltip
                      key={tool.type}
                      content={{ children: tool.label, className: styles.tooltipContent }}
                      relationship="label"
                      positioning="after"
                    >
                      <ToolbarButton
                        icon={tool.icon}
                        appearance={activeTool === tool.type ? 'primary' : 'subtle'}
                        onClick={() => setActiveTool(tool.type)}
                        className={styles.toolButton}
                      />
                    </Tooltip>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyMessage}>
                  {category.name === 'User' ? (
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
