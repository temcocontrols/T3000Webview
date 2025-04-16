import React, { useEffect, useState } from 'react';
import DrawerUtil from './UiStateUtil';
import { Drawer } from 'antd';

const ObjectConfig: React.FC = () => {
  const [isOpen, setIsOpen] = useState(DrawerUtil.getDrawerOpen());

  useEffect(() => {
    const handleStateChange = (value: boolean) => {
      setIsOpen(value);
    };

    DrawerUtil.addListener(handleStateChange);

    return () => {
      DrawerUtil.removeListener(handleStateChange);
    };
  }, []);

  return (
    <div>
      <Drawer
        title="Global Drawer"
        placement="right"
        onClose={() => DrawerUtil.setDrawerOpen(false)}
        open={isOpen}
      >
        <p>Drawer Content</p>
      </Drawer>
    </div>
  );
};

export default ObjectConfig;
