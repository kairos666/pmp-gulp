'use strict'

let fs            = require('fs');
let path          = require('path');

/* = globally available variables in the middleware = */
// $ --> jQuery light version (see available methods https://github.com/cheeriojs/cheerio)
// url --> the current file URL

/* =========================================================================================================================
    Liferay v7 specific helpers functions
========================================================================================================================= */

/*** return HTML partial string from file ***/
let getHTMLFormFile = function(url){
    try {
        return fs.readFileSync(path.join('./dist/html', url), 'utf8');
    } catch (err) {
        // If the type is not missing file, then just throw the error again.
        if (err.code !== 'ENOENT') throw err;

        // Handle a file-not-found error
        return '<p class="alert alert-warning">HTML inject file not found: ' + url + '</p>';
    }
}

/*** prevent all AUI related scripts from execution ***/
let killAUI = function(){
    $('script').each(function(){
        //test for anonymous script tag structure
        if(this.children && this.children[0] && this.children[0].data){
            //search for bundle call
            if(this.children[0].data.indexOf('AUI().use(') !== -1) {
                this.children[0].data = '/* killed scripts */';
            }
        }
    });
}

/*** prevent AUI module to be lazyloaded and executed ***/
//argument is an object with 2 strings : the moduleName / the removePattern string to prevent execution
let auiRemoveUse = function(auiModule){
    $('script').each(function(){
        //test for anonymous script tag structure
        if(this.children && this.children[0] && this.children[0].data){
            //search for bundle call
            if(this.children[0].data.indexOf('AUI().use(') !== -1) {
            //if first module required
            this.children[0].data = this.children[0].data.replace('("' + auiModule.moduleName + '",', '(');
            //other
            this.children[0].data = this.children[0].data.replace(',"' + auiModule.moduleName + '"', '');
            
            //remove constructor call
            this.children[0].data = this.children[0].data.replace(auiModule.removePattern , '');
            }
        }
    });
}

module.exports = {
    getHTMLFormFile: getHTMLFormFile,
    killAUI: killAUI,
    auiRemoveUse: auiRemoveUse
}