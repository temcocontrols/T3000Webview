import React from 'react';
import { Navigate } from 'react-router-dom';

export const TrendPolicyRouteAdapterPage: React.FC = () => {
  return <Navigate replace to="/t3000/haystack-tags" />;
};
