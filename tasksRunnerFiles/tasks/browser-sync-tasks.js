'use strict'

//start browser sync process
let run = function(browserSync, browserSyncCfg) {
    return function(cb) {
        browserSync.init(browserSyncCfg);
        cb();
    };
}

//reload page programmatically in browser sync instance
let reload = function(browserSync) {
    return function(cb) {
        browserSync.reload();
        cb();
    };
}

module.exports = {
    run: run,
    reload: reload
}