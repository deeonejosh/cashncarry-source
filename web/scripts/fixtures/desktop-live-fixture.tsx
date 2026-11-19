import React,{useState} from 'react';
import{createRoot}from'react-dom/client';
import DesktopLiveEmptyStage from '../../src/components/pages/DesktopLiveEmptyStage';
import '../../src/index.css';

function Fixture(){
 const [clicked,setClicked]=useState('');
 const params=new URLSearchParams(window.location.search);
 const ended=params.get('ended')==='1';
 return <main style={{padding:'15px',maxWidth:'1440px',margin:'0 auto'}}>
 <DesktopLiveEmptyStage isApprovedSeller={true} liveStreamingConfigured={true} hasEndedRoom={ended}
    onOpenCreate={()=>setClicked('start')} onSellerCentre={()=>setClicked('seller')} onExit={()=>setClicked('exit')}/>
 {clicked&&<p role="status" style={{color:'white'}}>Action: {clicked}</p>}
 </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
