import React from 'react';

export default function BrandLogo({ className = 'h-8 sm:h-9 w-auto' }: { className?: string }) {
  return (
    <div className="flex items-center gap-2">
      <img
        src="/brand/logo.png"
        alt="Cash N Carry Nigeria"
        className={`${className} object-contain transition-transform duration-200 hover:scale-[1.02]`}
      />
    </div>
  );
}
