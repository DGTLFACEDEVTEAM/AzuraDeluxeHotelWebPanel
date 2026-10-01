// Server environment only; never read a request header to select storage mode.
export function blogContractVersion() {
  const value = process.env.AZURA_BLOG_CONTRACT_VERSION;
  if (value === undefined || value === '2') return 2;
  if (value === '3') return 3;
  const error = new Error('AZURA_BLOG_CONTRACT_VERSION yalnız 2 veya 3 olabilir.');
  error.status = 503; error.code = 'BLOG_CONTRACT_CONFIGURATION_ERROR';
  throw error;
}
