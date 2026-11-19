import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

// Produce a small genuine OOXML ZIP container with deflated workbook,
// relationships and cells. The test exercises the actual browser XLSX path.
function zip(files) {
  const local = [];
  const central = [];
  let offset = 0;
  const u16 = (b, n, v) => b.writeUInt16LE(v, n);
  const u32 = (b, n, v) => b.writeUInt32LE(v >>> 0, n);
  for (const [name, content] of Object.entries(files)) {
    const nameBytes = Buffer.from(name);
    const plain = Buffer.from(content);
    const deflated = deflateRawSync(plain);
    const a = Buffer.alloc(30);
    u32(a, 0, 0x04034b50); u16(a, 4, 20); u16(a, 8, 8);
    u32(a, 18, deflated.length); u32(a, 22, plain.length);
    u16(a, 26, nameBytes.length);
    local.push(a, nameBytes, deflated);
    const c = Buffer.alloc(46);
    u32(c, 0, 0x02014b50); u16(c, 4, 20); u16(c, 6, 20); u16(c, 10, 8);
    u32(c, 20, deflated.length); u32(c, 24, plain.length);
    u16(c, 28, nameBytes.length); u32(c, 42, offset);
    central.push(c, nameBytes);
    offset += a.length + nameBytes.length + deflated.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  u32(end, 0, 0x06054b50);
  u16(end, 8, Object.keys(files).length); u16(end, 10, Object.keys(files).length);
  u32(end, 12, cd.length); u32(end, 16, offset);
  return Buffer.concat([...local, cd, end]);
}

const ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const workbook = '<workbook xmlns="' + ns + '" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Products" sheetId="1" r:id="rId1"/></sheets></workbook>';
const rels = '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"/></Relationships>';
const sheet = '<worksheet xmlns="' + ns + '"><sheetData>' +
  '<row r="1"><c r="A1" t="inlineStr"><is><t>title</t></is></c><c r="B1" t="inlineStr"><is><t>price_ngn</t></is></c><c r="C1" t="inlineStr"><is><t>stock</t></is></c><c r="D1" t="inlineStr"><is><t>category</t></is></c><c r="E1" t="inlineStr"><is><t>description</t></is></c></row>' +
  '<row r="2"><c r="A2" t="s"><v>0</v></c><c r="B2"><v>15000</v></c><c r="C2"><v>7</v></c><c r="D2" t="inlineStr"><is><t>tech</t></is></c><c r="E2" t="inlineStr"><is><t>Wireless gaming controller</t></is></c></row>' +
  '</sheetData></worksheet>';
const strings = '<sst xmlns="' + ns + '"><si><t>Game Controller</t></si></sst>';
const encoded = zip({
  'xl/workbook.xml': workbook,
  'xl/_rels/workbook.xml.rels': rels,
  'xl/worksheets/sheet1.xml': sheet,
  'xl/sharedStrings.xml': strings,
}).toString('base64');

const candidates = [
  process.env.CHROME_BIN, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].filter(Boolean);
const executablePath = candidates.find(p => existsSync(p));
if (!executablePath) throw new Error('Chrome/Chromium browser not installed for XLSX QA');
const child = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1'], { stdio: 'ignore' });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch('http://127.0.0.1:3000');
      if (r.ok) { ready = true; break; }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error('Vite did not start for XLSX browser test');
  browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:3000');
  const result = await page.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const file = new File([bytes], 'products.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const module = await import('/src/lib/seller-spreadsheet.ts');
    return await module.parseSellerSpreadsheet(file, [], 'Test Store');
  }, encoded);
  assert.equal(result.length, 1);
  assert.equal(result[0].errors.length, 0, JSON.stringify(result[0].errors));
  assert.equal(result[0].product.name, 'Game Controller');
  assert.equal(result[0].product.priceNaira, 15000);
  assert.equal(result[0].product.stock, 7);
  assert.equal(result[0].product.category, 'tech');
  console.log('XLSX browser parsing test PASS');
} finally {
  if (browser) await browser.close();
  child.kill('SIGTERM');
}
