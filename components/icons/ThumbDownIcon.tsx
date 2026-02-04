import React from 'react';
import { Icon } from './Icon';

export const ThumbDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <Icon {...props}>
    <path d="M17 14V2" />
    <path d="M5.5 14h5.72l-.96 4.57a1.18 1.18 0 0 0 .5 1.3l1.18.83a2.38 2.38 0 0 0 2.82-.43L22 14V4H5.5a2.5 2.5 0 0 0-2.5 2.5v5a2.5 2.5 0 0 0 2.5 2.5z" />
  </Icon>
);
