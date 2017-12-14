const path = require('path')

const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackPluginConfig = new HtmlWebpackPlugin({
  template: './js/index.html',
  filename: 'index.html',
  inject: 'head',
  showErrors: true,
});

module.exports = {
  devServer: {
    host: '0.0.0.0',
    port: '80',
  },

  entry: [
    'babel-polyfill',
    './js/index.js',
  ],

  output: {
    filename: 'js/webpack.js'
  },

  module: {
    loaders: [
      {
        loader: 'babel-loader',
        include: [
          path.resolve(__dirname, 'js'),
        ],
        test: /.js$/,
        query: {
          presets: ['es2015'],
        },
      }
    ]
  },

  plugins: [
    HtmlWebpackPluginConfig,
  ],
}
