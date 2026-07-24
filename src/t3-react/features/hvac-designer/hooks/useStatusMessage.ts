import { useState, useEffect, useRef } from 'react';
import { sbName, sbX, sbY, sbW, sbH } from '@/lib/t3-hvac/Data/Constant/RefConstant';

const pad = (n: number) => String(n).padStart(4);

function fmt() {
  return {
    name: sbName,
    coords: sbX || sbY || sbW || sbH
      ? `X:${pad(sbX)}  Y:${pad(sbY)}  W:${pad(sbW)}  H:${pad(sbH)}`
      : '',
  };
}

export function useStatusMessage() {
  const [st, setSt] = useState(fmt);
  const prev = useRef('');

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const cur = sbName + '|' + sbX + ',' + sbY + ',' + sbW + ',' + sbH;
      if (cur !== prev.current) {
        prev.current = cur;
        setSt(fmt());
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return { name: st.name, coords: st.coords, msg: 'Drawing editor initialized. Select a tool or shape to get started.' };
}
