import React, { useEffect, useRef, useState } from 'react';
import { Download, FileSpreadsheet, X } from 'lucide-react';
import { api } from '../../../lib/api';
import { categories } from '../../../lib/data';
import { MAX_IMPORT_ROWS, MAX_WORKBOOK_BYTES, parseProductRows, workbookDraftId, type WorkbookRow } from '../../../lib/sellerProductWorkbook';
import { sellerProductTemplate } from '../../../lib/sellerProductTemplate';

const fieldStyle = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 px-4 py-2 text-sm font-bold text-emerald-950 hover:bg-emerald-50';

interface Props {
  sellerId: string;
  storeName: string;
  onRefresh: () => Promise<void>;
  onClose: () => void;
}

type Preview = { hash: string; filename: string; rows: WorkbookRow[] };
type SaveResult = { id: string; row: number; error?: string };

export default function ProductWorkbookImport({ sellerId, storeName, onRefresh, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const mounted = useRef(false);
  const [preview, setPreview] = useState<Preview>();
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [outcomes, setOutcomes] = useState<SaveResult[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    mounted.current = true;
    const panel = dialog.current;
    panel?.showModal();
    return () => {
      mounted.current = false;
      panel?.close();
    };
  }, []);

  const chooseWorkbook = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPreview(undefined);
    setOutcomes([]);
    setError('');
    if (!file.name.toLowerCase().endsWith('.xlsx') || file.size > MAX_WORKBOOK_BYTES) {
      setError('Choose an Excel .xlsx file up to 2 MB.');
      return;
    }
    setReading(true);
    try {
      const bytes = await file.arrayBuffer();
      const { default: readWorkbook } = await import('read-excel-file/browser');
      const [rows, digest] = await Promise.all([readWorkbook(bytes), crypto.subtle.digest('SHA-256', bytes)]);
      const hash = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
      try {
        setPreview({ hash, filename: file.name, rows: parseProductRows(rows, storeName) });
      } catch (validationError) {
        setError(validationError instanceof Error ? validationError.message : 'Check the worksheet columns and try again.');
      }
    } catch {
      setError('This workbook could not be read. Open it in Excel and save it as a new .xlsx file.');
    } finally {
      setReading(false);
    }
  };

  const hasInvalidRows = preview?.rows.some(row => !row.product);
  const savedRows = new Set(outcomes.filter(entry => !entry.error).map(entry => entry.row));
  const savedCount = savedRows.size;

  const saveDrafts = async () => {
    if (!preview || hasInvalidRows || saving) return;
    setSaving(true);
    setError('');
    setProgress(savedCount);
    const results = outcomes.filter(entry => !entry.error);
    try {
      for (const row of preview.rows) {
        if (!mounted.current) return;
        if (!row.product || savedRows.has(row.number)) continue;
        const id = await workbookDraftId(sellerId, preview.hash, row.number);
        if (!mounted.current) return;
        const response = await api.mutateSellerProduct({ action: 'create', id, ...row.product });
        results.push({ id, row: row.number, error: response.ok ? undefined : response.error || 'Could not save draft' });
        setProgress(results.length);
        if (response.status === 401 || response.status === 403 || response.status === 429) break;
      }
      // A timeout or duplicate request can mean the draft was already saved.
      if (results.some(result => result.error)) {
        const inventory = await api.getSellerProducts();
        if (inventory.ok) {
          const existing = new Set(inventory.data?.items?.map(item => item.id));
          for (const result of results) if (existing.has(result.id)) delete result.error;
        }
      }
      if (!mounted.current) return;
      setOutcomes(results);
      await onRefresh();
    } catch {
      setOutcomes(results);
      setError('The import was interrupted. Reopen the same workbook to check or retry the remaining rows.');
    } finally {
      setSaving(false);
    }
  };

  const busy = reading || saving;

  return (
    <dialog ref={dialog} aria-labelledby="workbook-import-title"
      onCancel={event => { event.preventDefault(); if (!saving) onClose(); }}
      className="m-auto max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-2xl overflow-y-auto rounded-3xl border border-emerald-100 bg-white p-0 shadow-2xl backdrop:bg-slate-950/65">
      <div className="flex items-start justify-between gap-3 border-b border-emerald-100 bg-emerald-50 p-5">
        <div>
          <h2 id="workbook-import-title" className="flex items-center gap-2 text-lg font-black text-emerald-950">
            <FileSpreadsheet size={21} aria-hidden="true" /> Import products from Excel
          </h2>
          <p className="mt-1 text-sm text-emerald-950">Review the first worksheet before saving its products as drafts.</p>
        </div>
        <button type="button" onClick={onClose} disabled={saving} aria-label="Close Excel import"
          className="grid size-11 shrink-0 place-items-center rounded-xl text-emerald-950 hover:bg-emerald-100 disabled:opacity-50">
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <div className="space-y-4 p-5">
        <a className={fieldStyle} href={sellerProductTemplate} download="cash-n-carry-product-template.xlsx">
          <Download size={17} aria-hidden="true" /> Download Excel template
        </a>
        <div className="space-y-1 text-sm text-slate-700">
          <p>Use one row per product. Name, Price NGN, Stock and Category are required.</p>
          <p>Categories include {categories.map(category => category.name).join(', ')}.</p>
          <p>You can add HTTPS image links in the sheet or upload photos after importing.</p>
        </div>
        <label className="block text-sm font-bold text-slate-900" htmlFor="seller-product-workbook">Excel workbook (.xlsx)</label>
        <input id="seller-product-workbook" type="file" accept=".xlsx" onChange={event => void chooseWorkbook(event)} disabled={busy}
          aria-describedby="workbook-limit"
          className="block w-full rounded-xl border border-slate-200 p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-3 file:py-2 file:font-bold" />
        <p id="workbook-limit" className="text-xs text-slate-600">Up to {MAX_IMPORT_ROWS} products and 2 MB per workbook.</p>
        {reading && <p role="status">Reading workbook…</p>}
        {error && <p role="alert" className="text-sm font-bold text-rose-800">{error}</p>}
        {preview && (
          <>
            <p className="break-words text-sm font-bold text-slate-900">{preview.filename} · {preview.rows.length} products</p>
            <div className="max-h-64 overflow-auto rounded-xl border border-slate-200" role="region" aria-label="Excel product preview" tabIndex={0}>
              <table className="w-full text-left text-sm">
                <thead className="bg-emerald-50 text-emerald-950"><tr>
                  <th scope="col" className="p-2">Row</th><th scope="col" className="p-2">Product</th>
                  <th scope="col" className="p-2">Price (NGN)</th><th scope="col" className="p-2">Stock</th>
                  <th scope="col" className="p-2">Status</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.rows.map(row => {
                    const issue = outcomes.find(entry => entry.row === row.number)?.error;
                    return <tr key={row.number}>
                      <td className="p-2">{row.number}</td>
                      <td className="max-w-36 break-words p-2">{row.name || 'Unnamed product'}</td>
                      <td className="p-2">{row.product?.priceNaira.toLocaleString('en-NG') ?? '—'}</td>
                      <td className="p-2">{row.product?.stock ?? '—'}</td>
                      <td className={row.errors.length || issue ? 'p-2 text-rose-800' : 'p-2 text-emerald-800'}>
                        {row.errors.join('; ') || issue || (savedRows.has(row.number) ? 'Draft saved' : 'Ready')}
                      </td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
            {hasInvalidRows && <p className="text-sm font-bold text-rose-800">Correct the highlighted rows in Excel, then choose the corrected workbook.</p>}
            {saving && <p role="status" className="text-sm">Saving drafts… {progress} of {preview.rows.length} rows processed.</p>}
            {!saving && outcomes.length > 0 && <p role="status" className="text-sm">
              {savedCount} of {preview.rows.length} drafts saved. {savedCount < preview.rows.length
                ? 'You can retry the remaining rows.' : 'Submit the drafts for review from your inventory.'}
            </p>}
            <button type="button" onClick={() => void saveDrafts()} disabled={busy || hasInvalidRows || savedCount === preview.rows.length}
              className="min-h-11 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-950 disabled:opacity-50">
              {outcomes.length ? 'Retry remaining rows' : `Save ${preview.rows.length} drafts`}
            </button>
          </>
        )}
      </div>
    </dialog>
  );
}
