
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** Allows charts/legends to render outside the border container without being clipped */
  noClip?: boolean;
}

const Card: React.FC<CardProps> = ({ children, className = '', noClip = false }) => {
  return (
    <div className={`subtle-anim-border shadow-soft rounded-2xl ${noClip ? 'no-clip' : ''} ${className}`.trim()}>
      <div className="rounded-2xl p-6 bg-white text-gray-900 border border-black/5 h-full">
        {children}
      </div>
    </div>
  );
};

export default Card;
