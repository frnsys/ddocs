const path = require('path');
const webpack = require('webpack');

const ExtractTextPlugin = require('extract-text-webpack-plugin');
const ManifestRevisionPlugin = require('manifest-revision-webpack-plugin');

// take debug mode from the environment
const debug = (process.env.NODE_ENV !== 'production');

// Development asset host (webpack dev server)
const publicHost = debug ? 'http://localhost:2992' : '';

const rootAssetPath = path.join(__dirname, 'assets');

module.exports = {
  // configuration
  context: __dirname,
  entry: {
    main_js: './front/static/js/main',
    main_css: './front/static/css/style.sass'
  },
  output: {
    path: path.join(__dirname, 'front', 'static', 'build'),
    publicPath: `${publicHost}/assets/build/`, // make sure conforms to static_url_path
    filename: '[name].[hash].js',
    chunkFilename: '[id].[hash].js',
  },
  resolve: {
    extensions: ['.js', '.jsx', '.css'],
  },
  devtool: 'source-map',
  devServer: {
    headers: { 'Access-Control-Allow-Origin': '*' },
  },
  module: {
    rules: [{
      test: /\.(sass|scss)$/,
      use: ExtractTextPlugin.extract({ fallback: 'style-loader', use: 'css-loader!sass-loader' })
    }, {
      test: /\.css$/,
      use: [{
          loader: "style-loader" // creates style nodes from JS strings
      }, {
          loader: "css-loader" // translates CSS into CommonJS
      }]
    }, {
      test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
      loader: 'url-loader?limit=10000&mimetype=application/font-woff'
    }, {
      test: /\.(ttf|eot|svg|png|jpe?g|gif|ico)(\?.*)?$/i,
      loader: `file-loader?context=${rootAssetPath}&name=[path][name].[hash].[ext]`
    }, {
      test: /\.js$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env', '@babel/preset-react'],
          plugins: ['@babel/plugin-proposal-class-properties', '@babel/plugin-proposal-object-rest-spread']
        }
      }
    }]
  },
  plugins: [
    new ExtractTextPlugin('[name].[hash].css'),
    new ManifestRevisionPlugin(path.join(__dirname, 'front', 'manifest.json'), {
      rootAssetPath,
      ignorePaths: ['/js', '/css'],
    }),
  ].concat(debug ? [] : [
    // production webpack plugins go here
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('production'),
      }
    }),
  ]),
};