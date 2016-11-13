'use strict'

let gulp                = require('gulp'),
    gulpPlugins         = require('gulp-load-plugins')(),
    runSequence         = require('run-sequence'),
    browserSync         = require('browser-sync'),
    Q                   = require('q');

let gulpConf            = require('./tasksRunnerFiles/gulpConfigChunks');

/* ===========================================================================
  PLUGIN LIST PROMISER
=========================================================================== */
let pluginsPromise = () => {
  let deferredPluginList = Q.defer();
  require('child_process').exec('npm ls --json', function(err, stdout, stderr) {
    deferredPluginList.resolve(JSON.parse(stdout));
  });

  return deferredPluginList.promise.then(packageJson => {
    // list all packages
    let packageArray = Object.keys(packageJson.dependencies);

    //filter out pmp plugins
    return packageArray.filter(pack => (pack.indexOf('pmp-plugin') === 0));
  });
};

// available plugin list promise
let pluginList = pluginsPromise();

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
  TARGET PLUGIN (react render bits and helper functions)
=========================================================================== */
//TODO refactor this to use new plugin system
let targetPlugin = {
  components: require('./plugins/reactCmpnt/liferay-v7'),
  helpers: require('./plugins/helpers/liferay-v7-rules-helpers')
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

/* == HTML TASKS == */
// render static react cmpnts
gulp.task('process-html', require('./tasksRunnerFiles/tasks/html-tasks')(gulp, gulpPlugins, gulpConf.htmlCfg, targetPlugin));

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
    pluginList.then(pmpGulpLaunch);
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
            pluginList.then(pmpGulpLaunch);
        break;
    };
});

/* ===========================================================================
  PMP GULP LAUNCHER (ensure pluginlist & config are ready before doing so)
=========================================================================== */
let pmpGulpLaunch = (availablePlugins) => {
  // resolve plugins bundle
  if(process.send) process.send({type: 'CONFIG READY', msg:'processing config'});
  pluginBuilderPromise(gulpConf.browserSyncCfg.plugins, availablePlugins).then(pluginsBundle => {
    // PIMP configuration extend & plugins bundle binding
    let finalConfig = bsConfigExtend(gulpConf.browserSyncCfg, pluginsBundle.helpers);

    // launch server
    if(process.send) process.send({type: 'CONFIG READY', msg:'launching server'});
    gulp.task('run-bs', require('./tasksRunnerFiles/tasks/browser-sync-tasks').run(browserSync, finalConfig));
    gulp.task('reload-bs', require('./tasksRunnerFiles/tasks/browser-sync-tasks').reload(browserSync));
    gulp.run('watch');
  }).done();
};

/* ===========================================================================
  PLUGIN BUILDER PROMISER
=========================================================================== */
let pluginBuilderPromise = (pluginConfig, availablePlugins) => {
  let deferredPluginBundle = Q.defer();

  // match plugin list to available plugins
  let pluginListToProcess = pluginConfig.filter(n => (availablePlugins.indexOf(n) !== -1));

  let pluginsBundle = {
    helpers: {},
    htmlHelpers: {}
  };
  // build bundle
  pluginListToProcess.forEach(pluginName => {
    let pluginPackage = require(pluginName);
    
    // add to helper bundle
    let helpers = Object.assign({}, pluginPackage.ruleHelpers);
    if(Object.keys(helpers).length !== 0) pluginsBundle.helpers[pluginPackage.ruleHelperObjectName] = helpers;
  });
  
  deferredPluginBundle.resolve(pluginsBundle);

  return deferredPluginBundle.promise;
};
