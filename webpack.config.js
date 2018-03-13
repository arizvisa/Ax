const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  devServer: {
    host: '0.0.0.0',
    port: '80',
  },

  entry: [
    'babel-polyfill',
    'error-polyfill',
    './js/index.js',
  ],

  output: {
    filename: 'webpack.js'
  },

  module: {
    rules: [
      {
        test: /\.json$/,
        loader: 'json-loader',
      },
      {
        test: /\.js$/,
        enforce: 'pre',
        exclude: /node_modules/,
        use: [
          {
            loader: 'jshint-loader',
            options: {
              emitErrors: true,
              failOnHint: false,
              esversion: 6,
              debug: true,
              eqeqeq: false,
              '-W018' : true,
              '-W069' : true,
            },
          },
        ],
      },
      {
        test: /.js$/,
        enforce: 'post',
        include: [
          path.resolve(__dirname, 'js'),
        ],
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: ['env'],
              plugins: [
                ["babel-plugin-transform-builtin-extend", {
                  globals: ["Error", "Array"],
                  approximate: true,
                }],
              ],
            },
          },
        ]
      },
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: './js/index.thtml',
      filename: './index.html',
      inject: 'head',
      showErrors: true,
    }),
  ],
}
