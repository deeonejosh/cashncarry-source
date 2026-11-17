import { beforeEach, expect, it, vi } from 'vitest';
import { kycRoute, type KycEnvironment } from '../../../deploy/chatgpt-sites/kyc';
import { currentAccount } from '../../../deploy/chatgpt-sites/new-auth';
import { scanDocumentOverHttps } from '../../lib/kyc-https-scanner';

vi.mock('../../../deploy/chatgpt-sites/new-auth', () => ({ currentAccount: vi.fn() }));
vi.mock('../../lib/kyc-https-scanner', () => ({ scanDocumentOverHttps: vi.fn() }));
const origin = 'https://market.example.invalid';
const put = vi.fn();
const remove = vi.fn();
const batch = vi.fn();
const run = vi.fn();
const env = {
  AUTH_ORIGIN: origin, KYC_PRIVATE: {put, delete:remove},
  KYC_SCANNER_HTTPS_URL: 'https://scan.example.invalid', KYC_SCANNER_BEARER_TOKEN: 'fixture',
  KYC_DOCUMENT_KEY: 'a'.repeat(64),
  AUTH_DB: {prepare:() => ({bind:() => ({run})}),batch},
} as unknown as KycEnvironment;
const request = () => new Request(origin+'/api/sellers/kyc',{
  method:'POST',headers:{origin,'content-type':'application/pdf'},body:'%PDF-1.7 fixture',
});
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(currentAccount).mockResolvedValue({id:'seller',email:'seller@example.invalid',role:'seller'});
});
it('fails closed when a private bucket is missing', async () => {
  expect((await kycRoute(request(),{...env,KYC_PRIVATE:undefined}))?.status).toBe(503);
  expect(put).not.toHaveBeenCalled();
});
it('rejects infected files without persisting them', async () => {
  vi.mocked(scanDocumentOverHttps).mockResolvedValue('infected');
  expect((await kycRoute(request(),env))?.status).toBe(422);
  expect(put).not.toHaveBeenCalled();
});
it('stores only encrypted bytes after a clean verdict', async () => {
  vi.mocked(scanDocumentOverHttps).mockResolvedValue('clean');
  expect((await kycRoute(request(),env))?.status).toBe(201);
  expect(new TextDecoder().decode(put.mock.calls[0][1])).not.toContain('%PDF');
  expect(batch).toHaveBeenCalledTimes(1);
});
it('blocks a buyer from submitting a seller document', async () => {
  vi.mocked(currentAccount).mockResolvedValue({id:'buyer',email:'buyer@example.invalid',role:'buyer'});
  expect((await kycRoute(request(),env))?.status).toBe(403);
  expect(scanDocumentOverHttps).not.toHaveBeenCalled();
});
