import { useState, useEffect, useRef } from 'react';
import { sbName, sbX, sbY, sbR, sbB, sbWidth, sbHeight } from '@/lib/t3-hvac/Data/Constant/RefConstant';

const pad = (n: number) => String(n).padStart(5);

function fmt() {
  const hasPos = sbX || sbY || sbR || sbB;
  return {
    name: sbName,
    coords: hasPos
      ? `X:${pad(sbX)}   Y:${pad(sbY)}   R:${pad(sbR)}   B:${pad(sbB)}   |   W:${pad(sbWidth)}   H:${pad(sbHeight)}`
      : '',
  };
}

export function useStatusMessage() {
  const [st, setSt] = useState(fmt);
  const prev = useRef('');

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const cur = `${sbName}|${sbX},${sbY},${sbR},${sbB},${sbWidth},${sbHeight}`;
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
