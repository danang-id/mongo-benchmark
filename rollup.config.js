import commonjs from 'rollup-plugin-commonjs';
import typescript from 'rollup-plugin-typescript';
import json from 'rollup-plugin-json';

export default {
    plugins: [
        typescript(),
        commonjs(),
        json()
    ],
    input: 'lib/main.ts',
    output: {
        file: 'bin/mongobenchmark',
        format: 'esm'
    }
};
