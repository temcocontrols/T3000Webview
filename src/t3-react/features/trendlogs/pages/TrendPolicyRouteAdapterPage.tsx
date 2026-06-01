import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export const TrendPolicyRouteAdapterPage: React.FC = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  params.set('tab', 'haystack-tags');

  return (
    <Navigate
      replace
      to={{
        pathname: '/t3000/trendlogs',
        search: `?${params.toString()}`,
      }}
    />
  );
};
