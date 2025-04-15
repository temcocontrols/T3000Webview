//DOUBLE-LEARN
/*
export default 引入时不用加 {}，export 引入时需要加 {}，
import React from 'react ' //只是导入react
import * as React from 'react' //(*===所有)，导入所有 并命名为React
import hash as Router from 'react' //导入hash 并命名为Router
export default useStore as useAppStore // 导出useStore 并命名为useAppStore 
导出为一个对象时，引用需要使用对象的属性
*/

import { theme } from 'antd';

//const { token } = theme.useToken();

import { ProLayoutProps } from '@ant-design/pro-components';

/**
 * @name
 */
const Settings: ProLayoutProps & {
  pwa?: boolean;
  logo?: string;
} = {
  navTheme: 'light',
  colorPrimary: '#0064C8',
  // colorPrimary: '#00d9c5',
  layout: 'mix',
  contentWidth: 'Fluid',
  splitMenus: true, //Top & Left
  siderMenuType: "sub",
  siderWidth: 208,
  fixedHeader: true,
  fixSiderbar: true,
  colorWeak: true,
  title: 'PLT Platform',//显示在布局左上角的产品名，默认值为包名
  pwa: true,                       
  iconfontUrl: '',
  token: {
    // 参见ts声明，demo 见文档，通过token 修改样式
    //https://procomponents.ant.design/components/layout#%E9%80%9A%E8%BF%87-token-%E4%BF%AE%E6%94%B9%E6%A0%B7%E5%BC%8F
    bgLayout: '#fff',

    //配合顶部全局公告设置
    // header: {
    //   // heightLayoutHeader: 108,
    // },

    sider: {
      //eff3f8  0064c8 #EFF3F8
      //background-color: var(--console-menu-active-bg,#e6e6e6);
      //color: var(--console-menu-active-text-color,#1a1a1a);

      /*
      colorMenuBackground: '#fff',// "var(--ant-primary-color,'#e6e6e6')",//'#fff',
      colorMenuItemDivider: '#dfdfdf',
      colorTextMenu: '#595959',
      colorTextMenuSelected: 'rgba(42,122,251,1)',
      colorBgMenuItemSelected: '#EFF3F8',
      */

      colorBgMenuItemSelected: '#EFF3F8',
      colorTextMenuSelected: '#0064C8',
      colorBgMenuItemHover: '#EFF3F8',
    },

    // height: '100vh',
  },

  // pure:true,
  // loading:true,

  //
  // appList: appList.appList,
  // collapsedButtonRender:

  menu: {
    defaultOpenAll: true,
  },

  //https://procomponents.ant.design/components/layout
  //https://ant.design/components/menu-cn
  //menuProps:{ } 

};

export default Settings;
