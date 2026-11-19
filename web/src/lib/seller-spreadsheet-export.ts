import { categories } from './data';
import { BULK_HEADERS, type BulkProduct } from './seller-spreadsheet';
import type { SellerProductItem } from '../types';

/**
 * Small dependency-free OOXML writer for a seller-owned .xlsx download.
 * All sheets and cell values are assembled locally in the browser.
 * ZIP uses the standard STORED method (no decompression dependency).
 * Uploads use the existing authenticated seller API; exports never hit a public endpoint.
 */
type Cell = string | number | null | undefined;
type SpreadsheetRow = Cell[];

const MAX_EXPORT_ROWS = 500;
const bytes = (str: string) => new TextEncoder().encode(str);
const escapeXml = (input: string) => input
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

function excelColumn(n: number): string {
  let column = '';
  for (let index = n + 1; index > 0; index = Math.floor((index - 1) / 26)) {
    column = String.fromCharCode(65 + (index - 1) % 26) + column;
  }
  return column;
}

function sheetXml(rows: SpreadsheetRow[], widths: number[]): string {
  const cols = widths.map((width, index) => {
    const n = index + 1;
    return '<col min="' + n + '" max="' + n + '" width="' + width + '" customWidth="1"/>';
  }).join('');
  const xmlRows = rows.map((row, rowIndex) => {
    const index = rowIndex + 1;
    const cells = row.map((value, colIndex) => {
      if (value === undefined || value === null || value === '') return '';
      const ref = excelColumn(colIndex) + index;
      if (typeof value === 'number' && Number.isFinite(value)) {
        const money = rowIndex > 0 && (colIndex === 1 || colIndex === 7);
        return '<c r="' + ref + '"' + (money ? ' s="2"' : '') + '><v>' + value + '</v></c>';
      }
      const style = rowIndex === 0 ? ' s="1"' : '';
      const safe = escapeXml(String(value).slice(0, 32767));
      return '<c r="' + ref + '" t="inlineStr"' + style + '><is><t xml:space="preserve">' + safe + '</t></is></c>';
    }).join('');
    return '<row r="' + index + '"' + (rowIndex === 0 ? ' ht="26" customHeight="1"' : '') + '>' + cells + '</row>';
  }).join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    '<cols>' + cols + '</cols><sheetData>' + xmlRows + '</sheetData>' +
    (rows.length > 0 ? '<autoFilter ref="A1:' + excelColumn(rows[0].length - 1) + Math.max(1,rows.length) + '"/>' : '') +
    '</worksheet>';
}

const XLSX_STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<numFmts count="0"/>' +
  '<fonts count="2"><font><sz val="11"/><name val="Aptos"/></font>' +
  '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font></fonts>' +
  '<fills count="3"><fill><patternFill patternType="none"/></fill>' +
  '<fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FF0C5C36"/><bgColor indexed="64"/></patternFill></fill></fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"/>' +
  '<xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>' +
  '</styleSheet>';

const instructions: SpreadsheetRow[] = [
  ['Step', 'Instruction'],
  ['1', 'Use the Products worksheet for uploads. Keep the exact column headings in row 1.'],
  ['2', 'Upload at most 100 products in each file. Downloaded exports may contain up to 500 rows; split these before re-import.'],
  ['3', 'Required: title, price_ngn, stock, category and description.'],
  ['4', 'Use NGN (naira) prices, e.g. 15000 or 15000.50. Stock must be a whole number from 0 to 1000000.'],
  ['5', 'Select a category code from the Categories worksheet.'],
  ['6', 'Product image_url is optional and should be a publicly accessible HTTPS URL.'],
  ['7', 'compare_at_ngn is optional and must exceed price_ngn.'],
  ['8', 'Imported listings remain drafts until the seller submits them for admin moderation.'],
  ['9', 'Exporting your catalog makes a copy; re-importing does not overwrite or update existing listings.'],
  ['10', 'Files downloaded from your account must be stored securely.'],
];

const sample: BulkProduct[] = [
  { name:'TEST - Wireless Gaming Controller', priceNaira:24900, stock:15, category:'tech', brand:'DemoGear', description:'Sample Bluetooth-style game controller for PC and Android. Test listing only.', imageUrl:'',compareAtNaira:29900 },
  { name:'TEST - RGB Gaming Mouse', priceNaira:17900, stock:22, category:'tech', brand:'DemoGear', description:'Sample wired RGB optical gaming mouse with adjustable sensitivity. Test listing only.', imageUrl:'',compareAtNaira:21900 },
  { name:'TEST - Mechanical Gaming Keyboard', priceNaira:46500, stock:9, category:'tech', brand:'DemoGear', description:'Sample compact mechanical keyboard with backlit keys and USB connection. Test listing only.', imageUrl:'',compareAtNaira:52500 },
  { name:'TEST - Over-Ear Gaming Headset', priceNaira:38900, stock:12, category:'tech', brand:'DemoGear', description:'Sample over-ear gaming headset with adjustable microphone. Test listing only.', imageUrl:'',compareAtNaira:44900 },
  { name:'TEST - Controller Charging Dock', priceNaira:15900, stock:18, category:'tech', brand:'DemoGear', description:'Sample dual-controller charging stand for a gaming setup. Test listing only.', imageUrl:'',compareAtNaira:19500 },
  { name:'TEST - Extended RGB Mouse Pad', priceNaira:12900, stock:26, category:'tech', brand:'DemoGear', description:'Sample large RGB desk mouse pad for keyboard and mouse. Test listing only.', imageUrl:'',compareAtNaira:15900 },
  { name:'TEST - Mobile Game Trigger Buttons', priceNaira:7500, stock:30, category:'tech', brand:'DemoGear', description:'Sample clip-on trigger buttons for mobile gaming. Test listing only.', imageUrl:'',compareAtNaira:9000 },
  { name:'TEST - Console Travel Carrying Case', priceNaira:19900, stock:14, category:'tech', brand:'DemoGear', description:'Sample protective carrying case for handheld gaming accessories. Test listing only.', imageUrl:'',compareAtNaira:24500 },
  { name:'TEST - USB Game Capture Card', priceNaira:58500, stock:7, category:'tech', brand:'DemoGear', description:'Sample USB HDMI capture card for recording gameplay. Test listing only.', imageUrl:'',compareAtNaira:64900 },
  { name:'TEST - Laptop Gaming Cooling Pad', priceNaira:29500, stock:11, category:'tech', brand:'DemoGear', description:'Sample ventilated cooling stand for gaming laptops. Test listing only.', imageUrl:'',compareAtNaira:34900 },
];

function productRow(p: BulkProduct): SpreadsheetRow {
  return [p.name, p.priceNaira, p.stock, p.category, p.brand,
    p.description, p.imageUrl, p.compareAtNaira ?? ''];
}

function crc32(input: Uint8Array): number {
  let c = 0xFFFFFFFF;
  for (const b of input) {
    c ^= b;
    for (let k=0; k<8; k++) c = c & 1 ? (c >>> 1) ^ 0xEDB88320 : c >>> 1;
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function zipStored(files: Record<string, string>): Blob {
  const parts: Uint8Array[] = [];
  const directory: Uint8Array[] = [];
  let offset = 0;
  let count = 0;
  const write16 = (view: DataView, at: number, value: number) => view.setUint16(at, value, true);
  const write32 = (view: DataView, at: number, value: number) => view.setUint32(at, value >>> 0, true);
  for (const [name, value] of Object.entries(files)) {
    const filename = bytes(name);
    const data = bytes(value);
    const checksum = crc32(data);
    const local = new Uint8Array(30);
    const header = new DataView(local.buffer);
    write32(header, 0, 0x04034b50); write16(header, 4, 20);
    write32(header, 14, checksum); write32(header, 18, data.length); write32(header, 22, data.length);
    write16(header, 26, filename.length);
    parts.push(local, filename, data);
    const central = new Uint8Array(46);
    const centralView = new DataView(central.buffer);
    write32(centralView, 0, 0x02014b50); write16(centralView, 4, 20); write16(centralView, 6, 20);
    write32(centralView, 16, checksum); write32(centralView, 20, data.length); write32(centralView, 24, data.length);
    write16(centralView, 28, filename.length); write32(centralView, 42, offset);
    directory.push(central, filename);
    offset += local.length + filename.length + data.length;
    count++;
  }
  const centralLength = directory.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  write32(endView, 0, 0x06054b50); write16(endView, 8, count); write16(endView, 10, count);
  write32(endView, 12, centralLength); write32(endView, 16, offset);
  return new Blob([...parts.map(x => Uint8Array.from(x)), ...directory.map(x => Uint8Array.from(x)), end],
    {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}

export function buildSellerWorkbook(products: BulkProduct[]): Blob {
  if (products.length > MAX_EXPORT_ROWS) throw new Error('Maximum 500 products per Excel export.');
  const list: SpreadsheetRow[] = [BULK_HEADERS, ...products.map(productRow)];
  const categoriesRows: SpreadsheetRow[] = [['category', 'name'], ...categories.map(c => [c.id, c.name])];
  const sheets = [
    sheetXml(list, [38,17,13,18,20,55,46,21]),
    sheetXml(instructions, [12,100]),
    sheetXml(categoriesRows, [22,35]),
  ];
  const types = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    sheets.map((_,i) => '<Override PartName="/xl/worksheets/sheet' + (i+1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('') +
    '</Types>';
  const rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
  const sheetDeclarations = ['Products','Instructions','Categories'].map((name, index) =>
    '<sheet name="' + name + '" sheetId="' + (index + 1) + '" r:id="rId' + (index+1) + '"/>').join('');
  const workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets>' + sheetDeclarations + '</sheets></workbook>';
  const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    sheets.map((_, index) =>
      '<Relationship Id="rId' + (index + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (index + 1) + '.xml"/>').join('') +
    '<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
  return zipStored({
    '[Content_Types].xml': types,
    '_rels/.rels': rootRels,
    'xl/workbook.xml': workbook,
    'xl/_rels/workbook.xml.rels': rels,
    'xl/styles.xml': XLSX_STYLES,
    ...Object.fromEntries(sheets.map((content,i) => ['xl/worksheets/sheet' + (i+1) + '.xml',content])),
  });
}

export function sellerWorkbookFromListings(listings: SellerProductItem[]): Blob {
  return buildSellerWorkbook(listings.map(p=>({
    name:p.name,
    priceNaira:p.priceMinor/100,
    stock:p.stock,
    category:p.category,
    brand:p.brand,
    description:p.description,
    imageUrl:p.imageUrl,
    ...(p.compareAtMinor > p.priceMinor ? {compareAtNaira:p.compareAtMinor/100} : {}),
  })));
}

export function sampleGamingProducts(): BulkProduct[] {
  return sample.map(row=>({...row}));
}

export function downloadExcel(file: Blob, name: string): void {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Release after the browser has initiated the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}
