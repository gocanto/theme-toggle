import type { Theme } from 'vitepress';
import Layout from '@web/Layout.vue';
import '@web/assets/main.css';

/** Custom VitePress theme: a single landing-page layout, no default-theme chrome. */
const theme: Theme = { Layout };

export default theme;
