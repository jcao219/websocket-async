import pkg from './package.json';
import babel from 'rollup-plugin-babel';
import uglify from 'rollup-plugin-uglify';
import { minify } from 'uglify-es';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import eslint from 'rollup-plugin-eslint';

export default [
    {
        input: 'src/websocket-client.js',
        name: 'WebSocketClient',
        plugins: [
            eslint(),
            resolve({
                jsnext: 'true',
                main: true,
                browser: true
            }),
            babel({
                exclude: 'node_modules/**'
            }),
            commonjs(),
            uglify({}, minify)
        ],
        output: [
            { file: pkg.module, format: 'es' },
            { file: pkg.browser, format: 'umd' }
        ]
    }
];
