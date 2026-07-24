import { useState, useEffect, useRef } from 'react';
import { sbName, sbX, sbY, sbR, sbB, sbWidth, sbHeight } from '@/lib/t3-hvac/Data/Constant/RefConstant';

const pad = (n: number) => String(n).padStart(5);

function fmt() {
  const hasPos = sbX || sbY || sbR || sbB;
  return {
    name: sbName,
    coords: hasPos
      ? `X:${pad(sbX)}\u00A0\u00A0\u00A0 Y:${pad(sbY)}\u00A0\u00A0\u00A0 R:${pad(sbR)}\u00A0\u00A0\u00A0 B:${pad(sbB)}\u00A0\u00A0\u00A0 |\u00A0\u00A0\u00A0 W:${pad(sbWidth)}\u00A0\u00A0\u00A0 H:${pad(sbHeight)}`
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
