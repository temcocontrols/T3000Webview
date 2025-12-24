/**
 * ThemeSelector Component
 *
 * UI component to allow users to switch between themes
 * Can be placed in header, settings, or anywhere needed
 */

import React from 'react';
import {
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  Button,
  makeStyles,
} from '@fluentui/react-components';
import {
  WeatherMoonRegular,
  WeatherSunnyRegular,
  CloudRegular,
} from '@fluentui/react-icons';
import { useTheme } from './ThemeProvider';
import type { ThemeName } from './types';

const useStyles = makeStyles({
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
});

interface ThemeSelectorProps {
  appearance?: 'primary' | 'secondary' | 'outline' | 'subtle' | 'transparent';
  size?: 'small' | 'medium' | 'large';
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  appearance = 'subtle',
  size = 'medium',
}) => {
  const styles = useStyles();
  const { themeName, setTheme } = useTheme();

  const themeOptions: Array<{ name: ThemeName; label: string; icon: React.ReactElement }> = [
    { name: 'azure', label: 'Blue Mode', icon: <CloudRegular /> },
    { name: 'light', label: 'Light Mode', icon: <WeatherSunnyRegular /> },
    { name: 'dark', label: 'Dark Mode', icon: <WeatherMoonRegular /> },
  ];

  const currentTheme = themeOptions.find((t) => t.name === themeName);

  return (
    <Menu>
      <MenuTrigger>
        <Button
          appearance={appearance}
          size={size}
          icon={currentTheme?.icon}
        >
          Theme: {currentTheme?.label}
        </Button>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          {themeOptions.map((option) => (
            <MenuItem
              key={option.name}
              className={styles.menuItem}
              onClick={() => setTheme(option.name)}
              disabled={themeName === option.name}
            >
              {option.icon}
              <span>{option.label}</span>
              {themeName === option.name && <span> ✓</span>}
            </MenuItem>
          ))}
        </MenuList>
      </MenuPopover>
    </Menu>
  );
};
