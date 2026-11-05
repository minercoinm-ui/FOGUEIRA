import React, { useRef, useState, useEffect, useCallback } from 'react';

interface VirtualJoystickProps {
  onMove: (move: { forward: number; strafe: number }) => void;
  size?: number; // Base circle size in px
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  onMove,
  size = 128,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTouchId, setActiveTouchId] = useState<number | null>(null);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState<boolean>(false);

  const radius = size / 2;
  const maxKnobDistance = radius - 16; // Max distance knob can travel from center

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (activeTouchId !== null) return;

    const touch = e.changedTouches[0];
    if (!touch || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;

    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, maxKnobDistance);
    const angle = Math.atan2(dy, dx);

    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    setActiveTouchId(touch.identifier);
    setIsActive(true);
    setKnobPos({ x: knobX, y: knobY });

    // forward: dragging up (-dy) -> positive forward movement
    // strafe: dragging right (+dx) -> positive strafe right
    const forward = -(knobY / maxKnobDistance);
    const strafe = knobX / maxKnobDistance;
    onMove({ forward, strafe });
  };

  const updateTouchPosition = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = clientX - centerX;
      const dy = clientY - centerY;

      const dist = Math.hypot(dx, dy);
      const clampedDist = Math.min(dist, maxKnobDistance);
      const angle = Math.atan2(dy, dx);

      const knobX = Math.cos(angle) * clampedDist;
      const knobY = Math.sin(angle) * clampedDist;

      setKnobPos({ x: knobX, y: knobY });

      // Normalized coordinates -1 to 1
      const forward = -(knobY / maxKnobDistance);
      const strafe = knobX / maxKnobDistance;
      onMove({ forward, strafe });
    },
    [maxKnobDistance, onMove]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (activeTouchId === null) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === activeTouchId) {
          e.preventDefault();
          e.stopPropagation();
          updateTouchPosition(touch.clientX, touch.clientY);
          break;
        }
      }
    },
    [activeTouchId, updateTouchPosition]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (activeTouchId === null) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === activeTouchId) {
          e.preventDefault();
          e.stopPropagation();
          setActiveTouchId(null);
          setIsActive(false);
          setKnobPos({ x: 0, y: 0 });
          onMove({ forward: 0, strafe: 0 });
          break;
        }
      }
    },
    [activeTouchId, onMove]
  );

  useEffect(() => {
    if (activeTouchId !== null) {
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd, { passive: false });
      window.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    }

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [activeTouchId, handleTouchMove, handleTouchEnd]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        touchAction: 'none',
      }}
      className={`relative rounded-full select-none flex items-center justify-center transition-opacity cursor-pointer ${
        isActive ? 'opacity-95' : 'opacity-70 hover:opacity-85'
      }`}
    >
      {/* Outer Glow Ring */}
      <div
        className={`absolute inset-0 rounded-full border-2 transition-all duration-200 pointer-events-none shadow-2xl ${
          isActive
            ? 'border-amber-400 bg-amber-950/45 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
            : 'border-amber-600/50 bg-stone-950/65'
        }`}
      />

      {/* Compass direction indicators */}
      <div className="absolute top-1.5 text-[9px] font-bold text-amber-500/70 pointer-events-none">▲</div>
      <div className="absolute bottom-1.5 text-[9px] font-bold text-amber-500/70 pointer-events-none">▼</div>
      <div className="absolute left-2 text-[9px] font-bold text-amber-500/70 pointer-events-none">◀</div>
      <div className="absolute right-2 text-[9px] font-bold text-amber-500/70 pointer-events-none">▶</div>

      {/* Inner Track Ring */}
      <div className="w-16 h-16 rounded-full border border-dashed border-amber-500/30 pointer-events-none" />

      {/* Center Draggable Knob */}
      <div
        style={{
          transform: `translate3d(${knobPos.x}px, ${knobPos.y}px, 0)`,
          transition: isActive ? 'none' : 'transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
        className={`absolute w-12 h-12 rounded-full border-2 flex items-center justify-center shadow-lg pointer-events-none transition-colors ${
          isActive
            ? 'bg-gradient-to-br from-amber-400 to-amber-600 border-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.7)] text-stone-950'
            : 'bg-gradient-to-br from-stone-800 to-stone-900 border-amber-500/60 text-amber-400'
        }`}
      >
        {/* Grip detail inside knob */}
        <div className="w-4 h-4 rounded-full border border-stone-950/40 bg-stone-950/20 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-300" />
        </div>
      </div>
    </div>
  );
};
