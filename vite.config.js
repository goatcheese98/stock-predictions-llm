import {defineConfig} from "vite"

export default defineConfig({
	plugins: [
		
	],
	base: process.env.NODE_ENV === 'production' ? '/stock-predictions-ai/' : '/',
	build: {
		outDir: 'dist',
		assetsDir: 'assets',
		sourcemap: false,
		minify: 'terser',
		rollupOptions: {
			output: {
				manualChunks: undefined,
			},
		},
	},
})