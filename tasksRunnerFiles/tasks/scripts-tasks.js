module.exports = function(gulp, plugins, scriptsCfg) {
    return function() {
        gulp.src(scriptsCfg.jsFilePaths)
            .pipe(plugins.plumber({
                errorHandler: function (error) {
                    if(process.send) process.send({type: 'ERROR', msg:'scripts processing issue \n' + error.message});
                    this.emit('end');
                }})
            )
            .pipe(plugins.jshint())
            .pipe(plugins.jshint.reporter(scriptsCfg.jshintCfg))
            .pipe(plugins.sourcemaps.init())
            .pipe(plugins.concat(scriptsCfg.concatCfg))
            .pipe(plugins.rename(scriptsCfg.renameRules))
            .pipe(plugins.uglify())
            .pipe(plugins.sourcemaps.write(scriptsCfg.sourcemapsPath))
            .pipe(gulp.dest(scriptsCfg.jsDestPath))
    }
}