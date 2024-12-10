const path = require('path');

module.exports = {
  entry: {
    register: './static/register/main.js',
    auth: './static/auth/main.js',
    checkUID: './static/code/universalCode/checkUIDunbundled.js'
  },
  output: {
    path: path.resolve(__dirname, './static/npmBundledScripts'), // Output directory
    filename: '[name].bundle.js' // Output bundle file name using the entry key
  },
  mode: 'development', // Or 'production'
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
              presets: ['@babel/preset-env']
          }
        }
      }
    ]
  }
};