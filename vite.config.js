import {defineConfig} from "vite"

export default defineConfig(({ command, mode }) => {
	const isProduction = mode === 'production'

	return {
		plugins: [],
		base: '/',
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