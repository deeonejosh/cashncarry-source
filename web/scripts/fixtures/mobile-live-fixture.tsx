import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import MobileLiveStage from '../../src/components/pages/MobileLiveStage';
import type { LiveRoom, ProductItem, LiveComment } from '../../src/types';
import '../../src/index.css';

const product: ProductItem = {
  id: 'demo-product', slug: 'demo-product', title: 'RGB Wireless Gaming Controller',
  brand: 'DemoGear', price: 24900, compareAt: 29900, stock: 12, category: 'tech',
  description: 'Fictional QA product — no checkout requests are made.',
  image: '', sellerId: 'seller-test', sellerName: 'Gearpulse NG',
  rating: 4.8, reviews: 10, publication: 'published', archived: false,
  createdAt: '2026-11-19',
};
const room: LiveRoom = {
  id: 'qa-room', sellerId: 'seller-test', sellerName: 'Gearpulse NG',
  title: 'Gaming Accessories Deals', category: 'tech', status: 'live',
  viewerCount: 12, heartsCount: 3, pinnedProduct: product,
  pinnedProductId: product.id,
};
const role = new URLSearchParams(window.location.search).get('role') === 'seller' ? 'seller' : 'buyer';

declare global {
  interface Window { __cncLiveQaActions?: string[] }
}

window.__cncLiveQaActions = [];

function Fixture() {
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [hearts, setHearts] = useState(3);
  const [visible, setVisible] = useState(true);
  const log = (action: string) => window.__cncLiveQaActions?.push(action);
  if (!visible) return <p role="status" style={{color:'white'}}>Room closed for QA</p>;
  return <div className="cnc-app">
    <MobileLiveStage
      room={room} rooms={[room]} sellerProducts={[product]} comments={comments}
      commentValue={newComment} heartsCount={hearts} coinBalance={100}
      isHost={role === 'seller'} videoConfigured={false}
      onCommentChange={setNewComment}
      onSendComment={event => {
        event.preventDefault();
        if (!newComment.trim()) return;
        setComments(previous => [...previous, {
          id: String(previous.length + 1), roomId:room.id, userId:'qa',
          userName:'QA Tester', body:newComment, createdAt:'2026-11-19',
        }]);
        log('comment');
        setNewComment('');
      }}
      onHeart={() => {setHearts(n=>n+1);log('heart');}}
      onOpenGift={() => log('gift')}
      onPin={() => log('pin')}
      onEndRoom={() => { log('end'); setVisible(false); }}
      onExit={() => { log('exit'); setVisible(false); }}
      onChangeRoom={() => log('room')}
      onAddToCart={() => log('cart')}
      onBuy={() => log('buy')}
      onSelectProduct={() => log('details')}
      onShareNotice={() => log('share')}
    />
  </div>;
}

createRoot(document.getElementById('root')!).render(<Fixture />);
