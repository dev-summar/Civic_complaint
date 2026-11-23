import {useEffect, useState} from 'react';
import {Dimensions, Platform, ScaledSize} from 'react-native';

const DESKTOP_MIN_WIDTH = 960;

export function useDesktopLayout(): boolean {
  const [width, setWidth] = useState(() => Dimensions.get('window').width);

  useEffect(() => {
    const onChange = ({window}: {window: ScaledSize}) => setWidth(window.width);
    const sub = Dimensions.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  return Platform.OS === 'web' && width >= DESKTOP_MIN_WIDTH;
}
