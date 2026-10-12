import type { Config } from 'tailwindcss';
export default { content: ['./src/**/*.{ts,tsx}'], theme: { extend: { colors: { ink: '#08111f', panel: '#101c2d', line: '#22334a', cyan: '#57d9e6', teal: '#25b9a4' } } }, plugins: [] } satisfies Config;
