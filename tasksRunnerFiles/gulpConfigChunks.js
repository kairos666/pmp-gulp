'use strict'

/* == BS options for starting without opening a new window & reloading on start [--no-browser-tab] == */
let noBrowserTabBSConfig = {
    reloadOnRestart: true,
    open: false
};

//absolute path to sourcemaps (should be also added in stylesCfg & scriptsCfg but relative to the dest folder)
let mapPath = 'dist/maps/**/*';

let styleCfg = {
    sassFilePaths: ['src/precss/main.scss'],
    autoprefixerCfg: { browsers: ['last 2 versions', 'IE 8', 'IE 9', 'IE 10'] },
    renameRules:{suffix: '.min'},
    sourcemapsPath:'../maps',
    cssDestPath: 'dist/css/'
}

let scriptsCfg = {
    jsFilePaths: ['src/scripts/**/*.js'],
    jshintCfg: 'default',
    concatCfg: 'main.js',
    renameRules:{suffix: '.min'},
    sourcemapsPath:'../maps',
    jsDestPath: 'dist/js/'
};

/* 
    if no postHtml process are required, just set an empty array
    string values represent the postHtml's npm module to be required
    posthtml-lorem should always be placed before react render, use with attribute --> lorem="[number]"
*/
let htmlCfg = {
    htmlFilePaths: ['src/partials/**/*.html'],
    postHtmlCfg: ['posthtml-lorem', 'posthtml-static-react'],
    htmlDestPath: 'dist/html/'
}

//path patterns for watched files (should be identical to other srcPath configs but for styles that are narrower)
let watchCfg = {
    styles: ['src/precss/**/*.scss'],
    scripts: ['src/scripts/**/*.js'],
    html: ['src/partials/**/*.html'],
}

let browserSyncCfg = {
    bsOptions: {
        proxy: {
            target: 'http://www.syntaxsuccess.com/viewarticle/socket.io-with-rxjs-in-angular-2.0',
            cookies: { stripeDomain: false }
        },
        port:3000,
        serveStatic: ['./dist'],
        middleware: [],
        rewriteRules: []
    },
    pimpCmds:[
        { 
            url:'*/viewarticle*',
            modifs:[`
                $('head').append('<link rel="stylesheet" type="text/css" href="/css/main.min.css">');
                $('body').append('<script type="text/javascript" src="/js/main.min.js"></script>');
                $('body').addClass('sample-modifier-rules');
                $('.container').html('<p>replaced text</p>');
            `] 
        },
        { 
            url:'*/sample-url2*',
            modifs:[`
                $('head').append('<link rel="stylesheet" type="text/css" href="/css/main.min.css">');
                $('body').append('<script type="text/javascript" src="/js/main.min.js"></script>');
                $('body').addClass('sample-modifier-rules2');
            `] 
        }
    ]
}

module.exports = {
    noBrowserTabBSConfig: noBrowserTabBSConfig,
    styleCfg: styleCfg,
    scriptsCfg: scriptsCfg,
    htmlCfg: htmlCfg,
    browserSyncCfg: browserSyncCfg,
    watchCfg: watchCfg,
    mapPath: mapPath
}