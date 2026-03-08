import { useBackSwipe } from '../hooks/useBackSwipe';

interface SwipeNavigatorProps {
  navItems?: { path: string }[];
  basePath?: string;
}

const SwipeNavigator = ({ navItems, basePath }: SwipeNavigatorProps) => {
  useBackSwipe({
    edgeThreshold: 30,
    disableOnInput: true,
    fullScreenSwipe: true,
    overlayId: 'swipe-overlay',
    navItems,
    basePath
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
