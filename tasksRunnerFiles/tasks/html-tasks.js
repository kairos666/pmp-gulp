'use strict'

module.exports = function(gulp, plugins, htmlCfg, targetPlugin) {
    //organize available react component
    var reactComponents    = (targetPlugin.components)? targetPlugin.components : {};
    var reactComponentsKey = [];
    for(var key in reactComponents) {
      reactComponentsKey.push(key);
    };

    //manage postHtml plugins
    let hasPostHtmlProcesses = (htmlCfg.postHtmlCfg.length === 0) ? false : true;
    let postHtmlPlugins = [];
    htmlCfg.postHtmlCfg.map(plugin => {
        let postHtmlPlugin;
        switch(plugin){
            case 'posthtml-static-react':
                postHtmlPlugin = require(plugin)(reactComponentsKey, reactComponents);
            break;
            
            default:
                postHtmlPlugin = require(plugin)();
        }
        postHtmlPlugins.push(postHtmlPlugin);
    });

    return function() {
        return gulp.src(htmlCfg.htmlFilePaths)
        .pipe(plugins.plumber({
            errorHandler: function (error) {
                if(process.send) process.send({type: 'ERROR', msg:'html processing issue \n' + error.message});
                this.emit('end');
        }}))
        .pipe(plugins.if(hasPostHtmlProcesses, plugins.posthtml(postHtmlPlugins)))
        .pipe(gulp.dest(htmlCfg.htmlDestPath))
    };
}