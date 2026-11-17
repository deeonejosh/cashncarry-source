-- Staging safety contract: idempotent triggers already present in the populated D1.
-- This file also makes isolated Miniflare D1 regression schemas faithful.
-- Do not run a bulk migration on populated staging without first reconciling history.
CREATE TRIGGER IF NOT EXISTS cnc_auction_validate_create BEFORE INSERT ON cnc_auctions
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM cnc_seller_products p JOIN cnc_auth_users u ON u.id=p.owner
    WHERE p.id=NEW.product_id AND p.owner=NEW.seller AND p.stock>0 AND p.archived=0
      AND p.publication='published' AND u.role='seller' AND u.verified=1 AND u.suspended=0
  ) THEN RAISE(ABORT,'CNC_AUCTION_PRODUCT_UNAVAILABLE') END;
END;

CREATE TRIGGER IF NOT EXISTS cnc_auction_reserve_product AFTER INSERT ON cnc_auctions
BEGIN
  UPDATE cnc_seller_products SET stock=stock-1,revision=revision+1 WHERE id=NEW.product_id AND stock>0;
  SELECT CASE WHEN changes()<>1 THEN RAISE(ABORT,'CNC_AUCTION_STOCK_UNAVAILABLE') END;
END;

CREATE TRIGGER IF NOT EXISTS cnc_auction_close_no_bid AFTER UPDATE OF closed_at ON cnc_auctions
WHEN OLD.closed_at IS NULL AND NEW.closed_at IS NOT NULL AND OLD.winner_id IS NULL
BEGIN
  UPDATE cnc_seller_products SET stock=stock+1,revision=revision+1 WHERE id=NEW.product_id;
END;

CREATE TRIGGER IF NOT EXISTS cnc_bid_validate BEFORE INSERT ON cnc_bids
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM cnc_auctions a JOIN cnc_auth_users u ON u.id=NEW.bidder_id
    WHERE a.id=NEW.auction_id AND a.closed_at IS NULL AND a.ends_at>unixepoch()
      AND a.seller<>NEW.bidder_id AND u.role='buyer' AND u.verified=1 AND u.suspended=0
      AND NEW.amount_kobo >= CASE WHEN a.current_bid_kobo IS NULL THEN a.starting_bid_kobo ELSE a.current_bid_kobo+100 END
      AND NEW.amount_kobo <= 100000000000
  ) THEN RAISE(ABORT,'CNC_BID_REJECTED') END;
END;

CREATE TRIGGER IF NOT EXISTS cnc_bid_update_auction AFTER INSERT ON cnc_bids
BEGIN
  UPDATE cnc_auctions SET current_bid_kobo=NEW.amount_kobo,winner_id=NEW.bidder_id WHERE id=NEW.auction_id;
END;

CREATE TRIGGER IF NOT EXISTS cnc_coin_prevent_overdraft BEFORE INSERT ON cnc_coin_ledger
WHEN NEW.delta < 0
BEGIN
  SELECT CASE WHEN (SELECT COALESCE(SUM(delta),0) FROM cnc_coin_ledger WHERE user_id=NEW.user_id) + NEW.delta < 0
    THEN RAISE(ABORT,'CNC_INSUFFICIENT_COINS') END;
END;
