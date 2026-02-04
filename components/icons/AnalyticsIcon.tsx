
import React from 'react';
import { Icon } from './Icon';

export const AnalyticsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <Icon {...props}>
    <path d="M3 3v18h18" />
    <path d="M18.7 8a2 2 0 0 1 0 2.8l-6 6a2 2 0 0 1-2.8 0l-6-6a2 2 0 0 1 0-2.8l6-6a2 2 0 0 1 2.8 0z" />
  </Icon>
);
