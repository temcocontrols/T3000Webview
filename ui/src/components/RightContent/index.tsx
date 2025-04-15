import { QuestionCircleOutlined } from '@ant-design/icons';
import { SelectLang as UmiSelectLang } from '@umijs/max';
import React from 'react';

export type SiderTheme = 'light' | 'dark';

export const SelectLang = () => {
  return (
    <UmiSelectLang
      style={{
        padding: 4,
      }}
      postLocalesData={() => {
        const locals = [{
          lang: 'zh-CN',
          label: '简体中文',
          icon: '🇨🇳',
          title: '语言'
        }, 
        {
          lang: 'en-US',
          label: 'English',
          icon: '🇺🇸',
          title: 'Language'
        }
      ]
        return locals;
      }}
    />
  );
};

export const Question = () => {
  return (
    <div
      style={{
        display: 'flex',
        height: 26,
      }}
      onClick={() => {
        window.open('https://pro.ant.design/docs/getting-started');
      }}
    >
      <QuestionCircleOutlined />
    </div>
  );
};
