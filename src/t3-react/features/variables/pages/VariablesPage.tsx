/**
 * Variables Page - Placeholder
 * TODO: Implement variables grid based on C++ VariableSetDlg
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
    fontSize: tokens.fontSizeHero700,
  },
});

export const VariablesPage: React.FC = () => {
  const classes = useStyles();

  return (
    <div className={classes.container}>
      <Text className={classes.title}>Variables</Text>
      <Text>Coming soon...</Text>
    </div>
  );
};

export default VariablesPage;
