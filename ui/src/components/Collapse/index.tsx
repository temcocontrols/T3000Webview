import { useMergedState } from "rc-util";
import { css } from '@emotion/css';
import { RightOutlined, LeftOutlined } from '@ant-design/icons';


const liuvoF = css`
    position: absolute;
    z-index: 100;
    top: 50%;
    transform: translateY(-50%);
    left: 0px;
    width: 16px;
    height: 34px;
    cursor: pointer;
    margin-left:208px;
   `;

const liuvoF1 = css`
    position: absolute;
    z-index: 100;
    top: 50%;
    transform: translateY(-50%);
    left: 0px;
    width: 16px;
    height: 34px;
    cursor: pointer;
    margin-left:64px;
   `;

const cioGfI = css`
    display: block;
    position: relative;
    background: rgb(255, 255, 255);
    border-width: 1px 1px 1px 0px;
    border-style: solid solid solid none;
    border-color: rgb(203, 203, 203) rgb(203, 203, 203) rgb(203, 203, 203) currentcolor;
    border-image: none;
    border-radius: 0px 2px 2px 0px;
    left: -1px;
    width: 16px;
    height: 34px;
    line-height: 32px;
    text-align: center;
    cursor: pointer;
    transition: left 0.1s ease-in-out 0s, border 0.1s ease 0s;
    `;

const cls4 = css`
   width: 12px;
   position: relative;
   color: rgb(193, 193, 193);
   transform: rotate(0deg) scale(0.8);
   transition: transform 0.5s ease-in-out 0s, left 0.1s ease-in-out 0s;
   font-size: 12px;
 `;

const cls41 = css`
   width: 12px;
   position: relative;
   color: rgb(193, 193, 193);
   transform: rotate(180deg) scale(0.8);
   transition: transform 0.5s ease-in-out 0s, left 0.1s ease-in-out 0s;
   font-size: 12px;
 `;

// 将collapse的设置放到外边去，里面设置不生效，应为是导出的layout: RunTimeLayoutConfig，里面只做按钮样式渲染

const Collapse: React.FC<any> = (props) => {

  const rtNodeCollapse = <>
    {/* <div class="sc-fnVYJo aqTZb">
            <div class="sc-hBMVcZ liuvoF">
                <span class="sc-ksluoS cioGfI">
                    <span role="img" aria-label="left" class="anticon anticon-left app-layout-nav-collapse-trigger-icon">
                        <svg viewBox="64 64 896 896" focusable="false" data-icon="left" width="1em" height="1em" fill="currentColor" aria-hidden="true">
                            <path d="M724 218.3V141c0-6.7-7.7-10.4-12.9-6.3L260.3 486.8a31.86 31.86 0 000 50.3l450.8 352.1c5.3 4.1 12.9.4 12.9-6.3v-77.3c0-4.9-2.3-9.6-6.1-12.6l-360-281 360-281.1c3.8-3 6.1-7.7 6.1-12.6z" data-spm-anchor-id="5176.ecscore_overview.0.i1.787c4df5FGL28L">
                            </path>
                        </svg>
                    </span>
                </span>
            </div>
        </div> */}

    <div className={liuvoF}>
      <span className={cioGfI}>
        <LeftOutlined></LeftOutlined>
      </span>
    </div>
  </>;

  const rtNodeCollapsed = <>
    <div className={liuvoF1}>
      <span className={cioGfI}>
        <RightOutlined></RightOutlined>
      </span>
    </div>
  </>;

  return props.collapse ? rtNodeCollapse : rtNodeCollapsed;
}

export default Collapse;
