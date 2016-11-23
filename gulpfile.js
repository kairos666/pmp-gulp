'use strict'

let gulp                = require('gulp'),
    gulpPlugins         = require('gulp-load-plugins')(),
    runSequence         = require('run-sequence'),
    browserSync         = require('browser-sync'),
    Q                   = require('q');

let gulpConf            = require('./tasksRunnerFiles/gulpConfigChunks');

/* ===========================================================================
  DETECT STANDALONE MODE
=========================================================================== */
let isStandAlone   = false;
process.argv.map(function(arg){
  if(arg === '--standalone'){
    isStandAlone = true;
    console.log('STANDALONE MODE');
  }
  console.log(arg)
});

/* ===========================================================================
  BROWSER SYNC PROCESS CONFIG
=========================================================================== */
let bsConfigExtend = function(basicConfig, pluginsHelpersBundle){
  //clone bsOptions
  var extendedConfig = Object.assign({}, basicConfig.bsOptions);

  //add modifier middleware + pimp commands
  extendedConfig.middleware.push(require('./middlewares/html-resp-modifier')(basicConfig.pimpCmds, pluginsHelpersBundle));

  //switch between creating a new browser tab OR reusing the existing one (restart cases)
  process.argv.map(function(arg){
    if(arg === '--no-browser-tab'){
      extendedConfig.reloadOnRestart = true;
      extendedConfig.open = false;
    }
  });

  return extendedConfig;
}

/* ===========================================================================
  GULP TASKS
=========================================================================== */
/* == CLEANING TASKS == */
//clear files in dist folder
gulp.task('clean:styles', require('./tasksRunnerFiles/tasks/transverse-tasks').cleanStyles(gulpConf.styleCfg));
gulp.task('clean:scripts', require('./tasksRunnerFiles/tasks/transverse-tasks').cleanScripts(gulpConf.scriptsCfg));
gulp.task('clean:html', require('./tasksRunnerFiles/tasks/transverse-tasks').cleanHtml(gulpConf.htmlCfg));
gulp.task('clean:sourcemaps', require('./tasksRunnerFiles/tasks/transverse-tasks').cleanSourcemaps(gulpConf.mapPath));
gulp.task('clean:all', (cb) => {
  runSequence(['clean:styles', 'clean:scripts', 'clean:html', 'clean:sourcemaps'], cb);
});

/* == STYLE TASKS == */
// soucemaps + precompile + autoprefix + minify
gulp.task('compile-css', require('./tasksRunnerFiles/tasks/styles-tasks').compileCss(gulp, gulpPlugins, gulpConf.styleCfg));
gulp.task('compile-css-and-livereload', require('./tasksRunnerFiles/tasks/styles-tasks').compileCssAndLivereload(gulp, gulpPlugins, gulpConf.styleCfg, browserSync));

/* == SCRIPTS TASKS == */
// lint + soucemaps + concat + minify
gulp.task('process-js', require('./tasksRunnerFiles/tasks/scripts-tasks')(gulp, gulpPlugins, gulpConf.scriptsCfg));

/* == BUILD TASKS == */
//generate dist files
gulp.task('build:styles', (cb) => {
  runSequence('clean:styles', 'compile-css', cb);
});
gulp.task('build:scripts', (cb) => {
  runSequence('clean:scripts', 'process-js', cb);
});
gulp.task('build:html', (cb) => {
  runSequence('clean:html', 'process-html', cb);
});
gulp.task('build:all', (cb) => {
  runSequence('clean:all', ['compile-css', 'process-js', 'process-html'], cb);
});

/* == WATCH TASKS == */
//build all dist files, start browser sync and watch for changes
gulp.task('watch', ['run-bs', 'build:all'], function(){
  //update styles
  gulp.watch(gulpConf.watchCfg.styles, ['compile-css-and-livereload']);
  //update js
  gulp.watch(gulpConf.watchCfg.scripts, ['build:scripts', 'reload-bs']);
  //update html injections
  gulp.watch(gulpConf.watchCfg.html, ['build:html', 'reload-bs']);

  if(process.send) process.send({type: 'STARTED', msg:'engine is started'});
});

/* == DEFAULT TASK == */
gulp.task('default', function(cb) {
  cb();
  if(!isStandAlone) {
    if(process.send) process.send({type: 'INITIATED', msg:'awaiting config'});
  } else {
    //start proxy server with config described in gulpConfigChunks
    pmpGulpLaunch();
  }
});

/* == MESSAGE BETWEEN PROCESSES == */
process.on('uncaughtException', function (error) {
    if(process.send) process.send({type: 'ERROR', msg:error.message});
});
process.on('message', function (data) {
    switch(data.type){        
        case 'CONFIG':
            if(process.send) process.send({type: 'CONFIG READY', msg:'config received'});
            gulpConf.browserSyncCfg = data.payload;
        
            /* == BROWSER SYNC TASKS == */
            //start proxy server with targeteted config
            pmpGulpLaunch();
        break;
    };
});

/* ===========================================================================
  PMP GULP LAUNCHER (ensure pluginlist & config are ready before doing so)
=========================================================================== */
let pmpGulpLaunch = () => {
  // resolve plugins bundle
  if(process.send) process.send({type: 'CONFIG READY', msg:'processing config'});
  pluginBuilderPromise(gulpConf.browserSyncCfg.plugins).then(pluginsBundle => {
    // PIMP configuration extend & plugins bundle binding
    let finalConfig = bsConfigExtend(gulpConf.browserSyncCfg, pluginsBundle.helpers);

    /* == HTML TASKS == */
    // render static react cmpnts
    gulp.task('process-html', require('./tasksRunnerFiles/tasks/html-tasks')(gulp, gulpPlugins, gulpConf.htmlCfg, pluginsBundle.htmlHelpers));

    /* == BrowserSync TASKS == */
    gulp.task('run-bs', require('./tasksRunnerFiles/tasks/browser-sync-tasks').run(browserSync, finalConfig));
    gulp.task('reload-bs', require('./tasksRunnerFiles/tasks/browser-sync-tasks').reload(browserSync));
    
    // launch server
    if(process.send) process.send({type: 'CONFIG READY', msg:'launching server'});
    gulp.start('watch');
  }).done();
};

/* ===========================================================================
  PLUGIN BUILDER PROMISER
=========================================================================== */
let pluginBuilderPromise = (pluginConfig) => {
  let deferredPluginBundle = Q.defer();

  let pluginsBundle = {
    helpers: {},
    htmlHelpers: {}
  };
  // build bundle
  pluginConfig.forEach(pluginName => {
    // match plugin list to available plugins
    try {
      let pluginPackage = require(pluginName);

      // add to helper bundle
      let helpers = Object.assign({}, pluginPackage.ruleHelpers);
      if(Object.keys(helpers).length !== 0) pluginsBundle.helpers[pluginPackage.ruleHelperObjectName] = helpers;

      // add to HTML helper bundle | clone plugin components & add components to existing ones (beware in name collision)
      let htmlHelpers = Object.assign({}, pluginPackage.htmlHelpers);
      if(Object.keys(htmlHelpers).length !== 0) pluginsBundle.htmlHelpers = Object.assign(pluginsBundle.htmlHelpers, htmlHelpers);
    } catch (e) {
        if (e.code === 'MODULE_NOT_FOUND') {
          console.log(pluginName + ' was not found');
        } else {
          throw e;
        }
    }
  });
  
  deferredPluginBundle.resolve(pluginsBundle);

  return deferredPluginBundle.promise;
};
