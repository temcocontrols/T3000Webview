import React, { useState, useMemo } from 'react';
import {
  Drawer,
  DrawerHeader,
  DrawerHeaderTitle,
  DrawerBody,
  Button,
  SearchBox,
  Radio,
  RadioGroup,
  Tab,
  TabList,
  Text,
} from '@fluentui/react-components';
import { Dismiss24Regular } from '@fluentui/react-icons';
import {
  INPUT_ANALOG_RANGES,
  DIGITAL_RANGES,
  BAC_UNITS_ANALOG,
  BAC_UNITS_DIGITAL,
  type RangeOption,
} from '../data/rangeData';
import styles from './RangeSelectionDrawer.module.css';

interface RangeSelectionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentRange: number;
  digitalAnalog: number; // BAC_UNITS_ANALOG (0) or BAC_UNITS_DIGITAL (1)
  onSave: (newRange: number) => void;
  inputLabel?: string;
}

export const RangeSelectionDrawer: React.FC<RangeSelectionDrawerProps> = ({
  isOpen,
  onClose,
  currentRange,
  digitalAnalog,
  onSave,
  inputLabel,
}) => {
  // Determine initial tab based on digitalAnalog
  const initialTab = digitalAnalog === BAC_UNITS_DIGITAL ? 'digital' : 'analog';

  const [selectedTab, setSelectedTab] = useState<'analog' | 'digital'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRange, setSelectedRange] = useState<number>(currentRange);

  // Get current range options based on selected tab
  const currentRangeOptions = selectedTab === 'digital' ? DIGITAL_RANGES : INPUT_ANALOG_RANGES;

  // Filter ranges based on search query
  const filteredRanges = useMemo(() => {
    if (!searchQuery.trim()) {
      return currentRangeOptions;
    }

    const query = searchQuery.toLowerCase();
    return currentRangeOptions.filter(
      (range) =>
        range.label.toLowerCase().includes(query) ||
        range.unit?.toLowerCase().includes(query) ||
        range.category?.toLowerCase().includes(query) ||
        range.value.toString().includes(query)
    );
  }, [currentRangeOptions, searchQuery]);

  // Group ranges by category
  const groupedRanges = useMemo(() => {
    const groups: { [key: string]: RangeOption[] } = {};
    filteredRanges.forEach((range) => {
      const category = range.category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(range);
    });
    return groups;
  }, [filteredRanges]);

  const handleSave = () => {
    onSave(selectedRange);
    onClose();
  };

  const handleCancel = () => {
    setSelectedRange(currentRange); // Reset to original
    onClose();
  };

  // Reset tab and selection when drawer opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedTab(initialTab);
      setSelectedRange(currentRange);
      setSearchQuery('');
    }
  }, [isOpen, initialTab, currentRange]);

  return (
    <Drawer
      type="overlay"
      separator
      open={isOpen}
      onOpenChange={(_, { open }) => !open && handleCancel()}
      position="end"
      size="medium"
    >
      <DrawerHeader>
        <DrawerHeaderTitle
          action={
            <Button
              appearance="subtle"
              aria-label="Close"
              icon={<Dismiss24Regular />}
              onClick={handleCancel}
            />
          }
        >
          Select Range
          {inputLabel && (
            <Text size={200} style={{ display: 'block', color: '#605e5c', fontWeight: 'normal' }}>
              {inputLabel}
            </Text>
          )}
        </DrawerHeaderTitle>
      </DrawerHeader>

      <DrawerBody className={styles.drawerBody}>
        {/* Tabs for Analog/Digital */}
        <TabList
          selectedValue={selectedTab}
          onTabSelect={(_, data) => setSelectedTab(data.value as 'analog' | 'digital')}
          className={styles.tabList}
        >
          <Tab value="analog">Analog ({INPUT_ANALOG_RANGES.length})</Tab>
          <Tab value="digital">Digital ({DIGITAL_RANGES.length})</Tab>
        </TabList>

        {/* Search Box */}
        <SearchBox
          placeholder="Search ranges..."
          value={searchQuery}
          onChange={(_, data) => setSearchQuery(data.value)}
          className={styles.searchBox}
        />

        {/* Range Options */}
        <div className={styles.rangeList}>
          <RadioGroup
            value={selectedRange.toString()}
            onChange={(_, data) => setSelectedRange(Number(data.value))}
          >
            {Object.keys(groupedRanges).map((category) => (
              <div key={category} className={styles.categoryGroup}>
                <Text weight="semibold" size={300} className={styles.categoryTitle}>
                  {category}
                </Text>
                {groupedRanges[category].map((range) => (
                  <div key={range.value} className={styles.rangeOption}>
                    <Radio
                      value={range.value.toString()}
                      label={
                        <div className={styles.rangeLabel}>
                          <span className={styles.rangeValue}>{range.value}</span>
                          <span className={styles.rangeName}>{range.label}</span>
                          {range.unit && (
                            <span className={styles.rangeUnit}>({range.unit})</span>
                          )}
                        </div>
                      }
                    />
                  </div>
                ))}
              </div>
            ))}

            {filteredRanges.length === 0 && (
              <div className={styles.noResults}>
                <Text>No ranges found matching "{searchQuery}"</Text>
              </div>
            )}
          </RadioGroup>
        </div>

        {/* Custom Tables Button */}
        {((selectedTab === 'analog' && selectedRange >= 20 && selectedRange <= 24) ||
          (selectedTab === 'digital' && selectedRange >= 23 && selectedRange <= 30)) && (
          <div className={styles.customButtonContainer}>
            <Button appearance="secondary" className={styles.customButton}>
              Edit Custom {selectedTab === 'analog' ? 'Table' : 'Digital'}...
            </Button>
          </div>
        )}

        {/* Action Buttons */}
        <div className={styles.actionButtons}>
          <Button appearance="primary" onClick={handleSave}>
            Save
          </Button>
          <Button appearance="secondary" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </DrawerBody>
    </Drawer>
  );
};
