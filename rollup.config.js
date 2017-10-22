import pkg from './package.json';
import babel from 'rollup-plugin-babel';
import uglify from 'rollup-plugin-uglify';
import { minify } from 'uglify-es';

export default [
    {
        input: 'src/websocket-client.js',
        name: 'websocket-async',
        plugins: [
            babel({
                exclude: 'node_modules/**',
            }),
            uglify({}, minify)
        ],
        output: [
            { file: pkg.module, format: 'es' },
            { file: pkg.browser, format: 'umd' }
        ]
    }
];
