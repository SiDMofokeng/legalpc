import React from 'react';

export const LegalPracticeCouncilLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 160 140" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g fill="currentColor">
      {/* Tree structure */}
      <path d="M80 100 V70 M80 70 C 70 65, 65 55, 70 45 M80 70 C 90 65, 95 55, 90 45" stroke="currentColor" strokeWidth="3" fill="none" />
      <path d="M70 45 C 65 40, 60 30, 65 20 M90 45 C 95 40, 100 30, 95 20" stroke="currentColor" strokeWidth="2" fill="none" />

      {/* Leaves (simplified) */}
      <polygon points="80,0 85,15 75,15" />
      
      <g transform="rotate(20 80 80)">
         <polygon points="100,20 105,35 95,35" />
         <polygon points="110,45 115,60 105,60" />
         <polygon points="115,70 120,85 110,85" />
      </g>
      <g transform="rotate(-20 80 80)">
         <polygon points="60,20 65,35 55,35" />
         <polygon points="50,45 55,60 45,60" />
         <polygon points="45,70 50,85 40,85" />
      </g>
      
      <g transform="rotate(45 80 80)">
         <polygon points="105,50 110,65 100,65" />
         <polygon points="90,30 95,45 85,45" />
      </g>
      <g transform="rotate(-45 80 80)">
         <polygon points="55,50 60,65 50,65" />
         <polygon points="70,30 75,45 65,45" />
      </g>

       <g transform="rotate(70 80 80)">
         <polygon points="95,65 100,80 90,80" />
      </g>
      <g transform="rotate(-70 80 80)">
         <polygon points="65,65 70,80 60,80" />
      </g>
      
      {/* Ground */}
      <path d="M40 100 C 60 105, 100 105, 120 100" stroke="currentColor" strokeWidth="2" fill="none"/>
    </g>
    
    <text x="80" y="115" fontFamily="sans-serif" fontSize="10" fill="currentColor" textAnchor="middle" fontWeight="bold">LEGAL PRACTICE</text>
    <text x="80" y="130" fontFamily="sans-serif" fontSize="10" fill="currentColor" textAnchor="middle" fontWeight="bold">COUNCIL</text>
  </svg>
);
