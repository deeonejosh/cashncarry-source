import DepthArtwork from '../../ui/DepthArtwork';
import React, { useState } from 'react';
import { useStore } from '../../../context/StoreContext';
import { SellerProductItem } from '../../../types';
import { categories } from '../../../lib/data';
import ProductPhotoField from './ProductPhotoField';
import SellerBulkImport from './SellerBulkImport';
import { buildSellerWorkbook, downloadExcel, sellerWorkbookFromListings } from '../../../lib/seller-spreadsheet-export';
import { Package, Plus, Edit, Archive, CheckCircle2, Clock, Send, EyeOff, X, FileSpreadsheet, Download, Upload } from 'lucide-react';

export default function SellerProductsPage() {
  const {
    sellerStore,
    sellerProducts,
    refreshSellerData,
    createSellerProduct,
    updateSellerProduct,
    submitSellerProductForReview,
    unpublishSellerProduct,
    archiveSellerProduct,
    showToast,
  } = useStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('bulkImport') === '1';
  });
  const closeBulkImport = () => {
    setShowBulkImport(false);
    const url = new URL(window.location.href);
    if (url.searchParams.has('bulkImport')) {
      url.searchParams.delete('bulkImport');
      window.history.replaceState(window.history.state, '', url.pathname + url.search);
    }
  };
  const [editingProduct, setEditingProduct] = useState<SellerProductItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [actionProductId, setActionProductId] = useState<string | null>(null);

  const downloadTemplate = () => downloadExcel(buildSellerWorkbook([]), 'cashncarry-seller-products-template.xlsx');

  const exportProducts = () => {
    if (!sellerProducts.length) {
      showToast('No products to export. Download the Excel template to get started.', 'info');
      return;
    }
    try {
      const date = new Date().toISOString().slice(0, 10);
      downloadExcel(sellerWorkbookFromListings(sellerProducts), 'cashncarry-my-products-' + date + '.xlsx');
    } catch {
      showToast('Could not generate the product export.', 'error');
    }
  };

  // Create form states
  const [name, setName] = useState('');
  const [brand, setBrand] = useState(sellerStore?.name || '');
  const [priceNaira, setPriceNaira] = useState<number>(0);
  const [compareAtNaira, setCompareAtNaira] = useState<number>(0);
  const [stock, setStock] = useState<number>(1);
  const [category, setCategory] = useState('fashion');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Edit form states
  const [editName, setEditName] = useState('');
  const [editPriceNaira, setEditPriceNaira] = useState<number>(0);
  const [editStock, setEditStock] = useState<number>(1);
  const [editDescription, setEditDescription] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');

  const runProductAction = async (
    productId: string,
    action: () => Promise<{ ok: boolean; error?: string }>,
  ) => {
    if (actionProductId !== null) return;
    setActionProductId(productId);
    try {
      const result = await action();
      if (!result.ok) showToast(result.error || 'Could not complete product action.', 'error');
    } catch {
      showToast('Could not complete product action. Please try again.', 'error');
    } finally {
      setActionProductId(null);
    }
  };

  const handleOpenEdit = (prod: SellerProductItem) => {
    setEditingProduct(prod);
    setEditName(prod.name);
    setEditPriceNaira(prod.priceMinor / 100);
    setEditStock(prod.stock);
    setEditDescription(prod.description);
    setEditImageUrl(prod.imageUrl);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadingPhoto || submitting) return;
    if (!name.trim() || priceNaira <= 0 || stock < 0) {
      showToast('Enter a valid product name, positive price, and stock count.', 'error');
      return;
    }
    setSubmitting(true);
    const res = await createSellerProduct({
      name: name.trim(),
      brand: brand.trim() || sellerStore?.name || 'Verified Seller',
      priceNaira,
      compareAtNaira: compareAtNaira > priceNaira ? compareAtNaira : undefined,
      stock,
      category,
      description: description.trim(),
      imageUrl: imageUrl.trim(),
    });
    setSubmitting(false);
    if (res.ok) {
      setShowAddModal(false);
      setName('');
      setDescription('');
      setImageUrl('');
      setPriceNaira(0);
      setCompareAtNaira(0);
      setStock(1);
    } else {
      showToast(res.error || 'Could not create product.', 'error');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadingPhoto || submitting) return;
    if (!editingProduct) return;
    setSubmitting(true);
    const res = await updateSellerProduct({
      id: editingProduct.id,
      name: editName.trim(),
      priceNaira: editPriceNaira,
      stock: editStock,
      description: editDescription.trim(),
      imageUrl: editImageUrl.trim(),
    });
    setSubmitting(false);
    if (res.ok) {
      setEditingProduct(null);
    } else {
      showToast(res.error || 'Could not update product.', 'error');
    }
  };

  return (
    <div className="space-y-4 pb-16">
      <div className="cnc-workspace-hero cnc-seller-products-hero flex flex-col items-start justify-between gap-4 rounded-3xl p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="cnc-seller-products-art hidden md:block"><DepthArtwork icon={Package} /></div>
        <div>
          <h1 className="text-2xl font-black text-white sm:text-4xl">Products</h1>
          <p className="mt-1 max-w-xl text-sm text-emerald-100">
            Save a draft, then submit it for admin review. Approved listings appear in the shop.
          </p>
        </div>

        <button type="button" onClick={() => setShowAddModal(true)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-orange-200 px-4 py-2.5 text-xs font-black text-orange-950 hover:bg-orange-300">
          <Plus size={16} />
          <span>Add New Product</span>
        </button>
      </div>

      <section aria-label="Bulk product upload and download" className="rounded-2xl border-2 border-emerald-700 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-emerald-100 p-3 text-emerald-800"><FileSpreadsheet size={25} /></div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Bulk product upload</h2>
            <p className="text-sm text-slate-600">Upload up to 100 products in one Excel or CSV file. All new listings remain drafts until approved.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <button type="button" onClick={() => setShowBulkImport(true)}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0c5c36] px-4 py-3 text-sm font-black text-white hover:bg-emerald-900">
            <Upload size={18}/> Bulk Upload Excel
          </button>
          <button type="button" onClick={downloadTemplate}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-emerald-800 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-900 hover:bg-emerald-100">
            <FileSpreadsheet size={18}/> Download Excel Template
          </button>
          <button type="button" onClick={exportProducts}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-800 hover:bg-slate-50">
            <Download size={18}/> Export My Products
          </button>
        </div>
      </section>

      <div className="cnc-workspace-panel cnc-inventory-table overflow-x-auto rounded-2xl border" role="region" aria-label="Product inventory" tabIndex={0}>
        <table className="w-full min-w-[43rem] text-left text-sm">
          <thead className="border-b border-emerald-100 bg-emerald-50 text-xs font-extrabold tracking-wide text-emerald-950">
            <tr>
              <th scope="col" className="py-3 px-4">Product</th>
              <th scope="col" className="py-3 px-4">Price (NGN)</th>
              <th scope="col" className="py-3 px-4">Stock</th>
              <th scope="col" className="py-3 px-4">Category</th>
              <th scope="col" className="py-3 px-4">Status</th>
              <th scope="col" className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sellerProducts.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  No products created yet. Click &quot;Add New Product&quot; to create your first listing.
                </td>
              </tr>
            ) : (
              sellerProducts.map((prod) => (
                <tr key={prod.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      {prod.imageUrl ? (
                        <img src={prod.imageUrl} alt={prod.name} className="h-12 w-12 rounded-xl object-cover border border-slate-100 shrink-0" />
                      ) : (
                        <div className="h-12 w-12 rounded-xl bg-slate-100 shrink-0" />
                      )}
                      <div>
                        <div className="font-bold text-slate-900 line-clamp-1">{prod.name}</div>
                        <div className="text-[10px] text-slate-400">{prod.brand}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    ₦{(prod.priceMinor / 100).toLocaleString('en-NG', { maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`font-bold ${prod.stock <= 3 ? 'text-rose-600' : 'text-slate-700'}`}>
                      {prod.stock} units
                    </span>
                  </td>
                  <td className="py-3.5 px-4 capitalize text-slate-600 font-semibold">{prod.category}</td>
                  <td className="py-3.5 px-4">
                    {prod.publication === 'published' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                        <CheckCircle2 size={11} /> Published
                      </span>
                    )}
                    {prod.publication === 'pending' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                        <Clock size={11} /> In Moderation
                      </span>
                    )}
                    {(prod.publication === 'draft' || prod.publication === 'rejected') && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 capitalize">
                        {prod.publication}
                      </span>
                    )}
                    {prod.publication === 'archived' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-700">
                        Archived
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {prod.publication === 'draft' && (
                        <button
                          onClick={() => void runProductAction(prod.id, () => submitSellerProductForReview(prod.id))}
                          disabled={actionProductId !== null}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#0c5c36] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-900"
                        >
                          <Send size={12} /> Submit for review
                        </button>
                      )}
                      {prod.publication === 'published' && (
                        <button
                          onClick={() => void runProductAction(prod.id, () => unpublishSellerProduct(prod.id))}
                          disabled={actionProductId !== null}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                        >
                          <EyeOff size={12} /> Unpublish
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEdit(prod)}
                        disabled={actionProductId !== null}
                        className="grid min-h-10 min-w-10 place-items-center rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        aria-label="Edit product" title="Edit product"
                      >
                        <Edit size={15} />
                      </button>
                      {prod.publication !== 'archived' && (
                        <button
                          onClick={() => void runProductAction(prod.id, () => archiveSellerProduct(prod.id))}
                          disabled={actionProductId !== null}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          aria-label="Archive product" title="Archive product"
                        >
                          <Archive size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showBulkImport && (
        <SellerBulkImport
          sellerName={sellerStore?.name || 'Verified Seller'}
          existingProducts={sellerProducts}
          onClose={closeBulkImport}
          onImported={refreshSellerData}
          showToast={showToast}
        />
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div
            className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <h3 className="text-base font-black text-slate-900">Create Product Listing</h3>
              <button onClick={() => setShowAddModal(false)}
                disabled={uploadingPhoto || submitting}>
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700">Product Title *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Enter exact product title"
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Price in Naira (₦) *</label>
                  <input
                    type="number"
                    min={0.01}
                    max={10000000}
                    step={0.01}
                    value={priceNaira || ''}
                    onChange={(e) => setPriceNaira(Number(e.target.value))}
                    required
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Compare-At Price (₦)</label>
                  <input
                    type="number"
                    min={0}
                    max={10000000}
                    step={0.01}
                    value={compareAtNaira || ''}
                    onChange={(e) => setCompareAtNaira(Number(e.target.value))}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Available Stock *</label>
                  <input
                    type="number"
                    min={0}
                    max={1000000}
                    value={stock}
                    onChange={(e) => setStock(Number(e.target.value))}
                    required
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label htmlFor="seller-product-category" className="font-bold text-slate-700">Category *</label>
                  <select
                    id="seller-product-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Brand</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Manufacturer or store brand"
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none"
                />
              </div>

              <ProductPhotoField value={imageUrl} onChange={setImageUrl} uploading={uploadingPhoto}
                onUploadingChange={setUploadingPhoto} disabled={submitting} />

              <div>
                <label className="font-bold text-slate-700">Description *</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed specifications, size, condition..."
                  className="mt-1 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-emerald-600"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || uploadingPhoto}
                className="w-full rounded-2xl bg-[#0c5c36] py-3.5 text-xs font-black text-white hover:bg-emerald-900 transition shadow-lg disabled:opacity-50"
              >
                {submitting ? 'Creating Draft...' : 'Save Product Draft'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-product-edit-title"
            className="flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 id="seller-product-edit-title" className="text-base font-black text-slate-900">Edit Product</h3>
              <button onClick={() => setEditingProduct(null)} aria-label="Close product editor"
                disabled={uploadingPhoto || submitting}>✕</button>
            </div>

            <form onSubmit={handleUpdate} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6 text-xs">
              {editingProduct.publication !== 'draft' && editingProduct.publication !== 'rejected' && (
                <p className="text-slate-600">Stock-only changes keep an approved product published. Changes to its title, price, photo or description require another admin review.</p>
              )}
              <div>
                <label className="font-bold text-slate-700">Product Title</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Price (₦)</label>
                  <input
                    type="number"
                    min={0.01}
                    max={10000000}
                    step={0.01}
                    required
                    value={editPriceNaira}
                    onChange={(e) => setEditPriceNaira(Number(e.target.value))}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Stock</label>
                  <input
                    type="number"
                    min={0}
                    max={1000000}
                    required
                    value={editStock}
                    onChange={(e) => setEditStock(Number(e.target.value))}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none"
                  />
                </div>
              </div>

              <ProductPhotoField value={editImageUrl} onChange={setEditImageUrl} uploading={uploadingPhoto}
                onUploadingChange={setUploadingPhoto} disabled={submitting} />

              <div>
                <label className="font-bold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-3 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || uploadingPhoto}
                className="w-full rounded-2xl bg-[#0c5c36] py-3 text-xs font-black text-white hover:bg-emerald-900 transition disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
