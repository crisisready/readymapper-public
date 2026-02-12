module.exports = {
  publicPath: "./",
  transpileDependencies: [
    'flatgeobuf',
    'vue-router'
  ],
  configureWebpack: {
    devtool: 'source-map'
  },
  devServer: {
    historyApiFallback: false
  },
  // lol I can't believe this is how you ignore a directory in webpack
  // https://github.com/vuejs/vue-cli/issues/2231#issuecomment-413205904
  chainWebpack: config => {
    // Handle .mjs files from node_modules with babel-loader
    config.module
      .rule('mjs')
      .test(/\.mjs$/)
      .include.add(/node_modules/)
      .end()
      .use('babel-loader')
      .loader('babel-loader')
      .end();

    config.plugin('copy').tap(([options]) => {
      options[0].ignore.push('data/**/*');
      return [options];
    });
  },
};
