const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Add the missing WebAssembly extension to the asset extension resolver list
config.resolver.assetExts.push("wasm");

module.exports = config;
