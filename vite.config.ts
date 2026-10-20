import {defineConfig} from "vite"
import {pagesPolicy} from "./pages-build.ts"

export default defineConfig(({ command, mode }) => {
	const isProduction = mode === 'production'

	return {
		plugins: mode === 'pages' ? [pagesPolicy()] : [],
        resolve: { alias: [{ find: /^vue$/, replacement: 'vue/dist/vue.esm-bundler.js' }] },
        define: { __VUE_OPTIONS_API__: true, __VUE_PROD_DEVTOOLS__: false, __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false },
		base: mode === 'pages' ? '/' : '/stock-predictions-llm/',
		build: {
			outDir: 'dist',
			assetsDir: 'assets',
			sourcemap: false,
			minify: true,
			rollupOptions: {
				input: {
					main: 'index.html',
					report: 'report.html'
				},
				output: {
					manualChunks: undefined,
				},
			},
		},
	}
})