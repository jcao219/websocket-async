import pkg from './package.json';
import babel from 'rollup-plugin-babel';
import uglify from 'rollup-plugin-uglify';
import { minify } from 'uglify-es';
import eslint from 'rollup-plugin-eslint';

export default [
    {
        input: 'src/websocket-client.js',
        name: 'WebSocketClient',
        plugins: [
            eslint(),
            babel({
                exclude: 'node_modules/**'
            }),
            uglify({}, minify)
        ],
        output: [
            { file: pkg.module, format: 'es' },
            { file: pkg.browser, format: 'umd' }
        ]
    }
];
