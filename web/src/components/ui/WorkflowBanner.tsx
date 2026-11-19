import React from 'react';
import type { LucideIcon } from 'lucide-react';
import DepthArtwork from './DepthArtwork';
import './workflow-pages.css';

export default function WorkflowBanner({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  children?: React.ReactNode;
}) {
  return (
    <header className="cnc-flow-banner">
      <div className="cnc-flow-banner-copy">
        <h1>{title}</h1>
        {description && <p>{description}</p>}
        {children}
      </div>
      <DepthArtwork icon={icon} />
    </header>
  );
}
