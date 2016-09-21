# pmp-gulp
Core processing for PMP-engine

## gulp based processing for easy pimping
All core features for pmp engine are handled via gulp task runner.
* BrowserSync tasks for handling the browser output
* HTML tasks for processing html. Essentially based on [posthtml-static-react](https://github.com/rasmusfl0e/posthtml-static-react) plugin
* scripts tasks (jshint, sourcemaps, concatenation, minification)
* styles tasks (compile sass, sourcemaps, autoprefixer, minify)
* transverse tasks (utils to clean dist folder)

## install
```console
npm install pmp-gulp
```

## usage
prefered usage would be through the wrapping package [pmp-engine](https://github.com/kairos666/pmp-engine). But you can use the core directly via the --standalone inline argument.
```console
npm start
```
OR
```console
gulp --standalone
```

## modify pimping rules
This as close to the metal as it can get.
edit **gulpConfigChunks.js** *browserSyncCfg* variable to modify rules for pimping. 
Alternatively you could directly modify the gulp tasks and runSequences to suit your needs. Let's say you want to work with Typescript, or postCss, ...
for more details go check [pmp-engine](https://github.com/kairos666/pmp-engine) documentation
