import React, { useRef, useState } from 'react';
import { FileSpreadsheet, Download, Upload, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { BULK_MAX_ROWS, parseSellerSpreadsheet, type BulkImportRow } from '../../../lib/seller-spreadsheet';
import { buildSellerWorkbook, downloadExcel } from '../../../lib/seller-spreadsheet-export';
import type { SellerProductItem } from '../../../types';

type Props = {
  sellerName: string;
  existingProducts: SellerProductItem[];
  onClose: () => void;
  onImported: () => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
};

export default function SellerBulkImport({ sellerName, existingProducts, onClose, onImported, showToast }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<BulkImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState('');
  const good = rows.filter(row => row.product && row.status !== 'imported');
  const bad = rows.filter(row => row.errors.length > 0);
  const completed = rows.filter(row => row.status === 'imported').length;

  const downloadTemplate = () => {
    downloadExcel(buildSellerWorkbook([]), 'cashncarry-seller-products-template.xlsx');
  };

  const downloadUploadedFile = () => {
    if (selectedFile) downloadExcel(selectedFile, selectedFile.name);
  };

  const readFile = async (file?: File) => {
    if (!file) return;
    setReading(true);
    setRows([]);
    setFileName(file.name);
    setSelectedFile(file);
    setNotice('');
    try {
      const parsed = await parseSellerSpreadsheet(file, existingProducts, sellerName);
      setRows(parsed);
      if (parsed.some(row => row.errors.length)) {
        setNotice('Fix invalid spreadsheet rows and upload the corrected file. Only validated rows can be imported.');
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to read the spreadsheet.');
    } finally {
      setReading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const importDrafts = async () => {
    if (importing || reading || good.length === 0) return;
    setImporting(true);
    setNotice('');
    let success = 0;
    let failure = 0;
    // Sequential writes keep Cloudflare D1 load bounded and make row-level
    // failures explicit. UUIDs remain stable for retries within this preview.
    try {
      for (const row of good) {
        if (!row.product) continue;
        try {
          const response = await api.mutateSellerProduct({
            action: 'create', id: row.id, ...row.product,
          });
          if (response.ok) {
            success++;
            setRows(previous => previous.map(x =>
              x.id === row.id ? { ...x, status: 'imported', serverError: undefined } : x));
          } else {
            failure++;
            const message = response.error || 'Could not create this product.';
            setRows(previous => previous.map(x =>
              x.id === row.id ? { ...x, status: 'failed', serverError: message } : x));
          }
        } catch {
          failure++;
          setRows(previous => previous.map(x =>
            x.id === row.id ? { ...x, status: 'failed', serverError: 'Network error. Check the listing before retrying.' } : x));
        }
      }
    } finally {
      setImporting(false);
      await onImported();
    }
    if (success) showToast(success + ' products saved as drafts for admin review.', 'success');
    if (failure) {
      setNotice(failure + ' rows failed. Check their messages and retry only those rows. If a request timed out, first check your product listings to avoid duplicates.');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6">
      <div role="dialog" aria-modal="true" aria-labelledby="bulk-import-title"
        className="flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex shrink-0 items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <h2 id="bulk-import-title" className="flex items-center gap-2 text-lg font-black text-slate-900">
              <FileSpreadsheet size={20} className="text-emerald-700" /> Bulk import products
            </h2>
            <p className="mt-1 text-xs text-slate-500">Upload Excel (.xlsx) or CSV — maximum {BULK_MAX_ROWS} products per file.</p>
          </div>
          <button type="button" disabled={importing || reading} onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50" aria-label="Close bulk import">
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={downloadTemplate}
              className="flex items-center justify-center gap-2 rounded-xl border border-emerald-700 px-4 py-3 text-xs font-bold text-emerald-800 hover:bg-emerald-50">
              <Download size={17} /> Download blank Excel template
            </button>
            <label className={'flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0c5c36] px-4 py-3 text-xs font-bold text-white hover:bg-emerald-900 ' +
              (importing || reading ? 'pointer-events-none opacity-50' : '')}>
              <Upload size={17} /> {reading ? 'Reading file...' : 'Upload Excel / CSV'}
              <input ref={fileInput} type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only" disabled={importing || reading}
                onChange={event => void readFile(event.currentTarget.files?.[0])} />
            </label>
          </div>
          {selectedFile && (
            <button type="button" onClick={downloadUploadedFile} disabled={importing}
              className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800 underline underline-offset-4 disabled:opacity-50">
              <Download size={15} /> Download uploaded file: {fileName}
            </button>
          )}
          <p className="text-xs text-slate-600">
            Required columns: <strong>title, price_ngn, stock, category, description</strong>.
            Optional: brand, image_url, compare_at_ngn. Prices are in naira, not kobo.
            Use one of the existing shop categories, and a public HTTPS link for an optional product image.
          </p>
          <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
            Products are saved as <strong>drafts</strong>, never automatically published.
            Sellers must submit them for review before they can appear in the shop.
            The spreadsheet stays in your browser; only validated product details are submitted. You can download your original file again while this window is open.
          </p>

          {notice && <p role="alert" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertCircle size={16} className="shrink-0" /> {notice}
          </p>}
          {rows.length > 0 && (
            <section aria-label="Import preview">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="rounded-full bg-slate-100 px-3 py-1">{fileName}</span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">{good.length} ready/retry</span>
                {completed > 0 && <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-800">{completed} imported</span>}
                {bad.length > 0 && <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-700">{bad.length} invalid</span>}
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-[700px] w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="p-3">Excel row</th><th className="p-3">Product title</th>
                      <th className="p-3">Price</th><th className="p-3">Stock</th>
                      <th className="p-3">Category</th><th className="p-3">Validation / result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map(row => (
                      <tr key={row.id}>
                        <td className="p-3 font-mono">{row.line}</td>
                        <td className="max-w-52 truncate p-3 font-semibold">{row.titlePreview}</td>
                        <td className="p-3">{row.product ? '₦' + row.product.priceNaira.toLocaleString('en-NG') : '—'}</td>
                        <td className="p-3">{row.product?.stock ?? '—'}</td>
                        <td className="p-3 capitalize">{row.product?.category || '—'}</td>
                        <td className="max-w-72 p-3">
                          {row.errors.length ? <span className="text-rose-700">{row.errors.join('; ')}</span>
                            : row.status === 'imported' ? <span className="inline-flex items-center gap-1 font-bold text-emerald-700"><CheckCircle2 size={14} /> Draft created</span>
                              : row.status === 'failed' ? <span className="text-rose-700">{row.serverError}</span>
                                : <span className="font-bold text-emerald-700">Valid</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
          <p className="text-xs text-slate-500">Only approved sellers can import. Invalid rows are never saved.</p>
          <button type="button" onClick={() => void importDrafts()} disabled={importing || reading || good.length === 0}
            className="rounded-xl bg-[#0c5c36] px-5 py-3 text-xs font-black text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50">
            {importing ? 'Importing drafts... ' + completed + ' completed' : 'Import ' + good.length + ' valid products as drafts'}
          </button>
        </footer>
      </div>
    </div>
  );
}
