import { PageContainer } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import { Card, theme } from 'antd';
import React, { useEffect } from 'react';
import T3000 from '@/lib/T3000/T3000';
import './index.css';
import './lib.css';
import { Button } from "antd";
import LeftSidebar from './LeftSidebar';
import Topbar from './TopBar';

const Index: React.FC = () => {
  const { token } = theme.useToken();
  const { initialState } = useModel('@@initialState');

  useEffect(() => {
    console.log('initialState', initialState);
    console.log('token', token);

    T3000.Hvac.UI.Initialize(); // Initialize the HVAC UI

    // Add any necessary style adjustments for the SVG here
  }, []); // Empty dependency array to ensure it runs only once

  return (

    <>
      <div id="_crossTabClipboardDiv" className='clipboard-div'>
        <input
          id="_clipboardInput"
          type="text"
          value=" "
          aria-label="Clipboard Input"
          title="Clipboard Input Field"
        />
        <input id="_clipboardInput" type="text" value=" "></input>
      </div>

      <div id="main-app">
        <div id="main-panel" className="main-panel">
          <div className="top-area">
            <Topbar></Topbar>
          </div>

          <div className="main-area">
            <div id="left-panel" className="left-panel">
              <LeftSidebar></LeftSidebar>
            </div>

            <div id="work-area" className="main-panel">
              <div id="document-area">
                <div id="c-ruler" className="document-ruler-corner">
                </div>
                <div id="h-ruler" className="document-ruler-top">
                </div>
                <div id="v-ruler" className="document-ruler-left">
                </div>
                <div id="svg-area" className="svg-area">
                </div>
              </div>
              <div id="doc-toolbar" className="doc-toolbar">
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Index;
