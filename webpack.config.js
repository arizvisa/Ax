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

  resolve: {
    modules: [
      path.resolve(__dirname, 'node_modules'),
    ],
  },

  output: {
    filename: 'webpack.js'
  },

  module: {
    rules: [
      {
        test: /\.json$/,
        loader: require.resolve('json-loader'),
      },
      {
        test: /\.js$/,
        enforce: 'pre',
        exclude: /node_modules/,
        use: [
          {
            loader: require.resolve('jshint-loader'),
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
            loader: require.resolve('babel-loader'),
            options: {
              presets: ['env'],
              plugins: [
                [require.resolve("babel-plugin-transform-builtin-extend"), {
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
