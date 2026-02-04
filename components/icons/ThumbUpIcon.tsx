import React from 'react';
import { Icon } from './Icon';

export const ThumbUpIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <Icon {...props}>
    <path d="M7 10v12" />
    <path d="M18.5 10h-5.72l.96-4.57a1.18 1.18 0 0 0-.5-1.3l-1.18-.83a2.38 2.38 0 0 0-2.82.43L2 10v10h16.5a2.5 2.5 0 0 0 2.5-2.5V12.5a2.5 2.5 0 0 0-2.5-2.5z" />
  </Icon>
);
