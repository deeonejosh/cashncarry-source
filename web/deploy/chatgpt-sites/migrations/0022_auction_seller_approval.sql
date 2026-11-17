-- Private-staging source/isolated CI contract only. Do not apply to the existing D1
-- until a verified backup, reviewed migrations and release gate are complete.
-- Closes the role-only authorization gap in the original creation trigger.
DROP TRIGGER IF EXISTS cnc_auction_validate_create;

CREATE TRIGGER cnc_auction_validate_create BEFORE INSERT ON cnc_auctions
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM cnc_seller_products p
    JOIN cnc_auth_users u ON u.id=p.owner
    JOIN cnc_seller_applications a ON a.user_id=u.id
    WHERE p.id=NEW.product_id AND p.owner=NEW.seller AND p.stock>0
      AND p.archived=0 AND p.publication='published'
      AND a.status='approved' AND u.role='seller'
      AND u.verified=1 AND u.suspended=0
  ) THEN RAISE(ABORT,'CNC_AUCTION_PRODUCT_UNAVAILABLE') END;
END;
