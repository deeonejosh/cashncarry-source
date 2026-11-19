import React from 'react';
import logo from '../../assets/cash-n-carry-logo.webp?inline';

export default function BrandLogo({ className = 'h-8 sm:h-9 w-auto' }: { className?: string }) {
  return (
    <div className="cnc-depth-brand flex items-center gap-2">
      <img
        src={logo}
        alt="Cash N Carry Nigeria"
        width={360}
        height={120}
        className={`${className} object-contain transition-transform duration-200 hover:scale-[1.02]`}
      />
    </div>
  );
}
