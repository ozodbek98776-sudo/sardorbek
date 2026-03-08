import { useBackSwipe } from '../hooks/useBackSwipe';

interface SwipeNavigatorProps {
  navItems?: { path: string }[];
  basePath?: string;
}

const SwipeNavigator = ({ navItems, basePath }: SwipeNavigatorProps) => {
  useBackSwipe({
    disableOnInput: true,
    overlayId: 'swipe-overlay',
    navItems,
    basePath
  });

  return <div id="swipe-overlay" className="swipe-overlay" />;
};

export default SwipeNavigator;
