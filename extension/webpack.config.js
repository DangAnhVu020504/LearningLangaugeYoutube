// @ts-check
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

/** @type {import('webpack').Configuration} */
module.exports = {
  // ── Entry Points ──────────────────────────────────────────────────────
  // Mỗi entry tương ứng với một context riêng trong Chrome Extension:
  // - content: inject vào trang YouTube (Content Script)
  // - 'service-worker': chạy nền trong Extension (Background)
  entry: {
    content: './src/content/content.ts',
    'service-worker': './src/background/service-worker.ts',
  },

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true, // Xóa dist/ trước mỗi build
  },

  // ── TypeScript Loader ─────────────────────────────────────────────────
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },

  resolve: {
    extensions: ['.ts', '.js'],
  },

  // ── Plugins ───────────────────────────────────────────────────────────
  // Copy manifest.json vào dist/ để Chrome có thể load extension từ dist/
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'src/styles/subtitle.css', to: 'subtitle.css' },
      ],
    }),
  ],

  // ── Optimization ──────────────────────────────────────────────────────
  // Không cần code splitting cho extension - mỗi entry là independent
  optimization: {
    splitChunks: false,
  },

  // Source maps chỉ bật ở development mode để debug
  devtool: false,
};
