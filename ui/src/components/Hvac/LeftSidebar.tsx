

import type { CSSProperties } from 'react';
import React from 'react';
import Icon, { CaretRightOutlined } from '@ant-design/icons';
import type { CollapseProps } from 'antd';
import { Collapse, theme } from 'antd';
import { Row, Col } from 'antd';
import './leftSidebar.css';
import { InfoCircleFilled, StockOutlined, QuestionCircleFilled, MenuUnfoldOutlined, MenuFoldOutlined } from '@ant-design/icons';

const text = `
  A dog is a type of domesticated animal.
  Known for its loyalty and faithfulness,
  it can be found as a welcome guest in many households across the world.
`;

const getItems: (panelStyle: CSSProperties) => CollapseProps['items'] = (panelStyle) => [
  {
    key: '1',
    label: 'Basic',
    children:
      <>
        <InfoCircleFilled />
        <StockOutlined />
        <QuestionCircleFilled />
        <MenuUnfoldOutlined />
        <MenuFoldOutlined />
        <MenuFoldOutlined />
      </>,
    style: panelStyle,
  },
  {
    key: '2',
    label: 'General',
    children: <>
      <InfoCircleFilled />
      <StockOutlined />
      <QuestionCircleFilled />
      <MenuUnfoldOutlined />
      <MenuFoldOutlined />
      <MenuFoldOutlined />
    </>,
    style: panelStyle,
  },
  {
    key: '3',
    label: 'Pipe',
    children: <>
      <InfoCircleFilled />
      <StockOutlined />
      <QuestionCircleFilled />
      <MenuUnfoldOutlined />
      <MenuFoldOutlined />
      <MenuFoldOutlined />
    </>,
    style: panelStyle,
  },
  {
    key: '4',
    label: 'Duct',
    children: <>
      <InfoCircleFilled />
      <StockOutlined />
      <QuestionCircleFilled />
      <MenuUnfoldOutlined />
      <MenuFoldOutlined />
      <MenuFoldOutlined />
    </>,
    style: panelStyle,
  },
  {
    key: '5',
    label: 'Room',
    children: <>
      <InfoCircleFilled />
      <StockOutlined />
      <QuestionCircleFilled />
      <MenuUnfoldOutlined />
      <MenuFoldOutlined />
      <MenuFoldOutlined />
    </>,
    style: panelStyle,
  },
  {
    key: '6',
    label: 'Metrics',
    children: <>
      <InfoCircleFilled />
      <StockOutlined />
      <QuestionCircleFilled />
      <MenuUnfoldOutlined />
      <MenuFoldOutlined />
      <MenuFoldOutlined />
    </>,
    style: panelStyle,
  },
  {
    key: '7',
    label: 'User',
    children: <>
      <InfoCircleFilled />
      <StockOutlined />
      <QuestionCircleFilled />
      <MenuUnfoldOutlined />
      <MenuFoldOutlined />
      <MenuFoldOutlined />
    </>,
    style: panelStyle,
  },
];

const LeftSidebar: React.FC = () => {
  const { token } = theme.useToken();

  const panelStyle: React.CSSProperties = {
    marginBottom: 24,
    background: token.colorFillAlter,
    borderRadius: token.borderRadiusLG,
    border: 'none',
  };

  return (
    <>

      <div className='left-sidebar'>


        <Collapse
          bordered={false}
          defaultActiveKey={['1']}
          expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
          style={{ background: token.colorBgContainer }}
          items={getItems(panelStyle)}
        />
      </div>
    </>
  )
}

export default LeftSidebar;
