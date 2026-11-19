import { categories } from './data';
import type { SellerProductItem } from '../types';

export type BulkProduct = {
  name: string;
  priceNaira: number;
  stock: number;
  category: string;
  brand: string;
  description: string;
  imageUrl: string;
  compareAtNaira?: number;
};

export type BulkImportRow = {
  line: number;
  id: string;
  titlePreview: string;
  product: BulkProduct | null;
  errors: string[];
  status: 'ready' | 'imported' | 'failed';
  serverError?: string;
};

export const BULK_HEADERS = [
  'title', 'price_ngn', 'stock', 'category', 'brand',
  'description', 'image_url', 'compare_at_ngn',
];
export const BULK_MAX_ROWS = 100;
export const BULK_MAX_BYTES = 8 * 1024 * 1024;

const bytesToText = (bytes: Uint8Array) => new TextDecoder('utf-8').decode(bytes);

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { current += '"'; i++; }
      else if (!quoted && !current.trim()) quoted = true;
      else if (quoted) quoted = false;
      else throw new Error('Invalid CSV quoting near character ' + (i + 1));
    } else if (quoted) {
      current += ch;
    } else if (ch === ',') {
      cells.push(current.trim()); current = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      cells.push(current.trim());
      if (cells.some(Boolean)) rows.push(cells);
      if (rows.length > BULK_MAX_ROWS + 1) throw new Error('Maximum 100 products per file.');
      cells = []; current = '';
    } else {
      current += ch;
    }
  }
  if (quoted) throw new Error('Unclosed quote in CSV file.');
  cells.push(current.trim());
  if (cells.some(Boolean)) rows.push(cells);
  return rows;
}

function parseXml(content: string): Document {
  const doc = new DOMParser().parseFromString(content, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('Invalid Excel worksheet XML.');
  return doc;
}

function xmlNodes(element: Document | Element, name: string): Element[] {
  return Array.from(element.getElementsByTagNameNS('*', name));
}

function columnIndex(reference: string): number {
  const letters = (/^[A-Z]+/i.exec(reference) || [''])[0].toUpperCase();
  let index = 0;
  for (const letter of letters) index = index * 26 + letter.charCodeAt(0) - 64;
  return index - 1;
}

// Read the ZIP central directory instead of local header lengths: XLSX files
// created by Excel commonly use ZIP data descriptors.
async function readXlsx(file: File): Promise<string[][]> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Your browser cannot open XLSX files. Save as CSV in Excel and upload again.');
  }
  const raw = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(raw.buffer);
  const u16 = (n: number) => view.getUint16(n, true);
  const u32 = (n: number) => view.getUint32(n, true);
  let end = -1;
  for (let i = raw.length - 22; i >= Math.max(0, raw.length - 65557); i--) {
    if (u32(i) === 0x06054b50) { end = i; break; }
  }
  if (end < 0) throw new Error('Not a valid .xlsx workbook.');
  const count = u16(end + 10);
  const centralOffset = u32(end + 16);
  if (count > 250 || count === 0 || centralOffset > raw.length) {
    throw new Error('Excel file is too large or uses an unsupported ZIP format.');
  }
  type Entry = { method: number; size: number; plainSize: number; offset: number };
  const entries = new Map<string, Entry>();
  let cursor = centralOffset;
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > raw.length || u32(cursor) !== 0x02014b50) {
      throw new Error('Malformed XLSX ZIP directory.');
    }
    const method = u16(cursor + 10);
    const size = u32(cursor + 20);
    const plainSize = u32(cursor + 24);
    const nameLength = u16(cursor + 28);
    const extraLength = u16(cursor + 30);
    const commentLength = u16(cursor + 32);
    const offset = u32(cursor + 42);
    const limit = cursor + 46 + nameLength + extraLength + commentLength;
    if (limit > raw.length || plainSize > 8 * 1024 * 1024) {
      throw new Error('XLSX contains an oversized worksheet.');
    }
    const name = bytesToText(raw.subarray(cursor + 46, cursor + 46 + nameLength));
    entries.set(name, { method, size, plainSize, offset });
    cursor = limit;
  }
  async function entryText(path: string, required = true): Promise<string> {
    const e = entries.get(path);
    if (!e) {
      if (!required) return '';
      throw new Error('Excel workbook is missing ' + path);
    }
    if (e.offset + 30 > raw.length || u32(e.offset) !== 0x04034b50) {
      throw new Error('Invalid Excel file entry.');
    }
    const start = e.offset + 30 + u16(e.offset + 26) + u16(e.offset + 28);
    if (start + e.size > raw.length) throw new Error('Truncated Excel file.');
    const compressed = raw.subarray(start, start + e.size);
    if (e.method === 0) return bytesToText(compressed);
    if (e.method !== 8) throw new Error('Unsupported Excel compression.');
    const stream = new Blob([Uint8Array.from(compressed)]).stream()
      .pipeThrough(new DecompressionStream('deflate-raw'));
    const reader = stream.getReader();
    const parts: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > 8 * 1024 * 1024) {
        await reader.cancel();
        throw new Error('Decompressed worksheet is too large.');
      }
      parts.push(value);
    }
    if (total !== e.plainSize) throw new Error('Corrupt XLSX worksheet.');
    const combined = new Uint8Array(total);
    let pos = 0;
    for (const part of parts) { combined.set(part, pos); pos += part.length; }
    return bytesToText(combined);
  }
  const workbook = parseXml(await entryText('xl/workbook.xml'));
  const firstSheet = xmlNodes(workbook, 'sheet')[0];
  if (!firstSheet) throw new Error('Excel workbook contains no worksheets.');
  const relationId = firstSheet.getAttribute('r:id') ||
    firstSheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
  let sheetPath = 'xl/worksheets/sheet1.xml';
  if (relationId) {
    const rels = parseXml(await entryText('xl/_rels/workbook.xml.rels'));
    const relationship = xmlNodes(rels, 'Relationship').find(x => x.getAttribute('Id') === relationId);
    if (relationship) {
      const target = relationship.getAttribute('Target') || '';
      const segments = (target.startsWith('/') ? target.slice(1) : 'xl/' + target).split('/');
      const resolved: string[] = [];
      for (const part of segments) {
        if (part === '..') resolved.pop();
        else if (part && part !== '.') resolved.push(part);
      }
      sheetPath = resolved.join('/');
    }
  }
  const strings: string[] = [];
  const sharedXml = await entryText('xl/sharedStrings.xml', false);
  if (sharedXml) {
    const shared = parseXml(sharedXml);
    for (const item of xmlNodes(shared, 'si')) {
      strings.push(xmlNodes(item, 't').map(x => x.textContent || '').join(''));
    }
  }
  const sheet = parseXml(await entryText(sheetPath));
  const rows: string[][] = [];
  for (const row of xmlNodes(sheet, 'row')) {
    const cells: string[] = [];
    for (const cell of Array.from(row.children).filter(x => x.localName === 'c')) {
      const index = columnIndex(cell.getAttribute('r') || '');
      if (index < 0 || index >= 32) continue;
      const type = cell.getAttribute('t') || '';
      const rawValue = xmlNodes(cell, 'v')[0]?.textContent || '';
      let value = type === 's' ? strings[Number(rawValue)] || '' :
        type === 'inlineStr' ? xmlNodes(cell, 't').map(x => x.textContent || '').join('') :
        rawValue;
      if (!value && xmlNodes(cell, 'f').length) {
        throw new Error('Excel formulas require cached values. Paste values and save the workbook first.');
      }
      cells[index] = value.trim();
    }
    if (cells.some(Boolean)) {
      rows.push(cells);
      if (rows.length > BULK_MAX_ROWS + 1) throw new Error('Maximum 100 products per file.');
    }
  }
  return rows;
}

const aliases: Record<string, string[]> = {
  title: ['title', 'name', 'product_name', 'product_title'],
  price_ngn: ['price_ngn', 'price_naira', 'price', 'selling_price'],
  stock: ['stock', 'quantity', 'inventory'],
  category: ['category', 'product_category'],
  brand: ['brand', 'manufacturer'],
  description: ['description', 'details', 'product_description'],
  image_url: ['image_url', 'image', 'photo_url', 'product_image'],
  compare_at_ngn: ['compare_at_ngn', 'compare_at_price', 'original_price'],
};

const normalized = (input: string) => input.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

export async function parseSellerSpreadsheet(
  file: File,
  existing: SellerProductItem[],
  sellerName: string,
): Promise<BulkImportRow[]> {
  if (!/\.(csv|xlsx)$/i.test(file.name)) throw new Error('Select an Excel .xlsx or CSV .csv file.');
  if (file.size > BULK_MAX_BYTES || file.size === 0) throw new Error('The file must be between 1 byte and 8 MB.');
  const records = /\.xlsx$/i.test(file.name)
    ? await readXlsx(file)
    : parseCsv((await file.text()).replace(/^\uFEFF/, ''));
  if (records.length < 2) throw new Error('The spreadsheet must contain headers and at least one product.');
  const headers = records[0].map(x => normalized(x || ''));
  const positions = Object.fromEntries(Object.entries(aliases).map(([field, names]) =>
    [field, headers.findIndex(x => names.includes(x))])) as Record<string, number>;
  const missing = ['title', 'price_ngn', 'stock', 'category', 'description'].filter(k => positions[k] < 0);
  if (missing.length) throw new Error('Missing required columns: ' + missing.join(', '));
  if (records.length - 1 > BULK_MAX_ROWS) throw new Error('Maximum 100 products per file.');
  const known = new Set(existing.map(p => normalized(p.name) + '::' + normalized(p.brand)));
  const seen = new Set<string>();
  return records.slice(1).map((cells, index) => {
    const get = (field: string) => (positions[field] < 0 ? '' : String(cells[positions[field]] || '')).trim();
    const errors: string[] = [];
    const name = get('title');
    const brand = get('brand') || sellerName || 'Verified Seller';
    const priceRaw = get('price_ngn');
    const stockRaw = get('stock');
    const compareRaw = get('compare_at_ngn');
    const desc = get('description');
    const image = get('image_url');
    const inputCategory = get('category').toLowerCase();
    const foundCategory = categories.find(c =>
      [c.id, c.name.toLowerCase(), c.slug].includes(inputCategory));
    const moneyValid = (v: string) => /^\d{1,8}(?:\.\d{1,2})?$/.test(v) &&
      Number(v) > 0 && Number(v) <= 10000000;
    if (!name || name.length > 160) errors.push('Title required (maximum 160 characters)');
    if (!moneyValid(priceRaw)) errors.push('Price must be between ₦0.01 and ₦10,000,000');
    if (!/^\d+$/.test(stockRaw) || Number(stockRaw) > 1000000) errors.push('Stock must be a whole number from 0 to 1,000,000');
    if (!foundCategory) errors.push('Unknown category');
    if (!desc || desc.length > 2000) errors.push('Description required (maximum 2,000 characters)');
    if (brand.length > 100) errors.push('Brand exceeds 100 characters');
    if (compareRaw && (!moneyValid(compareRaw) || Number(compareRaw) <= Number(priceRaw))) {
      errors.push('Compare-at price must be greater than selling price');
    }
    if (image && (image.length > 1000 || !/^https:\/\/[a-z\d.-]+(?:\/|$)/i.test(image))) {
      errors.push('Photo URL must be a valid HTTPS address');
    }
    const duplicateKey = normalized(name) + '::' + normalized(brand);
    if (seen.has(duplicateKey)) errors.push('Duplicate in this file');
    if (known.has(duplicateKey)) errors.push('Already in your recent product listings');
    seen.add(duplicateKey);
    return {
      line: index + 2,
      id: crypto.randomUUID(),
      titlePreview: name || '(blank title)',
      product: errors.length ? null : {
        name, priceNaira: Number(priceRaw), stock: Number(stockRaw),
        category: foundCategory!.id, brand, description: desc, imageUrl: image,
        ...(compareRaw ? { compareAtNaira: Number(compareRaw) } : {}),
      },
      errors,
      status: 'ready' as const,
    };
  });
}
