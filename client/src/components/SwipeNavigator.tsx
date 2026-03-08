import { useBackSwipe } from '../hooks/useBackSwipe';

/**
 * Professional iOS-style swipe navigatsiya.
 * Visual overlay + sahifa/modal siljishi.
 */
const SwipeNavigator = () => {
  useBackSwipe({
    threshold: 80,
    edgeThreshold: 30,
    disableOnInput: true,
    fullScreenSwipe: true,
    overlayId: 'swipe-overlay'
  });

  return (
    <div
      id="swipe-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(to right, rgba(0,0,0,0.4) 0%, transparent 40%)',
        zIndex: 9998,
        display: 'none',
        opacity: 0,
        pointerEvents: 'none',
      }}
    />
  );
};

export default SwipeNavigator;
