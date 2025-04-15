import type { RequestOptions } from '@@/plugin-request/request';
import type { RequestConfig } from '@umijs/max';
import { message, notification } from 'antd';

// 错误处理方案： 错误类型
enum ErrorShowType {
  SILENT = 0,
  WARN_MESSAGE = 1,
  ERROR_MESSAGE = 2,
  NOTIFICATION = 3,
  REDIRECT = 9,
}
// 与后端约定的响应数据格式
interface ResponseStructure {

  /*
  success: boolean;
  data: any;
  errorCode?: number;
  errorMessage?: string;
  showType?: ErrorShowType;
  */

  success: boolean;
  code: number;
  msg: string;
  data: any;
  showType?: ErrorShowType;
}

/**
 * @name 错误处理
 * pro 自带的错误处理， 可以在这里做自己的改动
 * @doc https://umijs.org/docs/max/request#配置
 */
export const errorConfig: RequestConfig = {
  // 错误处理： umi@3 的错误处理方案。
  errorConfig: {
    // 错误抛出
    errorThrower: (res) => {
      const { success, data, code, msg, showType } =
        res as unknown as ResponseStructure;
      if (!success) {
        const error: any = new Error(msg);
        error.name = 'BizError';
        error.info = { code, msg, showType, data };
        // throw error; // 抛出自制的错误
      }
    },
    // 错误接收及处理
    errorHandler: (error: any, opts: any) => {
      if (opts?.skipErrorHandler) throw error;
      // 我们的 errorThrower 抛出的错误。
      if (error.name === 'BizError') {
        const errorInfo: ResponseStructure | undefined = error.info;
        if (errorInfo) {
          const { msg, code } = errorInfo;
          switch (errorInfo.showType) {
            case ErrorShowType.SILENT:
              // do nothing
              break;
            case ErrorShowType.WARN_MESSAGE:
              message.warning(msg);
              break;
            case ErrorShowType.ERROR_MESSAGE:
              message.error(msg);
              // console.log("global-log-error", msg);
              break;
            case ErrorShowType.NOTIFICATION:
              notification.open({
                description: msg,
                message: code,
              });
              break;
            case ErrorShowType.REDIRECT:
              // TODO: redirect
              break;
            default:
              message.error(msg);
          }
        }
      } else if (error.response) {
        // Axios 的错误
        // 请求成功发出且服务器也响应了状态码，但状态代码超出了 2xx 的范围
        message.error(`Response status:${error.response.status}`);
      } else if (error.request) {
        // 请求已经成功发起，但没有收到响应
        // \`error.request\` 在浏览器中是 XMLHttpRequest 的实例，
        // 而在node.js中是 http.ClientRequest 的实例
        message.error('None response! Please retry.');
      } else {
        // 发送请求时出了点问题
        message.error('Request error, please retry.');
      }
    },
  },

  // 请求拦截器
  requestInterceptors: [
    (config: RequestOptions) => {
      // 拦截请求配置，进行个性化处理。
      const url = config?.url?.concat('?token = 123');
      // return { ...config, url };
      return {
        ...config, url,
        headers: {
          "qn-token": localStorage.getItem('qn-token') || "",
          'qn-token-extral': localStorage.getItem('qn-token-extral') || "plt"
        },
      };
    },
  ],

  // 响应拦截器
  responseInterceptors: [
    (response) => {
      // 拦截响应数据，进行个性化处理
      const { data } = response as unknown as ResponseStructure;

      // console.log(response);
      // console.log(data?.success, data?.success === false);

      if (data?.code == "1025") {
        message.error('登陆超时，请重新登陆');
        // message.error(data?.msg);
        localStorage.setItem('qn-token', '');
        location.href = '/user/login';
      }
      else {

      }

      return response;
    },

    /*
    request.interceptors.response.use(async (response, options) => {
      // console.log("QN:request.interceptors.response//");
      // console.log(response);
      if (options.responseType === 'blob') {
        return response;
      } else {
        const data = await response.clone().json();
        if (data && data.code == '1205') {
          message.error('登陆超时，请重新登陆');
          // localStorage.setItem('antd-pro-authority', JSON.stringify(['']));
          localStorage.setItem('qn-act', '');
          location.href = '/user/login';
        }
      }  
      return response;
    });
    */
  ],
};
