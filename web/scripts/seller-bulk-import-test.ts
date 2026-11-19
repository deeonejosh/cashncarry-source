import assert from 'node:assert/strict';
import { parseSellerSpreadsheet, BULK_MAX_ROWS } from '../src/lib/seller-spreadsheet';

const csv = (rows: string[]) => new File([rows.join('\r\n')], 'products.csv', { type: 'text/csv' });
const sample = [
  'title,price_ngn,stock,category,brand,description,image_url,compare_at_ngn',
  'Controller,15500,8,Electronics,Giga,USB controller,https://example.org/controller.png,18000',
  'Headset,9900.50,0,tech,Giga,Gaming headset,,',
];
const items = await parseSellerSpreadsheet(csv(sample), [], 'Acme Store');
assert.equal(items.length, 2);
assert.equal(items[0].errors.length, 0);
assert.equal(items[0].product?.priceNaira, 15500);
assert.equal(items[0].product?.category, 'tech');
assert.equal(items[1].product?.stock, 0);
assert.equal(items[1].product?.priceNaira, 9900.50);
assert.equal(items[1].status, 'ready');
assert.notEqual(items[0].id, items[1].id);

const repeated = await parseSellerSpreadsheet(csv([...sample, sample[1]]), [], 'Acme Store');
assert(repeated[2].errors.includes('Duplicate in this file'));
const bad = await parseSellerSpreadsheet(csv([
  sample[0],
  'Wrong,-10,1.5,Unlisted,Giga,,http://insecure.com/photo.png,5',
]), [], 'Acme Store');
assert(bad[0].errors.length >= 4);
assert.equal(bad[0].product, null);

await assert.rejects(
  parseSellerSpreadsheet(csv(['title,stock', 'Item,2']), [], 'Acme'),
  /Missing required columns/,
);
const tooMany = [sample[0], ...Array.from({length: BULK_MAX_ROWS + 1}, (_, i) =>
  'Item ' + i + ',100,1,tech,Brand,Description,,')];
await assert.rejects(parseSellerSpreadsheet(csv(tooMany), [], 'Acme'), /Maximum 100/);
console.log('Seller bulk CSV import/validation test PASS');
