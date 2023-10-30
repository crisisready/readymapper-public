module.exports = {
  publicPath: "./",
  configureWebpack: {
    devtool: 'source-map'
  },
  devServer: {
    historyApiFallback: false
  },
  // lol I can't believe this is how you ignore a directory in webpack
  // https://github.com/vuejs/vue-cli/issues/2231#issuecomment-413205904
  chainWebpack: config => {

    
    config.plugin('copy').tap(([options]) => {
      options[0].ignore.push('data/**/*');
      return [options];
    });
  },
};
