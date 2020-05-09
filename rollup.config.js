import typescript from 'rollup-plugin-typescript2';

export default {
  input: 'src/boundary.ts',
  plugins: [typescript()],
  onwarn: (e) => {
    throw new Error(e);
  },
  output: {
    name: 'OnExit',
    file: 'dist/boundary.js',
    format: 'umd',
  },
};
