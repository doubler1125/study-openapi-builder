'use strict';
// webpack 基础配置

const fs = require('fs');
const path = require('path');
const webpack = require('webpack');

const webpackConfig = {
    entry: {
        index: "./src/msggen2openapi.ts",
        ConfluenceUpdator: "./src/ConfluenceUpdator.js",
    },

    output: {
        filename: '[name].js',
        path: path.join(__dirname, 'dist'),
        libraryTarget: "global",
    },

    mode: "development",

    target: "node",

    node: {
        console: true,
        global: true,
        process: true,
        Buffer: true,
    },

    resolveLoader: {
        modules: [path.join(__dirname, "node_modules")],
    },
  
    resolve: {
        modules: [
          path.join(__dirname, "src"),
          path.join(__dirname, "node_modules")
        ],
        extensions: ['.js', '.ts', '.tsx']
    },

    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },

    devtool: 'source-map',

    plugins: [
        new webpack.BannerPlugin({
            banner: '#!/usr/bin/env node', 
            raw: true,
            entryOnly: true
        })
    ]
};

module.exports = webpackConfig;
