import {cleanupContact} from './contact';
import {renderPage} from './render';
import {resolveLocale, selectCopy} from '../src/localization-contract';
import {notFoundCopy} from '../src/not-found-copy';
import { syntheticSourceOrders, validateTargetOrder } from '../src/api-contract';
import { metadata, pages } from '../src/metadata';
import { labGateway } from './lab-gateway';
import { supplement } from '../src/supplement-engine';
import { nativeApi } from './native/api';
import { D1Reports } from './native/storage';


const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

function notFoundHtml(path: string) {
  const locale=resolveLocale(path), copy=selectCopy(notFoundCopy,locale), home=locale==='en'?'/en':'/';
  return `<!doctype html><html lang="${locale}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${copy.title} — Ivan Matiushkin</title><link rel="icon" href="/favicon.ico"><style>:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#142536;background:#f5f8fa}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;grid-template-rows:auto 1fr auto}.header,.main,.footer{width:min(100% - 48px,1180px);margin-inline:auto}.header{min-height:84px;display:flex;align-items:center;border-bottom:1px solid #d9e3ea}.brand{display:flex;align-items:center;gap:14px;color:inherit;text-decoration:none}.brand img{width:46px;height:46px}.brand strong,.brand small{display:block}.brand small{color:#526576;margin-top:3px}.main{display:flex;align-items:center;padding-block:80px}.panel{max-width:680px}.eyebrow{font-size:13px;font-weight:800;letter-spacing:.14em;color:#2878a6}.panel h1{font-size:clamp(38px,6vw,64px);line-height:1.05;margin:16px 0}.panel p{font-size:18px;line-height:1.6;color:#526576}.button{display:inline-block;margin-top:18px;padding:13px 18px;border-radius:7px;background:#176b9b;color:#fff;text-decoration:none;font-weight:700}.button:focus-visible{outline:3px solid #8ac8e8;outline-offset:3px}.footer{padding-block:26px;border-top:1px solid #d9e3ea;color:#526576}@media(max-width:620px){.header,.main,.footer{width:min(100% - 28px,1180px)}.brand small{font-size:11px}.main{padding-block:54px}}</style></head><body><header class="header"><a class="brand" href="${home}"><img src="/brand/logo-transparent.png" alt=""><span><strong>Ivan Matiushkin</strong><small>${copy.tagline}</small></span></a></header><main class="main"><section class="panel"><div class="eyebrow">404</div><h1>${copy.title}</h1><p>${copy.description}</p><a class="button" href="${home}">${copy.home}</a></section></main><footer class="footer">Ivan Matiushkin · ivan@matiushkin.com</footer></body></html>`;
}

export default {
  async fetch(request: Request, env: Env, ctx:ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if(url.pathname==='/api/contact')return json({error:'contact_disabled_in_local_source'},503);
    if(url.pathname==='/api/metrics')return new Response(null,{status:204});
    const normalizedPath = url.pathname.replace(/\/+$/, '') || '/';
    if (['GET','HEAD'].includes(request.method) && normalizedPath !== url.pathname && pages[normalizedPath]) {
      url.pathname = normalizedPath;
      return Response.redirect(url.href, 308);
    }
    if (request.method === 'POST' && ['/api/demo/acceptance/async','/api/demo/acceptance/healthcare'].includes(url.pathname)) {
      if (request.headers.get('origin') && request.headers.get('origin') !== url.origin) return json({error:'cross_origin_rejected'},403);
      if (!(await env.LAB_MUTATIONS.limit({key:'supplement:'+(request.headers.get('cf-connecting-ip')??'local')})).success) return json({error:'rate_limited'},429);
      const reader=request.body?.getReader();let bytes=0;const parts:Uint8Array[]=[];
      if(reader){while(true){const item=await reader.read();if(item.done)break;bytes+=item.value.length;if(bytes>1024){await reader.cancel();return json({error:'payload_too_large'},413);}parts.push(item.value);}}
      try {const body=JSON.parse(parts.map(p=>new TextDecoder().decode(p)).join(''));if(typeof body.controlled!=='boolean'||Object.keys(body).length!==1)return json({error:'invalid_request'},422);return json(await supplement(url.pathname.endsWith('/async')?'async':'healthcare',body.controlled));}catch{return json({error:'invalid_request'},422);}
    }
    if (url.pathname.startsWith('/lab-api/')) {
      if(url.pathname.startsWith('/lab-api/ai-automation/'))return json({error:'live_ai_disabled_in_local_source'},503);
      if (import.meta.env.DEV && import.meta.env.VITE_LAB_RUNTIME !== 'native' && !url.pathname.startsWith('/lab-api/migration/') && !url.pathname.startsWith('/lab-api/revenue-bi/')) {
        const target = new URL(url.pathname + url.search, 'http://127.0.0.1:8001');
        try { return await fetch(new Request(target, request)); }
        catch { return json({ error: 'local_lab_backend_unavailable' }, 503); }
      }
      return labGateway(request,{...env,LAB_API:{fetch:internal=>nativeApi(internal,new D1Reports(env.DB,internal.headers.get('x-lab-session')!))}},import.meta.env.DEV);
    }
    if (['GET', 'HEAD'].includes(request.method) && pages[url.pathname]) {
      const response = await env.ASSETS.fetch(new Request(new URL('/', url), request));
      const { page, url: canonical, tags, alternates } = metadata(url.pathname);
      const htmlLang = page.locale === 'en' ? 'en' : 'pl';
      const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
      const html = Object.entries(tags).map(([key, value]) => `<meta ${key.startsWith('og:') ? 'property' : 'name'}="${key}" content="${escape(value)}">`).join('') + alternates.map(({lang,href}) => `<link rel="alternate" hreflang="${lang}" href="${escape(href)}">`).join('');
      const body=request.method==='HEAD'?'':await renderPage(url.pathname+url.search);
      return new HTMLRewriter()
        .on('html', { element(element) { element.setAttribute('lang', htmlLang); } })
        .on('title', { element(element) { element.setInnerContent(page.title); } })
        .on('link[rel="canonical"]', { element(element) { element.setAttribute('href', canonical); } })
        .on('meta', { element(element) { const key = element.getAttribute('property') ?? element.getAttribute('name'); if (key && (key in tags)) element.remove(); } })
        .on('head', { element(element) { element.append(html, { html: true }); } })
        .on('#root', { element(element) {
          element.setAttribute('data-ssr','true');
          element.setInnerContent(body,{html:true});
        } })
        .transform(response);
    }
    if (request.method === 'GET' && url.pathname === '/api/demo/source/orders') {
      return json({ data: syntheticSourceOrders, meta: { synthetic: true, count: syntheticSourceOrders.length } });
    }
    if (request.method === 'POST' && url.pathname === '/api/demo/target/orders') {
      const contentLength = Number(request.headers.get('content-length') ?? '0');
      if (contentLength > 65_536) return json({ error: 'payload_too_large' }, 413);
      let payload: unknown;
      try { payload = await request.json(); } catch { return json({ error: 'invalid_json' }, 400); }
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return json({error:'validation_failed',errors:validateTargetOrder(payload)},422);
      const simulation = url.searchParams.get('simulate');
      if (simulation === 'unexpected-status') return json({ error: 'demo_upstream_unavailable' }, 503);
      if (simulation === 'invalid-schema') return json({ externalId: (payload as { externalId?: string }).externalId, accepted: true }, 201);
      if (simulation === 'duplicate') return json({ targetId: 'TGT-DEMO-1001', externalId: (payload as { externalId?: string }).externalId, accepted: true, idempotentReplay: true }, 200);
      if (simulation === 'timeout' && request.headers.get('x-demo-attempt') === '1') return json({ error: 'demo_timeout' }, 504);
      const errors = validateTargetOrder(payload);
      if (simulation !== 'accept-currency' && errors.length) return json({ error: 'validation_failed', errors }, 422);
      const safePayload = payload as { externalId?: string };
      return json({ targetId: `TGT-${safePayload.externalId ?? 'UNKNOWN'}`, externalId: safePayload.externalId, accepted: true }, 201);
    }
    if (['GET', 'HEAD'].includes(request.method)) {
      // Workers Assets canonicalizes .html to extensionless URLs. Only these
      // Published report/preview assets bypass the application's hard-404 fallback.
      if (['/samples/migration-evidence-pl','/samples/migration-evidence-en','/samples/hero-3d'].includes(url.pathname)) return env.ASSETS.fetch(request);
      if (import.meta.env.DEV && url.pathname.startsWith('/@')) return env.ASSETS.fetch(request);
      if (/\.[a-z0-9]+$/i.test(url.pathname)) return env.ASSETS.fetch(request);
      return new Response(request.method === 'HEAD' ? null : notFoundHtml(url.pathname), { status: 404, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
    }
    return json({ error: 'not_found' }, 404);
  },
  async scheduled(_event,env) { await Promise.all([new D1Reports(env.DB,'cleanup').cleanup(),cleanupContact(env.DB)]); },
} satisfies ExportedHandler<Env>;
