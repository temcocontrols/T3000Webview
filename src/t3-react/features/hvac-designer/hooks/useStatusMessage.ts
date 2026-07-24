/**
 * useStatusMessage — returns message + coordinate info for split status bar.
 *
 * Left (fixed width): coordinates + selection count/type
 * Right (flexible): contextual message
 */

import { useState, useEffect } from 'react';
import T3Gv from '@/lib/t3-hvac/Data/T3Gv';
import ObjectUtil from '@/lib/t3-hvac/Opt/Data/ObjectUtil';
import { selectedTool } from '@/lib/t3-hvac/Data/Constant/RefConstant';

const DEFAULT_MSG = 'Drawing editor initialized. Select a tool or shape to get started.';
const POLL_MS = 150;

function getShapeTypeName(obj: any): string {
  if (!obj?.ShapeType) return '';
  return obj.ShapeType; // Already a string like 'Rect', 'Oval', 'GroupSymbol'
}

export function useStatusMessage() {
  const [message, setMessage] = useState(DEFAULT_MSG);
  const [info, setInfo] = useState('X: 0  Y: 0  W: 0  H: 0');

  useEffect(() => {
    const id = setInterval(() => {
      try {
        const sel = T3Gv.opt?.selectionState;
        const tool = selectedTool?.value?.name;

        // Right: message
        if (tool && tool !== 'Pointer') {
          setMessage(`Tool: ${tool}`);
        } else {
          setMessage(DEFAULT_MSG);
        }

        // Left: coordinates + selection info
        if (sel?.nselect) {
          const x = Math.round(sel.left ?? 0);
          const y = Math.round(sel.top ?? 0);
          const w = Math.round(sel.width ?? 0);
          const h = Math.round(sel.height ?? 0);

          // Get type name from tselect
          let typeName = '';
          if (sel.tselect >= 0) {
            const obj = ObjectUtil.GetObjectPtr(sel.tselect, false);
            typeName = getShapeTypeName(obj) || 'Shape';
          }

          let label = `${typeName}  `;
          if (sel.nselect > 1) label = `${sel.nselect}\u00D7 ${typeName}  `;

          let prefix = '';
          if (sel.nselect > 1) prefix = `${sel.nselect}\u00D7 `;
          setInfo(`${prefix}${typeName || 'Shape'}  |  X: ${x}    Y: ${y}    W: ${w}    H: ${h}`);
        } else {
          setInfo('X: 0    Y: 0    W: 0    H: 0');
        }
      } catch {
        setMessage(DEFAULT_MSG);
        setInfo('X: 0  Y: 0  W: 0  H: 0');
      }
    }, POLL_MS);

    return () => clearInterval(id);
  }, []);

  return { message, info };
}
