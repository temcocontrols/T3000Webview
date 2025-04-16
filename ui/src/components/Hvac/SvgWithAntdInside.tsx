import React, { useEffect } from 'react';
import { Button } from 'antd';

const SvgWithAntdInside: React.FC = () => {
  return (
    <svg width="60" height="60" style={{ border: '1px solid #ddd' }}>
      {/* Define an SVG Rectangle */}
      <rect x="60" y="60" width="60" height="60" fill="#f0f0f0" stroke="#ccc" />

      {/* Embed Ant Design component using foreignObject */}
      <foreignObject x="50" y="50" width="60" height="60">
        <div xmlns="http://www.w3.org/1999/xhtml" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Button type="primary">Ant Design Button</Button>
        </div>
      </foreignObject>
    </svg>
  );
};

export default SvgWithAntdInside;
