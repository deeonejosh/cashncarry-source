import React from 'react';
import type { LucideIcon } from 'lucide-react';

export default function DepthArtwork({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div className="cnc-depth-artwork" aria-hidden="true">
      <span className="cnc-depth-orbit" />
      <span className="cnc-depth-jewel">
        <span className="cnc-depth-jewel-face"><Icon strokeWidth={1.55} /></span>
        <span className="cnc-depth-jewel-edge" />
        <span className="cnc-depth-jewel-base" />
      </span>
      <span className="cnc-depth-satellite" />
    </div>
  );
}
