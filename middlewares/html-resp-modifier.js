'use strict'

let DEBUG         = false;
let cheerio       = require('cheerio');
let routePattern  = require('route-pattern');
let helpers;

/* ===========================================================================
  UTILITY FUNCTIONS
=========================================================================== */
//DOM --> String converter
let htmlSerialzing = function(jdoc){
    let htmlObject      = jdoc('html');
    let attributes      = (htmlObject[0] && htmlObject[0].attribs) ? htmlObject[0].attribs : {};
    var htmlStringified = '<!DOCTYPE html><html ';
    for(var attr in attributes) {
        htmlStringified += attr + '="' + attributes[attr] + '" ';
    };
    htmlStringified += '>' + htmlObject.html() + '</html>';
    return htmlStringified;
}

//filter pimp rules to apply
let filterPimpCmds = function( obj, req ) {
    let pattern = routePattern.fromString(obj.url);
    var result = pattern.match(req.url);
    if(DEBUG) {
        let shortURL = req.url.substring(0,120) + '...';
        if(result){ console.log('MATCH: ' + shortURL); } else { console.log('NO MATCH: ' + shortURL); }
    }

    return result;
}

//html request checkers
let isHtml = function(str) {
    if (!str) { return false; }
    // Test to see if start of file contents matches:
    // - Optional byte-order mark (BOM)
    // - Zero or more spaces
    // - Any sort of HTML tag, comment, or doctype tag (basically, <...>)
    return /^(\uFEFF|\uFFFE)?\s*<[^>]+>/i.test(str);
};
let snip = function(body) { if (!body) { return false; } };

//apply pimp rules
let pimpIt = function(initialResData, rules){
    // Include, if necessary, replacing the entire res.data with the included snippet.
    if(DEBUG) { console.log('START RESPONSE PIMPING'); }
    
    /* load and parse html string */
    let $ = cheerio.load(initialResData);

    //plugins helpers init
    Object.keys(helpers).forEach(helperName => {
        helpers[helperName].init($);
    });
    
    /* apply rules transformations */
    rules.forEach(function(rule){
        rule.modifs.forEach(function(modif){
            try {
                eval(modif.toString());
            } catch (e) {
                console.log(e);
            };
        });
    });

    /* serialize document back to string */
    var modifiedResData = htmlSerialzing($);

    if(DEBUG) { console.log('END RESPONSE PIMPING'); }

    return modifiedResData;
}

/**
 * Actually do the overwrite
 * @param {Array} rules
 * @param {Boolean} [force] - if true, will always attempt to perform
 * an overwrite - regardless of whether it appears to be HTML or not
 */
let modifyResponse = function(rules, req, res, force) {
    var writeHead   = res.writeHead;
    var runPatches  = true;
    var write       = res.write;
    var end         = res.end;
    req.headers["accept-encoding"] = "identity";

    function restore() {
        res.writeHead = writeHead;
        res.write = write;
        res.end = end;
    }

    res.push = function (chunk) { res.data = (res.data || "") + chunk; };
    res.write = function (string, encoding) {
        if (!runPatches) { return write.call(res, string, encoding); }

        if (string !== undefined) {
            var body = string instanceof Buffer ? string.toString(encoding) : string;
            // If this chunk appears to be valid, push onto the res.data stack
            if (force || (isHtml(body) || isHtml(res.data))) {
                res.push(body);
            } else {
                restore();
                return write.call(res, string, encoding);
            }
        }
        return true;
    };
    res.writeHead = function () {
        if (!runPatches) { return writeHead.apply(res, arguments); }

        var headers = arguments[arguments.length - 1];
        if (typeof headers === "object") {
            for (var name in headers) {
                if (/content-length/i.test(name)) {
                    delete headers[name];
                }
            }
        }

        if (res.getHeader("content-length")) {
            res.removeHeader("content-length");
        }

        writeHead.apply(res, arguments);
    };

    res.end = function (string, encoding) {
        res.data = res.data || "";

        if (typeof string === "string") {
            res.data += string;
        }

        if (string instanceof Buffer) {
            res.data += string.toString();
        }

        if (!runPatches) {
            return end.call(res, string, encoding);
        }
    
        // Check if our body is HTML, and if it does not already have the snippet.
        if (force || isHtml(res.data) && !snip(res.data)) {
            
            //PIMP MAGIC HAPPENS HERE
            res.data = pimpIt(res.data, rules);
            runPatches = false;
        
            if (res.data !== undefined && !res._header) {
                res.setHeader("content-length", Buffer.byteLength(res.data, encoding));
            }
            
            //final call with empty string addition (all HTML has already been received and pimped)
            end.call(res, '', encoding);
        }
    };
}

/* ===========================================================================
  MIDDLEWARE
=========================================================================== */
module.exports = function(modsData, pluginsHelpersBundle) { return function(req, res, next) {
  // assign helpers
  helpers = pluginsHelpersBundle;

  //quick exit when no matching pimp rules, otherwise proceed to modification
  var matchingMods = modsData.filter(obj => { return filterPimpCmds(obj, req) });
  if(matchingMods.length === 0) {
    return next();
  } else {
    modifyResponse(matchingMods, req, res);
    next();
  }
}};