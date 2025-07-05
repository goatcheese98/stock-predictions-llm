import {defineConfig} from "vite"

export default defineConfig(({ command, mode }) => {
	const isProduction = mode === 'production'
	
	return {
		plugins: [],
		base: isProduction ? '/stock-predictions-ai/' : '/',
		build: {
			outDir: 'dist',
			assetsDir: 'assets',
			sourcemap: false,
			minify: true,
			rollupOptions: {
				output: {
					manualChunks: undefined,
				},
			},
		},
	}
})