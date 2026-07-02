(()=>{let e=globalThis;if((e.__DARK_MODE_LITE_LOADED__||0)>=5)return;e.__DARK_MODE_LITE_LOADED__=5;let t=`dark-mode-lite`,n=`dark-mode-lite-style`,r=`data-dm-lite-active`,i=`data-dm-lite-mode`,a={enabled:!0,mode:`smart`,brightness:100,contrast:92,sepia:0,settingsVersion:2,siteOverrides:{}},o={...a},s=null,c=0,l=new Map;function u(e){return e.replace(/^www\./,``)}function d(){return u(location.hostname||``)}function f(e=o){let t=d();return e.siteOverrides?.[t]??!0}function p(e=o){return!!(e.enabled&&f(e))}function m(e,t,n){let r=Number(e);return Number.isFinite(r)?Math.min(n,Math.max(t,r)):t}function h(e){let t=String(e).match(/rgba?\(([^)]+)\)/)?.[1];if(!t)return null;let n=t.split(`,`).map(e=>Number.parseFloat(e.trim())),r=n[0],i=n[1],a=n[2],o=n[3]??1;return r===void 0||i===void 0||a===void 0||![r,i,a,o].every(Number.isFinite)||o===0?null:{r,g:i,b:a,a:o}}function g(e){let t=e=>{let t=e/255;return t<=.03928?t/12.92:((t+.055)/1.055)**2.4};return .2126*t(e.r)+.7152*t(e.g)+.0722*t(e.b)}function _(e,t){let n=l.get(e);n||(n={},l.set(e,n)),Object.hasOwn(n,t)||(n[t]={value:e.style.getPropertyValue(t),priority:e.style.getPropertyPriority(t)})}function v(e,t,n){_(e,t),e.style.setProperty(t,n,`important`)}function y(){for(let[e,t]of l)if(e?.style)for(let[n,r]of Object.entries(t))r.value?e.style.setProperty(n,r.value,r.priority):e.style.removeProperty(n);l.clear()}function b(e){return[`SCRIPT`,`STYLE`,`META`,`LINK`,`NOSCRIPT`,`IMG`,`VIDEO`,`PICTURE`,`CANVAS`,`SVG`,`PATH`,`IFRAME`].includes(e.tagName)}function x(e){if(!(e instanceof HTMLElement)||b(e))return;let t=getComputedStyle(e),n=h(t.backgroundColor),r=h(t.color);if(e===document.body||e===document.documentElement){v(e,`background-color`,`#111318`),v(e,`color`,`#e9edf5`);return}if(n){let t=g(n);t>.78?v(e,`background-color`,`#171b22`):t>.58&&v(e,`background-color`,`#202632`)}if(r){let t=g(r);e.closest(`a`)?v(e,`color`,`#8ab4ff`):t<.42&&v(e,`color`,`#e9edf5`)}for(let n of[`top`,`right`,`bottom`,`left`]){let r=`border-${n}-color`,i=h(t.getPropertyValue(r));i&&g(i)>.52&&v(e,r,`rgba(255, 255, 255, 0.18)`)}}function S(){if(c=0,!p(o)||o.mode!==`smart`)return;let e=[document.documentElement,document.body,...document.querySelectorAll(`body *`)];for(let t=0;t<e.length&&t<5e3;t+=1){let n=e[t];n&&x(n)}}function C(){c||=window.setTimeout(S,80)}function w(){C(),!s&&(s=new MutationObserver(C),s.observe(document.documentElement,{childList:!0,subtree:!0}))}function T(){s&&=(s.disconnect(),null),c&&=(window.clearTimeout(c),0),y()}function E(e){return e===`smart`||e===`invert`||e===`soft`?e:a.mode}function D(e){if(!A(e))return{};let t={};typeof e.enabled==`boolean`&&(t.enabled=e.enabled),typeof e.mode==`string`&&(t.mode=E(e.mode));let n=M(e.brightness,50,150);n!==void 0&&(t.brightness=n);let r=M(e.contrast,50,150);r!==void 0&&(t.contrast=r);let i=M(e.sepia,0,100);i!==void 0&&(t.sepia=i);let a=j(e.settingsVersion);a!==void 0&&(t.settingsVersion=a);let o=N(e.siteOverrides);return o!==void 0&&(t.siteOverrides=o),t}function O(e){let t=D(e),n={...a,...t,siteOverrides:{...a.siteOverrides,...t.siteOverrides??{}}};return P(e)&&(n.mode=`smart`),n.settingsVersion=a.settingsVersion,n}function k(e){return!A(e)||e.source!==t?null:e.type===`get-state`?{source:t,type:`get-state`}:e.type===`toggle-site`?{source:t,type:`toggle-site`}:e.type===`set-settings`?{source:t,type:`set-settings`,patch:D(e.patch)}:null}function A(e){return typeof e==`object`&&!!e&&!Array.isArray(e)}function j(e){if(!(typeof e!=`number`||!Number.isFinite(e)))return e}function M(e,t,n){let r=j(e);if(r!==void 0)return Math.min(n,Math.max(t,r))}function N(e){if(!A(e))return;let t={};for(let[n,r]of Object.entries(e))typeof r==`boolean`&&(t[u(n)]=r);return t}function P(e){return A(e)?!j(e.settingsVersion)&&e.mode===`invert`:!1}function F(e){let t=m(e.brightness,50,150),n=m(e.contrast,50,150),a=m(e.sepia,0,100);return`
      html[${r}="true"] {
        color-scheme: dark !important;
        --dm-lite-bg: #111318;
        --dm-lite-surface: #1a1d24;
        --dm-lite-surface-2: #232833;
        --dm-lite-text: #e9edf5;
        --dm-lite-muted: #aab2c2;
        --dm-lite-link: #8ab4ff;
        --dm-lite-border: rgba(255, 255, 255, 0.22);
      }

      html[${r}="true"][${i}="smart"],
      html[${r}="true"][${i}="smart"] body {
        background: var(--dm-lite-bg) !important;
        color: var(--dm-lite-text) !important;
      }

      html[${r}="true"][${i}="smart"] :where(
        p,
        span,
        li,
        label,
        strong,
        em,
        small,
        h1,
        h2,
        h3,
        h4,
        h5,
        h6,
        code,
        pre,
        th,
        td
      ) {
        color: var(--dm-lite-text) !important;
        border-color: var(--dm-lite-border) !important;
      }

      html[${r}="true"][${i}="smart"] :where(a, a *) {
        color: var(--dm-lite-link) !important;
      }

      html[${r}="true"][${i}="smart"] :where(
        [style*="background: white"],
        [style*="background:white"],
        [style*="background-color: white"],
        [style*="background-color:white"],
        [style*="background: rgb(255"],
        [style*="background-color: rgb(255"]
      ) {
        background: var(--dm-lite-bg) !important;
        background-color: var(--dm-lite-bg) !important;
      }

      html[${r}="true"][${i}="smart"] img,
      html[${r}="true"][${i}="smart"] video,
      html[${r}="true"][${i}="smart"] picture,
      html[${r}="true"][${i}="smart"] canvas,
      html[${r}="true"][${i}="smart"] svg,
      html[${r}="true"][${i}="smart"] iframe {
        filter: brightness(${t}%) contrast(${n}%) sepia(${a}%) !important;
      }

      html[${r}="true"][${i}="smart"] input,
      html[${r}="true"][${i}="smart"] textarea,
      html[${r}="true"][${i}="smart"] select,
      html[${r}="true"][${i}="smart"] button {
        background-color: var(--dm-lite-surface) !important;
        border-color: var(--dm-lite-border) !important;
        color: var(--dm-lite-text) !important;
      }

      html[${r}="true"][${i}="invert"] {
        background: white !important;
        filter: invert(1) hue-rotate(180deg) brightness(${t}%) contrast(${n}%) sepia(${a}%) !important;
      }

      html[${r}="true"][${i}="invert"] img,
      html[${r}="true"][${i}="invert"] video,
      html[${r}="true"][${i}="invert"] picture,
      html[${r}="true"][${i}="invert"] canvas,
      html[${r}="true"][${i}="invert"] iframe,
      html[${r}="true"][${i}="invert"] svg,
      html[${r}="true"][${i}="invert"] [style*="background-image"] {
        filter: invert(1) hue-rotate(180deg) !important;
      }

      html[${r}="true"][${i}="soft"],
      html[${r}="true"][${i}="soft"] body {
        background: var(--dm-lite-bg) !important;
        color: var(--dm-lite-text) !important;
      }

      html[${r}="true"][${i}="soft"] body,
      html[${r}="true"][${i}="soft"] main,
      html[${r}="true"][${i}="soft"] article,
      html[${r}="true"][${i}="soft"] section,
      html[${r}="true"][${i}="soft"] aside,
      html[${r}="true"][${i}="soft"] header,
      html[${r}="true"][${i}="soft"] footer,
      html[${r}="true"][${i}="soft"] nav,
      html[${r}="true"][${i}="soft"] div,
      html[${r}="true"][${i}="soft"] form,
      html[${r}="true"][${i}="soft"] dialog {
        background-color: var(--dm-lite-bg) !important;
        border-color: var(--dm-lite-border) !important;
      }

      html[${r}="true"][${i}="soft"] p,
      html[${r}="true"][${i}="soft"] span,
      html[${r}="true"][${i}="soft"] li,
      html[${r}="true"][${i}="soft"] label,
      html[${r}="true"][${i}="soft"] strong,
      html[${r}="true"][${i}="soft"] em,
      html[${r}="true"][${i}="soft"] h1,
      html[${r}="true"][${i}="soft"] h2,
      html[${r}="true"][${i}="soft"] h3,
      html[${r}="true"][${i}="soft"] h4,
      html[${r}="true"][${i}="soft"] h5,
      html[${r}="true"][${i}="soft"] h6,
      html[${r}="true"][${i}="soft"] code,
      html[${r}="true"][${i}="soft"] pre,
      html[${r}="true"][${i}="soft"] table,
      html[${r}="true"][${i}="soft"] th,
      html[${r}="true"][${i}="soft"] td {
        color: var(--dm-lite-text) !important;
        border-color: var(--dm-lite-border) !important;
      }

      html[${r}="true"][${i}="soft"] a {
        color: var(--dm-lite-link) !important;
      }

      html[${r}="true"][${i}="soft"] input,
      html[${r}="true"][${i}="soft"] textarea,
      html[${r}="true"][${i}="soft"] select,
      html[${r}="true"][${i}="soft"] button {
        background-color: var(--dm-lite-surface) !important;
        border-color: var(--dm-lite-border) !important;
        color: var(--dm-lite-text) !important;
      }

      html[${r}="true"][${i}="soft"] input::placeholder,
      html[${r}="true"][${i}="soft"] textarea::placeholder {
        color: var(--dm-lite-muted) !important;
      }

      html[${r}="true"][${i}="soft"] pre,
      html[${r}="true"][${i}="soft"] code,
      html[${r}="true"][${i}="soft"] blockquote {
        background-color: var(--dm-lite-surface-2) !important;
      }
    `}function I(e=document.documentElement){document.getElementById(`personal-dark-mode-lite-style`)?.remove(),e.removeAttribute(`data-pdm-lite-active`),e.removeAttribute(`data-pdm-lite-mode`)}function L(){let e=document.getElementById(n);if(e instanceof HTMLStyleElement)return e;let t=document.createElement(`style`);return t.id=n,t.setAttribute(`data-owner`,`dark-mode-lite`),(document.documentElement||document.head||document).appendChild(t),t}function R(e){let t=o.mode;o=O(e);let n=document.documentElement,a=p(o);I(n);let s=L(),c=[`smart`,`soft`,`invert`].includes(o.mode)?o.mode:`smart`;s.textContent=F(o),n.setAttribute(i,c),t===`smart`&&(!a||c!==`smart`)&&T(),a?(n.setAttribute(r,`true`),c===`smart`&&w()):(n.removeAttribute(r),T())}function z(){chrome.storage.sync.get(null,e=>{R(e)})}function B(e,t){let n=O({...o,...e,siteOverrides:e.siteOverrides?{...e.siteOverrides}:{...o.siteOverrides}});chrome.storage.sync.set(n,()=>{R(n),t?.(V())})}function V(){return{settings:o,host:d(),active:p(o),siteEnabled:f(o)}}chrome.runtime.onMessage.addListener((e,t,n)=>{let r=k(e);if(!r)return!1;if(r.type===`get-state`)return n(V()),!1;if(r.type===`set-settings`)return B(r.patch||{},n),!0;if(r.type===`toggle-site`){let e=d();return B({siteOverrides:{...o.siteOverrides,[e]:!f(o)}},n),!0}return!1}),chrome.storage.onChanged.addListener((e,t)=>{if(t!==`sync`)return;let n={...o};for(let[t,r]of Object.entries(e))n[t]=r.newValue;R(n)}),z()})();