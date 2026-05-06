import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    // Only split out third-party dependencies
                    if (id.includes('node_modules')) {
                        // Group recharts into 'charts'
                        if (id.includes('recharts')) {
                            return 'charts';
                        }
                        // Group Redux tools into 'redux'
                        if (id.includes('redux') || id.includes('@reduxjs')) {
                            return 'redux';
                        }
                        // Group React and React Router into 'vendor'
                        if (id.includes('react')) {
                            return 'vendor';
                        }
                    }
                }
            },
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/test/setup.js',
    },
});