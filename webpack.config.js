const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  devServer: {
    host: '0.0.0.0',
    port: '8080',
    inline: true,
  },

  entry: [
    'error-polyfill',
    path.resolve(__dirname, 'js', 'index.js'),
  ],

  resolve: {
    modules: [
      path.resolve(__dirname, 'node_modules'),
    ],
  },

  output: {
    path: path.resolve(__dirname),
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
        exclude: path.resolve(__dirname, 'node_modules'),
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
              presets: [
                require.resolve('babel-preset-env'),
              ],
              plugins: [
                require.resolve('babel-plugin-transform-runtime'),
                [require.resolve('babel-plugin-transform-builtin-extend'), {
                  globals: ['Error', 'Array'],
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
      template: path.resolve(__dirname, 'js', 'index.thtml'),
      filename: path.resolve(__dirname, 'index.html'),
      inject: 'head',
      showErrors: true,
      xhtml: true,
    }),
  ],
}
