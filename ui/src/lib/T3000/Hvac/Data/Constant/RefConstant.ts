

/*
import { ref } from "vue";
export const contextMenuShow = ref(false);
export const objectConfigShow = ref(false);
*/

// import React, { useState } from 'react';

// Example of using the custom hook in a React component

/*
export const MenuExampleComponent: React.FC = () => {
  const { contextMenuShow, setContextMenuShow, objectConfigShow, setObjectConfigShow } = useMenuState();

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuShow(true);
  };

  const handleConfigClick = () => {
    setContextMenuShow(false);
    setObjectConfigShow(true);
  };

  const handleClose = () => {
    setContextMenuShow(false);
    setObjectConfigShow(false);
  };

  return (
    <div onContextMenu={handleRightClick}>
      <h2>Right-click on this area to open the context menu</h2>

      {contextMenuShow && (
        <div className="context-menu">
          <button onClick={handleConfigClick}>Configure Object</button>
          <button onClick={handleClose}>Close Menu</button>
        </div>
      )}

      {objectConfigShow && (
        <div className="config-panel">
          <h3>Object Configuration</h3>
          <input type="text" placeholder="Object Name" />
          <button onClick={handleClose}>Close</button>
        </div>
      )}
    </div>
  );
};
*/

// Create a custom React hook to manage the state
// export function useMenuState() {
//   const [contextMenuShow, setContextMenuShow] = useState(false);
//   const [objectConfigShow, setObjectConfigShow] = useState(false);

//   return { contextMenuShow, setContextMenuShow, objectConfigShow, setObjectConfigShow };
// }

// export const contextMenuShow = false;
// export const objectConfigShow = false;

class RefConstant {
  static contextMenuShow = false;
  static objectConfigShow = false;

  // static ShowContextMenu(show: boolean) {
  //   this.contextMenuShow = show;
  // }

  // static ShowObjectConfig(show: boolean) {
  //   this.objectConfigShow = show;
  // }
}

export default RefConstant;
