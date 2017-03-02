const webpack = require('webpack');
const merge = require('webpack-merge');
const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const WriteFilePlugin = require('write-file-webpack-plugin');

const _languages = {
  google: {
    name: 'Dart',
    link: 'https://www.dartlang.org/',
    in: 'dart'
  },
  elixirscript: {
    name: 'ElixirScript',
    link: 'https://github.com/elixirscript/elixirscript'
  },
  elm: {
    name: 'Elm',
    link: 'http://elm-lang.org/'
  },
  es6: {
    name: 'ES6',
    link: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/New_in_JavaScript/ECMAScript_2015_support_in_Mozilla'
  },
  gopherjs: {
    name: 'GopherJS',
    link: 'https://github.com/gopherjs/gopherjs'
  },
  opal: {
    name: 'Opal',
    link: 'http://opalrb.org/'
  },
  php: {
    name: 'PHP.js',
    link: 'http://phpjs.hertzen.com/'
  },
  purescript: {
    name: 'PureScript',
    link: 'http://www.purescript.org/'
  },
  scalajs: {
    name: 'Scala.js',
    link: 'http://www.scala-js.org/'
  }
};

module.exports = (env) => {
  const prod = env && env.production;

  // Filter languages based on CLI args
  const exclude = env && env.exclude ? env.exclude.split(',').map(e => e.trim()).filter(e => e !== '') : [];
  const only = env && env.only ? env.only.split(',').map(e => e.trim()).filter(e => e !== '') : [];

  const langsToInclude = only.length > 0 ? only : Object.keys(_languages).filter(l => exclude.indexOf(l) === -1);
  const languages = langsToInclude.reduce((acc, l) => { acc[l] = _languages[l]; return acc; }, {})

  console.log(`\nBuilding languages: ${Object.keys(languages).join(', ')}\n`);

  process.env.OPAL_USE_BUNDLER = true;
  process.env.OPAL_LOAD_PATH = path.join(__dirname, 'opal', 'src');

  const base = {
    node: { fs: 'empty' },
    entry: Object.assign(
      { main: path.join(__dirname, 'js', 'index.js') },
      Object.keys(languages).reduce((acc, lang) => {
        acc[lang] = path.join(__dirname, (languages[lang].in || lang), 'index.js');
        return acc;
      }, {})
    ),
    output: {
      path: path.join(__dirname, 'dist'),
      publicPath: path.join(__dirname, 'dist', path.sep),
      filename: path.join('js', '[name].js'),
      sourceMapFilename: '[file].map'
    },
    module: {
      rules: [
        { test: /\.js$/, loader: 'babel-loader' },
        { test: /\.dart$/, loader: 'dart-loader' },
        { test: /\.ejs$/, loader: 'ejs-loader' },
        {
          test: /\.elm$/,
          exclude: [/elm-stuff/, /node_modules/],
          loader: `elm-webpack-loader?pathToMake=${path.join(__dirname, 'node_modules', '.bin', 'elm-make')}` +
                    `&warn=true&yes=true${process.env.TRAVIS === 'true' ? '&maxInstances=1' : ''}`
        },
        { test: /\.exjs$/, loader: 'babel-loader!elixirscript-loader' },
        { test: /\.go$/, loader: 'gopherjs-loader' },
        { test: /\.php$/, loader: 'raw-loader' },
        {
          test: /\.purs$/,
          loader: 'purs-loader',
          query: {
            output: path.join(__dirname, 'purescript', 'output'),
            psc: 'psa',
            pscArgs: { sourceMaps: !prod },
            src: [
              path.join(__dirname, 'bower_components', 'purescript-*', 'src', '**', '*.purs'),
              path.join(__dirname, 'purescript', 'src', '**', '*.purs')
            ]
          }
        },
        { test: /\.rb$/, loader: 'opal-loader' },
        { test: /\.scala$/, loader: 'scalajs-loader' },
        {
          test: /\.scss$/,
          loader: ExtractTextPlugin.extract({
            fallback: 'style-loader',
            use: `css-loader?minimize=${prod ? 'true' : 'false'}&sourceMap=true&url=false!sass-loader?sourceMap=true`
          })
        }
      ]
    },
    plugins: [
      new CopyWebpackPlugin([{ from: path.join(__dirname, 'img'), to: path.join(__dirname, 'dist', 'img') }]),
      new ExtractTextPlugin(path.join('css', 'bundle.css')),
      new HtmlWebpackPlugin({
        languages: languages,
        inject: false,
        filename: path.join(__dirname, 'dist', 'index.html'),
        template: path.join(__dirname, 'index.ejs')
      })
    ],
    resolve: { extensions: ['.js', '.dart', '.ejs', '.elm', '.exjs', '.go', '.php', '.purs', '.rb', '.scala', '.scss'] }
  };

  return Object.defineProperty(merge(base,
    prod ? {
      plugins: [
        new webpack.optimize.UglifyJsPlugin({
          compress: { screw_ie8: true, warnings: false },
          mangle: true,
          output: { comments: false },
          sourceMap: true
        })
      ].concat(process.env.CLEAN_DIST === 'false' ? [] : [new CleanWebpackPlugin([path.join(__dirname, 'dist')], { verbose: true })])
    } : {
      devtool: '#source-map',
      devServer: {
        contentBase: path.join(__dirname, 'dist', path.sep),
        historyApiFallback: true,
        port: 8000
      },
      plugins: [new WriteFilePlugin()]
    }), 'outputPath', { enumerable: false, value: path.join(__dirname, 'dist', path.sep) });
};
