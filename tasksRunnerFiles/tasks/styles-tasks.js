'use strict'

let compileCss = function(gulp, plugins, styleCfg) {
    return function() {
        gulp.src(styleCfg.sassFilePaths)
            .pipe(plugins.plumber({
                errorHandler: function (error) {
                    if(process.send) process.send({type: 'ERROR', msg:'styles compilation issue \n' + error.message});
                    this.emit('end');
                }})
            )
            .pipe(plugins.sourcemaps.init())
            .pipe(plugins.sass())
            .pipe(plugins.autoprefixer(styleCfg.autoprefixerCfg))
            .pipe(plugins.rename(styleCfg.renameRules))
            .pipe(plugins.cleanCss())
            .pipe(plugins.sourcemaps.write(styleCfg.sourcemapsPath))
            .pipe(gulp.dest(styleCfg.cssDestPath));
    }
}

let compileCssAndLivereload = function(gulp, plugins, styleCfg, browserSync) {
    return function() {
        gulp.src(styleCfg.sassFilePaths)
            .pipe(plugins.plumber({
                errorHandler: function (error) {
                    if(process.send) process.send({type: 'ERROR', msg:'styles compilation issue \n' + error.message});
                    this.emit('end');
                }})
            )
            .pipe(plugins.sourcemaps.init())
            .pipe(plugins.sass())
            .pipe(plugins.autoprefixer(styleCfg.autoprefixerCfg))
            .pipe(plugins.rename(styleCfg.renameRules))
            .pipe(plugins.cleanCss())
            .pipe(plugins.sourcemaps.write(styleCfg.sourcemapsPath))
            .pipe(gulp.dest(styleCfg.cssDestPath))
            .pipe(browserSync.reload({stream:true}));
    }
}

module.exports = {
    compileCss: compileCss,
    compileCssAndLivereload: compileCssAndLivereload
}