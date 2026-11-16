'use strict';
(() => {
  // Some existing email links use the public shop as the Auth site URL.
  const params = new URLSearchParams(location.hash.slice(1));
  if (!['recovery','invite'].includes(params.get('type')) || !params.has('access_token') || !params.has('refresh_token')) return;
  location.replace('/admin' + location.hash);
})();
