/**
 * Home Page - Landing page
 */
import React from 'react';
import { Text, makeStyles, shorthands, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    ...shorthands.padding(tokens.spacingVerticalXXXL),
    ...shorthands.gap(tokens.spacingVerticalL),
  },
  title: {
    fontSize: tokens.fontSizeHero900,
    fontWeight: tokens.fontWeightSemibold,
  },
  subtitle: {
    fontSize: tokens.fontSizeBase500,
    color: tokens.colorNeutralForeground3,
  },
});

export const HomePage: React.FC = () => {
  const classes = useStyles();

  return (
    <div className={classes.container}>
      <Text className={classes.title}>Welcome to T3000</Text>
      <Text className={classes.subtitle}>Select a device from the tree to get started</Text>
    </div>
  );
};

export default HomePage;
