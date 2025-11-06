declare module 'svg.js' {
  const SVG: any;
  export default SVG;
}

declare module 'svg.select.js';
declare module 'svg.draggable.js';
declare module 'svg.draw.js';
declare module 'svg.resize.js'

// Window object extensions for T3000 application
declare global {
  interface Window {
    t3000RequestTimes?: Array<{
      timestamp: number;
      panelsCount: number;
      modbusCount: number;
      timeString: string;
    }>;
    t3000PollingCalls?: Array<{
      timestamp: number;
      panelsCount: number;
      timeString: string;
    }>;
  }
}

export {};
