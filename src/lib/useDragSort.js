import { useRef, useState } from "react";

// つまみ(⋮⋮)をドラッグして並べ替える。マウスでも指(スマホ)でも動くよう、Pointer Events で自前で実装。
//   const { itemRef, handleProps, drag } = useDragSort((from, to) => ...並べ替え...);
//   各行の外側に ref={itemRef(i)}、つまみに {...handleProps(i)} を付ける。
//   drag = { from, over }(ドラッグ中だけ)。行の見た目(半透明・落とす位置の線)に使う。
export function useDragSort(onMove) {
  const refs = useRef([]);
  const [drag, setDrag] = useState(null);

  const itemRef = (i) => (el) => {
    refs.current[i] = el;
  };

  const overIndex = (y, current) => {
    const els = refs.current.filter(Boolean);
    if (!els.length) return current;
    let over = current;
    els.forEach((el, j) => {
      const r = el.getBoundingClientRect();
      if (y >= r.top && y <= r.bottom) over = j;
    });
    if (y < els[0].getBoundingClientRect().top) over = 0;
    if (y > els[els.length - 1].getBoundingClientRect().bottom) over = els.length - 1;
    return over;
  };

  const handleProps = (i) => ({
    onPointerDown: (e) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setDrag({ from: i, over: i });
    },
    onPointerMove: (e) => {
      if (!drag) return;
      const over = overIndex(e.clientY, drag.over);
      if (over !== drag.over) setDrag({ ...drag, over });
    },
    onPointerUp: () => {
      if (drag && drag.over !== drag.from) onMove(drag.from, drag.over);
      setDrag(null);
    },
    onPointerCancel: () => setDrag(null),
    style: { touchAction: "none", cursor: drag ? "grabbing" : "grab" },
    title: "ドラッグして並べ替え",
  });

  return { itemRef, handleProps, drag };
}

// 配列の from 番目を to 番目へ移す(新しい配列を返す)
export function arrayMove(list, from, to) {
  const next = [...list];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}
