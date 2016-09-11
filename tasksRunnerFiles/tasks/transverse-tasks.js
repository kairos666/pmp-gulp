'use strict'

let del                 = require('del');

let cleanStyles = function(styleCfg){
    return () => { del([styleCfg.cssDestPath + '**/*']); };
}

let cleanScripts = function(scriptsCfg){
    return () => { del([scriptsCfg.jsDestPath + '**/*']); };
}

let cleanHtml = function(htmlCfg){
    return () => { del([htmlCfg.htmlDestPath + '**/*']); };
}

let cleanSourcemaps = function(mapPath){
    return () => { del([mapPath]); }
}

module.exports = {
    cleanStyles: cleanStyles,
    cleanScripts: cleanScripts,
    cleanHtml: cleanHtml,
    cleanSourcemaps: cleanSourcemaps
}