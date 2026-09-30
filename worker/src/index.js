/**
 * cymys-pwa Worker — 当前仅托管静态资源（public/）
 * 静态请求由 [assets] 直接返回；未匹配资源路径的请求走这里。
 * 后续激活码 API（/api/activate 等）在此扩展，克隆自 daobox-api。
 */
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ ok: false, error: 'API 未部署' }), {
        status: 404,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      });
    }
    return fetch(request);
  },
};
