import Footer from '@/components/Footer';
import { Question, SelectLang } from '@/components/RightContent';
import { LinkOutlined } from '@ant-design/icons';
import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';
import type { RunTimeLayoutConfig } from '@umijs/max';
import { history, Link, useIntl } from '@umijs/max';
import defaultSettings from '../config/defaultSettings';
import { errorConfig } from './requestErrorConfig';
// import { currentUser } from './pages/user/login/service';
import React from 'react';
import { AvatarDropdown, AvatarName } from './components/RightContent/AvatarDropdown';
import { useState } from 'react';
import { Alert, Button, Input, Space, Image, Avatar, theme } from 'antd';
import { InfoCircleFilled, GithubFilled, QuestionCircleFilled, MenuUnfoldOutlined, MenuFoldOutlined } from '@ant-design/icons';
import Collapse from '@/components/Collapse';

const isDev = process.env.NODE_ENV === 'development';
const loginPath = '/user/login';

const layoutBgImgList = [
  {
    src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/D2LWSqNny4sAAAAAAAAAAAAAFl94AQBr',
    left: 85,
    bottom: 100,
    height: '303px',
  },
  {
    src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/C2TWRpJpiC0AAAAAAAAAAAAAFl94AQBr',
    bottom: -68,
    right: -45,
    height: '303px',
  },
  {
    src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/F6vSTbj8KpYAAAAAAAAAAAAAFl94AQBr',
    bottom: 0,
    left: 0,
    width: '331px',
  },
];

/**
 * @see  https://umijs.org/zh-CN/plugins/plugin-initial-state
 * */
export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: any;
  loading?: boolean;
  fetchUserInfo?: () => Promise<any | undefined>;
}> {
  const fetchUserInfo = async () => {
    try {
      const msg = await currentUser({
        skipErrorHandler: true,
      });
      return msg.data;
    } catch (error) {
      history.push(loginPath);
    }
    return undefined;
  };
  // 如果不是登录页面，执行
  const { location } = history;
  console.log("1", location)

  // 定义无需登录的特殊页面路径
  const noLoginRequiredPages = ['/', '/hvac', '/app-library','/app-library/','/app-library/index', '/modbus-register'];

  // 如果当前页面属于无需登录的页面，直接返回空的用户状态

  const defaultUser = {
    name: 'Home',
    avatar: 'https://img.alicdn.com/tfs/TB1DzOjXP7gK0jSZFjXXc5aXXa-212-48.png',
    access: 'admin'
  };
  if (noLoginRequiredPages.includes(location.pathname)) {
    return {
      fetchUserInfo: undefined,
      currentUser: defaultUser,
      settings: defaultSettings as Partial<LayoutSettings>,
    };
  }

  if (location.pathname !== loginPath) {
    const currentUser = await fetchUserInfo();
    return {
      fetchUserInfo,
      currentUser,
      settings: defaultSettings as Partial<LayoutSettings>,
    };
  }
  return {
    fetchUserInfo,
    settings: defaultSettings as Partial<LayoutSettings>,
  };
}

// ProLayout 支持的api https://procomponents.ant.design/components/layout
// 运行时配置 || 运行时配置写在 src/app.tsx 中，key 为 layout。
export const layout: RunTimeLayoutConfig = ({ initialState, setInitialState }) => {

  //自定义Collapse
  const [collapsed, setCollapsed] = useState(false);

  return {
    // logo: <img style={{ height: 22 }} src='https://img.alicdn.com/tfs/TB13DzOjXP7gK0jSZFjXXc5aXXa-212-48.png'></img>,
    logo: null,
    // actionsRender: () => [<Question key="doc" />, <SelectLang key="SelectLang" />],
    // actionsRender: () => [],
    avatarProps: {
      src: initialState?.currentUser?.avatar,
      title: <AvatarName />,
      render: (_, avatarChildren) => {
        return <AvatarDropdown>{avatarChildren}</AvatarDropdown>;
      },
    },
    // waterMarkProps: {
    //   content: initialState?.currentUser?.name,
    // },
    // footerRender: () => <Footer />,
    onPageChange: () => {

      // const { location } = history;
      // // 如果没有登录，重定向到 login
      //   if (!initialState?.currentUser && location.pathname !== loginPath) {
      //     history.push(loginPath);
      //   }

      const { location } = history;
      const noLoginRequiredPages = ['/', '/hvac', '/app-library','/app-library/index', '/modbus-register'];
      console.log("2", location);

      // 如果当前页面属于无需登录的页面，跳过登录验证
      if (noLoginRequiredPages.includes(location.pathname)) {
        return;
      }

      // 如果用户未登录且访问的页面不是登录页面，跳转到登录页面
      if (!initialState?.currentUser && location.pathname !== loginPath) {
        history.push(loginPath);
      }
    },
    layoutBgImgList: layoutBgImgList,
    // links: isDev
    //   ? [
    //     <Link key="openapi" to="/umi/plugin/openapi" target="_blank">
    //       <LinkOutlined />
    //       <span>OpenAPI 文档</span>
    //     </Link>,
    //     /* 取消菜单栏左下角显示*/
    //   ]
    //   : [],
    menuHeaderRender: undefined,
    // 自定义 403 页面
    // unAccessible: <div>unAccessible</div>,
    // 增加一个 loading 的状态
    childrenRender: (children) => {
      // if (initialState?.loading) return <PageLoading />;
      return (
        <>
          {children}
          <SettingDrawer
            disableUrlParams
            enableDarkTheme
            settings={initialState?.settings}
            onSettingChange={(settings) => {
              setInitialState((preInitialState) => ({
                ...preInitialState,
                settings,
              }));
            }}
          />
        </>
      );
    },
    ...initialState?.settings,
    // 其他属性见：https://procomponents.ant.design/components/layout#prolayout

    collapsed: collapsed,

    // DOUBLE-TODO: onCollapse 这里不能写出 (collapsed: boolean) => { setCollapsed(!collapsed) } ，会导致Mobile模式下，默认添加的顶部的按钮点击事件无效
    // onCollapse: (collapsed: boolean) => { setCollapsed(!collapsed) },
    onCollapse: setCollapsed,

    collapsedButtonRender: (collapsed?: boolean, defaultDom?: React.ReactNode) => {
      // console.log({ ...initialState?.settings })
      return <div onClick={() => { setCollapsed(!collapsed) }}>
        <Collapse collapse={!collapsed}></Collapse>
      </div>
    },

    pageTitleRender: () => {
      return ""; //设置Page的title为空
    }
  }
};

/**
 * @name request 配置，可以配置错误处理
 * 它基于 axios 和 ahooks 的 useRequest 提供了一套统一的网络请求和错误处理方案。
 * @doc https://umijs.org/docs/max/request#配置
 */
export const request = {
  ...errorConfig,
};
