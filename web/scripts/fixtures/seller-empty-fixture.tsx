import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import MobileLiveEmptyStage from '../../src/components/pages/MobileLiveEmptyStage';
import '../../src/index.css';

declare global { interface Window { __cncEmptyQaActions?: string[] } }
window.__cncEmptyQaActions = [];

function Fixture() {
  const [selected, setSelected] = useState('');
  const params = new URLSearchParams(window.location.search);
  const seller = params.get('seller') !== '0';
  return <div className="cnc-app">
    {selected ? <div role="status" style={{color:'#fff',padding:20}}>{selected}</div> :
      <MobileLiveEmptyStage isApprovedSeller={seller} liveStreamingConfigured={true}
        onOpenCreate={() => {window.__cncEmptyQaActions?.push('setup');setSelected('Setup opened');}}
        onExit={() => {window.__cncEmptyQaActions?.push('exit');setSelected('Exited studio');}} />}
  </div>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
