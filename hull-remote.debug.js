/** vim: et:ts=4:sw=4:sts=4
 * @license RequireJS 2.1.9 Copyright (c) 2010-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */
//Not using strict: uneven strict support in browsers, #392, and causes
//problems with requirejs.exec()/transpiler plugins that may not be strict.
/*jslint regexp: true, nomen: true, sloppy: true */
/*global window, navigator, document, importScripts, setTimeout, opera */

var requirejs, require, define;
(function (global) {
    var req, s, head, baseElement, dataMain, src,
        interactiveScript, currentlyAddingScript, mainScript, subPath,
        version = '2.1.9',
        commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg,
        cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g,
        jsSuffixRegExp = /\.js$/,
        currDirRegExp = /^\.\//,
        op = Object.prototype,
        ostring = op.toString,
        hasOwn = op.hasOwnProperty,
        ap = Array.prototype,
        apsp = ap.splice,
        isBrowser = !!(typeof window !== 'undefined' && typeof navigator !== 'undefined' && window.document),
        isWebWorker = !isBrowser && typeof importScripts !== 'undefined',
        //PS3 indicates loaded and complete, but need to wait for complete
        //specifically. Sequence is 'loading', 'loaded', execution,
        // then 'complete'. The UA check is unfortunate, but not sure how
        //to feature test w/o causing perf issues.
        readyRegExp = isBrowser && navigator.platform === 'PLAYSTATION 3' ?
                      /^complete$/ : /^(complete|loaded)$/,
        defContextName = '_',
        //Oh the tragedy, detecting opera. See the usage of isOpera for reason.
        isOpera = typeof opera !== 'undefined' && opera.toString() === '[object Opera]',
        contexts = {},
        cfg = {},
        globalDefQueue = [],
        useInteractive = false;

    function isFunction(it) {
        return ostring.call(it) === '[object Function]';
    }

    function isArray(it) {
        return ostring.call(it) === '[object Array]';
    }

    /**
     * Helper function for iterating over an array. If the func returns
     * a true value, it will break out of the loop.
     */
    function each(ary, func) {
        if (ary) {
            var i;
            for (i = 0; i < ary.length; i += 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    /**
     * Helper function for iterating over an array backwards. If the func
     * returns a true value, it will break out of the loop.
     */
    function eachReverse(ary, func) {
        if (ary) {
            var i;
            for (i = ary.length - 1; i > -1; i -= 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    function getOwn(obj, prop) {
        return hasProp(obj, prop) && obj[prop];
    }

    /**
     * Cycles over properties in an object and calls a function for each
     * property value. If the function returns a truthy value, then the
     * iteration is stopped.
     */
    function eachProp(obj, func) {
        var prop;
        for (prop in obj) {
            if (hasProp(obj, prop)) {
                if (func(obj[prop], prop)) {
                    break;
                }
            }
        }
    }

    /**
     * Simple function to mix in properties from source into target,
     * but only if target does not already have a property of the same name.
     */
    function mixin(target, source, force, deepStringMixin) {
        if (source) {
            eachProp(source, function (value, prop) {
                if (force || !hasProp(target, prop)) {
                    if (deepStringMixin && typeof value !== 'string') {
                        if (!target[prop]) {
                            target[prop] = {};
                        }
                        mixin(target[prop], value, force, deepStringMixin);
                    } else {
                        target[prop] = value;
                    }
                }
            });
        }
        return target;
    }

    //Similar to Function.prototype.bind, but the 'this' object is specified
    //first, since it is easier to read/figure out what 'this' will be.
    function bind(obj, fn) {
        return function () {
            return fn.apply(obj, arguments);
        };
    }

    function scripts() {
        return document.getElementsByTagName('script');
    }

    function defaultOnError(err) {
        throw err;
    }

    //Allow getting a global that expressed in
    //dot notation, like 'a.b.c'.
    function getGlobal(value) {
        if (!value) {
            return value;
        }
        var g = global;
        each(value.split('.'), function (part) {
            g = g[part];
        });
        return g;
    }

    /**
     * Constructs an error with a pointer to an URL with more information.
     * @param {String} id the error ID that maps to an ID on a web page.
     * @param {String} message human readable error.
     * @param {Error} [err] the original error, if there is one.
     *
     * @returns {Error}
     */
    function makeError(id, msg, err, requireModules) {
        var e = new Error(msg + '\nhttp://requirejs.org/docs/errors.html#' + id);
        e.requireType = id;
        e.requireModules = requireModules;
        if (err) {
            e.originalError = err;
        }
        return e;
    }

    if (typeof define !== 'undefined') {
        //If a define is already in play via another AMD loader,
        //do not overwrite.
        return;
    }

    if (typeof requirejs !== 'undefined') {
        if (isFunction(requirejs)) {
            //Do not overwrite and existing requirejs instance.
            return;
        }
        cfg = requirejs;
        requirejs = undefined;
    }

    //Allow for a require config object
    if (typeof require !== 'undefined' && !isFunction(require)) {
        //assume it is a config object.
        cfg = require;
        require = undefined;
    }

    function newContext(contextName) {
        var inCheckLoaded, Module, context, handlers,
            checkLoadedTimeoutId,
            config = {
                //Defaults. Do not set a default for map
                //config to speed up normalize(), which
                //will run faster if there is no default.
                waitSeconds: 7,
                baseUrl: './',
                paths: {},
                pkgs: {},
                shim: {},
                config: {}
            },
            registry = {},
            //registry of just enabled modules, to speed
            //cycle breaking code when lots of modules
            //are registered, but not activated.
            enabledRegistry = {},
            undefEvents = {},
            defQueue = [],
            defined = {},
            urlFetched = {},
            requireCounter = 1,
            unnormalizedCounter = 1;

        /**
         * Trims the . and .. from an array of path segments.
         * It will keep a leading path segment if a .. will become
         * the first path segment, to help with module name lookups,
         * which act like paths, but can be remapped. But the end result,
         * all paths that use this function should look normalized.
         * NOTE: this method MODIFIES the input array.
         * @param {Array} ary the array of path segments.
         */
        function trimDots(ary) {
            var i, part;
            for (i = 0; ary[i]; i += 1) {
                part = ary[i];
                if (part === '.') {
                    ary.splice(i, 1);
                    i -= 1;
                } else if (part === '..') {
                    if (i === 1 && (ary[2] === '..' || ary[0] === '..')) {
                        //End of the line. Keep at least one non-dot
                        //path segment at the front so it can be mapped
                        //correctly to disk. Otherwise, there is likely
                        //no path mapping for a path starting with '..'.
                        //This can still fail, but catches the most reasonable
                        //uses of ..
                        break;
                    } else if (i > 0) {
                        ary.splice(i - 1, 2);
                        i -= 2;
                    }
                }
            }
        }

        /**
         * Given a relative module name, like ./something, normalize it to
         * a real name that can be mapped to a path.
         * @param {String} name the relative name
         * @param {String} baseName a real name that the name arg is relative
         * to.
         * @param {Boolean} applyMap apply the map config to the value. Should
         * only be done if this normalization is for a dependency ID.
         * @returns {String} normalized name
         */
        function normalize(name, baseName, applyMap) {
            var pkgName, pkgConfig, mapValue, nameParts, i, j, nameSegment,
                foundMap, foundI, foundStarMap, starI,
                baseParts = baseName && baseName.split('/'),
                normalizedBaseParts = baseParts,
                map = config.map,
                starMap = map && map['*'];

            //Adjust any relative paths.
            if (name && name.charAt(0) === '.') {
                //If have a base name, try to normalize against it,
                //otherwise, assume it is a top-level require that will
                //be relative to baseUrl in the end.
                if (baseName) {
                    if (getOwn(config.pkgs, baseName)) {
                        //If the baseName is a package name, then just treat it as one
                        //name to concat the name with.
                        normalizedBaseParts = baseParts = [baseName];
                    } else {
                        //Convert baseName to array, and lop off the last part,
                        //so that . matches that 'directory' and not name of the baseName's
                        //module. For instance, baseName of 'one/two/three', maps to
                        //'one/two/three.js', but we want the directory, 'one/two' for
                        //this normalization.
                        normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                    }

                    name = normalizedBaseParts.concat(name.split('/'));
                    trimDots(name);

                    //Some use of packages may use a . path to reference the
                    //'main' module name, so normalize for that.
                    pkgConfig = getOwn(config.pkgs, (pkgName = name[0]));
                    name = name.join('/');
                    if (pkgConfig && name === pkgName + '/' + pkgConfig.main) {
                        name = pkgName;
                    }
                } else if (name.indexOf('./') === 0) {
                    // No baseName, so this is ID is resolved relative
                    // to baseUrl, pull off the leading dot.
                    name = name.substring(2);
                }
            }

            //Apply map config if available.
            if (applyMap && map && (baseParts || starMap)) {
                nameParts = name.split('/');

                for (i = nameParts.length; i > 0; i -= 1) {
                    nameSegment = nameParts.slice(0, i).join('/');

                    if (baseParts) {
                        //Find the longest baseName segment match in the config.
                        //So, do joins on the biggest to smallest lengths of baseParts.
                        for (j = baseParts.length; j > 0; j -= 1) {
                            mapValue = getOwn(map, baseParts.slice(0, j).join('/'));

                            //baseName segment has config, find if it has one for
                            //this name.
                            if (mapValue) {
                                mapValue = getOwn(mapValue, nameSegment);
                                if (mapValue) {
                                    //Match, update name to the new value.
                                    foundMap = mapValue;
                                    foundI = i;
                                    break;
                                }
                            }
                        }
                    }

                    if (foundMap) {
                        break;
                    }

                    //Check for a star map match, but just hold on to it,
                    //if there is a shorter segment match later in a matching
                    //config, then favor over this star map.
                    if (!foundStarMap && starMap && getOwn(starMap, nameSegment)) {
                        foundStarMap = getOwn(starMap, nameSegment);
                        starI = i;
                    }
                }

                if (!foundMap && foundStarMap) {
                    foundMap = foundStarMap;
                    foundI = starI;
                }

                if (foundMap) {
                    nameParts.splice(0, foundI, foundMap);
                    name = nameParts.join('/');
                }
            }

            return name;
        }

        function removeScript(name) {
            if (isBrowser) {
                each(scripts(), function (scriptNode) {
                    if (scriptNode.getAttribute('data-requiremodule') === name &&
                            scriptNode.getAttribute('data-requirecontext') === context.contextName) {
                        scriptNode.parentNode.removeChild(scriptNode);
                        return true;
                    }
                });
            }
        }

        function hasPathFallback(id) {
            var pathConfig = getOwn(config.paths, id);
            if (pathConfig && isArray(pathConfig) && pathConfig.length > 1) {
                //Pop off the first array value, since it failed, and
                //retry
                pathConfig.shift();
                context.require.undef(id);
                context.require([id]);
                return true;
            }
        }

        //Turns a plugin!resource to [plugin, resource]
        //with the plugin being undefined if the name
        //did not have a plugin prefix.
        function splitPrefix(name) {
            var prefix,
                index = name ? name.indexOf('!') : -1;
            if (index > -1) {
                prefix = name.substring(0, index);
                name = name.substring(index + 1, name.length);
            }
            return [prefix, name];
        }

        /**
         * Creates a module mapping that includes plugin prefix, module
         * name, and path. If parentModuleMap is provided it will
         * also normalize the name via require.normalize()
         *
         * @param {String} name the module name
         * @param {String} [parentModuleMap] parent module map
         * for the module name, used to resolve relative names.
         * @param {Boolean} isNormalized: is the ID already normalized.
         * This is true if this call is done for a define() module ID.
         * @param {Boolean} applyMap: apply the map config to the ID.
         * Should only be true if this map is for a dependency.
         *
         * @returns {Object}
         */
        function makeModuleMap(name, parentModuleMap, isNormalized, applyMap) {
            var url, pluginModule, suffix, nameParts,
                prefix = null,
                parentName = parentModuleMap ? parentModuleMap.name : null,
                originalName = name,
                isDefine = true,
                normalizedName = '';

            //If no name, then it means it is a require call, generate an
            //internal name.
            if (!name) {
                isDefine = false;
                name = '_@r' + (requireCounter += 1);
            }

            nameParts = splitPrefix(name);
            prefix = nameParts[0];
            name = nameParts[1];

            if (prefix) {
                prefix = normalize(prefix, parentName, applyMap);
                pluginModule = getOwn(defined, prefix);
            }

            //Account for relative paths if there is a base name.
            if (name) {
                if (prefix) {
                    if (pluginModule && pluginModule.normalize) {
                        //Plugin is loaded, use its normalize method.
                        normalizedName = pluginModule.normalize(name, function (name) {
                            return normalize(name, parentName, applyMap);
                        });
                    } else {
                        normalizedName = normalize(name, parentName, applyMap);
                    }
                } else {
                    //A regular module.
                    normalizedName = normalize(name, parentName, applyMap);

                    //Normalized name may be a plugin ID due to map config
                    //application in normalize. The map config values must
                    //already be normalized, so do not need to redo that part.
                    nameParts = splitPrefix(normalizedName);
                    prefix = nameParts[0];
                    normalizedName = nameParts[1];
                    isNormalized = true;

                    url = context.nameToUrl(normalizedName);
                }
            }

            //If the id is a plugin id that cannot be determined if it needs
            //normalization, stamp it with a unique ID so two matching relative
            //ids that may conflict can be separate.
            suffix = prefix && !pluginModule && !isNormalized ?
                     '_unnormalized' + (unnormalizedCounter += 1) :
                     '';

            return {
                prefix: prefix,
                name: normalizedName,
                parentMap: parentModuleMap,
                unnormalized: !!suffix,
                url: url,
                originalName: originalName,
                isDefine: isDefine,
                id: (prefix ?
                        prefix + '!' + normalizedName :
                        normalizedName) + suffix
            };
        }

        function getModule(depMap) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (!mod) {
                mod = registry[id] = new context.Module(depMap);
            }

            return mod;
        }

        function on(depMap, name, fn) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (hasProp(defined, id) &&
                    (!mod || mod.defineEmitComplete)) {
                if (name === 'defined') {
                    fn(defined[id]);
                }
            } else {
                mod = getModule(depMap);
                if (mod.error && name === 'error') {
                    fn(mod.error);
                } else {
                    mod.on(name, fn);
                }
            }
        }

        function onError(err, errback) {
            var ids = err.requireModules,
                notified = false;

            if (errback) {
                errback(err);
            } else {
                each(ids, function (id) {
                    var mod = getOwn(registry, id);
                    if (mod) {
                        //Set error on module, so it skips timeout checks.
                        mod.error = err;
                        if (mod.events.error) {
                            notified = true;
                            mod.emit('error', err);
                        }
                    }
                });

                if (!notified) {
                    req.onError(err);
                }
            }
        }

        /**
         * Internal method to transfer globalQueue items to this context's
         * defQueue.
         */
        function takeGlobalQueue() {
            //Push all the globalDefQueue items into the context's defQueue
            if (globalDefQueue.length) {
                //Array splice in the values since the context code has a
                //local var ref to defQueue, so cannot just reassign the one
                //on context.
                apsp.apply(defQueue,
                           [defQueue.length - 1, 0].concat(globalDefQueue));
                globalDefQueue = [];
            }
        }

        handlers = {
            'require': function (mod) {
                if (mod.require) {
                    return mod.require;
                } else {
                    return (mod.require = context.makeRequire(mod.map));
                }
            },
            'exports': function (mod) {
                mod.usingExports = true;
                if (mod.map.isDefine) {
                    if (mod.exports) {
                        return mod.exports;
                    } else {
                        return (mod.exports = defined[mod.map.id] = {});
                    }
                }
            },
            'module': function (mod) {
                if (mod.module) {
                    return mod.module;
                } else {
                    return (mod.module = {
                        id: mod.map.id,
                        uri: mod.map.url,
                        config: function () {
                            var c,
                                pkg = getOwn(config.pkgs, mod.map.id);
                            // For packages, only support config targeted
                            // at the main module.
                            c = pkg ? getOwn(config.config, mod.map.id + '/' + pkg.main) :
                                      getOwn(config.config, mod.map.id);
                            return  c || {};
                        },
                        exports: defined[mod.map.id]
                    });
                }
            }
        };

        function cleanRegistry(id) {
            //Clean up machinery used for waiting modules.
            delete registry[id];
            delete enabledRegistry[id];
        }

        function breakCycle(mod, traced, processed) {
            var id = mod.map.id;

            if (mod.error) {
                mod.emit('error', mod.error);
            } else {
                traced[id] = true;
                each(mod.depMaps, function (depMap, i) {
                    var depId = depMap.id,
                        dep = getOwn(registry, depId);

                    //Only force things that have not completed
                    //being defined, so still in the registry,
                    //and only if it has not been matched up
                    //in the module already.
                    if (dep && !mod.depMatched[i] && !processed[depId]) {
                        if (getOwn(traced, depId)) {
                            mod.defineDep(i, defined[depId]);
                            mod.check(); //pass false?
                        } else {
                            breakCycle(dep, traced, processed);
                        }
                    }
                });
                processed[id] = true;
            }
        }

        function checkLoaded() {
            var map, modId, err, usingPathFallback,
                waitInterval = config.waitSeconds * 1000,
                //It is possible to disable the wait interval by using waitSeconds of 0.
                expired = waitInterval && (context.startTime + waitInterval) < new Date().getTime(),
                noLoads = [],
                reqCalls = [],
                stillLoading = false,
                needCycleCheck = true;

            //Do not bother if this call was a result of a cycle break.
            if (inCheckLoaded) {
                return;
            }

            inCheckLoaded = true;

            //Figure out the state of all the modules.
            eachProp(enabledRegistry, function (mod) {
                map = mod.map;
                modId = map.id;

                //Skip things that are not enabled or in error state.
                if (!mod.enabled) {
                    return;
                }

                if (!map.isDefine) {
                    reqCalls.push(mod);
                }

                if (!mod.error) {
                    //If the module should be executed, and it has not
                    //been inited and time is up, remember it.
                    if (!mod.inited && expired) {
                        if (hasPathFallback(modId)) {
                            usingPathFallback = true;
                            stillLoading = true;
                        } else {
                            noLoads.push(modId);
                            removeScript(modId);
                        }
                    } else if (!mod.inited && mod.fetched && map.isDefine) {
                        stillLoading = true;
                        if (!map.prefix) {
                            //No reason to keep looking for unfinished
                            //loading. If the only stillLoading is a
                            //plugin resource though, keep going,
                            //because it may be that a plugin resource
                            //is waiting on a non-plugin cycle.
                            return (needCycleCheck = false);
                        }
                    }
                }
            });

            if (expired && noLoads.length) {
                //If wait time expired, throw error of unloaded modules.
                err = makeError('timeout', 'Load timeout for modules: ' + noLoads, null, noLoads);
                err.contextName = context.contextName;
                return onError(err);
            }

            //Not expired, check for a cycle.
            if (needCycleCheck) {
                each(reqCalls, function (mod) {
                    breakCycle(mod, {}, {});
                });
            }

            //If still waiting on loads, and the waiting load is something
            //other than a plugin resource, or there are still outstanding
            //scripts, then just try back later.
            if ((!expired || usingPathFallback) && stillLoading) {
                //Something is still waiting to load. Wait for it, but only
                //if a timeout is not already in effect.
                if ((isBrowser || isWebWorker) && !checkLoadedTimeoutId) {
                    checkLoadedTimeoutId = setTimeout(function () {
                        checkLoadedTimeoutId = 0;
                        checkLoaded();
                    }, 50);
                }
            }

            inCheckLoaded = false;
        }

        Module = function (map) {
            this.events = getOwn(undefEvents, map.id) || {};
            this.map = map;
            this.shim = getOwn(config.shim, map.id);
            this.depExports = [];
            this.depMaps = [];
            this.depMatched = [];
            this.pluginMaps = {};
            this.depCount = 0;

            /* this.exports this.factory
               this.depMaps = [],
               this.enabled, this.fetched
            */
        };

        Module.prototype = {
            init: function (depMaps, factory, errback, options) {
                options = options || {};

                //Do not do more inits if already done. Can happen if there
                //are multiple define calls for the same module. That is not
                //a normal, common case, but it is also not unexpected.
                if (this.inited) {
                    return;
                }

                this.factory = factory;

                if (errback) {
                    //Register for errors on this module.
                    this.on('error', errback);
                } else if (this.events.error) {
                    //If no errback already, but there are error listeners
                    //on this module, set up an errback to pass to the deps.
                    errback = bind(this, function (err) {
                        this.emit('error', err);
                    });
                }

                //Do a copy of the dependency array, so that
                //source inputs are not modified. For example
                //"shim" deps are passed in here directly, and
                //doing a direct modification of the depMaps array
                //would affect that config.
                this.depMaps = depMaps && depMaps.slice(0);

                this.errback = errback;

                //Indicate this module has be initialized
                this.inited = true;

                this.ignore = options.ignore;

                //Could have option to init this module in enabled mode,
                //or could have been previously marked as enabled. However,
                //the dependencies are not known until init is called. So
                //if enabled previously, now trigger dependencies as enabled.
                if (options.enabled || this.enabled) {
                    //Enable this module and dependencies.
                    //Will call this.check()
                    this.enable();
                } else {
                    this.check();
                }
            },

            defineDep: function (i, depExports) {
                //Because of cycles, defined callback for a given
                //export can be called more than once.
                if (!this.depMatched[i]) {
                    this.depMatched[i] = true;
                    this.depCount -= 1;
                    this.depExports[i] = depExports;
                }
            },

            fetch: function () {
                if (this.fetched) {
                    return;
                }
                this.fetched = true;

                context.startTime = (new Date()).getTime();

                var map = this.map;

                //If the manager is for a plugin managed resource,
                //ask the plugin to load it now.
                if (this.shim) {
                    context.makeRequire(this.map, {
                        enableBuildCallback: true
                    })(this.shim.deps || [], bind(this, function () {
                        return map.prefix ? this.callPlugin() : this.load();
                    }));
                } else {
                    //Regular dependency.
                    return map.prefix ? this.callPlugin() : this.load();
                }
            },

            load: function () {
                var url = this.map.url;

                //Regular dependency.
                if (!urlFetched[url]) {
                    urlFetched[url] = true;
                    context.load(this.map.id, url);
                }
            },

            /**
             * Checks if the module is ready to define itself, and if so,
             * define it.
             */
            check: function () {
                if (!this.enabled || this.enabling) {
                    return;
                }

                var err, cjsModule,
                    id = this.map.id,
                    depExports = this.depExports,
                    exports = this.exports,
                    factory = this.factory;

                if (!this.inited) {
                    this.fetch();
                } else if (this.error) {
                    this.emit('error', this.error);
                } else if (!this.defining) {
                    //The factory could trigger another require call
                    //that would result in checking this module to
                    //define itself again. If already in the process
                    //of doing that, skip this work.
                    this.defining = true;

                    if (this.depCount < 1 && !this.defined) {
                        if (isFunction(factory)) {
                            //If there is an error listener, favor passing
                            //to that instead of throwing an error. However,
                            //only do it for define()'d  modules. require
                            //errbacks should not be called for failures in
                            //their callbacks (#699). However if a global
                            //onError is set, use that.
                            if ((this.events.error && this.map.isDefine) ||
                                req.onError !== defaultOnError) {
                                try {
                                    exports = context.execCb(id, factory, depExports, exports);
                                } catch (e) {
                                    err = e;
                                }
                            } else {
                                exports = context.execCb(id, factory, depExports, exports);
                            }

                            if (this.map.isDefine) {
                                //If setting exports via 'module' is in play,
                                //favor that over return value and exports. After that,
                                //favor a non-undefined return value over exports use.
                                cjsModule = this.module;
                                if (cjsModule &&
                                        cjsModule.exports !== undefined &&
                                        //Make sure it is not already the exports value
                                        cjsModule.exports !== this.exports) {
                                    exports = cjsModule.exports;
                                } else if (exports === undefined && this.usingExports) {
                                    //exports already set the defined value.
                                    exports = this.exports;
                                }
                            }

                            if (err) {
                                err.requireMap = this.map;
                                err.requireModules = this.map.isDefine ? [this.map.id] : null;
                                err.requireType = this.map.isDefine ? 'define' : 'require';
                                return onError((this.error = err));
                            }

                        } else {
                            //Just a literal value
                            exports = factory;
                        }

                        this.exports = exports;

                        if (this.map.isDefine && !this.ignore) {
                            defined[id] = exports;

                            if (req.onResourceLoad) {
                                req.onResourceLoad(context, this.map, this.depMaps);
                            }
                        }

                        //Clean up
                        cleanRegistry(id);

                        this.defined = true;
                    }

                    //Finished the define stage. Allow calling check again
                    //to allow define notifications below in the case of a
                    //cycle.
                    this.defining = false;

                    if (this.defined && !this.defineEmitted) {
                        this.defineEmitted = true;
                        this.emit('defined', this.exports);
                        this.defineEmitComplete = true;
                    }

                }
            },

            callPlugin: function () {
                var map = this.map,
                    id = map.id,
                    //Map already normalized the prefix.
                    pluginMap = makeModuleMap(map.prefix);

                //Mark this as a dependency for this plugin, so it
                //can be traced for cycles.
                this.depMaps.push(pluginMap);

                on(pluginMap, 'defined', bind(this, function (plugin) {
                    var load, normalizedMap, normalizedMod,
                        name = this.map.name,
                        parentName = this.map.parentMap ? this.map.parentMap.name : null,
                        localRequire = context.makeRequire(map.parentMap, {
                            enableBuildCallback: true
                        });

                    //If current map is not normalized, wait for that
                    //normalized name to load instead of continuing.
                    if (this.map.unnormalized) {
                        //Normalize the ID if the plugin allows it.
                        if (plugin.normalize) {
                            name = plugin.normalize(name, function (name) {
                                return normalize(name, parentName, true);
                            }) || '';
                        }

                        //prefix and name should already be normalized, no need
                        //for applying map config again either.
                        normalizedMap = makeModuleMap(map.prefix + '!' + name,
                                                      this.map.parentMap);
                        on(normalizedMap,
                            'defined', bind(this, function (value) {
                                this.init([], function () { return value; }, null, {
                                    enabled: true,
                                    ignore: true
                                });
                            }));

                        normalizedMod = getOwn(registry, normalizedMap.id);
                        if (normalizedMod) {
                            //Mark this as a dependency for this plugin, so it
                            //can be traced for cycles.
                            this.depMaps.push(normalizedMap);

                            if (this.events.error) {
                                normalizedMod.on('error', bind(this, function (err) {
                                    this.emit('error', err);
                                }));
                            }
                            normalizedMod.enable();
                        }

                        return;
                    }

                    load = bind(this, function (value) {
                        this.init([], function () { return value; }, null, {
                            enabled: true
                        });
                    });

                    load.error = bind(this, function (err) {
                        this.inited = true;
                        this.error = err;
                        err.requireModules = [id];

                        //Remove temp unnormalized modules for this module,
                        //since they will never be resolved otherwise now.
                        eachProp(registry, function (mod) {
                            if (mod.map.id.indexOf(id + '_unnormalized') === 0) {
                                cleanRegistry(mod.map.id);
                            }
                        });

                        onError(err);
                    });

                    //Allow plugins to load other code without having to know the
                    //context or how to 'complete' the load.
                    load.fromText = bind(this, function (text, textAlt) {
                        /*jslint evil: true */
                        var moduleName = map.name,
                            moduleMap = makeModuleMap(moduleName),
                            hasInteractive = useInteractive;

                        //As of 2.1.0, support just passing the text, to reinforce
                        //fromText only being called once per resource. Still
                        //support old style of passing moduleName but discard
                        //that moduleName in favor of the internal ref.
                        if (textAlt) {
                            text = textAlt;
                        }

                        //Turn off interactive script matching for IE for any define
                        //calls in the text, then turn it back on at the end.
                        if (hasInteractive) {
                            useInteractive = false;
                        }

                        //Prime the system by creating a module instance for
                        //it.
                        getModule(moduleMap);

                        //Transfer any config to this other module.
                        if (hasProp(config.config, id)) {
                            config.config[moduleName] = config.config[id];
                        }

                        try {
                            req.exec(text);
                        } catch (e) {
                            return onError(makeError('fromtexteval',
                                             'fromText eval for ' + id +
                                            ' failed: ' + e,
                                             e,
                                             [id]));
                        }

                        if (hasInteractive) {
                            useInteractive = true;
                        }

                        //Mark this as a dependency for the plugin
                        //resource
                        this.depMaps.push(moduleMap);

                        //Support anonymous modules.
                        context.completeLoad(moduleName);

                        //Bind the value of that module to the value for this
                        //resource ID.
                        localRequire([moduleName], load);
                    });

                    //Use parentName here since the plugin's name is not reliable,
                    //could be some weird string with no path that actually wants to
                    //reference the parentName's path.
                    plugin.load(map.name, localRequire, load, config);
                }));

                context.enable(pluginMap, this);
                this.pluginMaps[pluginMap.id] = pluginMap;
            },

            enable: function () {
                enabledRegistry[this.map.id] = this;
                this.enabled = true;

                //Set flag mentioning that the module is enabling,
                //so that immediate calls to the defined callbacks
                //for dependencies do not trigger inadvertent load
                //with the depCount still being zero.
                this.enabling = true;

                //Enable each dependency
                each(this.depMaps, bind(this, function (depMap, i) {
                    var id, mod, handler;

                    if (typeof depMap === 'string') {
                        //Dependency needs to be converted to a depMap
                        //and wired up to this module.
                        depMap = makeModuleMap(depMap,
                                               (this.map.isDefine ? this.map : this.map.parentMap),
                                               false,
                                               !this.skipMap);
                        this.depMaps[i] = depMap;

                        handler = getOwn(handlers, depMap.id);

                        if (handler) {
                            this.depExports[i] = handler(this);
                            return;
                        }

                        this.depCount += 1;

                        on(depMap, 'defined', bind(this, function (depExports) {
                            this.defineDep(i, depExports);
                            this.check();
                        }));

                        if (this.errback) {
                            on(depMap, 'error', bind(this, this.errback));
                        }
                    }

                    id = depMap.id;
                    mod = registry[id];

                    //Skip special modules like 'require', 'exports', 'module'
                    //Also, don't call enable if it is already enabled,
                    //important in circular dependency cases.
                    if (!hasProp(handlers, id) && mod && !mod.enabled) {
                        context.enable(depMap, this);
                    }
                }));

                //Enable each plugin that is used in
                //a dependency
                eachProp(this.pluginMaps, bind(this, function (pluginMap) {
                    var mod = getOwn(registry, pluginMap.id);
                    if (mod && !mod.enabled) {
                        context.enable(pluginMap, this);
                    }
                }));

                this.enabling = false;

                this.check();
            },

            on: function (name, cb) {
                var cbs = this.events[name];
                if (!cbs) {
                    cbs = this.events[name] = [];
                }
                cbs.push(cb);
            },

            emit: function (name, evt) {
                each(this.events[name], function (cb) {
                    cb(evt);
                });
                if (name === 'error') {
                    //Now that the error handler was triggered, remove
                    //the listeners, since this broken Module instance
                    //can stay around for a while in the registry.
                    delete this.events[name];
                }
            }
        };

        function callGetModule(args) {
            //Skip modules already defined.
            if (!hasProp(defined, args[0])) {
                getModule(makeModuleMap(args[0], null, true)).init(args[1], args[2]);
            }
        }

        function removeListener(node, func, name, ieName) {
            //Favor detachEvent because of IE9
            //issue, see attachEvent/addEventListener comment elsewhere
            //in this file.
            if (node.detachEvent && !isOpera) {
                //Probably IE. If not it will throw an error, which will be
                //useful to know.
                if (ieName) {
                    node.detachEvent(ieName, func);
                }
            } else {
                node.removeEventListener(name, func, false);
            }
        }

        /**
         * Given an event from a script node, get the requirejs info from it,
         * and then removes the event listeners on the node.
         * @param {Event} evt
         * @returns {Object}
         */
        function getScriptData(evt) {
            //Using currentTarget instead of target for Firefox 2.0's sake. Not
            //all old browsers will be supported, but this one was easy enough
            //to support and still makes sense.
            var node = evt.currentTarget || evt.srcElement;

            //Remove the listeners once here.
            removeListener(node, context.onScriptLoad, 'load', 'onreadystatechange');
            removeListener(node, context.onScriptError, 'error');

            return {
                node: node,
                id: node && node.getAttribute('data-requiremodule')
            };
        }

        function intakeDefines() {
            var args;

            //Any defined modules in the global queue, intake them now.
            takeGlobalQueue();

            //Make sure any remaining defQueue items get properly processed.
            while (defQueue.length) {
                args = defQueue.shift();
                if (args[0] === null) {
                    return onError(makeError('mismatch', 'Mismatched anonymous define() module: ' + args[args.length - 1]));
                } else {
                    //args are id, deps, factory. Should be normalized by the
                    //define() function.
                    callGetModule(args);
                }
            }
        }

        context = {
            config: config,
            contextName: contextName,
            registry: registry,
            defined: defined,
            urlFetched: urlFetched,
            defQueue: defQueue,
            Module: Module,
            makeModuleMap: makeModuleMap,
            nextTick: req.nextTick,
            onError: onError,

            /**
             * Set a configuration for the context.
             * @param {Object} cfg config object to integrate.
             */
            configure: function (cfg) {
                //Make sure the baseUrl ends in a slash.
                if (cfg.baseUrl) {
                    if (cfg.baseUrl.charAt(cfg.baseUrl.length - 1) !== '/') {
                        cfg.baseUrl += '/';
                    }
                }

                //Save off the paths and packages since they require special processing,
                //they are additive.
                var pkgs = config.pkgs,
                    shim = config.shim,
                    objs = {
                        paths: true,
                        config: true,
                        map: true
                    };

                eachProp(cfg, function (value, prop) {
                    if (objs[prop]) {
                        if (prop === 'map') {
                            if (!config.map) {
                                config.map = {};
                            }
                            mixin(config[prop], value, true, true);
                        } else {
                            mixin(config[prop], value, true);
                        }
                    } else {
                        config[prop] = value;
                    }
                });

                //Merge shim
                if (cfg.shim) {
                    eachProp(cfg.shim, function (value, id) {
                        //Normalize the structure
                        if (isArray(value)) {
                            value = {
                                deps: value
                            };
                        }
                        if ((value.exports || value.init) && !value.exportsFn) {
                            value.exportsFn = context.makeShimExports(value);
                        }
                        shim[id] = value;
                    });
                    config.shim = shim;
                }

                //Adjust packages if necessary.
                if (cfg.packages) {
                    each(cfg.packages, function (pkgObj) {
                        var location;

                        pkgObj = typeof pkgObj === 'string' ? { name: pkgObj } : pkgObj;
                        location = pkgObj.location;

                        //Create a brand new object on pkgs, since currentPackages can
                        //be passed in again, and config.pkgs is the internal transformed
                        //state for all package configs.
                        pkgs[pkgObj.name] = {
                            name: pkgObj.name,
                            location: location || pkgObj.name,
                            //Remove leading dot in main, so main paths are normalized,
                            //and remove any trailing .js, since different package
                            //envs have different conventions: some use a module name,
                            //some use a file name.
                            main: (pkgObj.main || 'main')
                                  .replace(currDirRegExp, '')
                                  .replace(jsSuffixRegExp, '')
                        };
                    });

                    //Done with modifications, assing packages back to context config
                    config.pkgs = pkgs;
                }

                //If there are any "waiting to execute" modules in the registry,
                //update the maps for them, since their info, like URLs to load,
                //may have changed.
                eachProp(registry, function (mod, id) {
                    //If module already has init called, since it is too
                    //late to modify them, and ignore unnormalized ones
                    //since they are transient.
                    if (!mod.inited && !mod.map.unnormalized) {
                        mod.map = makeModuleMap(id);
                    }
                });

                //If a deps array or a config callback is specified, then call
                //require with those args. This is useful when require is defined as a
                //config object before require.js is loaded.
                if (cfg.deps || cfg.callback) {
                    context.require(cfg.deps || [], cfg.callback);
                }
            },

            makeShimExports: function (value) {
                function fn() {
                    var ret;
                    if (value.init) {
                        ret = value.init.apply(global, arguments);
                    }
                    return ret || (value.exports && getGlobal(value.exports));
                }
                return fn;
            },

            makeRequire: function (relMap, options) {
                options = options || {};

                function localRequire(deps, callback, errback) {
                    var id, map, requireMod;

                    if (options.enableBuildCallback && callback && isFunction(callback)) {
                        callback.__requireJsBuild = true;
                    }

                    if (typeof deps === 'string') {
                        if (isFunction(callback)) {
                            //Invalid call
                            return onError(makeError('requireargs', 'Invalid require call'), errback);
                        }

                        //If require|exports|module are requested, get the
                        //value for them from the special handlers. Caveat:
                        //this only works while module is being defined.
                        if (relMap && hasProp(handlers, deps)) {
                            return handlers[deps](registry[relMap.id]);
                        }

                        //Synchronous access to one module. If require.get is
                        //available (as in the Node adapter), prefer that.
                        if (req.get) {
                            return req.get(context, deps, relMap, localRequire);
                        }

                        //Normalize module name, if it contains . or ..
                        map = makeModuleMap(deps, relMap, false, true);
                        id = map.id;

                        if (!hasProp(defined, id)) {
                            return onError(makeError('notloaded', 'Module name "' +
                                        id +
                                        '" has not been loaded yet for context: ' +
                                        contextName +
                                        (relMap ? '' : '. Use require([])')));
                        }
                        return defined[id];
                    }

                    //Grab defines waiting in the global queue.
                    intakeDefines();

                    //Mark all the dependencies as needing to be loaded.
                    context.nextTick(function () {
                        //Some defines could have been added since the
                        //require call, collect them.
                        intakeDefines();

                        requireMod = getModule(makeModuleMap(null, relMap));

                        //Store if map config should be applied to this require
                        //call for dependencies.
                        requireMod.skipMap = options.skipMap;

                        requireMod.init(deps, callback, errback, {
                            enabled: true
                        });

                        checkLoaded();
                    });

                    return localRequire;
                }

                mixin(localRequire, {
                    isBrowser: isBrowser,

                    /**
                     * Converts a module name + .extension into an URL path.
                     * *Requires* the use of a module name. It does not support using
                     * plain URLs like nameToUrl.
                     */
                    toUrl: function (moduleNamePlusExt) {
                        var ext,
                            index = moduleNamePlusExt.lastIndexOf('.'),
                            segment = moduleNamePlusExt.split('/')[0],
                            isRelative = segment === '.' || segment === '..';

                        //Have a file extension alias, and it is not the
                        //dots from a relative path.
                        if (index !== -1 && (!isRelative || index > 1)) {
                            ext = moduleNamePlusExt.substring(index, moduleNamePlusExt.length);
                            moduleNamePlusExt = moduleNamePlusExt.substring(0, index);
                        }

                        return context.nameToUrl(normalize(moduleNamePlusExt,
                                                relMap && relMap.id, true), ext,  true);
                    },

                    defined: function (id) {
                        return hasProp(defined, makeModuleMap(id, relMap, false, true).id);
                    },

                    specified: function (id) {
                        id = makeModuleMap(id, relMap, false, true).id;
                        return hasProp(defined, id) || hasProp(registry, id);
                    }
                });

                //Only allow undef on top level require calls
                if (!relMap) {
                    localRequire.undef = function (id) {
                        //Bind any waiting define() calls to this context,
                        //fix for #408
                        takeGlobalQueue();

                        var map = makeModuleMap(id, relMap, true),
                            mod = getOwn(registry, id);

                        removeScript(id);

                        delete defined[id];
                        delete urlFetched[map.url];
                        delete undefEvents[id];

                        if (mod) {
                            //Hold on to listeners in case the
                            //module will be attempted to be reloaded
                            //using a different config.
                            if (mod.events.defined) {
                                undefEvents[id] = mod.events;
                            }

                            cleanRegistry(id);
                        }
                    };
                }

                return localRequire;
            },

            /**
             * Called to enable a module if it is still in the registry
             * awaiting enablement. A second arg, parent, the parent module,
             * is passed in for context, when this method is overriden by
             * the optimizer. Not shown here to keep code compact.
             */
            enable: function (depMap) {
                var mod = getOwn(registry, depMap.id);
                if (mod) {
                    getModule(depMap).enable();
                }
            },

            /**
             * Internal method used by environment adapters to complete a load event.
             * A load event could be a script load or just a load pass from a synchronous
             * load call.
             * @param {String} moduleName the name of the module to potentially complete.
             */
            completeLoad: function (moduleName) {
                var found, args, mod,
                    shim = getOwn(config.shim, moduleName) || {},
                    shExports = shim.exports;

                takeGlobalQueue();

                while (defQueue.length) {
                    args = defQueue.shift();
                    if (args[0] === null) {
                        args[0] = moduleName;
                        //If already found an anonymous module and bound it
                        //to this name, then this is some other anon module
                        //waiting for its completeLoad to fire.
                        if (found) {
                            break;
                        }
                        found = true;
                    } else if (args[0] === moduleName) {
                        //Found matching define call for this script!
                        found = true;
                    }

                    callGetModule(args);
                }

                //Do this after the cycle of callGetModule in case the result
                //of those calls/init calls changes the registry.
                mod = getOwn(registry, moduleName);

                if (!found && !hasProp(defined, moduleName) && mod && !mod.inited) {
                    if (config.enforceDefine && (!shExports || !getGlobal(shExports))) {
                        if (hasPathFallback(moduleName)) {
                            return;
                        } else {
                            return onError(makeError('nodefine',
                                             'No define call for ' + moduleName,
                                             null,
                                             [moduleName]));
                        }
                    } else {
                        //A script that does not call define(), so just simulate
                        //the call for it.
                        callGetModule([moduleName, (shim.deps || []), shim.exportsFn]);
                    }
                }

                checkLoaded();
            },

            /**
             * Converts a module name to a file path. Supports cases where
             * moduleName may actually be just an URL.
             * Note that it **does not** call normalize on the moduleName,
             * it is assumed to have already been normalized. This is an
             * internal API, not a public one. Use toUrl for the public API.
             */
            nameToUrl: function (moduleName, ext, skipExt) {
                var paths, pkgs, pkg, pkgPath, syms, i, parentModule, url,
                    parentPath;

                //If a colon is in the URL, it indicates a protocol is used and it is just
                //an URL to a file, or if it starts with a slash, contains a query arg (i.e. ?)
                //or ends with .js, then assume the user meant to use an url and not a module id.
                //The slash is important for protocol-less URLs as well as full paths.
                if (req.jsExtRegExp.test(moduleName)) {
                    //Just a plain path, not module name lookup, so just return it.
                    //Add extension if it is included. This is a bit wonky, only non-.js things pass
                    //an extension, this method probably needs to be reworked.
                    url = moduleName + (ext || '');
                } else {
                    //A module that needs to be converted to a path.
                    paths = config.paths;
                    pkgs = config.pkgs;

                    syms = moduleName.split('/');
                    //For each module name segment, see if there is a path
                    //registered for it. Start with most specific name
                    //and work up from it.
                    for (i = syms.length; i > 0; i -= 1) {
                        parentModule = syms.slice(0, i).join('/');
                        pkg = getOwn(pkgs, parentModule);
                        parentPath = getOwn(paths, parentModule);
                        if (parentPath) {
                            //If an array, it means there are a few choices,
                            //Choose the one that is desired
                            if (isArray(parentPath)) {
                                parentPath = parentPath[0];
                            }
                            syms.splice(0, i, parentPath);
                            break;
                        } else if (pkg) {
                            //If module name is just the package name, then looking
                            //for the main module.
                            if (moduleName === pkg.name) {
                                pkgPath = pkg.location + '/' + pkg.main;
                            } else {
                                pkgPath = pkg.location;
                            }
                            syms.splice(0, i, pkgPath);
                            break;
                        }
                    }

                    //Join the path parts together, then figure out if baseUrl is needed.
                    url = syms.join('/');
                    url += (ext || (/^data\:|\?/.test(url) || skipExt ? '' : '.js'));
                    url = (url.charAt(0) === '/' || url.match(/^[\w\+\.\-]+:/) ? '' : config.baseUrl) + url;
                }

                return config.urlArgs ? url +
                                        ((url.indexOf('?') === -1 ? '?' : '&') +
                                         config.urlArgs) : url;
            },

            //Delegates to req.load. Broken out as a separate function to
            //allow overriding in the optimizer.
            load: function (id, url) {
                req.load(context, id, url);
            },

            /**
             * Executes a module callback function. Broken out as a separate function
             * solely to allow the build system to sequence the files in the built
             * layer in the right sequence.
             *
             * @private
             */
            execCb: function (name, callback, args, exports) {
                return callback.apply(exports, args);
            },

            /**
             * callback for script loads, used to check status of loading.
             *
             * @param {Event} evt the event from the browser for the script
             * that was loaded.
             */
            onScriptLoad: function (evt) {
                //Using currentTarget instead of target for Firefox 2.0's sake. Not
                //all old browsers will be supported, but this one was easy enough
                //to support and still makes sense.
                if (evt.type === 'load' ||
                        (readyRegExp.test((evt.currentTarget || evt.srcElement).readyState))) {
                    //Reset interactive script so a script node is not held onto for
                    //to long.
                    interactiveScript = null;

                    //Pull out the name of the module and the context.
                    var data = getScriptData(evt);
                    context.completeLoad(data.id);
                }
            },

            /**
             * Callback for script errors.
             */
            onScriptError: function (evt) {
                var data = getScriptData(evt);
                if (!hasPathFallback(data.id)) {
                    return onError(makeError('scripterror', 'Script error for: ' + data.id, evt, [data.id]));
                }
            }
        };

        context.require = context.makeRequire();
        return context;
    }

    /**
     * Main entry point.
     *
     * If the only argument to require is a string, then the module that
     * is represented by that string is fetched for the appropriate context.
     *
     * If the first argument is an array, then it will be treated as an array
     * of dependency string names to fetch. An optional function callback can
     * be specified to execute when all of those dependencies are available.
     *
     * Make a local req variable to help Caja compliance (it assumes things
     * on a require that are not standardized), and to give a short
     * name for minification/local scope use.
     */
    req = requirejs = function (deps, callback, errback, optional) {

        //Find the right context, use default
        var context, config,
            contextName = defContextName;

        // Determine if have config object in the call.
        if (!isArray(deps) && typeof deps !== 'string') {
            // deps is a config object
            config = deps;
            if (isArray(callback)) {
                // Adjust args if there are dependencies
                deps = callback;
                callback = errback;
                errback = optional;
            } else {
                deps = [];
            }
        }

        if (config && config.context) {
            contextName = config.context;
        }

        context = getOwn(contexts, contextName);
        if (!context) {
            context = contexts[contextName] = req.s.newContext(contextName);
        }

        if (config) {
            context.configure(config);
        }

        return context.require(deps, callback, errback);
    };

    /**
     * Support require.config() to make it easier to cooperate with other
     * AMD loaders on globally agreed names.
     */
    req.config = function (config) {
        return req(config);
    };

    /**
     * Execute something after the current tick
     * of the event loop. Override for other envs
     * that have a better solution than setTimeout.
     * @param  {Function} fn function to execute later.
     */
    req.nextTick = typeof setTimeout !== 'undefined' ? function (fn) {
        setTimeout(fn, 4);
    } : function (fn) { fn(); };

    /**
     * Export require as a global, but only if it does not already exist.
     */
    if (!require) {
        require = req;
    }

    req.version = version;

    //Used to filter out dependencies that are already paths.
    req.jsExtRegExp = /^\/|:|\?|\.js$/;
    req.isBrowser = isBrowser;
    s = req.s = {
        contexts: contexts,
        newContext: newContext
    };

    //Create default context.
    req({});

    //Exports some context-sensitive methods on global require.
    each([
        'toUrl',
        'undef',
        'defined',
        'specified'
    ], function (prop) {
        //Reference from contexts instead of early binding to default context,
        //so that during builds, the latest instance of the default context
        //with its config gets used.
        req[prop] = function () {
            var ctx = contexts[defContextName];
            return ctx.require[prop].apply(ctx, arguments);
        };
    });

    if (isBrowser) {
        head = s.head = document.getElementsByTagName('head')[0];
        //If BASE tag is in play, using appendChild is a problem for IE6.
        //When that browser dies, this can be removed. Details in this jQuery bug:
        //http://dev.jquery.com/ticket/2709
        baseElement = document.getElementsByTagName('base')[0];
        if (baseElement) {
            head = s.head = baseElement.parentNode;
        }
    }

    /**
     * Any errors that require explicitly generates will be passed to this
     * function. Intercept/override it if you want custom error handling.
     * @param {Error} err the error object.
     */
    req.onError = defaultOnError;

    /**
     * Creates the node for the load command. Only used in browser envs.
     */
    req.createNode = function (config, moduleName, url) {
        var node = config.xhtml ?
                document.createElementNS('http://www.w3.org/1999/xhtml', 'html:script') :
                document.createElement('script');
        node.type = config.scriptType || 'text/javascript';
        node.charset = 'utf-8';
        node.async = true;
        return node;
    };

    /**
     * Does the request to load a module for the browser case.
     * Make this a separate function to allow other environments
     * to override it.
     *
     * @param {Object} context the require context to find state.
     * @param {String} moduleName the name of the module.
     * @param {Object} url the URL to the module.
     */
    req.load = function (context, moduleName, url) {
        var config = (context && context.config) || {},
            node;
        if (isBrowser) {
            //In the browser so use a script tag
            node = req.createNode(config, moduleName, url);

            node.setAttribute('data-requirecontext', context.contextName);
            node.setAttribute('data-requiremodule', moduleName);

            //Set up load listener. Test attachEvent first because IE9 has
            //a subtle issue in its addEventListener and script onload firings
            //that do not match the behavior of all other browsers with
            //addEventListener support, which fire the onload event for a
            //script right after the script execution. See:
            //https://connect.microsoft.com/IE/feedback/details/648057/script-onload-event-is-not-fired-immediately-after-script-execution
            //UNFORTUNATELY Opera implements attachEvent but does not follow the script
            //script execution mode.
            if (node.attachEvent &&
                    //Check if node.attachEvent is artificially added by custom script or
                    //natively supported by browser
                    //read https://github.com/jrburke/requirejs/issues/187
                    //if we can NOT find [native code] then it must NOT natively supported.
                    //in IE8, node.attachEvent does not have toString()
                    //Note the test for "[native code" with no closing brace, see:
                    //https://github.com/jrburke/requirejs/issues/273
                    !(node.attachEvent.toString && node.attachEvent.toString().indexOf('[native code') < 0) &&
                    !isOpera) {
                //Probably IE. IE (at least 6-8) do not fire
                //script onload right after executing the script, so
                //we cannot tie the anonymous define call to a name.
                //However, IE reports the script as being in 'interactive'
                //readyState at the time of the define call.
                useInteractive = true;

                node.attachEvent('onreadystatechange', context.onScriptLoad);
                //It would be great to add an error handler here to catch
                //404s in IE9+. However, onreadystatechange will fire before
                //the error handler, so that does not help. If addEventListener
                //is used, then IE will fire error before load, but we cannot
                //use that pathway given the connect.microsoft.com issue
                //mentioned above about not doing the 'script execute,
                //then fire the script load event listener before execute
                //next script' that other browsers do.
                //Best hope: IE10 fixes the issues,
                //and then destroys all installs of IE 6-9.
                //node.attachEvent('onerror', context.onScriptError);
            } else {
                node.addEventListener('load', context.onScriptLoad, false);
                node.addEventListener('error', context.onScriptError, false);
            }
            node.src = url;

            //For some cache cases in IE 6-8, the script executes before the end
            //of the appendChild execution, so to tie an anonymous define
            //call to the module name (which is stored on the node), hold on
            //to a reference to this node, but clear after the DOM insertion.
            currentlyAddingScript = node;
            if (baseElement) {
                head.insertBefore(node, baseElement);
            } else {
                head.appendChild(node);
            }
            currentlyAddingScript = null;

            return node;
        } else if (isWebWorker) {
            try {
                //In a web worker, use importScripts. This is not a very
                //efficient use of importScripts, importScripts will block until
                //its script is downloaded and evaluated. However, if web workers
                //are in play, the expectation that a build has been done so that
                //only one script needs to be loaded anyway. This may need to be
                //reevaluated if other use cases become common.
                importScripts(url);

                //Account for anonymous modules
                context.completeLoad(moduleName);
            } catch (e) {
                context.onError(makeError('importscripts',
                                'importScripts failed for ' +
                                    moduleName + ' at ' + url,
                                e,
                                [moduleName]));
            }
        }
    };

    function getInteractiveScript() {
        if (interactiveScript && interactiveScript.readyState === 'interactive') {
            return interactiveScript;
        }

        eachReverse(scripts(), function (script) {
            if (script.readyState === 'interactive') {
                return (interactiveScript = script);
            }
        });
        return interactiveScript;
    }

    //Look for a data-main script attribute, which could also adjust the baseUrl.
    if (isBrowser && !cfg.skipDataMain) {
        //Figure out baseUrl. Get it from the script tag with require.js in it.
        eachReverse(scripts(), function (script) {
            //Set the 'head' where we can append children by
            //using the script's parent.
            if (!head) {
                head = script.parentNode;
            }

            //Look for a data-main attribute to set main script for the page
            //to load. If it is there, the path to data main becomes the
            //baseUrl, if it is not already set.
            dataMain = script.getAttribute('data-main');
            if (dataMain) {
                //Preserve dataMain in case it is a path (i.e. contains '?')
                mainScript = dataMain;

                //Set final baseUrl if there is not already an explicit one.
                if (!cfg.baseUrl) {
                    //Pull off the directory of data-main for use as the
                    //baseUrl.
                    src = mainScript.split('/');
                    mainScript = src.pop();
                    subPath = src.length ? src.join('/')  + '/' : './';

                    cfg.baseUrl = subPath;
                }

                //Strip off any trailing .js since mainScript is now
                //like a module name.
                mainScript = mainScript.replace(jsSuffixRegExp, '');

                 //If mainScript is still a path, fall back to dataMain
                if (req.jsExtRegExp.test(mainScript)) {
                    mainScript = dataMain;
                }

                //Put the data-main script in the files to load.
                cfg.deps = cfg.deps ? cfg.deps.concat(mainScript) : [mainScript];

                return true;
            }
        });
    }

    /**
     * The function that handles definitions of modules. Differs from
     * require() in that a string for the module should be the first argument,
     * and the function to execute after dependencies are loaded should
     * return a value to define the module corresponding to the first argument's
     * name.
     */
    define = function (name, deps, callback) {
        var node, context;

        //Allow for anonymous modules
        if (typeof name !== 'string') {
            //Adjust args appropriately
            callback = deps;
            deps = name;
            name = null;
        }

        //This module may not have dependencies
        if (!isArray(deps)) {
            callback = deps;
            deps = null;
        }

        //If no name, and callback is a function, then figure out if it a
        //CommonJS thing with dependencies.
        if (!deps && isFunction(callback)) {
            deps = [];
            //Remove comments from the callback string,
            //look for require calls, and pull them into the dependencies,
            //but only if there are function args.
            if (callback.length) {
                callback
                    .toString()
                    .replace(commentRegExp, '')
                    .replace(cjsRequireRegExp, function (match, dep) {
                        deps.push(dep);
                    });

                //May be a CommonJS thing even without require calls, but still
                //could use exports, and module. Avoid doing exports and module
                //work though if it just needs require.
                //REQUIRES the function to expect the CommonJS variables in the
                //order listed below.
                deps = (callback.length === 1 ? ['require'] : ['require', 'exports', 'module']).concat(deps);
            }
        }

        //If in IE 6-8 and hit an anonymous define() call, do the interactive
        //work.
        if (useInteractive) {
            node = currentlyAddingScript || getInteractiveScript();
            if (node) {
                if (!name) {
                    name = node.getAttribute('data-requiremodule');
                }
                context = contexts[node.getAttribute('data-requirecontext')];
            }
        }

        //Always save off evaluating the def call until the script onload handler.
        //This allows multiple modules to be in a file without prematurely
        //tracing dependencies, and allows for anonymous module support,
        //where the module name is not known until the script onload event
        //occurs. If no context, use the global queue, and get it processed
        //in the onscript load callback.
        (context ? context.defQueue : globalDefQueue).push([name, deps, callback]);
    };

    define.amd = {
        jQuery: true
    };


    /**
     * Executes the text. Normally just uses eval, but can be modified
     * to use a better, environment-specific call. Only used for transpiling
     * loader plugins, not for plain JS modules.
     * @param {String} text the text to execute/evaluate.
     */
    req.exec = function (text) {
        /*jslint evil: true */
        return eval(text);
    };

    //Set up with config info.
    req(cfg);
}(this));

define("requireLib", function(){});

/*
    json2.js
    2014-02-04

    Public Domain.

    NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

    See http://www.JSON.org/js.html


    This code should be minified before deployment.
    See http://javascript.crockford.com/jsmin.html

    USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
    NOT CONTROL.


    This file creates a global JSON object containing two methods: stringify
    and parse.

        JSON.stringify(value, replacer, space)
            value       any JavaScript value, usually an object or array.

            replacer    an optional parameter that determines how object
                        values are stringified for objects. It can be a
                        function or an array of strings.

            space       an optional parameter that specifies the indentation
                        of nested structures. If it is omitted, the text will
                        be packed without extra whitespace. If it is a number,
                        it will specify the number of spaces to indent at each
                        level. If it is a string (such as '\t' or '&nbsp;'),
                        it contains the characters used to indent at each level.

            This method produces a JSON text from a JavaScript value.

            When an object value is found, if the object contains a toJSON
            method, its toJSON method will be called and the result will be
            stringified. A toJSON method does not serialize: it returns the
            value represented by the name/value pair that should be serialized,
            or undefined if nothing should be serialized. The toJSON method
            will be passed the key associated with the value, and this will be
            bound to the value

            For example, this would serialize Dates as ISO strings.

                Date.prototype.toJSON = function (key) {
                    function f(n) {
                        // Format integers to have at least two digits.
                        return n < 10 ? '0' + n : n;
                    }

                    return this.getUTCFullYear()   + '-' +
                         f(this.getUTCMonth() + 1) + '-' +
                         f(this.getUTCDate())      + 'T' +
                         f(this.getUTCHours())     + ':' +
                         f(this.getUTCMinutes())   + ':' +
                         f(this.getUTCSeconds())   + 'Z';
                };

            You can provide an optional replacer method. It will be passed the
            key and value of each member, with this bound to the containing
            object. The value that is returned from your method will be
            serialized. If your method returns undefined, then the member will
            be excluded from the serialization.

            If the replacer parameter is an array of strings, then it will be
            used to select the members to be serialized. It filters the results
            such that only members with keys listed in the replacer array are
            stringified.

            Values that do not have JSON representations, such as undefined or
            functions, will not be serialized. Such values in objects will be
            dropped; in arrays they will be replaced with null. You can use
            a replacer function to replace those with JSON values.
            JSON.stringify(undefined) returns undefined.

            The optional space parameter produces a stringification of the
            value that is filled with line breaks and indentation to make it
            easier to read.

            If the space parameter is a non-empty string, then that string will
            be used for indentation. If the space parameter is a number, then
            the indentation will be that many spaces.

            Example:

            text = JSON.stringify(['e', {pluribus: 'unum'}]);
            // text is '["e",{"pluribus":"unum"}]'


            text = JSON.stringify(['e', {pluribus: 'unum'}], null, '\t');
            // text is '[\n\t"e",\n\t{\n\t\t"pluribus": "unum"\n\t}\n]'

            text = JSON.stringify([new Date()], function (key, value) {
                return this[key] instanceof Date ?
                    'Date(' + this[key] + ')' : value;
            });
            // text is '["Date(---current time---)"]'


        JSON.parse(text, reviver)
            This method parses a JSON text to produce an object or array.
            It can throw a SyntaxError exception.

            The optional reviver parameter is a function that can filter and
            transform the results. It receives each of the keys and values,
            and its return value is used instead of the original value.
            If it returns what it received, then the structure is not modified.
            If it returns undefined then the member is deleted.

            Example:

            // Parse the text. Values that look like ISO date strings will
            // be converted to Date objects.

            myData = JSON.parse(text, function (key, value) {
                var a;
                if (typeof value === 'string') {
                    a =
/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
                    if (a) {
                        return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4],
                            +a[5], +a[6]));
                    }
                }
                return value;
            });

            myData = JSON.parse('["Date(09/09/2001)"]', function (key, value) {
                var d;
                if (typeof value === 'string' &&
                        value.slice(0, 5) === 'Date(' &&
                        value.slice(-1) === ')') {
                    d = new Date(value.slice(5, -1));
                    if (d) {
                        return d;
                    }
                }
                return value;
            });


    This is a reference implementation. You are free to copy, modify, or
    redistribute.
*/

/*jslint evil: true, regexp: true */

/*members "", "\b", "\t", "\n", "\f", "\r", "\"", JSON, "\\", apply,
    call, charCodeAt, getUTCDate, getUTCFullYear, getUTCHours,
    getUTCMinutes, getUTCMonth, getUTCSeconds, hasOwnProperty, join,
    lastIndex, length, parse, prototype, push, replace, slice, stringify,
    test, toJSON, toString, valueOf
*/


// Create a JSON object only if one does not already exist. We create the
// methods in a closure to avoid creating global variables.

if (typeof JSON !== 'object') {
    JSON = {};
}

(function () {
    

    function f(n) {
        // Format integers to have at least two digits.
        return n < 10 ? '0' + n : n;
    }

    if (typeof Date.prototype.toJSON !== 'function') {

        Date.prototype.toJSON = function () {

            return isFinite(this.valueOf())
                ? this.getUTCFullYear()     + '-' +
                    f(this.getUTCMonth() + 1) + '-' +
                    f(this.getUTCDate())      + 'T' +
                    f(this.getUTCHours())     + ':' +
                    f(this.getUTCMinutes())   + ':' +
                    f(this.getUTCSeconds())   + 'Z'
                : null;
        };

        String.prototype.toJSON      =
            Number.prototype.toJSON  =
            Boolean.prototype.toJSON = function () {
                return this.valueOf();
            };
    }

    var cx,
        escapable,
        gap,
        indent,
        meta,
        rep;


    function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

        escapable.lastIndex = 0;
        return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
            var c = meta[a];
            return typeof c === 'string'
                ? c
                : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
        }) + '"' : '"' + string + '"';
    }


    function str(key, holder) {

// Produce a string from holder[key].

        var i,          // The loop counter.
            k,          // The member key.
            v,          // The member value.
            length,
            mind = gap,
            partial,
            value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

        if (value && typeof value === 'object' &&
                typeof value.toJSON === 'function') {
            value = value.toJSON(key);
        }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }

// What happens next depends on the value's type.

        switch (typeof value) {
        case 'string':
            return quote(value);

        case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

            return isFinite(value) ? String(value) : 'null';

        case 'boolean':
        case 'null':

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce 'null'. The case is included here in
// the remote chance that this gets fixed someday.

            return String(value);

// If the type is 'object', we might be dealing with an object or an array or
// null.

        case 'object':

// Due to a specification blunder in ECMAScript, typeof null is 'object',
// so watch out for that case.

            if (!value) {
                return 'null';
            }

// Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

// Is the value an array?

            if (Object.prototype.toString.apply(value) === '[object Array]') {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

                v = partial.length === 0
                    ? '[]'
                    : gap
                    ? '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']'
                    : '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }

// If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    if (typeof rep[i] === 'string') {
                        k = rep[i];
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            } else {

// Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

            v = partial.length === 0
                ? '{}'
                : gap
                ? '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}'
                : '{' + partial.join(',') + '}';
            gap = mind;
            return v;
        }
    }

// If the JSON object does not yet have a stringify method, give it one.

    if (typeof JSON.stringify !== 'function') {
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        };
        JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

            var i;
            gap = '';
            indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.

            if (typeof space === 'number') {
                for (i = 0; i < space; i += 1) {
                    indent += ' ';
                }

// If the space parameter is a string, it will be used as the indent string.

            } else if (typeof space === 'string') {
                indent = space;
            }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

            rep = replacer;
            if (replacer && typeof replacer !== 'function' &&
                    (typeof replacer !== 'object' ||
                    typeof replacer.length !== 'number')) {
                throw new Error('JSON.stringify');
            }

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.

            return str('', {'': value});
        };
    }


// If the JSON object does not yet have a parse method, give it one.

    if (typeof JSON.parse !== 'function') {
        cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
        JSON.parse = function (text, reviver) {

// The parse method takes a text and an optional reviver function, and returns
// a JavaScript value if the text is a valid JSON text.

            var j;

            function walk(holder, key) {

// The walk method is used to recursively walk the resulting structure so
// that modifications can be made.

                var k, v, value = holder[key];
                if (value && typeof value === 'object') {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }


// Parsing happens in four stages. In the first stage, we replace certain
// Unicode characters with escape sequences. JavaScript handles many characters
// incorrectly, either silently deleting them, or treating them as line endings.

            text = String(text);
            cx.lastIndex = 0;
            if (cx.test(text)) {
                text = text.replace(cx, function (a) {
                    return '\\u' +
                        ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }

// In the second stage, we run the text against regular expressions that look
// for non-JSON patterns. We are especially concerned with '()' and 'new'
// because they can cause invocation, and '=' because it can cause mutation.
// But just to be safe, we want to reject all unexpected forms.

// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
// replace all simple value tokens with ']' characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or ']' or
// ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

            if (/^[\],:{}\s]*$/
                    .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
                        .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
                        .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

// In the third stage we use the eval function to compile the text into a
// JavaScript structure. The '{' operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

                j = eval('(' + text + ')');

// In the optional fourth stage, we recursively walk the new structure, passing
// each name/value pair to a reviver function for possible transformation.

                return typeof reviver === 'function'
                    ? walk({'': j}, '')
                    : j;
            }

// If the text is not JSON parseable, then a SyntaxError is thrown.

            throw new SyntaxError('JSON.parse');
        };
    }
}());

define("json2", function(){});

//     Underscore.js 1.5.2
//     http://underscorejs.org
//     (c) 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    concat           = ArrayProto.concat,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.5.2';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, length = obj.length; i < length; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      var keys = _.keys(obj);
      for (var i = 0, length = keys.length; i < length; i++) {
        if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return;
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results.push(iterator.call(context, value, index, list));
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    return _.filter(obj, function(value, index, list) {
      return !iterator.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs, first) {
    if (_.isEmpty(attrs)) return first ? void 0 : [];
    return _[first ? 'find' : 'filter'](obj, function(value) {
      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.where(obj, attrs, true);
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See [WebKit Bug 80797](https://bugs.webkit.org/show_bug.cgi?id=80797)
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity, value: -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed > result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity, value: Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array, using the modern version of the 
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // Sample **n** random values from an array.
  // If **n** is not specified, returns a single random element from the array.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (arguments.length < 2 || guard) {
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, value, context) {
      var result = {};
      var iterator = value == null ? _.identity : lookupIterator(value);
      each(obj, function(value, index) {
        var key = iterator.call(context, value, index, obj);
        behavior(result, key, value);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, key, value) {
    (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, key, value) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, key) {
    _.has(result, key) ? result[key]++ : result[key] = 1;
  });

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    return (n == null) || guard ? array[0] : slice.call(array, 0, n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) {
      return array[array.length - 1];
    } else {
      return slice.call(array, Math.max(array.length - n, 0));
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    if (shallow && _.every(input, _.isArray)) {
      return concat.apply(output, input);
    }
    each(input, function(value) {
      if (_.isArray(value) || _.isArguments(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var length = _.max(_.pluck(arguments, "length").concat(0));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(arguments, '' + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, length = list.length; i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, length = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, length + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < length; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(length);

    while(idx < length) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    var args, bound;
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context.
  _.partial = function(func) {
    var args = slice.call(arguments, 1);
    return function() {
      return func.apply(this, args.concat(slice.call(arguments)));
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) throw new Error("bindAll must be passed function names");
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    options || (options = {});
    var later = function() {
      previous = options.leading === false ? 0 : new Date;
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date;
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;
    return function() {
      context = this;
      args = arguments;
      timestamp = new Date();
      var later = function() {
        var last = (new Date()) - timestamp;
        if (last < wait) {
          timeout = setTimeout(later, wait - last);
        } else {
          timeout = null;
          if (!immediate) result = func.apply(context, args);
        }
      };
      var callNow = immediate && !timeout;
      if (!timeout) {
        timeout = setTimeout(later, wait);
      }
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = new Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = new Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] === void 0) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Objects with different constructors are not equivalent, but `Object`s
    // from different frames are.
    var aCtor = a.constructor, bCtor = b.constructor;
    if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                             _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
      return false;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(Math.max(0, n));
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

}).call(this);

define("underscore", (function (global) {
    return function () {
        var ret, fn;
        return ret || global._;
    };
}(this)));

/*!
 * xdm.js – Nicolas Gallagher – MIT License
 * easyXDM – Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no – MIT License
 */

(function (window) {
    

    if (!window.postMessage) {
        return;
    }

    // stores namespace under which the 'xdm' object is stored on the page
    // (empty if object is global)
    var namespace = "";
    var xdm = {};
    // map over global xdm in case of overwrite
    var _xdm = window.xdm;
    var IFRAME_PREFIX = 'xdm_';

    var iframe = document.createElement('IFRAME');
    // randomize the initial id in case multiple closures are loaded
    var channelId = Math.floor(Math.random() * 10000);
    var emptyFn = Function.prototype;
    // returns groups for protocol (2), domain (3) and port (4)
    var reURI = /^((http.?:)\/\/([^:\/\s]+)(:\d+)*)/;
    // matches a foo/../ expression
    var reParent = /[\-\w]+\/\.\.\//;
    // matches `//` anywhere but in the protocol
    var reDoubleSlash = /([^:])\/\//g;

    /**
     * Helper for adding and removing cross-browser event listeners
     */

    var addEvent = (function () {
        if (window.addEventListener) {
            return function (target, type, listener) {
                target.addEventListener(type, listener, false);
            };
        }
        return function (target, type, listener) {
            target.attachEvent('on' + type, listener);
        };
    }());

    var removeEvent = (function () {
        if (window.removeEventListener) {
            return function (target, type, listener) {
                target.removeEventListener(type, listener, false);
            };
        }
        return function (target, type, listener) {
            target.detachEvent('on' + type, listener);
        };
    }());

    /**
     * Build the query object from location.hash
     */

    var query = (function (input) {
        input = input.substring(1, input.length).split('&');
        var data = {}, pair, i = input.length;
        while (i--) {
            pair = input[i].split('=');
            data[pair[0]] = decodeURIComponent(pair[1]);
        }
        return data;
    }(location.hash));

    // -------------------------------------------------------------------------

    /**
     * xdm object setup
     */

    xdm.version = "1.0.1";
    xdm.stack = {};
    xdm.query = query;
    xdm.checkAcl = checkAcl;

    /**
     * Removes the `xdm` variable from the global scope. It also returns control
     * of the `xdm` variable to the code that used it before.
     *
     * @param {String} ns A string representation of an object that will hold
     *   an instance of xdm.
     * @return {xdm}
     */

    xdm.noConflict = function (ns) {
        window.xdm = _xdm;
        namespace = ns;
        if (namespace) {
            IFRAME_PREFIX = 'xdm_' + namespace.replace('.', '_') + '_';
        }
        return xdm;
    };

    // -------------------------------------------------------------------------

    /**
     * Helper for testing if an object is an array
     *
     * @param {Object} obj The object to test
     * @return {Boolean}
     */

    function isArray(obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    }

    /**
     * Helper for testing if a variable/property is undefined
     *
     * @param {Object} variable The variable to test
     * @return {Boolean}
     */

    function undef(variable) {
        return typeof variable === 'undefined';
    }

    /**
     * Returns a string containing the schema, domain and if present the port
     *
     * @param {String} url The url to extract the location from
     * @return {String} The location part of the url
     */

    function getLocation(url) {
        if (!url) {
            throw new Error('url is undefined or empty');
        }
        if (/^file/.test(url)) {
            throw new Error('The file:// protocol is not supported');
        }

        var m = url.toLowerCase().match(reURI);
        if (m) {
            var proto = m[2], domain = m[3], port = m[4] || '';
            if ((proto === 'http:' && port === ':80') || (proto === 'https:' && port === ':443')) {
                port = '';
            }
            return proto + '//' + domain + port;
        }

        return url;
    }

    /**
     * Resolves a relative url into an absolute one.
     *
     * @param {String} url The path to resolve.
     * @return {String} The resolved url.
     */
    function resolveUrl(url) {
        if (!url) {
            throw new Error('url is undefined or empty');
        }

        // replace all `//` except the one in proto with `/`
        url = url.replace(reDoubleSlash, '$1/');

        // if the url is a valid url we do nothing
        if (!url.match(/^(http||https):\/\//)) {
            // If this is a relative path
            var path = (url.substring(0, 1) === '/') ? '' : location.pathname;
            if (path.substring(path.length - 1) !== '/') {
                path = path.substring(0, path.lastIndexOf('/') + 1);
            }

            url = location.protocol + '//' + location.host + path + url;
        }

        // reduce all 'xyz/../' to just ''
        while (reParent.test(url)) {
            url = url.replace(reParent, '');
        }

        return url;
    }

    /**
     * Applies properties from the source object to the target object.
     *
     * @param {Object} destination The target of the properties.
     * @param {Object} source The source of the properties.
     * @param {Boolean} noOverwrite Set to True to only set non-existing properties.
     */

    function merge(destination, source, noOverwrite) {
        var member;
        for (var prop in source) {
            if (source.hasOwnProperty(prop)) {
                if (prop in destination) {
                    member = source[prop];
                    if (typeof member === 'object') {
                        merge(destination[prop], member, noOverwrite);
                    }
                    else if (!noOverwrite) {
                        destination[prop] = source[prop];
                    }
                }
                else {
                    destination[prop] = source[prop];
                }
            }
        }
        return destination;
    }

    /**
     * GUEST ONLY
     * Check whether a host domain is allowed using an Access Control List.
     * The ACL can contain `*` and `?` as wildcards, or can be regular expressions.
     * If regular expressions they need to begin with `^` and end with `$`.
     *
     * @param {Array/String} acl The list of allowed domains
     * @param {String} domain The domain to test.
     * @return {Boolean} True if the domain is allowed, false if not.
     */

    function checkAcl(acl, domain) {
        // normalize into an array
        if (typeof acl === 'string') {
            acl = [acl];
        }
        var re;
        var i = acl.length;
        while (i--) {
            re = acl[i];
            re = new RegExp(re.substr(0, 1) === '^' ? re : ('^' + re.replace(/(\*)/g, '.$1').replace(/\?/g, '.') + '$'));
            if (re.test(domain)) {
                return true;
            }
        }
        return false;
    }

    /**
     * HOST ONLY
     * Appends the parameters to the given url.
     * The base url can contain existing query parameters.
     *
     * @param {String} url The base url.
     * @param {Object} parameters The parameters to add.
     * @return {String} A new valid url with the parameters appended.
     */

    function appendQueryParameters(url, parameters) {
        if (!parameters) {
            throw new Error('parameters is undefined or null');
        }

        var indexOf = url.indexOf('#');
        var q = [];
        for (var key in parameters) {
            if (parameters.hasOwnProperty(key)) {
                q.push(key + '=' + encodeURIComponent(parameters[key]));
            }
        }

        return url + (indexOf === -1 ? '#' : '&') + q.join('&');
    }

    /**
     * HOST ONLY
     * Creates an iframe and appends it to the DOM.
     *
     * @param {Object} config This iframe configuration object
     * @return {Element} The frames DOM Element
     */

    function createFrame(config) {
        var frame = iframe.cloneNode(false);

        // merge the defaults with the configuration properties
        merge(config.props, {
            frameBorder: 0,
            allowTransparency: true,
            scrolling: 'no',
            width: '100%',
            src: appendQueryParameters(config.remote, {
                xdm_e: getLocation(location.href),
                xdm_c: config.channel,
                xdm_p: 1
            }),
            name: IFRAME_PREFIX + config.channel + '_provider',
            style: {
                margin: 0,
                padding: 0,
                border: 0
            }
        });

        frame.id = config.props.name;
        delete config.props.name;

        // if no container, then we cannot proceed
        if (!config.container) {
            throw new Error('xdm.Rpc() configuration object missing a DOM "container" property');
        }

        // merge config properties into the frame
        merge(frame, config.props);

        config.container.appendChild(frame);

        if (config.onLoad) {
            addEvent(frame, 'load', config.onLoad);
        }

        // if we're injecting HTML directly into the iframe
        if (config.html) {
            frame.contentWindow.document.open();
            frame.contentWindow.document.write(config.html);
            frame.contentWindow.document.close();
        }

        // pass a reference to the frame around so that it can be exposed on the
        // rpc object
        config.iframe = frame;

        return frame;
    }

    /**
     * Prepares an array of stack-elements suitable for the current configuration
     *
     * @param {Object} config The Transports configuration.
     * @return {Array} An array of stack-elements with the TransportElement at index 0.
     */

    function prepareTransportStack(config) {
        var stackEls;

        config.isHost = config.isHost || undef(query.xdm_p);
        config.props = config.props || {};

        if (!config.isHost) {
            config.channel = query.xdm_c.replace(/["'<>\\]/g, '');
            config.remote = query.xdm_e.replace(/["'<>\\]/g, '');

            if (config.acl && !checkAcl(config.acl, config.remote)) {
                throw new Error('Access denied for ' + config.remote);
            }
        }
        else {
            config.remote = resolveUrl(config.remote);
            config.channel = config.channel || 'default' + channelId++;
        }

        stackEls = [new xdm.stack.PostMessageTransport(config)];
        // this behavior is responsible for buffering outgoing messages
        stackEls.push(new xdm.stack.QueueBehavior(true));

        return stackEls;
    }

    /**
     * Chains all the separate stack elements into a single usable stack.
     * If an element is missing a necessary method then it will have a pass-through method applied.
     *
     * @param {Array} stackElements An array of stack elements to be linked.
     * @return {xdm.stack.StackElement} The last element in the chain.
     */

    function chainStack(stackElements) {
        var stackEl;
        var i;
        var len = stackElements.length;

        var defaults = {
            incoming: function (message, origin) {
                this.up.incoming(message, origin);
            },
            outgoing: function (message, recipient) {
                this.down.outgoing(message, recipient);
            },
            callback: function (success) {
                this.up.callback(success);
            },
            init: function () {
                this.down.init();
            },
            destroy: function () {
                this.down.destroy();
            }
        };

        for (i = 0; i < len; i++) {
            stackEl = stackElements[i];
            merge(stackEl, defaults, true);

            if (i !== 0) {
                stackEl.down = stackElements[i - 1];
            }

            if (i !== len - 1) {
                stackEl.up = stackElements[i + 1];
            }
        }

        return stackEl;
    }

    /**
     * This will remove a stackelement from its stack while leaving the stack functional.
     *
     * @param {Object} element The elment to remove from the stack.
     */

    function removeFromStack(element) {
        element.up.down = element.down;
        element.down.up = element.up;
        element.up = element.down = null;
    }

    /**
     * xdm.Rpc
     *
     * Creates a proxy object that can be used to call methods implemented on the
     * remote end of the channel, and also to provide the implementation of methods
     * to be called from the remote end.
     *
     * The instantiated object will have methods matching those specified in
     * `config.remote`.
     *
     * @param {Object} config The underlying transport configuration.
     *   remote: The remote window's location
     *   html: HTML to inject into a sourceless iframe
     *   container: The iframe's container DOM element
     *   props: Object of the properties that should be set on the frame
     *   acl: An array of domains to add to the Access Control List
     *   onReady: A function to call when communication has been established
     *   onLoad: A function to called – with the iframe's `contentWindow` as
     *     the argument – when the frame is fully loaded
     * @param {Object} jsonRpcConfig The description of the interface to implement.
     */

    xdm.Rpc = function (config, jsonRpcConfig) {
        var member;

        // expand shorthand notation
        if (jsonRpcConfig.local) {
            for (var method in jsonRpcConfig.local) {
                if (jsonRpcConfig.local.hasOwnProperty(method)) {
                    member = jsonRpcConfig.local[method];
                    if (typeof member === 'function') {
                        jsonRpcConfig.local[method] = {
                            method: member
                        };
                    }
                }
            }
        }

        // create the stack
        var stack = chainStack(prepareTransportStack(config).concat([
            new xdm.stack.RpcBehavior(this, jsonRpcConfig), {
                callback: function (success) {
                    if (config.onReady) config.onReady(success);
                }
            }
        ]));

        // set the origin
        this.origin = getLocation(config.remote);

        // initiates the destruction of the stack.
        this.destroy = function () {
            stack.destroy();
        };

        stack.init();

        // store a reference to the iframe that is created
        this.iframe = config.iframe;
    };

    /**
     * xdm.stack.PostMessageTransport
     *
     * PostMessageTransport uses HTML5 postMessage for communication.
     *
     * @param {Object} config The transports configuration.
     */

    xdm.stack.PostMessageTransport = function (config) {
        var pub;
        var frame;
        var callerWindow;
        var targetOrigin;

        /**
         * This is the main implementation for the onMessage event.
         * It checks the validity of the origin and passes the message on if appropriate.
         *
         * @param {Object} event The message event
         */

        function _windowOnMessage(event) {
            var origin = getLocation(event.origin);
            var dataIsString = (typeof event.data === 'string');
            if (origin === targetOrigin && dataIsString && event.data.substring(0, config.channel.length + 1) === config.channel + ' ') {
                pub.up.incoming(event.data.substring(config.channel.length + 1), origin);
            }
        }

        pub = {
            outgoing: function (message, domain, fn) {
                callerWindow.postMessage(config.channel + ' ' + message, domain || targetOrigin);
                if (fn) {
                    fn();
                }
            },

            destroy: function () {
                removeEvent(window, 'message', _windowOnMessage);
                if (frame) {
                    callerWindow = null;
                    frame.parentNode.removeChild(frame);
                    frame = null;
                }
            },

            init: function () {
                targetOrigin = getLocation(config.remote);
                if (config.isHost) {
                    // add the event handler for listening
                    var waitForReady = function (event) {
                        if (event.data === config.channel + '-ready') {
                            if ('postMessage' in frame.contentWindow) {
                                callerWindow = frame.contentWindow;
                            }
                            else {
                                callerWindow = frame.contentWindow.document;
                            }

                            // replace the eventlistener
                            removeEvent(window, 'message', waitForReady);
                            addEvent(window, 'message', _windowOnMessage);

                            setTimeout(function () {
                                pub.up.callback(true);
                            }, 0);
                        }
                    };

                    addEvent(window, 'message', waitForReady);
                    frame = createFrame(config);
                }
                else {
                     // add the event handler for listening
                    addEvent(window, 'message', _windowOnMessage);
                    if ('postMessage' in window.parent) {
                        callerWindow = window.parent;
                    }
                    else {
                        callerWindow = window.parent.document;
                    }

                    callerWindow.postMessage(config.channel + '-ready', targetOrigin);

                    setTimeout(function () {
                        pub.up.callback(true);
                    }, 0);
                }
            }
        };

        return pub;
    };

    /**
     * xdm.stack.QueueBehavior
     *
     * This is a behavior that enables queueing of messages.
     * It will buffer incoming messages and dispach these as fast as the underlying transport allows.
     *
     * @param {Boolean} remove If true, it will remove from the stack
     */

    xdm.stack.QueueBehavior = function (remove) {
        var pub;
        var queue = [];
        var waiting = true;
        var incoming = '';
        var destroying;

        function dispatch() {
            var message;

            if (remove === true && queue.length === 0) {
                removeFromStack(pub);
                return;
            }
            if (waiting || queue.length === 0 || destroying) {
                return;
            }

            waiting = true;
            message = queue.shift();

            pub.down.outgoing(message.data, message.origin, function (success) {
                waiting = false;
                if (message.callback) {
                    setTimeout(function () {
                        message.callback(success);
                    }, 0);
                }
                dispatch();
            });
        }

        pub = {
            init: function () {
                pub.down.init();
            },

            callback: function (success) {
                waiting = false;
                // in case dispatch calls removeFromStack
                var up = pub.up;
                dispatch();
                up.callback(success);
            },

            incoming: function (message, origin) {
                pub.up.incoming(message, origin);
            },

            outgoing: function (message, origin, fn) {
                queue.push({
                    data: message,
                    origin: origin,
                    callback: fn
                });

                dispatch();
            },

            destroy: function () {
                destroying = true;
                pub.down.destroy();
            }
        };

        return pub;
    };

    /**
     * xdm.stack.RpcBehavior
     *
     * This uses JSON-RPC 2.0 to expose local methods and to invoke remote methods
     * and have responses returned over the the string based transport stack.
     *
     * Exposed methods can return values synchronously, asynchronously, or not at all.
     *
     * @param {Object} proxy The object to apply the methods to.
     * @param {Object} config The definition of the local and remote interface to implement.
     *   local: The local interface to expose.
     *   remote: The remote methods to expose through the proxy.
     */

    xdm.stack.RpcBehavior = function (proxy, config) {
        var pub;
        var _callbackCounter = 0;
        var _callbacks = {};

        /**
         * Serializes and sends the message
         *
         * @param {Object} data The JSON-RPC message to be sent. The jsonrpc property will be added.
         */

        function _send(data) {
            data.jsonrpc = '2.0';
            pub.down.outgoing(JSON.stringify(data));
        }

        /**
         * Creates a method that implements the given definition
         *
         * @param {Object} definition The method configuration
         * @param {String} method The name of the method
         * @return {Function} A stub capable of proxying the requested method call
         */

        function _createMethod(definition, method) {
            var slice = Array.prototype.slice;

            return function () {
                var l = arguments.length;
                var callback;
                var message = {
                    method: method
                };

                if (l > 0 && typeof arguments[l - 1] === 'function') {
                    // one callback, procedure
                    if (l > 1 && typeof arguments[l - 2] === 'function') {
                        // two callbacks, success and error
                        callback = {
                            success: arguments[l - 2],
                            error: arguments[l - 1]
                        };
                        message.params = slice.call(arguments, 0, l - 2);
                    }
                    else {
                        // single callback, success
                        callback = {
                            success: arguments[l - 1]
                        };
                        message.params = slice.call(arguments, 0, l - 1);
                    }
                    _callbacks['' + (++_callbackCounter)] = callback;
                    message.id = _callbackCounter;
                }
                else {
                    // no callbacks, a notification
                    message.params = slice.call(arguments, 0);
                }

                if (definition.namedParams && message.params.length === 1) {
                    message.params = message.params[0];
                }
                // Send the method request
                _send(message);
            };
        }

        /**
         * Executes the exposed method
         *
         * @param {String} method The name of the method
         * @param {Number} id The callback id to use
         * @param {Function} fn The exposed implementation
         * @param {Array} params The parameters supplied by the remote end
         */

        function _executeMethod(method, id, fn, params) {
            if (!fn) {
                if (id) {
                    _send({
                        id: id,
                        error: {
                            code: -32601,
                            message: 'Procedure not found.'
                        }
                    });
                }
                return;
            }

            var success;
            var error;

            if (id) {
                success = function (result) {
                    success = emptyFn;
                    _send({
                        id: id,
                        result: result
                    });
                };

                error = function (message, data) {
                    error = emptyFn;
                    var msg = {
                        id: id,
                        error: {
                            code: -32099,
                            message: message
                        }
                    };

                    if (data) {
                        msg.error.data = data;
                    }
                    _send(msg);
                };
            }
            else {
                success = error = emptyFn;
            }

            // call local method
            if (!isArray(params)) {
                params = [params];
            }

            try {
                var result = fn.method.apply(fn.scope, params.concat([success, error]));
                if (!undef(result)) {
                    success(result);
                }
            }
            catch (ex1) {
                error(ex1.message);
            }
        }

        pub = {
            incoming: function (message, origin) {
                var data = JSON.parse(message);
                var callback;

                if (data.method) {
                    // a method call from the remote end
                    if (config.handle) {
                        config.handle(data, _send);
                    }
                    else {
                        _executeMethod(data.method, data.id, config.local[data.method], data.params);
                    }
                }
                else {
                    // a method response from the other end
                    callback = _callbacks[data.id];
                    if (data.error && callback.error) {
                        callback.error(data.error);
                    }
                    else if (callback.success) {
                        callback.success(data.result);
                    }
                    delete _callbacks[data.id];
                }
            },

            init: function () {
                if (config.remote) {
                    // implement the remote sides exposed methods
                    for (var method in config.remote) {
                        if (config.remote.hasOwnProperty(method)) {
                            proxy[method] = _createMethod(config.remote[method], method);
                        }
                    }
                }
                pub.down.init();
            },

            destroy: function () {
                for (var method in config.remote) {
                    if (config.remote.hasOwnProperty(method) && proxy.hasOwnProperty(method)) {
                        delete proxy[method];
                    }
                }
                pub.down.destroy();
            }
        };

        return pub;
    };

    // commonjs export
    if (typeof exports === 'object') {
        module.exports = xdm;
    }
    // amd export
    else if (typeof define === 'function' && define.amd) {
        define('xdm',[],function () {
            return xdm;
        });
    }
    // browser global
    else {
        window.xdm = xdm;
    }

}(window));

/*!
 * EventEmitter2
 * https://github.com/hij1nx/EventEmitter2
 *
 * Copyright (c) 2013 hij1nx
 * Licensed under the MIT license.
 */
;!function(undefined) {

  var isArray = Array.isArray ? Array.isArray : function _isArray(obj) {
    return Object.prototype.toString.call(obj) === "[object Array]";
  };
  var defaultMaxListeners = 10;

  function init() {
    this._events = {};
    if (this._conf) {
      configure.call(this, this._conf);
    }
  }

  function configure(conf) {
    if (conf) {

      this._conf = conf;

      conf.delimiter && (this.delimiter = conf.delimiter);
      conf.maxListeners && (this._events.maxListeners = conf.maxListeners);
      conf.wildcard && (this.wildcard = conf.wildcard);
      conf.newListener && (this.newListener = conf.newListener);

      if (this.wildcard) {
        this.listenerTree = {};
      }
    }
  }

  function EventEmitter(conf) {
    this._events = {};
    this.newListener = false;
    configure.call(this, conf);
  }

  //
  // Attention, function return type now is array, always !
  // It has zero elements if no any matches found and one or more
  // elements (leafs) if there are matches
  //
  function searchListenerTree(handlers, type, tree, i) {
    if (!tree) {
      return [];
    }
    var listeners=[], leaf, len, branch, xTree, xxTree, isolatedBranch, endReached,
        typeLength = type.length, currentType = type[i], nextType = type[i+1];
    if (i === typeLength && tree._listeners) {
      //
      // If at the end of the event(s) list and the tree has listeners
      // invoke those listeners.
      //
      if (typeof tree._listeners === 'function') {
        handlers && handlers.push(tree._listeners);
        return [tree];
      } else {
        for (leaf = 0, len = tree._listeners.length; leaf < len; leaf++) {
          handlers && handlers.push(tree._listeners[leaf]);
        }
        return [tree];
      }
    }

    if ((currentType === '*' || currentType === '**') || tree[currentType]) {
      //
      // If the event emitted is '*' at this part
      // or there is a concrete match at this patch
      //
      if (currentType === '*') {
        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+1));
          }
        }
        return listeners;
      } else if(currentType === '**') {
        endReached = (i+1 === typeLength || (i+2 === typeLength && nextType === '*'));
        if(endReached && tree._listeners) {
          // The next element has a _listeners, add it to the handlers.
          listeners = listeners.concat(searchListenerTree(handlers, type, tree, typeLength));
        }

        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            if(branch === '*' || branch === '**') {
              if(tree[branch]._listeners && !endReached) {
                listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], typeLength));
              }
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            } else if(branch === nextType) {
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+2));
            } else {
              // No match on this one, shift into the tree but not in the type array.
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            }
          }
        }
        return listeners;
      }

      listeners = listeners.concat(searchListenerTree(handlers, type, tree[currentType], i+1));
    }

    xTree = tree['*'];
    if (xTree) {
      //
      // If the listener tree will allow any match for this part,
      // then recursively explore all branches of the tree
      //
      searchListenerTree(handlers, type, xTree, i+1);
    }

    xxTree = tree['**'];
    if(xxTree) {
      if(i < typeLength) {
        if(xxTree._listeners) {
          // If we have a listener on a '**', it will catch all, so add its handler.
          searchListenerTree(handlers, type, xxTree, typeLength);
        }

        // Build arrays of matching next branches and others.
        for(branch in xxTree) {
          if(branch !== '_listeners' && xxTree.hasOwnProperty(branch)) {
            if(branch === nextType) {
              // We know the next element will match, so jump twice.
              searchListenerTree(handlers, type, xxTree[branch], i+2);
            } else if(branch === currentType) {
              // Current node matches, move into the tree.
              searchListenerTree(handlers, type, xxTree[branch], i+1);
            } else {
              isolatedBranch = {};
              isolatedBranch[branch] = xxTree[branch];
              searchListenerTree(handlers, type, { '**': isolatedBranch }, i+1);
            }
          }
        }
      } else if(xxTree._listeners) {
        // We have reached the end and still on a '**'
        searchListenerTree(handlers, type, xxTree, typeLength);
      } else if(xxTree['*'] && xxTree['*']._listeners) {
        searchListenerTree(handlers, type, xxTree['*'], typeLength);
      }
    }

    return listeners;
  }

  function growListenerTree(type, listener) {

    type = typeof type === 'string' ? type.split(this.delimiter) : type.slice();

    //
    // Looks for two consecutive '**', if so, don't add the event at all.
    //
    for(var i = 0, len = type.length; i+1 < len; i++) {
      if(type[i] === '**' && type[i+1] === '**') {
        return;
      }
    }

    var tree = this.listenerTree;
    var name = type.shift();

    while (name) {

      if (!tree[name]) {
        tree[name] = {};
      }

      tree = tree[name];

      if (type.length === 0) {

        if (!tree._listeners) {
          tree._listeners = listener;
        }
        else if(typeof tree._listeners === 'function') {
          tree._listeners = [tree._listeners, listener];
        }
        else if (isArray(tree._listeners)) {

          tree._listeners.push(listener);

          if (!tree._listeners.warned) {

            var m = defaultMaxListeners;

            if (typeof this._events.maxListeners !== 'undefined') {
              m = this._events.maxListeners;
            }

            if (m > 0 && tree._listeners.length > m) {

              tree._listeners.warned = true;
              console.error('(node) warning: possible EventEmitter memory ' +
                            'leak detected. %d listeners added. ' +
                            'Use emitter.setMaxListeners() to increase limit.',
                            tree._listeners.length);
              console.trace();
            }
          }
        }
        return true;
      }
      name = type.shift();
    }
    return true;
  }

  // By default EventEmitters will print a warning if more than
  // 10 listeners are added to it. This is a useful default which
  // helps finding memory leaks.
  //
  // Obviously not all Emitters should be limited to 10. This function allows
  // that to be increased. Set to zero for unlimited.

  EventEmitter.prototype.delimiter = '.';

  EventEmitter.prototype.setMaxListeners = function(n) {
    this._events || init.call(this);
    this._events.maxListeners = n;
    if (!this._conf) this._conf = {};
    this._conf.maxListeners = n;
  };

  EventEmitter.prototype.event = '';

  EventEmitter.prototype.once = function(event, fn) {
    this.many(event, 1, fn);
    return this;
  };

  EventEmitter.prototype.many = function(event, ttl, fn) {
    var self = this;

    if (typeof fn !== 'function') {
      throw new Error('many only accepts instances of Function');
    }

    function listener() {
      if (--ttl === 0) {
        self.off(event, listener);
      }
      fn.apply(this, arguments);
    }

    listener._origin = fn;

    this.on(event, listener);

    return self;
  };

  EventEmitter.prototype.emit = function() {

    this._events || init.call(this);

    var type = arguments[0];

    if (type === 'newListener' && !this.newListener) {
      if (!this._events.newListener) { return false; }
    }

    // Loop through the *_all* functions and invoke them.
    if (this._all) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
      for (i = 0, l = this._all.length; i < l; i++) {
        this.event = type;
        this._all[i].apply(this, args);
      }
    }

    // If there is no 'error' event listener then throw.
    if (type === 'error') {

      if (!this._all &&
        !this._events.error &&
        !(this.wildcard && this.listenerTree.error)) {

        if (arguments[1] instanceof Error) {
          throw arguments[1]; // Unhandled 'error' event
        } else {
          throw new Error("Uncaught, unspecified 'error' event.");
        }
        return false;
      }
    }

    var handler;

    if(this.wildcard) {
      handler = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handler, ns, this.listenerTree, 0);
    }
    else {
      handler = this._events[type];
    }

    if (typeof handler === 'function') {
      this.event = type;
      if (arguments.length === 1) {
        handler.call(this);
      }
      else if (arguments.length > 1)
        switch (arguments.length) {
          case 2:
            handler.call(this, arguments[1]);
            break;
          case 3:
            handler.call(this, arguments[1], arguments[2]);
            break;
          // slower
          default:
            var l = arguments.length;
            var args = new Array(l - 1);
            for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
            handler.apply(this, args);
        }
      return true;
    }
    else if (handler) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];

      var listeners = handler.slice();
      for (var i = 0, l = listeners.length; i < l; i++) {
        this.event = type;
        listeners[i].apply(this, args);
      }
      return (listeners.length > 0) || !!this._all;
    }
    else {
      return !!this._all;
    }

  };

  EventEmitter.prototype.on = function(type, listener) {

    if (typeof type === 'function') {
      this.onAny(type);
      return this;
    }

    if (typeof listener !== 'function') {
      throw new Error('on only accepts instances of Function');
    }
    this._events || init.call(this);

    // To avoid recursion in the case that type == "newListeners"! Before
    // adding it to the listeners, first emit "newListeners".
    this.emit('newListener', type, listener);

    if(this.wildcard) {
      growListenerTree.call(this, type, listener);
      return this;
    }

    if (!this._events[type]) {
      // Optimize the case of one listener. Don't need the extra array object.
      this._events[type] = listener;
    }
    else if(typeof this._events[type] === 'function') {
      // Adding the second element, need to change to array.
      this._events[type] = [this._events[type], listener];
    }
    else if (isArray(this._events[type])) {
      // If we've already got an array, just append.
      this._events[type].push(listener);

      // Check for listener leak
      if (!this._events[type].warned) {

        var m = defaultMaxListeners;

        if (typeof this._events.maxListeners !== 'undefined') {
          m = this._events.maxListeners;
        }

        if (m > 0 && this._events[type].length > m) {

          this._events[type].warned = true;
          console.error('(node) warning: possible EventEmitter memory ' +
                        'leak detected. %d listeners added. ' +
                        'Use emitter.setMaxListeners() to increase limit.',
                        this._events[type].length);
          console.trace();
        }
      }
    }
    return this;
  };

  EventEmitter.prototype.onAny = function(fn) {

    if (typeof fn !== 'function') {
      throw new Error('onAny only accepts instances of Function');
    }

    if(!this._all) {
      this._all = [];
    }

    // Add the function to the event listener collection.
    this._all.push(fn);
    return this;
  };

  EventEmitter.prototype.addListener = EventEmitter.prototype.on;

  EventEmitter.prototype.off = function(type, listener) {
    if (typeof listener !== 'function') {
      throw new Error('removeListener only takes instances of Function');
    }

    var handlers,leafs=[];

    if(this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);
    }
    else {
      // does not use listeners(), so no side effect of creating _events[type]
      if (!this._events[type]) return this;
      handlers = this._events[type];
      leafs.push({_listeners:handlers});
    }

    for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
      var leaf = leafs[iLeaf];
      handlers = leaf._listeners;
      if (isArray(handlers)) {

        var position = -1;

        for (var i = 0, length = handlers.length; i < length; i++) {
          if (handlers[i] === listener ||
            (handlers[i].listener && handlers[i].listener === listener) ||
            (handlers[i]._origin && handlers[i]._origin === listener)) {
            position = i;
            break;
          }
        }

        if (position < 0) {
          continue;
        }

        if(this.wildcard) {
          leaf._listeners.splice(position, 1);
        }
        else {
          this._events[type].splice(position, 1);
        }

        if (handlers.length === 0) {
          if(this.wildcard) {
            delete leaf._listeners;
          }
          else {
            delete this._events[type];
          }
        }
        return this;
      }
      else if (handlers === listener ||
        (handlers.listener && handlers.listener === listener) ||
        (handlers._origin && handlers._origin === listener)) {
        if(this.wildcard) {
          delete leaf._listeners;
        }
        else {
          delete this._events[type];
        }
      }
    }

    return this;
  };

  EventEmitter.prototype.offAny = function(fn) {
    var i = 0, l = 0, fns;
    if (fn && this._all && this._all.length > 0) {
      fns = this._all;
      for(i = 0, l = fns.length; i < l; i++) {
        if(fn === fns[i]) {
          fns.splice(i, 1);
          return this;
        }
      }
    } else {
      this._all = [];
    }
    return this;
  };

  EventEmitter.prototype.removeListener = EventEmitter.prototype.off;

  EventEmitter.prototype.removeAllListeners = function(type) {
    if (arguments.length === 0) {
      !this._events || init.call(this);
      return this;
    }

    if(this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      var leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);

      for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
        var leaf = leafs[iLeaf];
        leaf._listeners = null;
      }
    }
    else {
      if (!this._events[type]) return this;
      this._events[type] = null;
    }
    return this;
  };

  EventEmitter.prototype.listeners = function(type) {
    if(this.wildcard) {
      var handlers = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handlers, ns, this.listenerTree, 0);
      return handlers;
    }

    this._events || init.call(this);

    if (!this._events[type]) this._events[type] = [];
    if (!isArray(this._events[type])) {
      this._events[type] = [this._events[type]];
    }
    return this._events[type];
  };

  EventEmitter.prototype.listenersAny = function() {

    if(this._all) {
      return this._all;
    }
    else {
      return [];
    }

  };

  if (typeof define === 'function' && define.amd) {
     // AMD. Register as an anonymous module.
    define('eventemitter',[],function() {
      return EventEmitter;
    });
  } else if (typeof exports === 'object') {
    // CommonJS
    exports.EventEmitter2 = EventEmitter;
  }
  else {
    // Browser global.
    window.EventEmitter2 = EventEmitter;
  }
}();

;(function () {

  var
    object = typeof window != 'undefined' ? window : exports,
    chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
    INVALID_CHARACTER_ERR = (function () {
      // fabricate a suitable error object
      try { document.createElement('$'); }
      catch (error) { return error; }}());

  // encoder
  // [https://gist.github.com/999166] by [https://github.com/nignag]
  object.btoa || (
  object.btoa = function (input) {
    for (
      // initialize result and counter
      var block, charCode, idx = 0, map = chars, output = '';
      // if the next input index does not exist:
      //   change the mapping table to "="
      //   check if d has no fractional digits
      input.charAt(idx | 0) || (map = '=', idx % 1);
      // "8 - idx % 1 * 8" generates the sequence 2, 4, 6, 8
      output += map.charAt(63 & block >> 8 - idx % 1 * 8)
    ) {
      charCode = input.charCodeAt(idx += 3/4);
      if (charCode > 0xFF) throw INVALID_CHARACTER_ERR;
      block = block << 8 | charCode;
    }
    return output;
  });

  // decoder
  // [https://gist.github.com/1020396] by [https://github.com/atk]
  object.atob || (
  object.atob = function (input) {
    input = input.replace(/=+$/, '')
    if (input.length % 4 == 1) throw INVALID_CHARACTER_ERR;
    for (
      // initialize result and counters
      var bc = 0, bs, buffer, idx = 0, output = '';
      // get next character
      buffer = input.charAt(idx++);
      // character found in table? initialize bit storage and add its ascii value;
      ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
        // and if not first of each 4 characters,
        // convert the first 8 bits to one ascii character
        bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
    ) {
      // try to find character in table (0-63, not found => -1)
      buffer = chars.indexOf(buffer);
    }
    return output;
  });

}());

define("base64", function(){});

/*!
 * Cookies.js - 0.3.1
 * Wednesday, April 24 2013 @ 2:28 AM EST
 *
 * Copyright (c) 2013, Scott Hamper
 * Licensed under the MIT license,
 * http://www.opensource.org/licenses/MIT
 */
(function (undefined) {
    

    var Cookies = function (key, value, options) {
        return arguments.length === 1 ?
            Cookies.get(key) : Cookies.set(key, value, options);
    };

    // Allows for setter injection in unit tests
    Cookies._document = document;
    Cookies._navigator = navigator;

    Cookies.defaults = {
        path: '/'
    };

    Cookies.get = function (key) {
        if (Cookies._cachedDocumentCookie !== Cookies._document.cookie) {
            Cookies._renewCache();
        }

        return Cookies._cache[key];
    };

    Cookies.set = function (key, value, options) {
        options = Cookies._getExtendedOptions(options);
        options.expires = Cookies._getExpiresDate(value === undefined ? -1 : options.expires);

        Cookies._document.cookie = Cookies._generateCookieString(key, value, options);

        return Cookies;
    };

    Cookies.expire = function (key, options) {
        return Cookies.set(key, undefined, options);
    };

    Cookies._getExtendedOptions = function (options) {
        return {
            path: options && options.path || Cookies.defaults.path,
            domain: options && options.domain || Cookies.defaults.domain,
            expires: options && options.expires || Cookies.defaults.expires,
            secure: options && options.secure !== undefined ?  options.secure : Cookies.defaults.secure
        };
    };

    Cookies._isValidDate = function (date) {
        return Object.prototype.toString.call(date) === '[object Date]' && !isNaN(date.getTime());
    };

    Cookies._getExpiresDate = function (expires, now) {
        now = now || new Date();
        switch (typeof expires) {
            case 'number': expires = new Date(now.getTime() + expires * 1000); break;
            case 'string': expires = new Date(expires); break;
        }

        if (expires && !Cookies._isValidDate(expires)) {
            throw new Error('`expires` parameter cannot be converted to a valid Date instance');
        }

        return expires;
    };

    Cookies._generateCookieString = function (key, value, options) {
        key = encodeURIComponent(key);
        value = (value + '').replace(/[^!#$&-+\--:<-\[\]-~]/g, encodeURIComponent);
        options = options || {};

        var cookieString = key + '=' + value;
        cookieString += options.path ? ';path=' + options.path : '';
        cookieString += options.domain ? ';domain=' + options.domain : '';
        cookieString += options.expires ? ';expires=' + options.expires.toGMTString() : '';
        cookieString += options.secure ? ';secure' : '';

        return cookieString;
    };

    Cookies._getCookieObjectFromString = function (documentCookie) {
        var cookieObject = {};
        var cookiesArray = documentCookie ? documentCookie.split('; ') : [];

        for (var i = 0; i < cookiesArray.length; i++) {
            var cookieKvp = Cookies._getKeyValuePairFromCookieString(cookiesArray[i]);

            if (cookieObject[cookieKvp.key] === undefined) {
                cookieObject[cookieKvp.key] = cookieKvp.value;
            }
        }

        return cookieObject;
    };

    Cookies._getKeyValuePairFromCookieString = function (cookieString) {
        // "=" is a valid character in a cookie value according to RFC6265, so cannot `split('=')`
        var separatorIndex = cookieString.indexOf('=');

        // IE omits the "=" when the cookie value is an empty string
        separatorIndex = separatorIndex < 0 ? cookieString.length : separatorIndex;

        return {
            key: decodeURIComponent(cookieString.substr(0, separatorIndex)),
            value: decodeURIComponent(cookieString.substr(separatorIndex + 1))
        };
    };

    Cookies._renewCache = function () {
        Cookies._cache = Cookies._getCookieObjectFromString(Cookies._document.cookie);
        Cookies._cachedDocumentCookie = Cookies._document.cookie;
    };

    Cookies._areEnabled = function () {
        return Cookies._navigator.cookieEnabled ||
            Cookies.set('cookies.js', 1).get('cookies.js') === '1';
    };

    Cookies.enabled = Cookies._areEnabled();

    // AMD support
    if (typeof define === 'function' && define.amd) {
        define('cookie',[],function () { return Cookies; });
    // CommonJS and Node.js module support.
    } else if (typeof exports !== 'undefined') {
        // Support Node.js specific `module.exports` (which can be a function)
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = Cookies;
        }
        // But always support CommonJS module 1.1.1 spec (`exports` cannot be a function)
        exports.Cookies = Cookies;
    } else {
        window.Cookies = Cookies;
    }
})();
/*
 * Purl (A JavaScript URL parser) v2.3.1
 * Developed and maintanined by Mark Perkins, mark@allmarkedup.com
 * Source repository: https://github.com/allmarkedup/jQuery-URL-Parser
 * Licensed under an MIT-style license. See https://github.com/allmarkedup/jQuery-URL-Parser/blob/master/LICENSE for details.
 */

;(function(factory) {
    if (typeof define === 'function' && define.amd) {
        define('purl',factory);
    } else {
        window.purl = factory();
    }
})(function() {

    var tag2attr = {
            a       : 'href',
            img     : 'src',
            form    : 'action',
            base    : 'href',
            script  : 'src',
            iframe  : 'src',
            link    : 'href'
        },

        key = ['source', 'protocol', 'authority', 'userInfo', 'user', 'password', 'host', 'port', 'relative', 'path', 'directory', 'file', 'query', 'fragment'], // keys available to query

        aliases = { 'anchor' : 'fragment' }, // aliases for backwards compatability

        parser = {
            strict : /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,  //less intuitive, more accurate to the specs
            loose :  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/ // more intuitive, fails on relative paths and deviates from specs
        },

        isint = /^[0-9]+$/;

    function parseUri( url, strictMode ) {
        var str = decodeURI( url ),
        res   = parser[ strictMode || false ? 'strict' : 'loose' ].exec( str ),
        uri = { attr : {}, param : {}, seg : {} },
        i   = 14;

        while ( i-- ) {
            uri.attr[ key[i] ] = res[i] || '';
        }

        // build query and fragment parameters
        uri.param['query'] = parseString(uri.attr['query']);
        uri.param['fragment'] = parseString(uri.attr['fragment']);

        // split path and fragement into segments
        uri.seg['path'] = uri.attr.path.replace(/^\/+|\/+$/g,'').split('/');
        uri.seg['fragment'] = uri.attr.fragment.replace(/^\/+|\/+$/g,'').split('/');

        // compile a 'base' domain attribute
        uri.attr['base'] = uri.attr.host ? (uri.attr.protocol ?  uri.attr.protocol+'://'+uri.attr.host : uri.attr.host) + (uri.attr.port ? ':'+uri.attr.port : '') : '';

        return uri;
    }

    function getAttrName( elm ) {
        var tn = elm.tagName;
        if ( typeof tn !== 'undefined' ) return tag2attr[tn.toLowerCase()];
        return tn;
    }

    function promote(parent, key) {
        if (parent[key].length === 0) return parent[key] = {};
        var t = {};
        for (var i in parent[key]) t[i] = parent[key][i];
        parent[key] = t;
        return t;
    }

    function parse(parts, parent, key, val) {
        var part = parts.shift();
        if (!part) {
            if (isArray(parent[key])) {
                parent[key].push(val);
            } else if ('object' == typeof parent[key]) {
                parent[key] = val;
            } else if ('undefined' == typeof parent[key]) {
                parent[key] = val;
            } else {
                parent[key] = [parent[key], val];
            }
        } else {
            var obj = parent[key] = parent[key] || [];
            if (']' == part) {
                if (isArray(obj)) {
                    if ('' !== val) obj.push(val);
                } else if ('object' == typeof obj) {
                    obj[keys(obj).length] = val;
                } else {
                    obj = parent[key] = [parent[key], val];
                }
            } else if (~part.indexOf(']')) {
                part = part.substr(0, part.length - 1);
                if (!isint.test(part) && isArray(obj)) obj = promote(parent, key);
                parse(parts, obj, part, val);
                // key
            } else {
                if (!isint.test(part) && isArray(obj)) obj = promote(parent, key);
                parse(parts, obj, part, val);
            }
        }
    }

    function merge(parent, key, val) {
        if (~key.indexOf(']')) {
            var parts = key.split('[');
            parse(parts, parent, 'base', val);
        } else {
            if (!isint.test(key) && isArray(parent.base)) {
                var t = {};
                for (var k in parent.base) t[k] = parent.base[k];
                parent.base = t;
            }
            if (key !== '') {
                set(parent.base, key, val);
            }
        }
        return parent;
    }

    function parseString(str) {
        return reduce(String(str).split(/&|;/), function(ret, pair) {
            try {
                pair = decodeURIComponent(pair.replace(/\+/g, ' '));
            } catch(e) {
                // ignore
            }
            var eql = pair.indexOf('='),
                brace = lastBraceInKey(pair),
                key = pair.substr(0, brace || eql),
                val = pair.substr(brace || eql, pair.length);

            val = val.substr(val.indexOf('=') + 1, val.length);

            if (key === '') {
                key = pair;
                val = '';
            }

            return merge(ret, key, val);
        }, { base: {} }).base;
    }

    function set(obj, key, val) {
        var v = obj[key];
        if (typeof v === 'undefined') {
            obj[key] = val;
        } else if (isArray(v)) {
            v.push(val);
        } else {
            obj[key] = [v, val];
        }
    }

    function lastBraceInKey(str) {
        var len = str.length,
            brace,
            c;
        for (var i = 0; i < len; ++i) {
            c = str[i];
            if (']' == c) brace = false;
            if ('[' == c) brace = true;
            if ('=' == c && !brace) return i;
        }
    }

    function reduce(obj, accumulator){
        var i = 0,
            l = obj.length >> 0,
            curr = arguments[2];
        while (i < l) {
            if (i in obj) curr = accumulator.call(undefined, curr, obj[i], i, obj);
            ++i;
        }
        return curr;
    }

    function isArray(vArg) {
        return Object.prototype.toString.call(vArg) === "[object Array]";
    }

    function keys(obj) {
        var key_array = [];
        for ( var prop in obj ) {
            if ( obj.hasOwnProperty(prop) ) key_array.push(prop);
        }
        return key_array;
    }

    function purl( url, strictMode ) {
        if ( arguments.length === 1 && url === true ) {
            strictMode = true;
            url = undefined;
        }
        strictMode = strictMode || false;
        url = url || window.location.toString();

        return {

            data : parseUri(url, strictMode),

            // get various attributes from the URI
            attr : function( attr ) {
                attr = aliases[attr] || attr;
                return typeof attr !== 'undefined' ? this.data.attr[attr] : this.data.attr;
            },

            // return query string parameters
            param : function( param ) {
                return typeof param !== 'undefined' ? this.data.param.query[param] : this.data.param.query;
            },

            // return fragment parameters
            fparam : function( param ) {
                return typeof param !== 'undefined' ? this.data.param.fragment[param] : this.data.param.fragment;
            },

            // return path segments
            segment : function( seg ) {
                if ( typeof seg === 'undefined' ) {
                    return this.data.seg.path;
                } else {
                    seg = seg < 0 ? this.data.seg.path.length + seg : seg - 1; // negative segments count from the end
                    return this.data.seg.path[seg];
                }
            },

            // return fragment segments
            fsegment : function( seg ) {
                if ( typeof seg === 'undefined' ) {
                    return this.data.seg.fragment;
                } else {
                    seg = seg < 0 ? this.data.seg.fragment.length + seg : seg - 1; // negative segments count from the end
                    return this.data.seg.fragment[seg];
                }
            }

        };

    }
    
    purl.jQuery = function($){
        if ($ != null) {
            $.fn.url = function( strictMode ) {
                var url = '';
                if ( this.length ) {
                    url = $(this).attr( getAttrName(this[0]) ) || '';
                }
                return purl( url, strictMode );
            };

            $.url = purl;
        }
    };

    purl.jQuery(window.jQuery);

    return purl;

});

;(function(){

/**
 * Require the given path.
 *
 * @param {String} path
 * @return {Object} exports
 * @api public
 */

function require(path, parent, orig) {
  var resolved = require.resolve(path);

  // lookup failed
  if (null == resolved) {
    orig = orig || path;
    parent = parent || 'root';
    var err = new Error('Failed to require "' + orig + '" from "' + parent + '"');
    err.path = orig;
    err.parent = parent;
    err.require = true;
    throw err;
  }

  var module = require.modules[resolved];

  // perform real require()
  // by invoking the module's
  // registered function
  if (!module._resolving && !module.exports) {
    var mod = {};
    mod.exports = {};
    mod.client = mod.component = true;
    module._resolving = true;
    module.call(this, mod.exports, require.relative(resolved), mod);
    delete module._resolving;
    module.exports = mod.exports;
  }

  return module.exports;
}

/**
 * Registered modules.
 */

require.modules = {};

/**
 * Registered aliases.
 */

require.aliases = {};

/**
 * Resolve `path`.
 *
 * Lookup:
 *
 *   - PATH/index.js
 *   - PATH.js
 *   - PATH
 *
 * @param {String} path
 * @return {String} path or null
 * @api private
 */

require.resolve = function(path) {
  if (path.charAt(0) === '/') path = path.slice(1);

  var paths = [
    path,
    path + '.js',
    path + '.json',
    path + '/index.js',
    path + '/index.json'
  ];

  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];
    if (require.modules.hasOwnProperty(path)) return path;
    if (require.aliases.hasOwnProperty(path)) return require.aliases[path];
  }
};

/**
 * Normalize `path` relative to the current path.
 *
 * @param {String} curr
 * @param {String} path
 * @return {String}
 * @api private
 */

require.normalize = function(curr, path) {
  var segs = [];

  if ('.' != path.charAt(0)) return path;

  curr = curr.split('/');
  path = path.split('/');

  for (var i = 0; i < path.length; ++i) {
    if ('..' == path[i]) {
      curr.pop();
    } else if ('.' != path[i] && '' != path[i]) {
      segs.push(path[i]);
    }
  }

  return curr.concat(segs).join('/');
};

/**
 * Register module at `path` with callback `definition`.
 *
 * @param {String} path
 * @param {Function} definition
 * @api private
 */

require.register = function(path, definition) {
  require.modules[path] = definition;
};

/**
 * Alias a module definition.
 *
 * @param {String} from
 * @param {String} to
 * @api private
 */

require.alias = function(from, to) {
  if (!require.modules.hasOwnProperty(from)) {
    throw new Error('Failed to alias "' + from + '", it does not exist');
  }
  require.aliases[to] = from;
};

/**
 * Return a require function relative to the `parent` path.
 *
 * @param {String} parent
 * @return {Function}
 * @api private
 */

require.relative = function(parent) {
  var p = require.normalize(parent, '..');

  /**
   * lastIndexOf helper.
   */

  function lastIndexOf(arr, obj) {
    var i = arr.length;
    while (i--) {
      if (arr[i] === obj) return i;
    }
    return -1;
  }

  /**
   * The relative require() itself.
   */

  function localRequire(path) {
    var resolved = localRequire.resolve(path);
    return require(resolved, parent, path);
  }

  /**
   * Resolve relative to the parent.
   */

  localRequire.resolve = function(path) {
    var c = path.charAt(0);
    if ('/' == c) return path.slice(1);
    if ('.' == c) return require.normalize(p, path);

    // resolve deps by returning
    // the dep in the nearest "deps"
    // directory
    var segs = parent.split('/');
    var i = lastIndexOf(segs, 'deps') + 1;
    if (!i) i = 0;
    path = segs.slice(0, i + 1).join('/') + '/deps/' + path;
    return path;
  };

  /**
   * Check if module is defined at `path`.
   */

  localRequire.exists = function(path) {
    return require.modules.hasOwnProperty(localRequire.resolve(path));
  };

  return localRequire;
};
require.register("avetisk-defaults/index.js", function(exports, require, module){
/**
 * Expose `defaults`.
 */
module.exports = defaults;

function defaults (dest, defaults) {
  for (var prop in defaults) {
    if (! (prop in dest)) {
      dest[prop] = defaults[prop];
    }
  }

  return dest;
};

});
require.register("component-type/index.js", function(exports, require, module){

/**
 * toString ref.
 */

var toString = Object.prototype.toString;

/**
 * Return the type of `val`.
 *
 * @param {Mixed} val
 * @return {String}
 * @api public
 */

module.exports = function(val){
  switch (toString.call(val)) {
    case '[object Function]': return 'function';
    case '[object Date]': return 'date';
    case '[object RegExp]': return 'regexp';
    case '[object Arguments]': return 'arguments';
    case '[object Array]': return 'array';
    case '[object String]': return 'string';
  }

  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (val && val.nodeType === 1) return 'element';
  if (val === Object(val)) return 'object';

  return typeof val;
};

});
require.register("component-clone/index.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var type;

try {
  type = require('type');
} catch(e){
  type = require('type-component');
}

/**
 * Module exports.
 */

module.exports = clone;

/**
 * Clones objects.
 *
 * @param {Mixed} any object
 * @api public
 */

function clone(obj){
  switch (type(obj)) {
    case 'object':
      var copy = {};
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          copy[key] = clone(obj[key]);
        }
      }
      return copy;

    case 'array':
      var copy = new Array(obj.length);
      for (var i = 0, l = obj.length; i < l; i++) {
        copy[i] = clone(obj[i]);
      }
      return copy;

    case 'regexp':
      // from millermedeiros/amd-utils - MIT
      var flags = '';
      flags += obj.multiline ? 'm' : '';
      flags += obj.global ? 'g' : '';
      flags += obj.ignoreCase ? 'i' : '';
      return new RegExp(obj.source, flags);

    case 'date':
      return new Date(obj.getTime());

    default: // string, number, boolean, …
      return obj;
  }
}

});
require.register("component-cookie/index.js", function(exports, require, module){
/**
 * Encode.
 */

var encode = encodeURIComponent;

/**
 * Decode.
 */

var decode = decodeURIComponent;

/**
 * Set or get cookie `name` with `value` and `options` object.
 *
 * @param {String} name
 * @param {String} value
 * @param {Object} options
 * @return {Mixed}
 * @api public
 */

module.exports = function(name, value, options){
  switch (arguments.length) {
    case 3:
    case 2:
      return set(name, value, options);
    case 1:
      return get(name);
    default:
      return all();
  }
};

/**
 * Set cookie `name` to `value`.
 *
 * @param {String} name
 * @param {String} value
 * @param {Object} options
 * @api private
 */

function set(name, value, options) {
  options = options || {};
  var str = encode(name) + '=' + encode(value);

  if (null == value) options.maxage = -1;

  if (options.maxage) {
    options.expires = new Date(+new Date + options.maxage);
  }

  if (options.path) str += '; path=' + options.path;
  if (options.domain) str += '; domain=' + options.domain;
  if (options.expires) str += '; expires=' + options.expires.toGMTString();
  if (options.secure) str += '; secure';

  document.cookie = str;
}

/**
 * Return all cookies.
 *
 * @return {Object}
 * @api private
 */

function all() {
  return parse(document.cookie);
}

/**
 * Get cookie `name`.
 *
 * @param {String} name
 * @return {String}
 * @api private
 */

function get(name) {
  return all()[name];
}

/**
 * Parse cookie `str`.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function parse(str) {
  var obj = {};
  var pairs = str.split(/ *; */);
  var pair;
  if ('' == pairs[0]) return obj;
  for (var i = 0; i < pairs.length; ++i) {
    pair = pairs[i].split('=');
    obj[decode(pair[0])] = decode(pair[1]);
  }
  return obj;
}

});
require.register("component-each/index.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var type = require('type');

/**
 * HOP reference.
 */

var has = Object.prototype.hasOwnProperty;

/**
 * Iterate the given `obj` and invoke `fn(val, i)`.
 *
 * @param {String|Array|Object} obj
 * @param {Function} fn
 * @api public
 */

module.exports = function(obj, fn){
  switch (type(obj)) {
    case 'array':
      return array(obj, fn);
    case 'object':
      if ('number' == typeof obj.length) return array(obj, fn);
      return object(obj, fn);
    case 'string':
      return string(obj, fn);
  }
};

/**
 * Iterate string chars.
 *
 * @param {String} obj
 * @param {Function} fn
 * @api private
 */

function string(obj, fn) {
  for (var i = 0; i < obj.length; ++i) {
    fn(obj.charAt(i), i);
  }
}

/**
 * Iterate object keys.
 *
 * @param {Object} obj
 * @param {Function} fn
 * @api private
 */

function object(obj, fn) {
  for (var key in obj) {
    if (has.call(obj, key)) {
      fn(key, obj[key]);
    }
  }
}

/**
 * Iterate array-ish.
 *
 * @param {Array|Object} obj
 * @param {Function} fn
 * @api private
 */

function array(obj, fn) {
  for (var i = 0; i < obj.length; ++i) {
    fn(obj[i], i);
  }
}
});
require.register("component-indexof/index.js", function(exports, require, module){
module.exports = function(arr, obj){
  if (arr.indexOf) return arr.indexOf(obj);
  for (var i = 0; i < arr.length; ++i) {
    if (arr[i] === obj) return i;
  }
  return -1;
};
});
require.register("component-emitter/index.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var index = require('indexof');

/**
 * Expose `Emitter`.
 */

module.exports = Emitter;

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
Emitter.prototype.addEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks[event] = this._callbacks[event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  var self = this;
  this._callbacks = this._callbacks || {};

  function on() {
    self.off(event, on);
    fn.apply(this, arguments);
  }

  fn._off = on;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks[event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks[event];
    return this;
  }

  // remove specific handler
  var i = index(callbacks, fn._off || fn);
  if (~i) callbacks.splice(i, 1);
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks[event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks[event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

});
require.register("component-event/index.js", function(exports, require, module){

/**
 * Bind `el` event `type` to `fn`.
 *
 * @param {Element} el
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {Function}
 * @api public
 */

exports.bind = function(el, type, fn, capture){
  if (el.addEventListener) {
    el.addEventListener(type, fn, capture || false);
  } else {
    el.attachEvent('on' + type, fn);
  }
  return fn;
};

/**
 * Unbind `el` event `type`'s callback `fn`.
 *
 * @param {Element} el
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {Function}
 * @api public
 */

exports.unbind = function(el, type, fn, capture){
  if (el.removeEventListener) {
    el.removeEventListener(type, fn, capture || false);
  } else {
    el.detachEvent('on' + type, fn);
  }
  return fn;
};

});
require.register("component-inherit/index.js", function(exports, require, module){

module.exports = function(a, b){
  var fn = function(){};
  fn.prototype = b.prototype;
  a.prototype = new fn;
  a.prototype.constructor = a;
};
});
require.register("component-object/index.js", function(exports, require, module){

/**
 * HOP ref.
 */

var has = Object.prototype.hasOwnProperty;

/**
 * Return own keys in `obj`.
 *
 * @param {Object} obj
 * @return {Array}
 * @api public
 */

exports.keys = Object.keys || function(obj){
  var keys = [];
  for (var key in obj) {
    if (has.call(obj, key)) {
      keys.push(key);
    }
  }
  return keys;
};

/**
 * Return own values in `obj`.
 *
 * @param {Object} obj
 * @return {Array}
 * @api public
 */

exports.values = function(obj){
  var vals = [];
  for (var key in obj) {
    if (has.call(obj, key)) {
      vals.push(obj[key]);
    }
  }
  return vals;
};

/**
 * Merge `b` into `a`.
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Object} a
 * @api public
 */

exports.merge = function(a, b){
  for (var key in b) {
    if (has.call(b, key)) {
      a[key] = b[key];
    }
  }
  return a;
};

/**
 * Return length of `obj`.
 *
 * @param {Object} obj
 * @return {Number}
 * @api public
 */

exports.length = function(obj){
  return exports.keys(obj).length;
};

/**
 * Check if `obj` is empty.
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api public
 */

exports.isEmpty = function(obj){
  return 0 == exports.length(obj);
};
});
require.register("component-trim/index.js", function(exports, require, module){

exports = module.exports = trim;

function trim(str){
  if (str.trim) return str.trim();
  return str.replace(/^\s*|\s*$/g, '');
}

exports.left = function(str){
  if (str.trimLeft) return str.trimLeft();
  return str.replace(/^\s*/, '');
};

exports.right = function(str){
  if (str.trimRight) return str.trimRight();
  return str.replace(/\s*$/, '');
};

});
require.register("component-querystring/index.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var encode = encodeURIComponent;
var decode = decodeURIComponent;
var trim = require('trim');
var type = require('type');

/**
 * Parse the given query `str`.
 *
 * @param {String} str
 * @return {Object}
 * @api public
 */

exports.parse = function(str){
  if ('string' != typeof str) return {};

  str = trim(str);
  if ('' == str) return {};
  if ('?' == str.charAt(0)) str = str.slice(1);

  var obj = {};
  var pairs = str.split('&');
  for (var i = 0; i < pairs.length; i++) {
    var parts = pairs[i].split('=');
    var key = decode(parts[0]);
    var m;

    if (m = /(\w+)\[(\d+)\]/.exec(key)) {
      obj[m[1]] = obj[m[1]] || [];
      obj[m[1]][m[2]] = decode(parts[1]);
      continue;
    }

    obj[parts[0]] = null == parts[1]
      ? ''
      : decode(parts[1]);
  }

  return obj;
};

/**
 * Stringify the given `obj`.
 *
 * @param {Object} obj
 * @return {String}
 * @api public
 */

exports.stringify = function(obj){
  if (!obj) return '';
  var pairs = [];

  for (var key in obj) {
    var value = obj[key];

    if ('array' == type(value)) {
      for (var i = 0; i < value.length; ++i) {
        pairs.push(encode(key + '[' + i + ']') + '=' + encode(value[i]));
      }
      continue;
    }

    pairs.push(encode(key) + '=' + encode(obj[key]));
  }

  return pairs.join('&');
};

});
require.register("component-url/index.js", function(exports, require, module){

/**
 * Parse the given `url`.
 *
 * @param {String} str
 * @return {Object}
 * @api public
 */

exports.parse = function(url){
  var a = document.createElement('a');
  a.href = url;
  return {
    href: a.href,
    host: a.host,
    port: a.port,
    hash: a.hash,
    hostname: a.hostname,
    pathname: a.pathname,
    protocol: a.protocol,
    search: a.search,
    query: a.search.slice(1)
  }
};

/**
 * Check if `url` is absolute.
 *
 * @param {String} url
 * @return {Boolean}
 * @api public
 */

exports.isAbsolute = function(url){
  if (0 == url.indexOf('//')) return true;
  if (~url.indexOf('://')) return true;
  return false;
};

/**
 * Check if `url` is relative.
 *
 * @param {String} url
 * @return {Boolean}
 * @api public
 */

exports.isRelative = function(url){
  return ! exports.isAbsolute(url);
};

/**
 * Check if `url` is cross domain.
 *
 * @param {String} url
 * @return {Boolean}
 * @api public
 */

exports.isCrossDomain = function(url){
  url = exports.parse(url);
  return url.hostname != location.hostname
    || url.port != location.port
    || url.protocol != location.protocol;
};
});
require.register("component-bind/index.js", function(exports, require, module){
/**
 * Slice reference.
 */

var slice = [].slice;

/**
 * Bind `obj` to `fn`.
 *
 * @param {Object} obj
 * @param {Function|String} fn or string
 * @return {Function}
 * @api public
 */

module.exports = function(obj, fn){
  if ('string' == typeof fn) fn = obj[fn];
  if ('function' != typeof fn) throw new Error('bind() requires a function');
  var args = slice.call(arguments, 2);
  return function(){
    return fn.apply(obj, args.concat(slice.call(arguments)));
  }
};

});
require.register("segmentio-bind-all/index.js", function(exports, require, module){

try {
  var bind = require('bind');
  var type = require('type');
} catch (e) {
  var bind = require('bind-component');
  var type = require('type-component');
}

module.exports = function (obj) {
  for (var key in obj) {
    var val = obj[key];
    if (type(val) === 'function') obj[key] = bind(obj, obj[key]);
  }
  return obj;
};
});
require.register("ianstormtaylor-bind/index.js", function(exports, require, module){

try {
  var bind = require('bind');
} catch (e) {
  var bind = require('bind-component');
}

var bindAll = require('bind-all');


/**
 * Expose `bind`.
 */

module.exports = exports = bind;


/**
 * Expose `bindAll`.
 */

exports.all = bindAll;


/**
 * Expose `bindMethods`.
 */

exports.methods = bindMethods;


/**
 * Bind `methods` on `obj` to always be called with the `obj` as context.
 *
 * @param {Object} obj
 * @param {String} methods...
 */

function bindMethods (obj, methods) {
  methods = [].slice.call(arguments, 1);
  for (var i = 0, method; method = methods[i]; i++) {
    obj[method] = bind(obj, obj[method]);
  }
  return obj;
}
});
require.register("timoxley-next-tick/index.js", function(exports, require, module){
"use strict"

if (typeof setImmediate == 'function') {
  module.exports = function(f){ setImmediate(f) }
}
// legacy node.js
else if (typeof process != 'undefined' && typeof process.nextTick == 'function') {
  module.exports = process.nextTick
}
// fallback for other environments / postMessage behaves badly on IE8
else if (typeof window == 'undefined' || window.ActiveXObject || !window.postMessage) {
  module.exports = function(f){ setTimeout(f) };
} else {
  var q = [];

  window.addEventListener('message', function(){
    var i = 0;
    while (i < q.length) {
      try { q[i++](); }
      catch (e) {
        q = q.slice(i);
        window.postMessage('tic!', '*');
        throw e;
      }
    }
    q.length = 0;
  }, true);

  module.exports = function(fn){
    if (!q.length) window.postMessage('tic!', '*');
    q.push(fn);
  }
}

});
require.register("ianstormtaylor-callback/index.js", function(exports, require, module){
var next = require('next-tick');


/**
 * Expose `callback`.
 */

module.exports = callback;


/**
 * Call an `fn` back synchronously if it exists.
 *
 * @param {Function} fn
 */

function callback (fn) {
  if ('function' === typeof fn) fn();
}


/**
 * Call an `fn` back asynchronously if it exists. If `wait` is ommitted, the
 * `fn` will be called on next tick.
 *
 * @param {Function} fn
 * @param {Number} wait (optional)
 */

callback.async = function (fn, wait) {
  if ('function' !== typeof fn) return;
  if (!wait) return next(fn);
  setTimeout(fn, wait);
};


/**
 * Symmetry.
 */

callback.sync = callback;

});
require.register("ianstormtaylor-is-empty/index.js", function(exports, require, module){

/**
 * Expose `isEmpty`.
 */

module.exports = isEmpty;


/**
 * Has.
 */

var has = Object.prototype.hasOwnProperty;


/**
 * Test whether a value is "empty".
 *
 * @param {Mixed} val
 * @return {Boolean}
 */

function isEmpty (val) {
  if (null == val) return true;
  if ('number' == typeof val) return 0 === val;
  if (undefined !== val.length) return 0 === val.length;
  for (var key in val) if (has.call(val, key)) return false;
  return true;
}
});
require.register("ianstormtaylor-is/index.js", function(exports, require, module){

var isEmpty = require('is-empty');

try {
  var typeOf = require('type');
} catch (e) {
  var typeOf = require('component-type');
}


/**
 * Types.
 */

var types = [
  'arguments',
  'array',
  'boolean',
  'date',
  'element',
  'function',
  'null',
  'number',
  'object',
  'regexp',
  'string',
  'undefined'
];


/**
 * Expose type checkers.
 *
 * @param {Mixed} value
 * @return {Boolean}
 */

for (var i = 0, type; type = types[i]; i++) exports[type] = generate(type);


/**
 * Add alias for `function` for old browsers.
 */

exports.fn = exports['function'];


/**
 * Expose `empty` check.
 */

exports.empty = isEmpty;


/**
 * Expose `nan` check.
 */

exports.nan = function (val) {
  return exports.number(val) && val != val;
};


/**
 * Generate a type checker.
 *
 * @param {String} type
 * @return {Function}
 */

function generate (type) {
  return function (value) {
    return type === typeOf(value);
  };
}
});
require.register("segmentio-after/index.js", function(exports, require, module){

module.exports = function after (times, func) {
  // After 0, really?
  if (times <= 0) return func();

  // That's more like it.
  return function() {
    if (--times < 1) {
      return func.apply(this, arguments);
    }
  };
};
});
require.register("component-domify/index.js", function(exports, require, module){

/**
 * Expose `parse`.
 */

module.exports = parse;

/**
 * Wrap map from jquery.
 */

var map = {
  legend: [1, '<fieldset>', '</fieldset>'],
  tr: [2, '<table><tbody>', '</tbody></table>'],
  col: [2, '<table><tbody></tbody><colgroup>', '</colgroup></table>'],
  _default: [0, '', '']
};

map.td =
map.th = [3, '<table><tbody><tr>', '</tr></tbody></table>'];

map.option =
map.optgroup = [1, '<select multiple="multiple">', '</select>'];

map.thead =
map.tbody =
map.colgroup =
map.caption =
map.tfoot = [1, '<table>', '</table>'];

map.text =
map.circle =
map.ellipse =
map.line =
map.path =
map.polygon =
map.polyline =
map.rect = [1, '<svg xmlns="http://www.w3.org/2000/svg" version="1.1">','</svg>'];

/**
 * Parse `html` and return the children.
 *
 * @param {String} html
 * @return {Array}
 * @api private
 */

function parse(html) {
  if ('string' != typeof html) throw new TypeError('String expected');

  html = html.replace(/^\s+|\s+$/g, ''); // Remove leading/trailing whitespace

  // tag name
  var m = /<([\w:]+)/.exec(html);
  if (!m) return document.createTextNode(html);
  var tag = m[1];

  // body support
  if (tag == 'body') {
    var el = document.createElement('html');
    el.innerHTML = html;
    return el.removeChild(el.lastChild);
  }

  // wrap map
  var wrap = map[tag] || map._default;
  var depth = wrap[0];
  var prefix = wrap[1];
  var suffix = wrap[2];
  var el = document.createElement('div');
  el.innerHTML = prefix + html + suffix;
  while (depth--) el = el.lastChild;

  // one element
  if (el.firstChild == el.lastChild) {
    return el.removeChild(el.firstChild);
  }

  // several elements
  var fragment = document.createDocumentFragment();
  while (el.firstChild) {
    fragment.appendChild(el.removeChild(el.firstChild));
  }

  return fragment;
}

});
require.register("component-once/index.js", function(exports, require, module){

/**
 * Identifier.
 */

var n = 0;

/**
 * Global.
 */

var global = (function(){ return this })();

/**
 * Make `fn` callable only once.
 *
 * @param {Function} fn
 * @return {Function}
 * @api public
 */

module.exports = function(fn) {
  var id = n++;

  function once(){
    // no receiver
    if (this == global) {
      if (once.called) return;
      once.called = true;
      return fn.apply(this, arguments);
    }

    // receiver
    var key = '__called_' + id + '__';
    if (this[key]) return;
    this[key] = true;
    return fn.apply(this, arguments);
  }

  return once;
};

});
require.register("segmentio-alias/index.js", function(exports, require, module){

var type = require('type');

try {
  var clone = require('clone');
} catch (e) {
  var clone = require('clone-component');
}


/**
 * Expose `alias`.
 */

module.exports = alias;


/**
 * Alias an `object`.
 *
 * @param {Object} obj
 * @param {Mixed} method
 */

function alias (obj, method) {
  switch (type(method)) {
    case 'object': return aliasByDictionary(clone(obj), method);
    case 'function': return aliasByFunction(clone(obj), method);
  }
}


/**
 * Convert the keys in an `obj` using a dictionary of `aliases`.
 *
 * @param {Object} obj
 * @param {Object} aliases
 */

function aliasByDictionary (obj, aliases) {
  for (var key in aliases) {
    if (undefined === obj[key]) continue;
    obj[aliases[key]] = obj[key];
    delete obj[key];
  }
  return obj;
}


/**
 * Convert the keys in an `obj` using a `convert` function.
 *
 * @param {Object} obj
 * @param {Function} convert
 */

function aliasByFunction (obj, convert) {
  // have to create another object so that ie8 won't infinite loop on keys
  var output = {};
  for (var key in obj) output[convert(key)] = obj[key];
  return output;
}
});
require.register("ianstormtaylor-to-no-case/index.js", function(exports, require, module){

/**
 * Expose `toNoCase`.
 */

module.exports = toNoCase;


/**
 * Test whether a string is camel-case.
 */

var hasSpace = /\s/;
var hasSeparator = /[\W_]/;


/**
 * Remove any starting case from a `string`, like camel or snake, but keep
 * spaces and punctuation that may be important otherwise.
 *
 * @param {String} string
 * @return {String}
 */

function toNoCase (string) {
  if (hasSpace.test(string)) return string.toLowerCase();
  if (hasSeparator.test(string)) return unseparate(string).toLowerCase();
  return uncamelize(string).toLowerCase();
}


/**
 * Separator splitter.
 */

var separatorSplitter = /[\W_]+(.|$)/g;


/**
 * Un-separate a `string`.
 *
 * @param {String} string
 * @return {String}
 */

function unseparate (string) {
  return string.replace(separatorSplitter, function (m, next) {
    return next ? ' ' + next : '';
  });
}


/**
 * Camelcase splitter.
 */

var camelSplitter = /(.)([A-Z]+)/g;


/**
 * Un-camelcase a `string`.
 *
 * @param {String} string
 * @return {String}
 */

function uncamelize (string) {
  return string.replace(camelSplitter, function (m, previous, uppers) {
    return previous + ' ' + uppers.toLowerCase().split('').join(' ');
  });
}
});
require.register("segmentio-analytics.js-integration/lib/index.js", function(exports, require, module){

var bind = require('bind');
var callback = require('callback');
var clone = require('clone');
var debug = require('debug');
var defaults = require('defaults');
var protos = require('./protos');
var slug = require('slug');
var statics = require('./statics');


/**
 * Expose `createIntegration`.
 */

module.exports = createIntegration;


/**
 * Create a new Integration constructor.
 *
 * @param {String} name
 */

function createIntegration (name) {

  /**
   * Initialize a new `Integration`.
   *
   * @param {Object} options
   */

  function Integration (options) {
    this.debug = debug('analytics:integration:' + slug(name));
    this.options = defaults(clone(options) || {}, this.defaults);
    this._queue = [];
    this.once('ready', bind(this, this.flush));

    Integration.emit('construct', this);
    this._wrapInitialize();
    this._wrapLoad();
    this._wrapPage();
    this._wrapTrack();
  }

  Integration.prototype.defaults = {};
  Integration.prototype.globals = [];
  Integration.prototype.name = name;
  for (var key in statics) Integration[key] = statics[key];
  for (var key in protos) Integration.prototype[key] = protos[key];
  return Integration;
}

});
require.register("segmentio-analytics.js-integration/lib/protos.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var normalize = require('to-no-case');
var after = require('after');
var callback = require('callback');
var Emitter = require('emitter');
var tick = require('next-tick');
var events = require('./events');
var type = require('type');


/**
 * Mixin emitter.
 */

Emitter(exports);

/**
 * Initialize.
 */

exports.initialize = function () {
  this.load();
};


/**
 * Loaded?
 *
 * @return {Boolean}
 * @api private
 */

exports.loaded = function () {
  return false;
};


/**
 * Load.
 *
 * @param {Function} cb
 */

exports.load = function (cb) {
  callback.async(cb);
};


/**
 * Page.
 *
 * @param {Page} page
 */

exports.page = function(page){};

/**
 * Track.
 *
 * @param {Track} track
 */

exports.track = function(track){};

/**
 * Get events that match `str`.
 *
 * Examples:
 *
 *    { my_event: 'a4991b88' }
 *    .track('My Event');
 *    // => ["a4991b88"]
 *    .track('whatever');
 *    // => []
 *
 *    [{ key: 'my event', value: '9b5eb1fa' }]
 *    .track('my_event');
 *    // => ["9b5eb1fa"]
 *    .track('whatever');
 *    // => []
 *
 * @param {String} str
 * @return {Array}
 * @api public
 */

exports.events = function(str){
  var events = this.options.events;
  var a = normalize(str);
  var ret = [];

  // no events
  if (!events) return ret;

  // object
  if ('object' == type(events)) {
    for (var k in events) {
      var item = events[k];
      var b = normalize(k);
      if (b == a) ret.push(item);
    }
  }

  // array
  if ('array' == type(events)) {
    if (!events.length) return ret;
    if (!events[0].key) return ret;

    for (var i = 0; i < events.length; ++i) {
      var item = events[i];
      var b = normalize(item.key);
      if (b == a) ret.push(item.value);
    }
  }

  return ret;
};

/**
 * Invoke a `method` that may or may not exist on the prototype with `args`,
 * queueing or not depending on whether the integration is "ready". Don't
 * trust the method call, since it contains integration party code.
 *
 * @param {String} method
 * @param {Mixed} args...
 * @api private
 */

exports.invoke = function (method) {
  if (!this[method]) return;
  var args = [].slice.call(arguments, 1);
  if (!this._ready) return this.queue(method, args);
  var ret;

  try {
    this.debug('%s with %o', method, args);
    ret = this[method].apply(this, args);
  } catch (e) {
    this.debug('error %o calling %s with %o', e, method, args);
  }

  return ret;
};


/**
 * Queue a `method` with `args`. If the integration assumes an initial
 * pageview, then let the first call to `page` pass through.
 *
 * @param {String} method
 * @param {Array} args
 * @api private
 */

exports.queue = function (method, args) {
  if ('page' == method && this._assumesPageview && !this._initialized) {
    return this.page.apply(this, args);
  }

  this._queue.push({ method: method, args: args });
};


/**
 * Flush the internal queue.
 *
 * @api private
 */

exports.flush = function () {
  this._ready = true;
  var call;
  while (call = this._queue.shift()) this[call.method].apply(this, call.args);
};


/**
 * Reset the integration, removing its global variables.
 *
 * @api private
 */

exports.reset = function () {
  for (var i = 0, key; key = this.globals[i]; i++) window[key] = undefined;
};


/**
 * Wrap the initialize method in an exists check, so we don't have to do it for
 * every single integration.
 *
 * @api private
 */

exports._wrapInitialize = function () {
  var initialize = this.initialize;
  this.initialize = function () {
    this.debug('initialize');
    this._initialized = true;
    var ret = initialize.apply(this, arguments);
    this.emit('initialize');

    var self = this;
    if (this._readyOnInitialize) {
      tick(function () {
        self.emit('ready');
      });
    }

    return ret;
  };

};


/**
 * Wrap the load method in `debug` calls, so every integration gets them
 * automatically.
 *
 * @api private
 */

exports._wrapLoad = function () {
  var load = this.load;
  this.load = function (callback) {
    var self = this;
    this.debug('loading');

    if (this.loaded()) {
      this.debug('already loaded');
      tick(function () {
        if (self._readyOnLoad) self.emit('ready');
        callback && callback();
      });
      return;
    }

    return load.call(this, function (err, e) {
      self.debug('loaded');
      self.emit('load');
      if (self._readyOnLoad) self.emit('ready');
      callback && callback(err, e);
    });
  };
};


/**
 * Wrap the page method to call `initialize` instead if the integration assumes
 * a pageview.
 *
 * @api private
 */

exports._wrapPage = function () {
  var page = this.page;
  this.page = function () {
    if (this._assumesPageview && !this._initialized) {
      return this.initialize.apply(this, arguments);
    }

    return page.apply(this, arguments);
  };
};

/**
 * Wrap the track method to call other ecommerce methods if
 * available depending on the `track.event()`.
 *
 * @api private
 */

exports._wrapTrack = function(){
  var t = this.track;
  this.track = function(track){
    var event = track.event();
    var called;
    var ret;

    for (var method in events) {
      var regexp = events[method];
      if (!this[method]) continue;
      if (!regexp.test(event)) continue;
      ret = this[method].apply(this, arguments);
      called = true;
      break;
    }

    if (!called) ret = t.apply(this, arguments);
    return ret;
  };
};

});
require.register("segmentio-analytics.js-integration/lib/events.js", function(exports, require, module){

/**
 * Expose `events`
 */

module.exports = {
  removedProduct: /removed product/i,
  viewedProduct: /viewed product/i,
  addedProduct: /added product/i,
  completedOrder: /completed order/i
};

});
require.register("segmentio-analytics.js-integration/lib/statics.js", function(exports, require, module){

var after = require('after');
var Emitter = require('emitter');


/**
 * Mixin emitter.
 */

Emitter(exports);


/**
 * Add a new option to the integration by `key` with default `value`.
 *
 * @param {String} key
 * @param {Mixed} value
 * @return {Integration}
 */

exports.option = function (key, value) {
  this.prototype.defaults[key] = value;
  return this;
};


/**
 * Register a new global variable `key` owned by the integration, which will be
 * used to test whether the integration is already on the page.
 *
 * @param {String} global
 * @return {Integration}
 */

exports.global = function (key) {
  this.prototype.globals.push(key);
  return this;
};


/**
 * Mark the integration as assuming an initial pageview, so to defer loading
 * the script until the first `page` call, noop the first `initialize`.
 *
 * @return {Integration}
 */

exports.assumesPageview = function () {
  this.prototype._assumesPageview = true;
  return this;
};


/**
 * Mark the integration as being "ready" once `load` is called.
 *
 * @return {Integration}
 */

exports.readyOnLoad = function () {
  this.prototype._readyOnLoad = true;
  return this;
};


/**
 * Mark the integration as being "ready" once `load` is called.
 *
 * @return {Integration}
 */

exports.readyOnInitialize = function () {
  this.prototype._readyOnInitialize = true;
  return this;
};
});
require.register("segmentio-convert-dates/index.js", function(exports, require, module){

var is = require('is');

try {
  var clone = require('clone');
} catch (e) {
  var clone = require('clone-component');
}


/**
 * Expose `convertDates`.
 */

module.exports = convertDates;


/**
 * Recursively convert an `obj`'s dates to new values.
 *
 * @param {Object} obj
 * @param {Function} convert
 * @return {Object}
 */

function convertDates (obj, convert) {
  obj = clone(obj);
  for (var key in obj) {
    var val = obj[key];
    if (is.date(val)) obj[key] = convert(val);
    if (is.object(val)) obj[key] = convertDates(val, convert);
  }
  return obj;
}
});
require.register("segmentio-global-queue/index.js", function(exports, require, module){

/**
 * Expose `generate`.
 */

module.exports = generate;


/**
 * Generate a global queue pushing method with `name`.
 *
 * @param {String} name
 * @param {Object} options
 *   @property {Boolean} wrap
 * @return {Function}
 */

function generate (name, options) {
  options = options || {};

  return function (args) {
    args = [].slice.call(arguments);
    window[name] || (window[name] = []);
    options.wrap === false
      ? window[name].push.apply(window[name], args)
      : window[name].push(args);
  };
}
});
require.register("segmentio-load-date/index.js", function(exports, require, module){


/*
 * Load date.
 *
 * For reference: http://www.html5rocks.com/en/tutorials/webperformance/basics/
 */

var time = new Date()
  , perf = window.performance;

if (perf && perf.timing && perf.timing.responseEnd) {
  time = new Date(perf.timing.responseEnd);
}

module.exports = time;
});
require.register("segmentio-load-script/index.js", function(exports, require, module){
var type = require('type');


module.exports = function loadScript (options, callback) {
    if (!options) throw new Error('Cant load nothing...');

    // Allow for the simplest case, just passing a `src` string.
    if (type(options) === 'string') options = { src : options };

    var https = document.location.protocol === 'https:' ||
                document.location.protocol === 'chrome-extension:';

    // If you use protocol relative URLs, third-party scripts like Google
    // Analytics break when testing with `file:` so this fixes that.
    if (options.src && options.src.indexOf('//') === 0) {
        options.src = https ? 'https:' + options.src : 'http:' + options.src;
    }

    // Allow them to pass in different URLs depending on the protocol.
    if (https && options.https) options.src = options.https;
    else if (!https && options.http) options.src = options.http;

    // Make the `<script>` element and insert it before the first script on the
    // page, which is guaranteed to exist since this Javascript is running.
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = options.src;

    var firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode.insertBefore(script, firstScript);

    // If we have a callback, attach event handlers, even in IE. Based off of
    // the Third-Party Javascript script loading example:
    // https://github.com/thirdpartyjs/thirdpartyjs-code/blob/master/examples/templates/02/loading-files/index.html
    if (callback && type(callback) === 'function') {
        if (script.addEventListener) {
            script.addEventListener('load', function (event) {
                callback(null, event);
            }, false);
            script.addEventListener('error', function (event) {
                callback(new Error('Failed to load the script.'), event);
            }, false);
        } else if (script.attachEvent) {
            script.attachEvent('onreadystatechange', function (event) {
                if (/complete|loaded/.test(script.readyState)) {
                    callback(null, event);
                }
            });
        }
    }

    // Return the script element in case they want to do anything special, like
    // give it an ID or attributes.
    return script;
};

});
require.register("segmentio-script-onload/index.js", function(exports, require, module){

// https://github.com/thirdpartyjs/thirdpartyjs-code/blob/master/examples/templates/02/loading-files/index.html

/**
 * Invoke `fn(err)` when the given `el` script loads.
 *
 * @param {Element} el
 * @param {Function} fn
 * @api public
 */

module.exports = function(el, fn){
  return el.addEventListener
    ? add(el, fn)
    : attach(el, fn);
};

/**
 * Add event listener to `el`, `fn()`.
 *
 * @param {Element} el
 * @param {Function} fn
 * @api private
 */

function add(el, fn){
  el.addEventListener('load', function(_, e){ fn(null, e); }, false);
  el.addEventListener('error', function(e){
    var err = new Error('failed to load the script "' + el.src + '"');
    err.event = e;
    fn(err);
  }, false);
}

/**
 * Attach evnet.
 *
 * @param {Element} el
 * @param {Function} fn
 * @api private
 */

function attach(el, fn){
  el.attachEvent('onreadystatechange', function(e){
    if (!/complete|loaded/.test(el.readyState)) return;
    fn(null, e);
  });
}

});
require.register("segmentio-on-body/index.js", function(exports, require, module){
var each = require('each');


/**
 * Cache whether `<body>` exists.
 */

var body = false;


/**
 * Callbacks to call when the body exists.
 */

var callbacks = [];


/**
 * Export a way to add handlers to be invoked once the body exists.
 *
 * @param {Function} callback  A function to call when the body exists.
 */

module.exports = function onBody (callback) {
  if (body) {
    call(callback);
  } else {
    callbacks.push(callback);
  }
};


/**
 * Set an interval to check for `document.body`.
 */

var interval = setInterval(function () {
  if (!document.body) return;
  body = true;
  each(callbacks, call);
  clearInterval(interval);
}, 5);


/**
 * Call a callback, passing it the body.
 *
 * @param {Function} callback  The callback to call.
 */

function call (callback) {
  callback(document.body);
}
});
require.register("segmentio-on-error/index.js", function(exports, require, module){

/**
 * Expose `onError`.
 */

module.exports = onError;


/**
 * Callbacks.
 */

var callbacks = [];


/**
 * Preserve existing handler.
 */

if ('function' == typeof window.onerror) callbacks.push(window.onerror);


/**
 * Bind to `window.onerror`.
 */

window.onerror = handler;


/**
 * Error handler.
 */

function handler () {
  for (var i = 0, fn; fn = callbacks[i]; i++) fn.apply(this, arguments);
}


/**
 * Call a `fn` on `window.onerror`.
 *
 * @param {Function} fn
 */

function onError (fn) {
  callbacks.push(fn);
  if (window.onerror != handler) {
    callbacks.push(window.onerror);
    window.onerror = handler;
  }
}
});
require.register("segmentio-to-iso-string/index.js", function(exports, require, module){

/**
 * Expose `toIsoString`.
 */

module.exports = toIsoString;


/**
 * Turn a `date` into an ISO string.
 *
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString
 *
 * @param {Date} date
 * @return {String}
 */

function toIsoString (date) {
  return date.getUTCFullYear()
    + '-' + pad(date.getUTCMonth() + 1)
    + '-' + pad(date.getUTCDate())
    + 'T' + pad(date.getUTCHours())
    + ':' + pad(date.getUTCMinutes())
    + ':' + pad(date.getUTCSeconds())
    + '.' + String((date.getUTCMilliseconds()/1000).toFixed(3)).slice(2, 5)
    + 'Z';
}


/**
 * Pad a `number` with a ten's place zero.
 *
 * @param {Number} number
 * @return {String}
 */

function pad (number) {
  var n = number.toString();
  return n.length === 1 ? '0' + n : n;
}
});
require.register("segmentio-to-unix-timestamp/index.js", function(exports, require, module){

/**
 * Expose `toUnixTimestamp`.
 */

module.exports = toUnixTimestamp;


/**
 * Convert a `date` into a Unix timestamp.
 *
 * @param {Date}
 * @return {Number}
 */

function toUnixTimestamp (date) {
  return Math.floor(date.getTime() / 1000);
}
});
require.register("segmentio-use-https/index.js", function(exports, require, module){

/**
 * Protocol.
 */

module.exports = function (url) {
  switch (arguments.length) {
    case 0: return check();
    case 1: return transform(url);
  }
};


/**
 * Transform a protocol-relative `url` to the use the proper protocol.
 *
 * @param {String} url
 * @return {String}
 */

function transform (url) {
  return check() ? 'https:' + url : 'http:' + url;
}


/**
 * Check whether `https:` be used for loading scripts.
 *
 * @return {Boolean}
 */

function check () {
  return (
    location.protocol == 'https:' ||
    location.protocol == 'chrome-extension:'
  );
}
});
require.register("segmentio-when/index.js", function(exports, require, module){

var callback = require('callback');


/**
 * Expose `when`.
 */

module.exports = when;


/**
 * Loop on a short interval until `condition()` is true, then call `fn`.
 *
 * @param {Function} condition
 * @param {Function} fn
 * @param {Number} interval (optional)
 */

function when (condition, fn, interval) {
  if (condition()) return callback.async(fn);

  var ref = setInterval(function () {
    if (!condition()) return;
    callback(fn);
    clearInterval(ref);
  }, interval || 10);
}
});
require.register("yields-slug/index.js", function(exports, require, module){

/**
 * Generate a slug from the given `str`.
 *
 * example:
 *
 *        generate('foo bar');
 *        // > foo-bar
 *
 * @param {String} str
 * @param {Object} options
 * @config {String|RegExp} [replace] characters to replace, defaulted to `/[^a-z0-9]/g`
 * @config {String} [separator] separator to insert, defaulted to `-`
 * @return {String}
 */

module.exports = function (str, options) {
  options || (options = {});
  return str.toLowerCase()
    .replace(options.replace || /[^a-z0-9]/g, ' ')
    .replace(/^ +| +$/g, '')
    .replace(/ +/g, options.separator || '-')
};

});
require.register("visionmedia-batch/index.js", function(exports, require, module){
/**
 * Module dependencies.
 */

try {
  var EventEmitter = require('events').EventEmitter;
} catch (err) {
  var Emitter = require('emitter');
}

/**
 * Noop.
 */

function noop(){}

/**
 * Expose `Batch`.
 */

module.exports = Batch;

/**
 * Create a new Batch.
 */

function Batch() {
  if (!(this instanceof Batch)) return new Batch;
  this.fns = [];
  this.concurrency(Infinity);
  this.throws(true);
  for (var i = 0, len = arguments.length; i < len; ++i) {
    this.push(arguments[i]);
  }
}

/**
 * Inherit from `EventEmitter.prototype`.
 */

if (EventEmitter) {
  Batch.prototype.__proto__ = EventEmitter.prototype;
} else {
  Emitter(Batch.prototype);
}

/**
 * Set concurrency to `n`.
 *
 * @param {Number} n
 * @return {Batch}
 * @api public
 */

Batch.prototype.concurrency = function(n){
  this.n = n;
  return this;
};

/**
 * Queue a function.
 *
 * @param {Function} fn
 * @return {Batch}
 * @api public
 */

Batch.prototype.push = function(fn){
  this.fns.push(fn);
  return this;
};

/**
 * Set wether Batch will or will not throw up.
 *
 * @param  {Boolean} throws
 * @return {Batch}
 * @api public
 */
Batch.prototype.throws = function(throws) {
  this.e = !!throws;
  return this;
};

/**
 * Execute all queued functions in parallel,
 * executing `cb(err, results)`.
 *
 * @param {Function} cb
 * @return {Batch}
 * @api public
 */

Batch.prototype.end = function(cb){
  var self = this
    , total = this.fns.length
    , pending = total
    , results = []
    , errors = []
    , cb = cb || noop
    , fns = this.fns
    , max = this.n
    , throws = this.e
    , index = 0
    , done;

  // empty
  if (!fns.length) return cb(null, results);

  // process
  function next() {
    var i = index++;
    var fn = fns[i];
    if (!fn) return;
    var start = new Date;

    try {
      fn(callback);
    } catch (err) {
      callback(err);
    }

    function callback(err, res){
      if (done) return;
      if (err && throws) return done = true, cb(err);
      var complete = total - pending + 1;
      var end = new Date;

      results[i] = res;
      errors[i] = err;

      self.emit('progress', {
        index: i,
        value: res,
        error: err,
        pending: pending,
        total: total,
        complete: complete,
        percent: complete / total * 100 | 0,
        start: start,
        end: end,
        duration: end - start
      });

      if (--pending) next()
      else if(!throws) cb(errors, results);
      else cb(null, results);
    }
  }

  // concurrency
  for (var i = 0; i < fns.length; i++) {
    if (i == max) break;
    next();
  }

  return this;
};

});
require.register("segmentio-substitute/index.js", function(exports, require, module){

/**
 * Expose `substitute`
 */

module.exports = substitute;

/**
 * Substitute `:prop` with the given `obj` in `str`
 *
 * @param {String} str
 * @param {Object} obj
 * @param {RegExp} expr
 * @return {String}
 * @api public
 */

function substitute(str, obj, expr){
  if (!obj) throw new TypeError('expected an object');
  expr = expr || /:(\w+)/g;
  return str.replace(expr, function(_, prop){
    return null != obj[prop]
      ? obj[prop]
      : _;
  });
}

});
require.register("segmentio-load-pixel/index.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var stringify = require('querystring').stringify;
var sub = require('substitute');

/**
 * Factory function to create a pixel loader.
 *
 * @param {String} path
 * @return {Function}
 * @api public
 */

module.exports = function(path){
  return function(query, obj, fn){
    if ('function' == typeof obj) fn = obj, obj = {};
    obj = obj || {};
    fn = fn || function(){};
    var url = sub(path, obj);
    var img = new Image;
    img.onerror = error(fn, 'failed to load pixel', img);
    img.onload = function(){ fn(); };
    query = stringify(query);
    if (query) query = '?' + query;
    img.src = url + query;
    img.width = 1;
    img.height = 1;
    return img;
  };
};

/**
 * Create an error handler.
 *
 * @param {Fucntion} fn
 * @param {String} message
 * @param {Image} img
 * @return {Function}
 * @api private
 */

function error(fn, message, img){
  return function(e){
    e = e || window.event;
    var err = new Error(message);
    err.event = e;
    err.source = img;
    fn(err);
  };
}

});
require.register("segmentio-replace-document-write/index.js", function(exports, require, module){
var domify = require('domify');

/**
 * Replace document.write until a url is written matching the url fragment
 *
 * @param {String} match
 * @param {Element} parent to appendChild onto
 * @param {Function} fn optional callback function
 */

module.exports = function(match, parent, fn){
  var write = document.write;
  document.write = append;
  if (typeof parent === 'function') fn = parent, parent = null;
  if (!parent) parent = document.body;

  function append(str){
    var el = domify(str)
    var src = el.src || '';
    if (el.src.indexOf(match) === -1) return write(str);
    if ('SCRIPT' == el.tagName) el = recreate(el);
    parent.appendChild(el);
    document.write = write;
    fn && fn();
  }
};

/**
 * Re-create the given `script`.
 *
 * domify() actually adds the script to he dom
 * and then immediately removes it so the script
 * will never be loaded :/
 *
 * @param {Element} script
 * @api public
 */

function recreate(script){
  var ret = document.createElement('script');
  ret.src = script.src;
  ret.async = script.async;
  ret.defer = script.defer;
  return ret;
}
});
require.register("ianstormtaylor-to-camel-case/index.js", function(exports, require, module){

var toSpace = require('to-space-case');


/**
 * Expose `toCamelCase`.
 */

module.exports = toCamelCase;


/**
 * Convert a `string` to camel case.
 *
 * @param {String} string
 * @return {String}
 */


function toCamelCase (string) {
  return toSpace(string).replace(/\s(\w)/g, function (matches, letter) {
    return letter.toUpperCase();
  });
}
});
require.register("ianstormtaylor-to-capital-case/index.js", function(exports, require, module){

var clean = require('to-no-case');


/**
 * Expose `toCapitalCase`.
 */

module.exports = toCapitalCase;


/**
 * Convert a `string` to capital case.
 *
 * @param {String} string
 * @return {String}
 */


function toCapitalCase (string) {
  return clean(string).replace(/(^|\s)(\w)/g, function (matches, previous, letter) {
    return previous + letter.toUpperCase();
  });
}
});
require.register("ianstormtaylor-to-constant-case/index.js", function(exports, require, module){

var snake = require('to-snake-case');


/**
 * Expose `toConstantCase`.
 */

module.exports = toConstantCase;


/**
 * Convert a `string` to constant case.
 *
 * @param {String} string
 * @return {String}
 */


function toConstantCase (string) {
  return snake(string).toUpperCase();
}
});
require.register("ianstormtaylor-to-dot-case/index.js", function(exports, require, module){

var toSpace = require('to-space-case');


/**
 * Expose `toDotCase`.
 */

module.exports = toDotCase;


/**
 * Convert a `string` to slug case.
 *
 * @param {String} string
 * @return {String}
 */


function toDotCase (string) {
  return toSpace(string).replace(/\s/g, '.');
}
});
require.register("ianstormtaylor-to-pascal-case/index.js", function(exports, require, module){

var toSpace = require('to-space-case');


/**
 * Expose `toPascalCase`.
 */

module.exports = toPascalCase;


/**
 * Convert a `string` to pascal case.
 *
 * @param {String} string
 * @return {String}
 */


function toPascalCase (string) {
  return toSpace(string).replace(/(?:^|\s)(\w)/g, function (matches, letter) {
    return letter.toUpperCase();
  });
}
});
require.register("ianstormtaylor-to-sentence-case/index.js", function(exports, require, module){

var clean = require('to-no-case');


/**
 * Expose `toSentenceCase`.
 */

module.exports = toSentenceCase;


/**
 * Convert a `string` to camel case.
 *
 * @param {String} string
 * @return {String}
 */


function toSentenceCase (string) {
  return clean(string).replace(/[a-z]/i, function (letter) {
    return letter.toUpperCase();
  });
}
});
require.register("ianstormtaylor-to-slug-case/index.js", function(exports, require, module){

var toSpace = require('to-space-case');


/**
 * Expose `toSlugCase`.
 */

module.exports = toSlugCase;


/**
 * Convert a `string` to slug case.
 *
 * @param {String} string
 * @return {String}
 */


function toSlugCase (string) {
  return toSpace(string).replace(/\s/g, '-');
}
});
require.register("ianstormtaylor-to-snake-case/index.js", function(exports, require, module){
var toSpace = require('to-space-case');


/**
 * Expose `toSnakeCase`.
 */

module.exports = toSnakeCase;


/**
 * Convert a `string` to snake case.
 *
 * @param {String} string
 * @return {String}
 */


function toSnakeCase (string) {
  return toSpace(string).replace(/\s/g, '_');
}

});
require.register("ianstormtaylor-to-space-case/index.js", function(exports, require, module){

var clean = require('to-no-case');


/**
 * Expose `toSpaceCase`.
 */

module.exports = toSpaceCase;


/**
 * Convert a `string` to space case.
 *
 * @param {String} string
 * @return {String}
 */


function toSpaceCase (string) {
  return clean(string).replace(/[\W_]+(.|$)/g, function (matches, match) {
    return match ? ' ' + match : '';
  });
}
});
require.register("component-escape-regexp/index.js", function(exports, require, module){

/**
 * Escape regexp special characters in `str`.
 *
 * @param {String} str
 * @return {String}
 * @api public
 */

module.exports = function(str){
  return String(str).replace(/([.*+?=^!:${}()|[\]\/\\])/g, '\\$1');
};
});
require.register("ianstormtaylor-map/index.js", function(exports, require, module){

var each = require('each');


/**
 * Map an array or object.
 *
 * @param {Array|Object} obj
 * @param {Function} iterator
 * @return {Mixed}
 */

module.exports = function map (obj, iterator) {
  var arr = [];
  each(obj, function (o) {
    arr.push(iterator.apply(null, arguments));
  });
  return arr;
};
});
require.register("ianstormtaylor-title-case-minors/index.js", function(exports, require, module){

module.exports = [
  'a',
  'an',
  'and',
  'as',
  'at',
  'but',
  'by',
  'en',
  'for',
  'from',
  'how',
  'if',
  'in',
  'neither',
  'nor',
  'of',
  'on',
  'only',
  'onto',
  'out',
  'or',
  'per',
  'so',
  'than',
  'that',
  'the',
  'to',
  'until',
  'up',
  'upon',
  'v',
  'v.',
  'versus',
  'vs',
  'vs.',
  'via',
  'when',
  'with',
  'without',
  'yet'
];
});
require.register("ianstormtaylor-to-title-case/index.js", function(exports, require, module){

var capital = require('to-capital-case')
  , escape = require('escape-regexp')
  , map = require('map')
  , minors = require('title-case-minors');


/**
 * Expose `toTitleCase`.
 */

module.exports = toTitleCase;


/**
 * Minors.
 */

var escaped = map(minors, escape);
var minorMatcher = new RegExp('[^^]\\b(' + escaped.join('|') + ')\\b', 'ig');
var colonMatcher = /:\s*(\w)/g;


/**
 * Convert a `string` to camel case.
 *
 * @param {String} string
 * @return {String}
 */


function toTitleCase (string) {
  return capital(string)
    .replace(minorMatcher, function (minor) {
      return minor.toLowerCase();
    })
    .replace(colonMatcher, function (letter) {
      return letter.toUpperCase();
    });
}
});
require.register("ianstormtaylor-case/lib/index.js", function(exports, require, module){

var cases = require('./cases');


/**
 * Expose `determineCase`.
 */

module.exports = exports = determineCase;


/**
 * Determine the case of a `string`.
 *
 * @param {String} string
 * @return {String|Null}
 */

function determineCase (string) {
  for (var key in cases) {
    if (key == 'none') continue;
    var convert = cases[key];
    if (convert(string) == string) return key;
  }
  return null;
}


/**
 * Define a case by `name` with a `convert` function.
 *
 * @param {String} name
 * @param {Object} convert
 */

exports.add = function (name, convert) {
  exports[name] = cases[name] = convert;
};


/**
 * Add all the `cases`.
 */

for (var key in cases) {
  exports.add(key, cases[key]);
}
});
require.register("ianstormtaylor-case/lib/cases.js", function(exports, require, module){

var camel = require('to-camel-case')
  , capital = require('to-capital-case')
  , constant = require('to-constant-case')
  , dot = require('to-dot-case')
  , none = require('to-no-case')
  , pascal = require('to-pascal-case')
  , sentence = require('to-sentence-case')
  , slug = require('to-slug-case')
  , snake = require('to-snake-case')
  , space = require('to-space-case')
  , title = require('to-title-case');


/**
 * Camel.
 */

exports.camel = camel;


/**
 * Pascal.
 */

exports.pascal = pascal;


/**
 * Dot. Should precede lowercase.
 */

exports.dot = dot;


/**
 * Slug. Should precede lowercase.
 */

exports.slug = slug;


/**
 * Snake. Should precede lowercase.
 */

exports.snake = snake;


/**
 * Space. Should precede lowercase.
 */

exports.space = space;


/**
 * Constant. Should precede uppercase.
 */

exports.constant = constant;


/**
 * Capital. Should precede sentence and title.
 */

exports.capital = capital;


/**
 * Title.
 */

exports.title = title;


/**
 * Sentence.
 */

exports.sentence = sentence;


/**
 * Convert a `string` to lower case from camel, slug, etc. Different that the
 * usual `toLowerCase` in that it will try to break apart the input first.
 *
 * @param {String} string
 * @return {String}
 */

exports.lower = function (string) {
  return none(string).toLowerCase();
};


/**
 * Convert a `string` to upper case from camel, slug, etc. Different that the
 * usual `toUpperCase` in that it will try to break apart the input first.
 *
 * @param {String} string
 * @return {String}
 */

exports.upper = function (string) {
  return none(string).toUpperCase();
};


/**
 * Invert each character in a `string` from upper to lower and vice versa.
 *
 * @param {String} string
 * @return {String}
 */

exports.inverse = function (string) {
  for (var i = 0, char; char = string[i]; i++) {
    if (!/[a-z]/i.test(char)) continue;
    var upper = char.toUpperCase();
    var lower = char.toLowerCase();
    string[i] = char == upper ? lower : upper;
  }
  return string;
};


/**
 * None.
 */

exports.none = none;
});
require.register("segmentio-obj-case/index.js", function(exports, require, module){

var Case = require('case');


var cases = [
  Case.upper,
  Case.lower,
  Case.snake,
  Case.pascal,
  Case.camel,
  Case.constant,
  Case.title,
  Case.capital,
  Case.sentence
];


/**
 * Module exports, export
 */

module.exports = module.exports.find = multiple(find);


/**
 * Export the replacement function, return the modified object
 */

module.exports.replace = function (obj, key, val) {
  multiple(replace).apply(this, arguments);
  return obj;
};


/**
 * Export the delete function, return the modified object
 */

module.exports.del = function (obj, key) {
  multiple(del).apply(this, arguments);
  return obj;
};


/**
 * Compose applying the function to a nested key
 */

function multiple (fn) {
  return function (obj, key, val) {
    var keys = key.split('.');
    if (keys.length === 0) return;

    while (keys.length > 1) {
      key = keys.shift();
      obj = find(obj, key);

      if (obj === null || obj === undefined) return;
    }

    key = keys.shift();
    return fn(obj, key, val);
  };
}


/**
 * Find an object by its key
 *
 * find({ first_name : 'Calvin' }, 'firstName')
 */

function find (obj, key) {
  for (var i = 0; i < cases.length; i++) {
    var cased = cases[i](key);
    if (obj.hasOwnProperty(cased)) return obj[cased];
  }
}


/**
 * Delete a value for a given key
 *
 * del({ a : 'b', x : 'y' }, 'X' }) -> { a : 'b' }
 */

function del (obj, key) {
  for (var i = 0; i < cases.length; i++) {
    var cased = cases[i](key);
    if (obj.hasOwnProperty(cased)) delete obj[cased];
  }
  return obj;
}


/**
 * Replace an objects existing value with a new one
 *
 * replace({ a : 'b' }, 'a', 'c') -> { a : 'c' }
 */

function replace (obj, key, val) {
  for (var i = 0; i < cases.length; i++) {
    var cased = cases[i](key);
    if (obj.hasOwnProperty(cased)) obj[cased] = val;
  }
  return obj;
}

});
require.register("segmentio-analytics.js-integrations/index.js", function(exports, require, module){

var integrations = require('./lib/slugs');
var each = require('each');

/**
 * Expose the integrations, using their own `name` from their `prototype`.
 */

each(integrations, function (slug) {
  var plugin = require('./lib/' + slug);
  var name = plugin.Integration.prototype.name;
  exports[name] = plugin;
});

});
require.register("segmentio-analytics.js-integrations/lib/google-analytics.js", function(exports, require, module){

var callback = require('callback');
var canonical = require('canonical');
var each = require('each');
var integration = require('integration');
var is = require('is');
var load = require('load-script');
var push = require('global-queue')('_gaq');
var Track = require('facade').Track;
var length = require('object').length;
var keys = require('object').keys;
var dot = require('obj-case');
var type = require('type');
var url = require('url');
var group;
var user;


/**
 * Expose plugin.
 */

module.exports = exports = function (analytics) {
  analytics.addIntegration(GA);
  group = analytics.group();
  user = analytics.user();
};


/**
 * Expose `GA` integration.
 *
 * http://support.google.com/analytics/bin/answer.py?hl=en&answer=2558867
 * https://developers.google.com/analytics/devguides/collection/gajs/methods/gaJSApiBasicConfiguration#_gat.GA_Tracker_._setSiteSpeedSampleRate
 */

var GA = exports.Integration = integration('Google Analytics')
  .readyOnLoad()
  .global('ga')
  .global('gaplugins')
  .global('_gaq')
  .global('GoogleAnalyticsObject')
  .option('anonymizeIp', false)
  .option('classic', false)
  .option('domain', 'none')
  .option('doubleClick', false)
  .option('enhancedLinkAttribution', false)
  .option('ignoreReferrer', null)
  .option('includeSearch', false)
  .option('siteSpeedSampleRate', null)
  .option('trackingId', '')
  .option('trackNamedPages', true)
  .option('trackCategorizedPages', true)
  .option('sendUserId', false)
  .option('metrics', {})
  .option('dimensions', {});


/**
 * When in "classic" mode, on `construct` swap all of the method to point to
 * their classic counterparts.
 */

GA.on('construct', function (integration) {
  if (!integration.options.classic) return;
  integration.initialize = integration.initializeClassic;
  integration.load = integration.loadClassic;
  integration.loaded = integration.loadedClassic;
  integration.page = integration.pageClassic;
  integration.track = integration.trackClassic;
  integration.completedOrder = integration.completedOrderClassic;
});


/**
 * Initialize.
 *
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/advanced
 */

GA.prototype.initialize = function () {
  var opts = this.options;
  var gMetrics = metrics(group.traits(), opts);
  var uMetrics = metrics(user.traits(), opts);
  var custom;

  // setup the tracker globals
  window.GoogleAnalyticsObject = 'ga';
  window.ga = window.ga || function () {
    window.ga.q = window.ga.q || [];
    window.ga.q.push(arguments);
  };
  window.ga.l = new Date().getTime();

  window.ga('create', opts.trackingId, {
    cookieDomain: opts.domain || GA.prototype.defaults.domain, // to protect against empty string
    siteSpeedSampleRate: opts.siteSpeedSampleRate,
    allowLinker: true
  });

  // display advertising
  if (opts.doubleClick) {
    window.ga('require', 'displayfeatures');
  }

  // send global id
  if (opts.sendUserId && user.id()) {
    window.ga('set', '&uid', user.id());
  }

  // anonymize after initializing, otherwise a warning is shown
  // in google analytics debugger
  if (opts.anonymizeIp) window.ga('set', 'anonymizeIp', true);

  // custom dimensions & metrics
  if (length(gMetrics)) window.ga('set', gMetrics);
  if (length(uMetrics)) window.ga('set', uMetrics);

  this.load();
};


/**
 * Loaded?
 *
 * @return {Boolean}
 */

GA.prototype.loaded = function () {
  return !! window.gaplugins;
};


/**
 * Load the Google Analytics library.
 *
 * @param {Function} callback
 */

GA.prototype.load = function (callback) {
  load('//www.google-analytics.com/analytics.js', callback);
};


/**
 * Page.
 *
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/pages
 *
 * @param {Page} page
 */

GA.prototype.page = function (page) {
  var category = page.category();
  var props = page.properties();
  var name = page.fullName();
  var pageview = {};
  var track;

  this._category = category; // store for later

  // add metrics and dimensions
  var hit = metrics(page.properties(), this.options);
  hit.page = path(props, this.options);
  hit.title = name || props.title;
  hit.location = props.url;

  // send
  window.ga('send', 'pageview', hit);

  // categorized pages
  if (category && this.options.trackCategorizedPages) {
    track = page.track(category);
    this.track(track, { noninteraction: true });
  }

  // named pages
  if (name && this.options.trackNamedPages) {
    track = page.track(name);
    this.track(track, { noninteraction: true });
  }
};


/**
 * Track.
 *
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/events
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference
 *
 * @param {Track} event
 */

GA.prototype.track = function (track, options) {
  var opts = options || track.options(this.name);
  var props = track.properties();

  // metrics & dimensions
  var event = metrics(props, this.options);

  // event
  event.eventAction = track.event();
  event.eventCategory = this._category || props.category || 'All';
  event.eventLabel = props.label;
  event.eventValue = formatValue(props.value || track.revenue());
  event.nonInteraction = props.noninteraction || opts.noninteraction;

  // send
  window.ga('send', 'event', event);
};

/**
 * Completed order.
 *
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/ecommerce
 *
 * @param {Track} track
 * @api private
 */

GA.prototype.completedOrder = function(track){
  var orderId = track.orderId();
  var products = track.products();
  var props = track.properties();

  // orderId is required.
  if (!orderId) return;

  // require ecommerce
  if (!this.ecommerce) {
    window.ga('require', 'ecommerce', 'ecommerce.js');
    this.ecommerce = true;
  }

  // add transaction
  window.ga('ecommerce:addTransaction', {
    affiliation: props.affiliation,
    shipping: track.shipping(),
    revenue: track.total(),
    tax: track.tax(),
    id: orderId
  });

  // add products
  each(products, function(product){
    var track = new Track({ properties: product });
    window.ga('ecommerce:addItem', {
      category: track.category(),
      quantity: track.quantity(),
      price: track.price(),
      name: track.name(),
      sku: track.sku(),
      id: orderId
    });
  });

  // send
  window.ga('ecommerce:send');
};

/**
 * Initialize (classic).
 *
 * https://developers.google.com/analytics/devguides/collection/gajs/methods/gaJSApiBasicConfiguration
 */

GA.prototype.initializeClassic = function () {
  var opts = this.options;
  var anonymize = opts.anonymizeIp;
  var db = opts.doubleClick;
  var domain = opts.domain;
  var enhanced = opts.enhancedLinkAttribution;
  var ignore = opts.ignoreReferrer;
  var sample = opts.siteSpeedSampleRate;

  window._gaq = window._gaq || [];
  push('_setAccount', opts.trackingId);
  push('_setAllowLinker', true);

  if (anonymize) push('_gat._anonymizeIp');
  if (domain) push('_setDomainName', domain);
  if (sample) push('_setSiteSpeedSampleRate', sample);

  if (enhanced) {
    var protocol = 'https:' === document.location.protocol ? 'https:' : 'http:';
    var pluginUrl = protocol + '//www.google-analytics.com/plugins/ga/inpage_linkid.js';
    push('_require', 'inpage_linkid', pluginUrl);
  }

  if (ignore) {
    if (!is.array(ignore)) ignore = [ignore];
    each(ignore, function (domain) {
      push('_addIgnoredRef', domain);
    });
  }

  this.load();
};


/**
 * Loaded? (classic)
 *
 * @return {Boolean}
 */

GA.prototype.loadedClassic = function () {
  return !! (window._gaq && window._gaq.push !== Array.prototype.push);
};


/**
 * Load the classic Google Analytics library.
 *
 * @param {Function} callback
 */

GA.prototype.loadClassic = function (callback) {
  if (this.options.doubleClick) {
    load('//stats.g.doubleclick.net/dc.js', callback);
  } else {
    load({
      http: 'http://www.google-analytics.com/ga.js',
      https: 'https://ssl.google-analytics.com/ga.js'
    }, callback);
  }
};


/**
 * Page (classic).
 *
 * https://developers.google.com/analytics/devguides/collection/gajs/methods/gaJSApiBasicConfiguration
 *
 * @param {Page} page
 */

GA.prototype.pageClassic = function (page) {
  var opts = page.options(this.name);
  var category = page.category();
  var props = page.properties();
  var name = page.fullName();
  var track;

  push('_trackPageview', path(props, this.options));

  // categorized pages
  if (category && this.options.trackCategorizedPages) {
    track = page.track(category);
    this.track(track, { noninteraction: true });
  }

  // named pages
  if (name && this.options.trackNamedPages) {
    track = page.track(name);
    this.track(track, { noninteraction: true });
  }
};


/**
 * Track (classic).
 *
 * https://developers.google.com/analytics/devguides/collection/gajs/methods/gaJSApiEventTracking
 *
 * @param {Track} track
 */

GA.prototype.trackClassic = function (track, options) {
  var opts = options || track.options(this.name);
  var props = track.properties();
  var revenue = track.revenue();
  var event = track.event();
  var category = this._category || props.category || 'All';
  var label = props.label;
  var value = formatValue(revenue || props.value);
  var noninteraction = props.noninteraction || opts.noninteraction;
  push('_trackEvent', category, event, label, value, noninteraction);
};

/**
 * Completed order.
 *
 * https://developers.google.com/analytics/devguides/collection/gajs/gaTrackingEcommerce
 *
 * @param {Track} track
 * @api private
 */

GA.prototype.completedOrderClassic = function(track){
  var orderId = track.orderId();
  var products = track.products() || [];
  var props = track.properties();

  // required
  if (!orderId) return;

  // add transaction
  push('_addTrans'
    , orderId
    , props.affiliation
    , track.total()
    , track.tax()
    , track.shipping()
    , track.city()
    , track.state()
    , track.country());

  // add items
  each(products, function(product){
    var track = new Track({ properties: product });
    push('_addItem'
      , orderId
      , track.sku()
      , track.name()
      , track.category()
      , track.price()
      , track.quantity());
  })

  // send
  push('_trackTrans');
};

/**
 * Return the path based on `properties` and `options`.
 *
 * @param {Object} properties
 * @param {Object} options
 */

function path (properties, options) {
  if (!properties) return;
  var str = properties.path;
  if (options.includeSearch && properties.search) str += properties.search;
  return str;
}


/**
 * Format the value property to Google's liking.
 *
 * @param {Number} value
 * @return {Number}
 */

function formatValue (value) {
  if (!value || value < 0) return 0;
  return Math.round(value);
}

/**
 * Map google's custom dimensions & metrics with `obj`.
 *
 * Example:
 *
 *      metrics({ revenue: 1.9 }, { { metrics : { metric8: 'revenue' } });
 *      // => { metric8: 1.9 }
 *
 *      metrics({ revenue: 1.9 }, {});
 *      // => {}
 *
 * @param {Object} obj
 * @param {Object} data
 * @return {Object|null}
 * @api private
 */

function metrics(obj, data){
  var dimensions = data.dimensions;
  var metrics = data.metrics;
  var names = keys(metrics).concat(keys(dimensions));
  var ret = {};

  for (var i = 0; i < names.length; ++i) {
    var name = metrics[names[i]] || dimensions[names[i]];
    var value = dot(obj, name);
    if (null == value) continue;
    ret[names[i]] = value;
  }

  return ret;
}

});
require.register("segmentio-analytics.js-integrations/lib/intercom.js", function(exports, require, module){

var alias = require('alias');
var convertDates = require('convert-dates');
var integration = require('integration');
var each = require('each');
var is = require('is');
var isEmail = require('is-email');
var load = require('load-script');
var defaults = require('defaults');
var empty = require('is-empty');


/* Group reference. */
var group;


/**
 * Expose plugin.
 */

module.exports = exports = function (analytics) {
  analytics.addIntegration(Intercom);
  group = analytics.group();
};


/**
 * Expose `Intercom` integration.
 */

var Intercom = exports.Integration = integration('Intercom')
  .assumesPageview()
  .readyOnLoad()
  .global('Intercom')
  .option('activator', '#IntercomDefaultWidget')
  .option('appId', '')
  .option('inbox', false);


/**
 * Initialize.
 *
 * http://docs.intercom.io/
 * http://docs.intercom.io/#IntercomJS
 *
 * @param {Object} page
 */

Intercom.prototype.initialize = function (page) {
  this.load();
};


/**
 * Loaded?
 *
 * @return {Boolean}
 */

Intercom.prototype.loaded = function () {
  return is.fn(window.Intercom);
};


/**
 * Load the Intercom library.
 *
 * @param {Function} callback
 */

Intercom.prototype.load = function (callback) {
  load('https://static.intercomcdn.com/intercom.v1.js', callback);
};

/**
 * Page.
 *
 * @param {Page} page
 */

Intercom.prototype.page = function(page){
  window.Intercom('update');
};


/**
 * Identify.
 *
 * http://docs.intercom.io/#IntercomJS
 *
 * @param {Identify} identify
 */

Intercom.prototype.identify = function (identify) {
  var traits = identify.traits({ userId: 'user_id' });
  var activator = this.options.activator;
  var opts = identify.options(this.name);
  var companyCreated = identify.companyCreated();
  var created = identify.created();
  var email = identify.email();
  var name = identify.name();
  var id = identify.userId();

  if (!id && !traits.email) return; // one is required

  traits.app_id = this.options.appId;

  // Make sure company traits are carried over (fixes #120).
  if (!empty(group.traits())) {
    traits.company = traits.company || {};
    defaults(traits.company, group.traits());
  }

  // name
  if (name) traits.name = name;

  // handle dates
  if (companyCreated) traits.company.created = companyCreated;
  if (created) traits.created = created;

  // convert dates
  traits = convertDates(traits, formatDate);
  traits = alias(traits, { created: 'created_at'});

  // company
  if (traits.company) {
    traits.company = alias(traits.company, { created: 'created_at' });
  }

  // handle options
  if (opts.increments) traits.increments = opts.increments;
  if (opts.userHash) traits.user_hash = opts.userHash;
  if (opts.user_hash) traits.user_hash = opts.user_hash;

  // Intercom, will force the widget to appear
  // if the selector is #IntercomDefaultWidget
  // so no need to check inbox, just need to check
  // that the selector isn't #IntercomDefaultWidget.
  if ('#IntercomDefaultWidget' != activator) {
    traits.widget = { activator: activator };
  }

  var method = this._id !== id ? 'boot': 'update';
  this._id = id; // cache for next time

  window.Intercom(method, traits);
};


/**
 * Group.
 *
 * @param {Group} group
 */

Intercom.prototype.group = function (group) {
  var props = group.properties();
  var id = group.groupId();
  if (id) props.id = id;
  window.Intercom('update', { company: props });
};

/**
 * Track.
 *
 * @param {Track} track
 */

Intercom.prototype.track = function(track){
  window.Intercom('trackEvent', track.event(), track.properties());
};

/**
 * Format a date to Intercom's liking.
 *
 * @param {Date} date
 * @return {Number}
 */

function formatDate (date) {
  return Math.floor(date / 1000);
}

});
require.register("segmentio-analytics.js-integrations/lib/keen-io.js", function(exports, require, module){

var callback = require('callback');
var integration = require('integration');
var load = require('load-script');


/**
 * Expose plugin.
 */

module.exports = exports = function (analytics) {
  analytics.addIntegration(Keen);
};


/**
 * Expose `Keen IO` integration.
 */

var Keen = exports.Integration = integration('Keen IO')
  .readyOnInitialize()
  .global('Keen')
  .option('projectId', '')
  .option('readKey', '')
  .option('writeKey', '')
  .option('trackNamedPages', true)
  .option('trackAllPages', false)
  .option('trackCategorizedPages', true);


/**
 * Initialize.
 *
 * https://keen.io/docs/
 */

Keen.prototype.initialize = function () {
  var options = this.options;
  window.Keen = window.Keen||{configure:function(e){this._cf=e;},addEvent:function(e,t,n,i){this._eq=this._eq||[],this._eq.push([e,t,n,i]);},setGlobalProperties:function(e){this._gp=e;},onChartsReady:function(e){this._ocrq=this._ocrq||[],this._ocrq.push(e);}};
  window.Keen.configure({
    projectId: options.projectId,
    writeKey: options.writeKey,
    readKey: options.readKey
  });
  this.load();
};


/**
 * Loaded?
 *
 * @return {Boolean}
 */

Keen.prototype.loaded = function () {
  return !! (window.Keen && window.Keen.Base64);
};


/**
 * Load the Keen IO library.
 *
 * @param {Function} callback
 */

Keen.prototype.load = function (callback) {
  load('//dc8na2hxrj29i.cloudfront.net/code/keen-2.1.0-min.js', callback);
};


/**
 * Page.
 *
 * @param {Page} page
 */

Keen.prototype.page = function (page) {
  var category = page.category();
  var props = page.properties();
  var name = page.fullName();
  var opts = this.options;

  // all pages
  if (opts.trackAllPages) {
    this.track(page.track());
  }

  // named pages
  if (name && opts.trackNamedPages) {
    this.track(page.track(name));
  }

  // categorized pages
  if (category && opts.trackCategorizedPages) {
    this.track(page.track(category));
  }
};


/**
 * Identify.
 *
 * TODO: migrate from old `userId` to simpler `id`
 *
 * @param {Identify} identify
 */

Keen.prototype.identify = function (identify) {
  var traits = identify.traits();
  var id = identify.userId();
  var user = {};
  if (id) user.userId = id;
  if (traits) user.traits = traits;
  window.Keen.setGlobalProperties(function() {
    return { user: user };
  });
};


/**
 * Track.
 *
 * @param {Track} track
 */

Keen.prototype.track = function (track) {
  window.Keen.addEvent(track.event(), track.properties());
};

});
require.register("segmentio-analytics.js-integrations/lib/kissmetrics.js", function(exports, require, module){

var alias = require('alias');
var Batch = require('batch');
var callback = require('callback');
var integration = require('integration');
var is = require('is');
var load = require('load-script');
var push = require('global-queue')('_kmq');
var Track = require('facade').Track;
var each = require('each');

/**
 * Expose plugin.
 */

module.exports = exports = function (analytics) {
  analytics.addIntegration(KISSmetrics);
};


/**
 * Expose `KISSmetrics` integration.
 */

var KISSmetrics = exports.Integration = integration('KISSmetrics')
  .assumesPageview()
  .readyOnInitialize()
  .global('_kmq')
  .global('KM')
  .global('_kmil')
  .option('apiKey', '')
  .option('trackNamedPages', true)
  .option('trackCategorizedPages', true);


/**
 * Initialize.
 *
 * http://support.kissmetrics.com/apis/javascript
 *
 * @param {Object} page
 */

KISSmetrics.prototype.initialize = function (page) {
  window._kmq = [];
  this.load();
};


/**
 * Loaded?
 *
 * @return {Boolean}
 */

KISSmetrics.prototype.loaded = function () {
  return is.object(window.KM);
};


/**
 * Load.
 *
 * @param {Function} callback
 */

KISSmetrics.prototype.load = function (callback) {
  var key = this.options.apiKey;
  var useless = '//i.kissmetrics.com/i.js';
  var library = '//doug1izaerwt3.cloudfront.net/' + key + '.1.js';

  new Batch()
    .push(function (done) { load(useless, done); }) // :)
    .push(function (done) { load(library, done); })
    .end(callback);
};


/**
 * Page.
 *
 * @param {String} category (optional)
 * @param {String} name (optional)
 * @param {Object} properties (optional)
 * @param {Object} options (optional)
 */

KISSmetrics.prototype.page = function (page) {
  var category = page.category();
  var name = page.fullName();
  var opts = this.options;

  // named pages
  if (name && opts.trackNamedPages) {
    this.track(page.track(name));
  }

  // categorized pages
  if (category && opts.trackCategorizedPages) {
    this.track(page.track(category));
  }
};


/**
 * Identify.
 *
 * @param {Identify} identify
 */

KISSmetrics.prototype.identify = function (identify) {
  var traits = identify.traits();
  var id = identify.userId();
  if (id) push('identify', id);
  if (traits) push('set', traits);
};


/**
 * Track.
 *
 * @param {Track} track
 */

KISSmetrics.prototype.track = function (track) {
  var props = track.properties({ revenue: 'Billing Amount' });
  push('record', track.event(), props);
};


/**
 * Alias.
 *
 * @param {Alias} to
 */

KISSmetrics.prototype.alias = function (alias) {
  push('alias', alias.to(), alias.from());
};

/**
 * Viewed product.
 *
 * @param {Track} track
 * @api private
 */

KISSmetrics.prototype.viewedProduct = function(track){
  push('record', 'Product Viewed', toProduct(track));
};

/**
 * Product added.
 *
 * @param {Track} track
 * @api private
 */

KISSmetrics.prototype.addedProduct = function(track){
  push('record', 'Product Added', toProduct(track));
};

/**
 * Completed order.
 *
 * @param {Track} track
 * @api private
 */

KISSmetrics.prototype.completedOrder = function(track){
  var orderId = track.orderId();
  var products = track.products();

  // transaction
  push('record', 'Purchased', {
    'Order ID': track.orderId(),
    'Order Total': track.total()
  });

  // items
  window._kmq.push(function(){
    var km = window.KM;
    each(products, function(product, i){
      var track = new Track({ properties: product });
      var item = toProduct(track);
      item['Order ID'] = orderId;
      item._t = km.ts() + i;
      item._d = 1;
      km.set(item);
    });
  });
};

/**
 * Get a product from the given `track`.
 *
 * @param {Track} track
 * @return {Object}
 * @api private
 */

function toProduct(track){
  return {
    Quantity: track.quantity(),
    Price: track.price(),
    Name: track.name(),
    SKU: track.sku()
  };
}

});
require.register("segmentio-analytics.js-integrations/lib/mixpanel.js", function(exports, require, module){

var alias = require('alias');
var clone = require('clone');
var dates = require('convert-dates');
var integration = require('integration');
var iso = require('to-iso-string');
var load = require('load-script');
var indexof = require('indexof');
var del = require('obj-case').del;

/**
 * Expose plugin.
 */

module.exports = exports = function (analytics) {
  analytics.addIntegration(Mixpanel);
};


/**
 * Expose `Mixpanel` integration.
 */

var Mixpanel = exports.Integration = integration('Mixpanel')
  .readyOnLoad()
  .global('mixpanel')
  .option('increments', [])
  .option('cookieName', '')
  .option('nameTag', true)
  .option('pageview', false)
  .option('people', false)
  .option('token', '')
  .option('trackAllPages', false)
  .option('trackNamedPages', true)
  .option('trackCategorizedPages', true);


/**
 * Options aliases.
 */

var optionsAliases = {
  cookieName: 'cookie_name'
};


/**
 * Initialize.
 *
 * https://mixpanel.com/help/reference/javascript#installing
 * https://mixpanel.com/help/reference/javascript-full-api-reference#mixpanel.init
 */

Mixpanel.prototype.initialize = function () {
  (function (c, a) {window.mixpanel = a; var b, d, h, e; a._i = []; a.init = function (b, c, f) {function d(a, b) {var c = b.split('.'); 2 == c.length && (a = a[c[0]], b = c[1]); a[b] = function () {a.push([b].concat(Array.prototype.slice.call(arguments, 0))); }; } var g = a; 'undefined' !== typeof f ? g = a[f] = [] : f = 'mixpanel'; g.people = g.people || []; h = ['disable', 'track', 'track_pageview', 'track_links', 'track_forms', 'register', 'register_once', 'unregister', 'identify', 'alias', 'name_tag', 'set_config', 'people.set', 'people.increment', 'people.track_charge', 'people.append']; for (e = 0; e < h.length; e++) d(g, h[e]); a._i.push([b, c, f]); }; a.__SV = 1.2; })(document, window.mixpanel || []);
  this.options.increments = lowercase(this.options.increments);
  var options = alias(this.options, optionsAliases);
  window.mixpanel.init(options.token, options);
  this.load();
};


/**
 * Loaded?
 *
 * @return {Boolean}
 */

Mixpanel.prototype.loaded = function () {
  return !! (window.mixpanel && window.mixpanel.config);
};


/**
 * Load.
 *
 * @param {Function} callback
 */

Mixpanel.prototype.load = function (callback) {
  load('//cdn.mxpnl.com/libs/mixpanel-2.2.min.js', callback);
};


/**
 * Page.
 *
 * https://mixpanel.com/help/reference/javascript-full-api-reference#mixpanel.track_pageview
 *
 * @param {String} category (optional)
 * @param {String} name (optional)
 * @param {Object} properties (optional)
 * @param {Object} options (optional)
 */

Mixpanel.prototype.page = function (page) {
  var category = page.category();
  var name = page.fullName();
  var opts = this.options;

  // all pages
  if (opts.trackAllPages) {
    this.track(page.track());
  }

  // categorized pages
  if (category && opts.trackCategorizedPages) {
    this.track(page.track(category));
  }

  // named pages
  if (name && opts.trackNamedPages) {
    this.track(page.track(name));
  }
};


/**
 * Trait aliases.
 */

var traitAliases = {
  created: '$created',
  email: '$email',
  firstName: '$first_name',
  lastName: '$last_name',
  lastSeen: '$last_seen',
  name: '$name',
  username: '$username',
  phone: '$phone'
};


/**
 * Identify.
 *
 * https://mixpanel.com/help/reference/javascript#super-properties
 * https://mixpanel.com/help/reference/javascript#user-identity
 * https://mixpanel.com/help/reference/javascript#storing-user-profiles
 *
 * @param {Identify} identify
 */

Mixpanel.prototype.identify = function (identify) {
  var username = identify.username();
  var email = identify.email();
  var id = identify.userId();

  // id
  if (id) window.mixpanel.identify(id);

  // name tag
  var nametag = email || username || id;
  if (nametag) window.mixpanel.name_tag(nametag);

  // traits
  var traits = identify.traits(traitAliases);
  if (traits.$created) del(traits, 'createdAt');
  window.mixpanel.register(traits);
  if (this.options.people) window.mixpanel.people.set(traits);
};

/**
 * Maps user properties into service-specific properties
 */

var specialPropertiesAliases = {
  'referrer': '$referrer',
  'referring_domain': '$referring_domain'
};

/**
 * Track.
 *
 * https://mixpanel.com/help/reference/javascript#sending-events
 * https://mixpanel.com/help/reference/javascript#tracking-revenue
 *
 * @param {Track} track
 */

Mixpanel.prototype.track = function (track) {
  var increments = this.options.increments;
  var increment = track.event().toLowerCase();
  var people = this.options.people;
  var props = track.properties(specialPropertiesAliases);
  var revenue = track.revenue();

  if (people && ~indexof(increments, increment)) {
    window.mixpanel.people.increment(track.event());
    window.mixpanel.people.set('Last ' + track.event(), new Date);
  }

  props = dates(props, iso);
  window.mixpanel.track(track.event(), props);

  if (revenue && people) {
    window.mixpanel.people.track_charge(revenue);
  }
};


/**
 * Alias.
 *
 * https://mixpanel.com/help/reference/javascript#user-identity
 * https://mixpanel.com/help/reference/javascript-full-api-reference#mixpanel.alias
 *
 * @param {Alias} alias
 */

Mixpanel.prototype.alias = function (alias) {
  var mp = window.mixpanel;
  var to = alias.to();
  if (mp.get_distinct_id && mp.get_distinct_id() === to) return;
  // HACK: internal mixpanel API to ensure we don't overwrite
  if (mp.get_property && mp.get_property('$people_distinct_id') === to) return;
  // although undocumented, mixpanel takes an optional original id
  mp.alias(to, alias.from());
};

/**
 * Lowercase the given `arr`.
 *
 * @param {Array} arr
 * @return {Array}
 * @api private
 */

function lowercase(arr){
  var ret = new Array(arr.length);

  for (var i = 0; i < arr.length; ++i) {
    ret[i] = String(arr[i]).toLowerCase();
  }

  return ret;
}

});
require.register("segmentio-canonical/index.js", function(exports, require, module){
module.exports = function canonical () {
  var tags = document.getElementsByTagName('link');
  for (var i = 0, tag; tag = tags[i]; i++) {
    if ('canonical' == tag.getAttribute('rel')) return tag.getAttribute('href');
  }
};
});
require.register("segmentio-extend/index.js", function(exports, require, module){

module.exports = function extend (object) {
    // Takes an unlimited number of extenders.
    var args = Array.prototype.slice.call(arguments, 1);

    // For each extender, copy their properties on our object.
    for (var i = 0, source; source = args[i]; i++) {
        if (!source) continue;
        for (var property in source) {
            object[property] = source[property];
        }
    }

    return object;
};
});
require.register("camshaft-require-component/index.js", function(exports, require, module){
/**
 * Require a module with a fallback
 */
module.exports = function(parent) {
  function require(name, fallback) {
    try {
      return parent(name);
    }
    catch (e) {
      try {
        return parent(fallback || name+"-component");
      }
      catch(e2) {
        throw e;
      }
    }
  };

  // Merge the old properties
  for (var key in parent) {
    require[key] = parent[key];
  }

  return require;
};

});
require.register("segmentio-facade/lib/index.js", function(exports, require, module){

var Facade = require('./facade');

/**
 * Expose `Facade` facade.
 */

module.exports = Facade;

/**
 * Expose specific-method facades.
 */

Facade.Alias = require('./alias');
Facade.Group = require('./group');
Facade.Identify = require('./identify');
Facade.Track = require('./track');
Facade.Page = require('./page');

});
require.register("segmentio-facade/lib/alias.js", function(exports, require, module){

var Facade = require('./facade');
var component = require('require-component')(require);
var inherit = component('inherit');

/**
 * Expose `Alias` facade.
 */

module.exports = Alias;

/**
 * Initialize a new `Alias` facade with a `dictionary` of arguments.
 *
 * @param {Object} dictionary
 *   @property {String} from
 *   @property {String} to
 *   @property {Object} options
 */

function Alias (dictionary) {
  Facade.call(this, dictionary);
}

/**
 * Inherit from `Facade`.
 */

inherit(Alias, Facade);

/**
 * Return type of facade.
 *
 * @return {String}
 */

Alias.prototype.action = function () {
  return 'alias';
};

/**
 * Setup some basic proxies.
 */

Alias.prototype.from = Facade.field('from');
Alias.prototype.to = Facade.field('to');
});
require.register("segmentio-facade/lib/facade.js", function(exports, require, module){

var component = require('require-component')(require);
var clone = component('clone');
var isEnabled = component('./is-enabled');
var objCase = component('obj-case');

/**
 * Expose `Facade`.
 */

module.exports = Facade;

/**
 * Initialize a new `Facade` with an `obj` of arguments.
 *
 * @param {Object} obj
 */

function Facade (obj) {
  if (!obj.hasOwnProperty('timestamp')) obj.timestamp = new Date();
  else obj.timestamp = new Date(obj.timestamp);
  this.obj = obj;
}

/**
 * Return a proxy function for a `field` that will attempt to first use methods,
 * and fallback to accessing the underlying object directly. You can specify
 * deeply nested fields too like:
 *
 *   this.proxy('options.Librato');
 *
 * @param {String} field
 */

Facade.prototype.proxy = function (field) {
  var fields = field.split('.');
  field = fields.shift();

  // Call a function at the beginning to take advantage of facaded fields
  var obj = this[field] || this.field(field);
  if (!obj) return obj;
  if (typeof obj === 'function') obj = obj.call(this) || {};
  if (fields.length === 0) return clone(obj);

  obj = objCase(obj, fields.join('.'));
  return clone(obj);
};

/**
 * Directly access a specific `field` from the underlying object, returning a
 * clone so outsiders don't mess with stuff.
 *
 * @param {String} field
 * @return {Mixed}
 */

Facade.prototype.field = function (field) {
  return clone(this.obj[field]);
};

/**
 * Utility method to always proxy a particular `field`. You can specify deeply
 * nested fields too like:
 *
 *   Facade.proxy('options.Librato');
 *
 * @param {String} field
 * @return {Function}
 */

Facade.proxy = function (field) {
  return function () {
    return this.proxy(field);
  };
};

/**
 * Utility method to directly access a `field`.
 *
 * @param {String} field
 * @return {Function}
 */

Facade.field = function (field) {
  return function () {
    return this.field(field);
  };
};

/**
 * Get the basic json object of this facade.
 *
 * @return {Object}
 */

Facade.prototype.json = function () {
  return clone(this.obj);
};

/**
 * Get the options of a call (formerly called "context"). If you pass an
 * integration name, it will get the options for that specific integration, or
 * undefined if the integration is not enabled.
 *
 * @param {String} integration (optional)
 * @return {Object or Null}
 */

Facade.prototype.options = function (integration) {
  var options = clone(this.obj.options || this.obj.context) || {};
  if (!integration) return clone(options);
  if (!this.enabled(integration)) return;
  options = options[integration] || objCase(options, integration) || {};
  return typeof options === 'boolean' ? {} : clone(options);
};

/**
 * Check whether an integration is enabled.
 *
 * @param {String} integration
 * @return {Boolean}
 */

Facade.prototype.enabled = function (integration) {
  var allEnabled = this.proxy('options.providers.all');
  if (typeof allEnabled !== 'boolean') allEnabled = this.proxy('options.all');
  if (typeof allEnabled !== 'boolean') allEnabled = true;

  var enabled = allEnabled && isEnabled(integration);
  var options = this.options();

  // If the integration is explicitly enabled or disabled, use that
  // First, check options.providers for backwards compatibility
  if (options.providers && options.providers.hasOwnProperty(integration)) {
    enabled = options.providers[integration];
  }

  // Next, check for the integration's existence in 'options' to enable it.
  // If the settings are a boolean, use that, otherwise it should be enabled.
  if (options.hasOwnProperty(integration)) {
    var settings = options[integration];
    if (typeof settings === 'boolean') {
      enabled = settings;
    } else {
      enabled = true;
    }
  }

  return enabled ? true : false;
};

/**
 * Get the `userAgent` option.
 *
 * @return {String}
 */

Facade.prototype.userAgent = function () {};

/**
 * Check whether the user is active.
 *
 * @return {Boolean}
 */

Facade.prototype.active = function () {
  var active = this.proxy('options.active');
  if (active === null || active === undefined) active = true;
  return active;
};

/**
 * Setup some basic proxies.
 */

Facade.prototype.userId = Facade.field('userId');
Facade.prototype.sessionId = Facade.field('sessionId');
Facade.prototype.channel = Facade.field('channel');
Facade.prototype.timestamp = Facade.field('timestamp');
Facade.prototype.ip = Facade.proxy('options.ip');

});
require.register("segmentio-facade/lib/group.js", function(exports, require, module){

var Facade = require('./facade');
var component = require('require-component')(require);
var inherit = component('inherit');
var newDate = component('new-date');

/**
 * Expose `Group` facade.
 */

module.exports = Group;

/**
 * Initialize a new `Group` facade with a `dictionary` of arguments.
 *
 * @param {Object} dictionary
 *   @param {String} userId
 *   @param {String} groupId
 *   @param {Object} properties
 *   @param {Object} options
 */

function Group (dictionary) {
  Facade.call(this, dictionary);
}

/**
 * Inherit from `Facade`
 */

inherit(Group, Facade);

/**
 * Get the facade's action.
 */

Group.prototype.action = function () {
  return 'group';
};

/**
 * Setup some basic proxies.
 */

Group.prototype.groupId = Facade.field('groupId');

/**
 * Get created or createdAt.
 *
 * @return {Date}
 */

Group.prototype.created = function(){
  var created = this.proxy('traits.createdAt')
    || this.proxy('traits.created')
    || this.proxy('properties.createdAt')
    || this.proxy('properties.created');

  if (created) return newDate(created);
};

/**
 * Get the group's traits.
 *
 * @param {Object} aliases
 * @return {Object}
 */

Group.prototype.traits = function (aliases) {
  var ret = this.properties();
  var id = this.groupId();
  aliases = aliases || {};

  if (id) ret.id = id;

  for (var alias in aliases) {
    var value = null == this[alias]
      ? this.proxy('traits.' + alias)
      : this[alias]();
    if (null == value) continue;
    ret[aliases[alias]] = value;
    delete ret[alias];
  }

  return ret;
};

/**
 * Get traits or properties.
 *
 * TODO: remove me
 *
 * @return {Object}
 */

Group.prototype.properties = function(){
  return this.field('traits')
    || this.field('properties')
    || {};
};

});
require.register("segmentio-facade/lib/page.js", function(exports, require, module){

var component = require('require-component')(require);
var Facade = component('./facade');
var inherit = component('inherit');
var Track = require('./track');

/**
 * Expose `Page` facade
 */

module.exports = Page;

/**
 * Initialize new `Page` facade with `dictionary`.
 *
 * @param {Object} dictionary
 *   @param {String} category
 *   @param {String} name
 *   @param {Object} traits
 *   @param {Object} options
 */

function Page(dictionary){
  Facade.call(this, dictionary);
}

/**
 * Inherit from `Facade`
 */

inherit(Page, Facade);

/**
 * Get the facade's action.
 *
 * @return {String}
 */

Page.prototype.action = function(){
  return 'page';
};

/**
 * Proxies
 */

Page.prototype.category = Facade.field('category');
Page.prototype.name = Facade.field('name');

/**
 * Get the page properties mixing `category` and `name`.
 *
 * @return {Object}
 */

Page.prototype.properties = function(){
  var props = this.field('properties') || {};
  var category = this.category();
  var name = this.name();
  if (category) props.category = category;
  if (name) props.name = name;
  return props;
};

/**
 * Get the page fullName.
 *
 * @return {String}
 */

Page.prototype.fullName = function(){
  var category = this.category();
  var name = this.name();
  return name && category
    ? category + ' ' + name
    : name;
};

/**
 * Get event with `name`.
 *
 * @return {String}
 */

Page.prototype.event = function(name){
  return name
    ? 'Viewed ' + name + ' Page'
    : 'Loaded a Page';
};

/**
 * Convert this Page to a Track facade with `name`.
 *
 * @param {String} name
 * @return {Track}
 */

Page.prototype.track = function(name){
  var props = this.properties();
  return new Track({
    event: this.event(name),
    properties: props
  });
};

});
require.register("segmentio-facade/lib/identify.js", function(exports, require, module){

var component = require('require-component')(require);
var clone = component('clone');
var Facade = component('./facade');
var inherit = component('inherit');
var isEmail = component('is-email');
var newDate = component('new-date');
var trim = component('trim');

/**
 * Expose `Idenfity` facade.
 */

module.exports = Identify;

/**
 * Initialize a new `Identify` facade with a `dictionary` of arguments.
 *
 * @param {Object} dictionary
 *   @param {String} userId
 *   @param {String} sessionId
 *   @param {Object} traits
 *   @param {Object} options
 */

function Identify (dictionary) {
  Facade.call(this, dictionary);
}

/**
 * Inherit from `Facade`.
 */

inherit(Identify, Facade);

/**
 * Get the facade's action.
 */

Identify.prototype.action = function () {
  return 'identify';
};

/**
 * Get the user's traits.
 *
 * @param {Object} aliases
 * @return {Object}
 */

Identify.prototype.traits = function (aliases) {
  var ret = this.field('traits') || {};
  var id = this.userId();
  aliases = aliases || {};

  if (id) ret.id = id;

  for (var alias in aliases) {
    var value = null == this[alias]
      ? this.proxy('traits.' + alias)
      : this[alias]();
    if (null == value) continue;
    ret[aliases[alias]] = value;
    delete ret[alias];
  }

  return ret;
};

/**
 * Get the user's email, falling back to their user ID if it's a valid email.
 *
 * @return {String}
 */

Identify.prototype.email = function () {
  var email = this.proxy('traits.email');
  if (email) return email;

  var userId = this.userId();
  if (isEmail(userId)) return userId;
};

/**
 * Get the user's created date, optionally looking for `createdAt` since lots of
 * people do that instead.
 *
 * @return {Date or Undefined}
 */

Identify.prototype.created = function () {
  var created = this.proxy('traits.created') || this.proxy('traits.createdAt');
  if (created) return newDate(created);
};

/**
 * Get the company created date.
 *
 * @return {Date or undefined}
 */

Identify.prototype.companyCreated = function(){
  var created = this.proxy('traits.company.created')
    || this.proxy('traits.company.createdAt');

  if (created) return newDate(created);
};

/**
 * Get the user's name, optionally combining a first and last name if that's all
 * that was provided.
 *
 * @return {String or Undefined}
 */

Identify.prototype.name = function () {
  var name = this.proxy('traits.name');
  if (typeof name === 'string') return trim(name);

  var firstName = this.firstName();
  var lastName = this.lastName();
  if (firstName && lastName) return trim(firstName + ' ' + lastName);
};

/**
 * Get the user's first name, optionally splitting it out of a single name if
 * that's all that was provided.
 *
 * @return {String or Undefined}
 */

Identify.prototype.firstName = function () {
  var firstName = this.proxy('traits.firstName');
  if (typeof firstName === 'string') return trim(firstName);

  var name = this.proxy('traits.name');
  if (typeof name === 'string') return trim(name).split(' ')[0];
};

/**
 * Get the user's last name, optionally splitting it out of a single name if
 * that's all that was provided.
 *
 * @return {String or Undefined}
 */

Identify.prototype.lastName = function () {
  var lastName = this.proxy('traits.lastName');
  if (typeof lastName === 'string') return trim(lastName);

  var name = this.proxy('traits.name');
  if (typeof name !== 'string') return;

  var space = trim(name).indexOf(' ');
  if (space === -1) return;

  return trim(name.substr(space + 1));
};

/**
 * Get the user's unique id.
 *
 * @return {String or undefined}
 */

Identify.prototype.uid = function(){
  return this.userId()
    || this.username()
    || this.email();
};

/**
 * Get description.
 *
 * @return {String}
 */

Identify.prototype.description = function(){
  return this.proxy('traits.description')
    || this.proxy('traits.background');
};

/**
 * Setup sme basic "special" trait proxies.
 */

Identify.prototype.username = Facade.proxy('traits.username');
Identify.prototype.website = Facade.proxy('traits.website');
Identify.prototype.phone = Facade.proxy('traits.phone');
Identify.prototype.address = Facade.proxy('traits.address');
Identify.prototype.avatar = Facade.proxy('traits.avatar');

});
require.register("segmentio-facade/lib/is-enabled.js", function(exports, require, module){

/**
 * A few integrations are disabled by default. They must be explicitly
 * enabled by setting options[Provider] = true.
 */

var disabled = {
  Salesforce: true,
  Marketo: true
};

/**
 * Check whether an integration should be enabled by default.
 *
 * @param {String} integration
 * @return {Boolean}
 */

module.exports = function (integration) {
  return ! disabled[integration];
};
});
require.register("segmentio-facade/lib/track.js", function(exports, require, module){

var component = require('require-component')(require);
var clone = component('clone');
var Facade = component('./facade');
var Identify = component('./identify');
var inherit = component('inherit');
var isEmail = component('is-email');
var traverse = component('isodate-traverse');

/**
 * Expose `Track` facade.
 */

module.exports = Track;

/**
 * Initialize a new `Track` facade with a `dictionary` of arguments.
 *
 * @param {object} dictionary
 *   @property {String} event
 *   @property {String} userId
 *   @property {String} sessionId
 *   @property {Object} properties
 *   @property {Object} options
 */

function Track (dictionary) {
  Facade.call(this, dictionary);
}

/**
 * Inherit from `Facade`.
 */

inherit(Track, Facade);

/**
 * Return the facade's action.
 *
 * @return {String}
 */

Track.prototype.action = function () {
  return 'track';
};

/**
 * Setup some basic proxies.
 */

Track.prototype.event = Facade.field('event');
Track.prototype.value = Facade.proxy('properties.value');

/**
 * Misc
 */

Track.prototype.category = Facade.proxy('properties.category');
Track.prototype.country = Facade.proxy('properties.country');
Track.prototype.state = Facade.proxy('properties.state');
Track.prototype.city = Facade.proxy('properties.city');
Track.prototype.zip = Facade.proxy('properties.zip');

/**
 * Ecommerce
 */

Track.prototype.id = Facade.proxy('properties.id');
Track.prototype.sku = Facade.proxy('properties.sku');
Track.prototype.tax = Facade.proxy('properties.tax');
Track.prototype.name = Facade.proxy('properties.name');
Track.prototype.price = Facade.proxy('properties.price');
Track.prototype.total = Facade.proxy('properties.total');
Track.prototype.coupon = Facade.proxy('properties.coupon');
Track.prototype.orderId = Facade.proxy('properties.orderId');
Track.prototype.shipping = Facade.proxy('properties.shipping');

/**
 * Order id.
 *
 * @return {String}
 * @api public
 */

Track.prototype.orderId = function(){
  return this.proxy('properties.id')
    || this.proxy('properties.orderId');
};

/**
 * Get subtotal.
 *
 * @return {Number}
 */

Track.prototype.subtotal = function(){
  var subtotal = this.obj.properties.subtotal;
  var total = this.total();
  var n;

  if (subtotal) return subtotal;
  if (!total) return 0;
  if (n = this.tax()) total -= n;
  if (n = this.shipping()) total -= n;

  return total;
};

/**
 * Get products.
 *
 * @return {Array}
 */

Track.prototype.products = function(){
  var props = this.obj.properties || {};
  return props.products || [];
};

/**
 * Get quantity.
 *
 * @return {Number}
 */

Track.prototype.quantity = function(){
  var props = this.obj.properties || {};
  return props.quantity || 1;
};

/**
 * Get currency.
 *
 * @return {String}
 */

Track.prototype.currency = function(){
  var props = this.obj.properties || {};
  return props.currency || 'USD';
};

/**
 * BACKWARDS COMPATIBILITY: should probably re-examine where these come from.
 */

Track.prototype.referrer = Facade.proxy('properties.referrer');
Track.prototype.query = Facade.proxy('options.query');

/**
 * Get the call's properties.
 *
 * @param {Object} aliases
 * @return {Object}
 */

Track.prototype.properties = function (aliases) {
  var ret = this.field('properties') || {};
  aliases = aliases || {};

  for (var alias in aliases) {
    var value = null == this[alias]
      ? this.proxy('properties.' + alias)
      : this[alias]();
    if (null == value) continue;
    ret[aliases[alias]] = value;
    delete ret[alias];
  }

  return clone(traverse(ret));
};

/**
 * Get the call's "super properties" which are just traits that have been
 * passed in as if from an identify call.
 *
 * @return {Object}
 */

Track.prototype.traits = function () {
  return this.proxy('options.traits') || {};
};

/**
 * Get the call's username.
 *
 * @return {String or Undefined}
 */

Track.prototype.username = function () {
  return this.proxy('traits.username') ||
         this.proxy('properties.username') ||
         this.userId() ||
         this.sessionId();
};

/**
 * Get the call's email, using an the user ID if it's a valid email.
 *
 * @return {String or Undefined}
 */

Track.prototype.email = function () {
  var email = this.proxy('traits.email');
  if (email) return email;

  var userId = this.userId();
  if (isEmail(userId)) return userId;
};

/**
 * Get the call's revenue, parsing it from a string with an optional leading
 * dollar sign.
 *
 * @return {String or Undefined}
 */

Track.prototype.revenue = function () {
  var revenue = this.proxy('properties.revenue');

  if (!revenue) return;
  if (typeof revenue === 'number') return revenue;
  if (typeof revenue !== 'string') return;

  revenue = revenue.replace(/\$/g, '');
  revenue = parseFloat(revenue);

  if (!isNaN(revenue)) return revenue;
};

/**
 * Get cents.
 *
 * @return {Number}
 */

Track.prototype.cents = function(){
  var revenue = this.revenue();
  return 'number' != typeof revenue
    ? this.value() || 0
    : revenue * 100;
};

/**
 * A utility to turn the pieces of a track call into an identify. Used for
 * integrations with super properties or rate limits.
 *
 * TODO: remove me.
 *
 * @return {Facade}
 */

Track.prototype.identify = function () {
  var json = this.json();
  json.traits = this.traits();
  return new Identify(json);
};

});
require.register("segmentio-is-email/index.js", function(exports, require, module){

/**
 * Expose `isEmail`.
 */

module.exports = isEmail;


/**
 * Email address matcher.
 */

var matcher = /.+\@.+\..+/;


/**
 * Loosely validate an email address.
 *
 * @param {String} string
 * @return {Boolean}
 */

function isEmail (string) {
  return matcher.test(string);
}
});
require.register("segmentio-is-meta/index.js", function(exports, require, module){
module.exports = function isMeta (e) {
    if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) return true;

    // Logic that handles checks for the middle mouse button, based
    // on [jQuery](https://github.com/jquery/jquery/blob/master/src/event.js#L466).
    var which = e.which, button = e.button;
    if (!which && button !== undefined) {
      return (!button & 1) && (!button & 2) && (button & 4);
    } else if (which === 2) {
      return true;
    }

    return false;
};
});
require.register("segmentio-isodate/index.js", function(exports, require, module){

/**
 * Matcher, slightly modified from:
 *
 * https://github.com/csnover/js-iso8601/blob/lax/iso8601.js
 */

var matcher = /^(\d{4})(?:-?(\d{2})(?:-?(\d{2}))?)?(?:([ T])(\d{2}):?(\d{2})(?::?(\d{2})(?:[,\.](\d{1,}))?)?(?:(Z)|([+\-])(\d{2})(?::?(\d{2}))?)?)?$/;


/**
 * Convert an ISO date string to a date. Fallback to native `Date.parse`.
 *
 * https://github.com/csnover/js-iso8601/blob/lax/iso8601.js
 *
 * @param {String} iso
 * @return {Date}
 */

exports.parse = function (iso) {
  var numericKeys = [1, 5, 6, 7, 8, 11, 12];
  var arr = matcher.exec(iso);
  var offset = 0;

  // fallback to native parsing
  if (!arr) return new Date(iso);

  // remove undefined values
  for (var i = 0, val; val = numericKeys[i]; i++) {
    arr[val] = parseInt(arr[val], 10) || 0;
  }

  // allow undefined days and months
  arr[2] = parseInt(arr[2], 10) || 1;
  arr[3] = parseInt(arr[3], 10) || 1;

  // month is 0-11
  arr[2]--;

  // allow abitrary sub-second precision
  if (arr[8]) arr[8] = (arr[8] + '00').substring(0, 3);

  // apply timezone if one exists
  if (arr[4] == ' ') {
    offset = new Date().getTimezoneOffset();
  } else if (arr[9] !== 'Z' && arr[10]) {
    offset = arr[11] * 60 + arr[12];
    if ('+' == arr[10]) offset = 0 - offset;
  }

  var millis = Date.UTC(arr[1], arr[2], arr[3], arr[5], arr[6] + offset, arr[7], arr[8]);
  return new Date(millis);
};


/**
 * Checks whether a `string` is an ISO date string. `strict` mode requires that
 * the date string at least have a year, month and date.
 *
 * @param {String} string
 * @param {Boolean} strict
 * @return {Boolean}
 */

exports.is = function (string, strict) {
  if (strict && false === /^\d{4}-\d{2}-\d{2}/.test(string)) return false;
  return matcher.test(string);
};
});
require.register("segmentio-isodate-traverse/index.js", function(exports, require, module){

var is = require('is');
var isodate = require('isodate');
var each;

try {
  each = require('each');
} catch (err) {
  each = require('each-component');
}

/**
 * Expose `traverse`.
 */

module.exports = traverse;

/**
 * Traverse an object or array, and return a clone with all ISO strings parsed
 * into Date objects.
 *
 * @param {Object} obj
 * @return {Object}
 */

function traverse (input, strict) {
  if (strict === undefined) strict = true;

  if (is.object(input)) {
    return object(input, strict);
  } else if (is.array(input)) {
    return array(input, strict);
  }
}

/**
 * Object traverser.
 *
 * @param {Object} obj
 * @param {Boolean} strict
 * @return {Object}
 */

function object (obj, strict) {
  each(obj, function (key, val) {
    if (isodate.is(val, strict)) {
      obj[key] = isodate.parse(val);
    } else if (is.object(val) || is.array(val)) {
      traverse(val, strict);
    }
  });
  return obj;
}

/**
 * Array traverser.
 *
 * @param {Array} arr
 * @param {Boolean} strict
 * @return {Array}
 */

function array (arr, strict) {
  each(arr, function (val, x) {
    if (is.object(val)) {
      traverse(val, strict);
    } else if (isodate.is(val, strict)) {
      arr[x] = isodate.parse(val);
    }
  });
  return arr;
}

});
require.register("component-json-fallback/index.js", function(exports, require, module){
/*
    json2.js
    2014-02-04

    Public Domain.

    NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

    See http://www.JSON.org/js.html


    This code should be minified before deployment.
    See http://javascript.crockford.com/jsmin.html

    USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
    NOT CONTROL.


    This file creates a global JSON object containing two methods: stringify
    and parse.

        JSON.stringify(value, replacer, space)
            value       any JavaScript value, usually an object or array.

            replacer    an optional parameter that determines how object
                        values are stringified for objects. It can be a
                        function or an array of strings.

            space       an optional parameter that specifies the indentation
                        of nested structures. If it is omitted, the text will
                        be packed without extra whitespace. If it is a number,
                        it will specify the number of spaces to indent at each
                        level. If it is a string (such as '\t' or '&nbsp;'),
                        it contains the characters used to indent at each level.

            This method produces a JSON text from a JavaScript value.

            When an object value is found, if the object contains a toJSON
            method, its toJSON method will be called and the result will be
            stringified. A toJSON method does not serialize: it returns the
            value represented by the name/value pair that should be serialized,
            or undefined if nothing should be serialized. The toJSON method
            will be passed the key associated with the value, and this will be
            bound to the value

            For example, this would serialize Dates as ISO strings.

                Date.prototype.toJSON = function (key) {
                    function f(n) {
                        // Format integers to have at least two digits.
                        return n < 10 ? '0' + n : n;
                    }

                    return this.getUTCFullYear()   + '-' +
                         f(this.getUTCMonth() + 1) + '-' +
                         f(this.getUTCDate())      + 'T' +
                         f(this.getUTCHours())     + ':' +
                         f(this.getUTCMinutes())   + ':' +
                         f(this.getUTCSeconds())   + 'Z';
                };

            You can provide an optional replacer method. It will be passed the
            key and value of each member, with this bound to the containing
            object. The value that is returned from your method will be
            serialized. If your method returns undefined, then the member will
            be excluded from the serialization.

            If the replacer parameter is an array of strings, then it will be
            used to select the members to be serialized. It filters the results
            such that only members with keys listed in the replacer array are
            stringified.

            Values that do not have JSON representations, such as undefined or
            functions, will not be serialized. Such values in objects will be
            dropped; in arrays they will be replaced with null. You can use
            a replacer function to replace those with JSON values.
            JSON.stringify(undefined) returns undefined.

            The optional space parameter produces a stringification of the
            value that is filled with line breaks and indentation to make it
            easier to read.

            If the space parameter is a non-empty string, then that string will
            be used for indentation. If the space parameter is a number, then
            the indentation will be that many spaces.

            Example:

            text = JSON.stringify(['e', {pluribus: 'unum'}]);
            // text is '["e",{"pluribus":"unum"}]'


            text = JSON.stringify(['e', {pluribus: 'unum'}], null, '\t');
            // text is '[\n\t"e",\n\t{\n\t\t"pluribus": "unum"\n\t}\n]'

            text = JSON.stringify([new Date()], function (key, value) {
                return this[key] instanceof Date ?
                    'Date(' + this[key] + ')' : value;
            });
            // text is '["Date(---current time---)"]'


        JSON.parse(text, reviver)
            This method parses a JSON text to produce an object or array.
            It can throw a SyntaxError exception.

            The optional reviver parameter is a function that can filter and
            transform the results. It receives each of the keys and values,
            and its return value is used instead of the original value.
            If it returns what it received, then the structure is not modified.
            If it returns undefined then the member is deleted.

            Example:

            // Parse the text. Values that look like ISO date strings will
            // be converted to Date objects.

            myData = JSON.parse(text, function (key, value) {
                var a;
                if (typeof value === 'string') {
                    a =
/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
                    if (a) {
                        return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4],
                            +a[5], +a[6]));
                    }
                }
                return value;
            });

            myData = JSON.parse('["Date(09/09/2001)"]', function (key, value) {
                var d;
                if (typeof value === 'string' &&
                        value.slice(0, 5) === 'Date(' &&
                        value.slice(-1) === ')') {
                    d = new Date(value.slice(5, -1));
                    if (d) {
                        return d;
                    }
                }
                return value;
            });


    This is a reference implementation. You are free to copy, modify, or
    redistribute.
*/

/*jslint evil: true, regexp: true */

/*members "", "\b", "\t", "\n", "\f", "\r", "\"", JSON, "\\", apply,
    call, charCodeAt, getUTCDate, getUTCFullYear, getUTCHours,
    getUTCMinutes, getUTCMonth, getUTCSeconds, hasOwnProperty, join,
    lastIndex, length, parse, prototype, push, replace, slice, stringify,
    test, toJSON, toString, valueOf
*/


// Create a JSON object only if one does not already exist. We create the
// methods in a closure to avoid creating global variables.

(function () {
    

    var JSON = module.exports = {};

    function f(n) {
        // Format integers to have at least two digits.
        return n < 10 ? '0' + n : n;
    }

    if (typeof Date.prototype.toJSON !== 'function') {

        Date.prototype.toJSON = function () {

            return isFinite(this.valueOf())
                ? this.getUTCFullYear()     + '-' +
                    f(this.getUTCMonth() + 1) + '-' +
                    f(this.getUTCDate())      + 'T' +
                    f(this.getUTCHours())     + ':' +
                    f(this.getUTCMinutes())   + ':' +
                    f(this.getUTCSeconds())   + 'Z'
                : null;
        };

        String.prototype.toJSON      =
            Number.prototype.toJSON  =
            Boolean.prototype.toJSON = function () {
                return this.valueOf();
            };
    }

    var cx,
        escapable,
        gap,
        indent,
        meta,
        rep;


    function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

        escapable.lastIndex = 0;
        return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
            var c = meta[a];
            return typeof c === 'string'
                ? c
                : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
        }) + '"' : '"' + string + '"';
    }


    function str(key, holder) {

// Produce a string from holder[key].

        var i,          // The loop counter.
            k,          // The member key.
            v,          // The member value.
            length,
            mind = gap,
            partial,
            value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

        if (value && typeof value === 'object' &&
                typeof value.toJSON === 'function') {
            value = value.toJSON(key);
        }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }

// What happens next depends on the value's type.

        switch (typeof value) {
        case 'string':
            return quote(value);

        case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

            return isFinite(value) ? String(value) : 'null';

        case 'boolean':
        case 'null':

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce 'null'. The case is included here in
// the remote chance that this gets fixed someday.

            return String(value);

// If the type is 'object', we might be dealing with an object or an array or
// null.

        case 'object':

// Due to a specification blunder in ECMAScript, typeof null is 'object',
// so watch out for that case.

            if (!value) {
                return 'null';
            }

// Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

// Is the value an array?

            if (Object.prototype.toString.apply(value) === '[object Array]') {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

                v = partial.length === 0
                    ? '[]'
                    : gap
                    ? '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']'
                    : '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }

// If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    if (typeof rep[i] === 'string') {
                        k = rep[i];
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            } else {

// Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

            v = partial.length === 0
                ? '{}'
                : gap
                ? '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}'
                : '{' + partial.join(',') + '}';
            gap = mind;
            return v;
        }
    }

// If the JSON object does not yet have a stringify method, give it one.

    if (typeof JSON.stringify !== 'function') {
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        };
        JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

            var i;
            gap = '';
            indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.

            if (typeof space === 'number') {
                for (i = 0; i < space; i += 1) {
                    indent += ' ';
                }

// If the space parameter is a string, it will be used as the indent string.

            } else if (typeof space === 'string') {
                indent = space;
            }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

            rep = replacer;
            if (replacer && typeof replacer !== 'function' &&
                    (typeof replacer !== 'object' ||
                    typeof replacer.length !== 'number')) {
                throw new Error('JSON.stringify');
            }

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.

            return str('', {'': value});
        };
    }


// If the JSON object does not yet have a parse method, give it one.

    if (typeof JSON.parse !== 'function') {
        cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
        JSON.parse = function (text, reviver) {

// The parse method takes a text and an optional reviver function, and returns
// a JavaScript value if the text is a valid JSON text.

            var j;

            function walk(holder, key) {

// The walk method is used to recursively walk the resulting structure so
// that modifications can be made.

                var k, v, value = holder[key];
                if (value && typeof value === 'object') {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }


// Parsing happens in four stages. In the first stage, we replace certain
// Unicode characters with escape sequences. JavaScript handles many characters
// incorrectly, either silently deleting them, or treating them as line endings.

            text = String(text);
            cx.lastIndex = 0;
            if (cx.test(text)) {
                text = text.replace(cx, function (a) {
                    return '\\u' +
                        ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }

// In the second stage, we run the text against regular expressions that look
// for non-JSON patterns. We are especially concerned with '()' and 'new'
// because they can cause invocation, and '=' because it can cause mutation.
// But just to be safe, we want to reject all unexpected forms.

// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
// replace all simple value tokens with ']' characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or ']' or
// ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

            if (/^[\],:{}\s]*$/
                    .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
                        .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
                        .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

// In the third stage we use the eval function to compile the text into a
// JavaScript structure. The '{' operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

                j = eval('(' + text + ')');

// In the optional fourth stage, we recursively walk the new structure, passing
// each name/value pair to a reviver function for possible transformation.

                return typeof reviver === 'function'
                    ? walk({'': j}, '')
                    : j;
            }

// If the text is not JSON parseable, then a SyntaxError is thrown.

            throw new SyntaxError('JSON.parse');
        };
    }
}());

});
require.register("segmentio-json/index.js", function(exports, require, module){

var json = window.JSON || {};
var stringify = json.stringify;
var parse = json.parse;

module.exports = parse && stringify
  ? JSON
  : require('json-fallback');

});
require.register("segmentio-new-date/lib/index.js", function(exports, require, module){

var is = require('is');
var isodate = require('isodate');
var milliseconds = require('./milliseconds');
var seconds = require('./seconds');


/**
 * Returns a new Javascript Date object, allowing a variety of extra input types
 * over the native Date constructor.
 *
 * @param {Date|String|Number} val
 */

module.exports = function newDate (val) {
  if (is.date(val)) return val;
  if (is.number(val)) return new Date(toMs(val));

  // date strings
  if (isodate.is(val)) return isodate.parse(val);
  if (milliseconds.is(val)) return milliseconds.parse(val);
  if (seconds.is(val)) return seconds.parse(val);

  // fallback to Date.parse
  return new Date(val);
};


/**
 * If the number passed val is seconds from the epoch, turn it into milliseconds.
 * Milliseconds would be greater than 31557600000 (December 31, 1970).
 *
 * @param {Number} num
 */

function toMs (num) {
  if (num < 31557600000) return num * 1000;
  return num;
}
});
require.register("segmentio-new-date/lib/milliseconds.js", function(exports, require, module){

/**
 * Matcher.
 */

var matcher = /\d{13}/;


/**
 * Check whether a string is a millisecond date string.
 *
 * @param {String} string
 * @return {Boolean}
 */

exports.is = function (string) {
  return matcher.test(string);
};


/**
 * Convert a millisecond string to a date.
 *
 * @param {String} millis
 * @return {Date}
 */

exports.parse = function (millis) {
  millis = parseInt(millis, 10);
  return new Date(millis);
};
});
require.register("segmentio-new-date/lib/seconds.js", function(exports, require, module){

/**
 * Matcher.
 */

var matcher = /\d{10}/;


/**
 * Check whether a string is a second date string.
 *
 * @param {String} string
 * @return {Boolean}
 */

exports.is = function (string) {
  return matcher.test(string);
};


/**
 * Convert a second string to a date.
 *
 * @param {String} seconds
 * @return {Date}
 */

exports.parse = function (seconds) {
  var millis = parseInt(seconds, 10) * 1000;
  return new Date(millis);
};
});
require.register("segmentio-store.js/store.js", function(exports, require, module){
;(function(win){
	var store = {},
		doc = win.document,
		localStorageName = 'localStorage',
		namespace = '__storejs__',
		storage

	store.disabled = false
	store.set = function(key, value) {}
	store.get = function(key) {}
	store.remove = function(key) {}
	store.clear = function() {}
	store.transact = function(key, defaultVal, transactionFn) {
		var val = store.get(key)
		if (transactionFn == null) {
			transactionFn = defaultVal
			defaultVal = null
		}
		if (typeof val == 'undefined') { val = defaultVal || {} }
		transactionFn(val)
		store.set(key, val)
	}
	store.getAll = function() {}

	store.serialize = function(value) {
		return JSON.stringify(value)
	}
	store.deserialize = function(value) {
		if (typeof value != 'string') { return undefined }
		try { return JSON.parse(value) }
		catch(e) { return value || undefined }
	}

	// Functions to encapsulate questionable FireFox 3.6.13 behavior
	// when about.config::dom.storage.enabled === false
	// See https://github.com/marcuswestin/store.js/issues#issue/13
	function isLocalStorageNameSupported() {
		try { return (localStorageName in win && win[localStorageName]) }
		catch(err) { return false }
	}

	if (isLocalStorageNameSupported()) {
		storage = win[localStorageName]
		store.set = function(key, val) {
			if (val === undefined) { return store.remove(key) }
			storage.setItem(key, store.serialize(val))
			return val
		}
		store.get = function(key) { return store.deserialize(storage.getItem(key)) }
		store.remove = function(key) { storage.removeItem(key) }
		store.clear = function() { storage.clear() }
		store.getAll = function() {
			var ret = {}
			for (var i=0; i<storage.length; ++i) {
				var key = storage.key(i)
				ret[key] = store.get(key)
			}
			return ret
		}
	} else if (doc.documentElement.addBehavior) {
		var storageOwner,
			storageContainer
		// Since #userData storage applies only to specific paths, we need to
		// somehow link our data to a specific path.  We choose /favicon.ico
		// as a pretty safe option, since all browsers already make a request to
		// this URL anyway and being a 404 will not hurt us here.  We wrap an
		// iframe pointing to the favicon in an ActiveXObject(htmlfile) object
		// (see: http://msdn.microsoft.com/en-us/library/aa752574(v=VS.85).aspx)
		// since the iframe access rules appear to allow direct access and
		// manipulation of the document element, even for a 404 page.  This
		// document can be used instead of the current document (which would
		// have been limited to the current path) to perform #userData storage.
		try {
			storageContainer = new ActiveXObject('htmlfile')
			storageContainer.open()
			storageContainer.write('<s' + 'cript>document.w=window</s' + 'cript><iframe src="/favicon.ico"></iframe>')
			storageContainer.close()
			storageOwner = storageContainer.w.frames[0].document
			storage = storageOwner.createElement('div')
		} catch(e) {
			// somehow ActiveXObject instantiation failed (perhaps some special
			// security settings or otherwse), fall back to per-path storage
			storage = doc.createElement('div')
			storageOwner = doc.body
		}
		function withIEStorage(storeFunction) {
			return function() {
				var args = Array.prototype.slice.call(arguments, 0)
				args.unshift(storage)
				// See http://msdn.microsoft.com/en-us/library/ms531081(v=VS.85).aspx
				// and http://msdn.microsoft.com/en-us/library/ms531424(v=VS.85).aspx
				storageOwner.appendChild(storage)
				storage.addBehavior('#default#userData')
				storage.load(localStorageName)
				var result = storeFunction.apply(store, args)
				storageOwner.removeChild(storage)
				return result
			}
		}

		// In IE7, keys may not contain special chars. See all of https://github.com/marcuswestin/store.js/issues/40
		var forbiddenCharsRegex = new RegExp("[!\"#$%&'()*+,/\\\\:;<=>?@[\\]^`{|}~]", "g")
		function ieKeyFix(key) {
			return key.replace(forbiddenCharsRegex, '___')
		}
		store.set = withIEStorage(function(storage, key, val) {
			key = ieKeyFix(key)
			if (val === undefined) { return store.remove(key) }
			storage.setAttribute(key, store.serialize(val))
			storage.save(localStorageName)
			return val
		})
		store.get = withIEStorage(function(storage, key) {
			key = ieKeyFix(key)
			return store.deserialize(storage.getAttribute(key))
		})
		store.remove = withIEStorage(function(storage, key) {
			key = ieKeyFix(key)
			storage.removeAttribute(key)
			storage.save(localStorageName)
		})
		store.clear = withIEStorage(function(storage) {
			var attributes = storage.XMLDocument.documentElement.attributes
			storage.load(localStorageName)
			for (var i=0, attr; attr=attributes[i]; i++) {
				storage.removeAttribute(attr.name)
			}
			storage.save(localStorageName)
		})
		store.getAll = withIEStorage(function(storage) {
			var attributes = storage.XMLDocument.documentElement.attributes
			var ret = {}
			for (var i=0, attr; attr=attributes[i]; ++i) {
				var key = ieKeyFix(attr.name)
				ret[attr.name] = store.deserialize(storage.getAttribute(key))
			}
			return ret
		})
	}

	try {
		store.set(namespace, namespace)
		if (store.get(namespace) != namespace) { store.disabled = true }
		store.remove(namespace)
	} catch(e) {
		store.disabled = true
	}
	store.enabled = !store.disabled
	if (typeof module != 'undefined' && module.exports) { module.exports = store }
	else if (typeof define === 'function' && define.amd) { define('analytics',store) }
	else { win.store = store }
})(this.window || global);

});
require.register("segmentio-top-domain/index.js", function(exports, require, module){

var url = require('url');

// Official Grammar: http://tools.ietf.org/html/rfc883#page-56
// Look for tlds with up to 2-6 characters.

module.exports = function (urlStr) {

  var host     = url.parse(urlStr).hostname
    , topLevel = host.match(/[a-z0-9][a-z0-9\-]*[a-z0-9]\.[a-z\.]{2,6}$/i);

  return topLevel ? topLevel[0] : host;
};
});
require.register("visionmedia-debug/index.js", function(exports, require, module){
if ('undefined' == typeof window) {
  module.exports = require('./lib/debug');
} else {
  module.exports = require('./debug');
}

});
require.register("visionmedia-debug/debug.js", function(exports, require, module){

/**
 * Expose `debug()` as the module.
 */

module.exports = debug;

/**
 * Create a debugger with the given `name`.
 *
 * @param {String} name
 * @return {Type}
 * @api public
 */

function debug(name) {
  if (!debug.enabled(name)) return function(){};

  return function(fmt){
    fmt = coerce(fmt);

    var curr = new Date;
    var ms = curr - (debug[name] || curr);
    debug[name] = curr;

    fmt = name
      + ' '
      + fmt
      + ' +' + debug.humanize(ms);

    // This hackery is required for IE8
    // where `console.log` doesn't have 'apply'
    window.console
      && console.log
      && Function.prototype.apply.call(console.log, console, arguments);
  }
}

/**
 * The currently active debug mode names.
 */

debug.names = [];
debug.skips = [];

/**
 * Enables a debug mode by name. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} name
 * @api public
 */

debug.enable = function(name) {
  try {
    localStorage.debug = name;
  } catch(e){}

  var split = (name || '').split(/[\s,]+/)
    , len = split.length;

  for (var i = 0; i < len; i++) {
    name = split[i].replace('*', '.*?');
    if (name[0] === '-') {
      debug.skips.push(new RegExp('^' + name.substr(1) + '$'));
    }
    else {
      debug.names.push(new RegExp('^' + name + '$'));
    }
  }
};

/**
 * Disable debug output.
 *
 * @api public
 */

debug.disable = function(){
  debug.enable('');
};

/**
 * Humanize the given `ms`.
 *
 * @param {Number} m
 * @return {String}
 * @api private
 */

debug.humanize = function(ms) {
  var sec = 1000
    , min = 60 * 1000
    , hour = 60 * min;

  if (ms >= hour) return (ms / hour).toFixed(1) + 'h';
  if (ms >= min) return (ms / min).toFixed(1) + 'm';
  if (ms >= sec) return (ms / sec | 0) + 's';
  return ms + 'ms';
};

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

debug.enabled = function(name) {
  for (var i = 0, len = debug.skips.length; i < len; i++) {
    if (debug.skips[i].test(name)) {
      return false;
    }
  }
  for (var i = 0, len = debug.names.length; i < len; i++) {
    if (debug.names[i].test(name)) {
      return true;
    }
  }
  return false;
};

/**
 * Coerce `val`.
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

// persist

try {
  if (window.localStorage) debug.enable(localStorage.debug);
} catch(e){}

});
require.register("yields-prevent/index.js", function(exports, require, module){

/**
 * prevent default on the given `e`.
 *
 * examples:
 *
 *      anchor.onclick = prevent;
 *      anchor.onclick = function(e){
 *        if (something) return prevent(e);
 *      };
 *
 * @param {Event} e
 */

module.exports = function(e){
  e = e || window.event
  return e.preventDefault
    ? e.preventDefault()
    : e.returnValue = false;
};

});
require.register("analytics/lib/index.js", function(exports, require, module){

/**
 * Analytics.js
 *
 * (C) 2013 Segment.io Inc.
 */

var Integrations = require('integrations');
var Analytics = require('./analytics');
var each = require('each');


/**
 * Expose the `analytics` singleton.
 */

var analytics = module.exports = exports = new Analytics();

/**
 * Expose require
 */

analytics.require = require;

/**
 * Expose `VERSION`.
 */

exports.VERSION = '1.3.30';


/**
 * Add integrations.
 */

each(Integrations, function (name, Integration) {
  analytics.use(Integration);
});

});
require.register("analytics/lib/analytics.js", function(exports, require, module){

var after = require('after');
var bind = require('bind');
var callback = require('callback');
var canonical = require('canonical');
var clone = require('clone');
var cookie = require('./cookie');
var debug = require('debug');
var defaults = require('defaults');
var each = require('each');
var Emitter = require('emitter');
var group = require('./group');
var is = require('is');
var isEmail = require('is-email');
var isMeta = require('is-meta');
var newDate = require('new-date');
var on = require('event').bind;
var prevent = require('prevent');
var querystring = require('querystring');
var size = require('object').length;
var store = require('./store');
var url = require('url');
var user = require('./user');
var Facade = require('facade');
var Identify = Facade.Identify;
var Group = Facade.Group;
var Alias = Facade.Alias;
var Track = Facade.Track;
var Page = Facade.Page;


/**
 * Expose `Analytics`.
 */

module.exports = Analytics;


/**
 * Initialize a new `Analytics` instance.
 */

function Analytics () {
  this.Integrations = {};
  this._integrations = {};
  this._readied = false;
  this._timeout = 300;
  this._user = user; // BACKWARDS COMPATIBILITY
  bind.all(this);

  var self = this;
  this.on('initialize', function (settings, options) {
    if (options.initialPageview) self.page();
  });

  this.on('initialize', function () {
    self._parseQuery();
  });

}


/**
 * Event Emitter.
 */

Emitter(Analytics.prototype);


/**
 * Use a `plugin`.
 *
 * @param {Function} plugin
 * @return {Analytics}
 */

Analytics.prototype.use = function (plugin) {
  plugin(this);
  return this;
};


/**
 * Define a new `Integration`.
 *
 * @param {Function} Integration
 * @return {Analytics}
 */

Analytics.prototype.addIntegration = function (Integration) {
  var name = Integration.prototype.name;
  if (!name) throw new TypeError('attempted to add an invalid integration');
  this.Integrations[name] = Integration;
  return this;
};


/**
 * Initialize with the given integration `settings` and `options`. Aliased to
 * `init` for convenience.
 *
 * @param {Object} settings
 * @param {Object} options (optional)
 * @return {Analytics}
 */

Analytics.prototype.init =
Analytics.prototype.initialize = function (settings, options) {
  settings = settings || {};
  options = options || {};

  this._options(options);
  this._readied = false;
  this._integrations = {};

  // load user now that options are set
  user.load();
  group.load();

  // clean unknown integrations from settings
  var self = this;
  each(settings, function (name) {
    var Integration = self.Integrations[name];
    if (!Integration) delete settings[name];
  });

  // make ready callback
  var ready = after(size(settings), function () {
    self._readied = true;
    self.emit('ready');
  });

  // initialize integrations, passing ready
  each(settings, function (name, opts) {
    var Integration = self.Integrations[name];
    if (options.initialPageview && opts.initialPageview === false) {
      Integration.prototype.page = after(2, Integration.prototype.page);
    }

    var integration = new Integration(clone(opts));
    integration.once('ready', ready);
    integration.initialize();
    self._integrations[name] = integration;
  });

  // backwards compat with angular plugin.
  // TODO: remove
  this.initialized = true;

  this.emit('initialize', settings, options);
  return this;
};


/**
 * Identify a user by optional `id` and `traits`.
 *
 * @param {String} id (optional)
 * @param {Object} traits (optional)
 * @param {Object} options (optional)
 * @param {Function} fn (optional)
 * @return {Analytics}
 */

Analytics.prototype.identify = function (id, traits, options, fn) {
  if (is.fn(options)) fn = options, options = null;
  if (is.fn(traits)) fn = traits, options = null, traits = null;
  if (is.object(id)) options = traits, traits = id, id = user.id();


  // clone traits before we manipulate so we don't do anything uncouth, and take
  // from `user` so that we carryover anonymous traits
  user.identify(id, traits);
  id = user.id();
  traits = user.traits();

  this._invoke('identify', new Identify({
    options: options,
    traits: traits,
    userId: id
  }));

  // emit
  this.emit('identify', id, traits, options);
  this._callback(fn);
  return this;
};


/**
 * Return the current user.
 *
 * @return {Object}
 */

Analytics.prototype.user = function () {
  return user;
};


/**
 * Identify a group by optional `id` and `traits`. Or, if no arguments are
 * supplied, return the current group.
 *
 * @param {String} id (optional)
 * @param {Object} traits (optional)
 * @param {Object} options (optional)
 * @param {Function} fn (optional)
 * @return {Analytics or Object}
 */

Analytics.prototype.group = function (id, traits, options, fn) {
  if (0 === arguments.length) return group;
  if (is.fn(options)) fn = options, options = null;
  if (is.fn(traits)) fn = traits, options = null, traits = null;
  if (is.object(id)) options = traits, traits = id, id = group.id();


  // grab from group again to make sure we're taking from the source
  group.identify(id, traits);
  id = group.id();
  traits = group.traits();

  this._invoke('group', new Group({
    options: options,
    traits: traits,
    groupId: id
  }));

  this.emit('group', id, traits, options);
  this._callback(fn);
  return this;
};


/**
 * Track an `event` that a user has triggered with optional `properties`.
 *
 * @param {String} event
 * @param {Object} properties (optional)
 * @param {Object} options (optional)
 * @param {Function} fn (optional)
 * @return {Analytics}
 */

Analytics.prototype.track = function (event, properties, options, fn) {
  if (is.fn(options)) fn = options, options = null;
  if (is.fn(properties)) fn = properties, options = null, properties = null;

  this._invoke('track', new Track({
    properties: properties,
    options: options,
    event: event
  }));

  this.emit('track', event, properties, options);
  this._callback(fn);
  return this;
};


/**
 * Helper method to track an outbound link that would normally navigate away
 * from the page before the analytics calls were sent.
 *
 * BACKWARDS COMPATIBILITY: aliased to `trackClick`.
 *
 * @param {Element or Array} links
 * @param {String or Function} event
 * @param {Object or Function} properties (optional)
 * @return {Analytics}
 */

Analytics.prototype.trackClick =
Analytics.prototype.trackLink = function (links, event, properties) {
  if (!links) return this;
  if (is.element(links)) links = [links]; // always arrays, handles jquery

  var self = this;
  each(links, function (el) {
    on(el, 'click', function (e) {
      var ev = is.fn(event) ? event(el) : event;
      var props = is.fn(properties) ? properties(el) : properties;
      self.track(ev, props);

      if (el.href && el.target !== '_blank' && !isMeta(e)) {
        prevent(e);
        self._callback(function () {
          window.location.href = el.href;
        });
      }
    });
  });

  return this;
};


/**
 * Helper method to track an outbound form that would normally navigate away
 * from the page before the analytics calls were sent.
 *
 * BACKWARDS COMPATIBILITY: aliased to `trackSubmit`.
 *
 * @param {Element or Array} forms
 * @param {String or Function} event
 * @param {Object or Function} properties (optional)
 * @return {Analytics}
 */

Analytics.prototype.trackSubmit =
Analytics.prototype.trackForm = function (forms, event, properties) {
  if (!forms) return this;
  if (is.element(forms)) forms = [forms]; // always arrays, handles jquery

  var self = this;
  each(forms, function (el) {
    function handler (e) {
      prevent(e);

      var ev = is.fn(event) ? event(el) : event;
      var props = is.fn(properties) ? properties(el) : properties;
      self.track(ev, props);

      self._callback(function () {
        el.submit();
      });
    }

    // support the events happening through jQuery or Zepto instead of through
    // the normal DOM API, since `el.submit` doesn't bubble up events...
    var $ = window.jQuery || window.Zepto;
    if ($) {
      $(el).submit(handler);
    } else {
      on(el, 'submit', handler);
    }
  });

  return this;
};


/**
 * Trigger a pageview, labeling the current page with an optional `category`,
 * `name` and `properties`.
 *
 * @param {String} category (optional)
 * @param {String} name (optional)
 * @param {Object or String} properties (or path) (optional)
 * @param {Object} options (optional)
 * @param {Function} fn (optional)
 * @return {Analytics}
 */

Analytics.prototype.page = function (category, name, properties, options, fn) {
  if (is.fn(options)) fn = options, options = null;
  if (is.fn(properties)) fn = properties, options = properties = null;
  if (is.fn(name)) fn = name, options = properties = name = null;
  if (is.object(category)) options = name, properties = category, name = category = null;
  if (is.object(name)) options = properties, properties = name, name = null;
  if (is.string(category) && !is.string(name)) name = category, category = null;

  var defs = {
    path: canonicalPath(),
    referrer: document.referrer,
    title: document.title,
    search: location.search
  };

  if (name) defs.name = name;
  if (category) defs.category = category;

  properties = clone(properties) || {};
  defaults(properties, defs);
  properties.url = properties.url || canonicalUrl(properties.search);

  this._invoke('page', new Page({
    properties: properties,
    category: category,
    options: options,
    name: name
  }));

  this.emit('page', category, name, properties, options);
  this._callback(fn);
  return this;
};


/**
 * BACKWARDS COMPATIBILITY: convert an old `pageview` to a `page` call.
 *
 * @param {String} url (optional)
 * @param {Object} options (optional)
 * @return {Analytics}
 * @api private
 */

Analytics.prototype.pageview = function (url, options) {
  var properties = {};
  if (url) properties.path = url;
  this.page(properties);
  return this;
};


/**
 * Merge two previously unassociated user identities.
 *
 * @param {String} to
 * @param {String} from (optional)
 * @param {Object} options (optional)
 * @param {Function} fn (optional)
 * @return {Analytics}
 */

Analytics.prototype.alias = function (to, from, options, fn) {
  if (is.fn(options)) fn = options, options = null;
  if (is.fn(from)) fn = from, options = null, from = null;
  if (is.object(from)) options = from, from = null;

  this._invoke('alias', new Alias({
    options: options,
    from: from,
    to: to
  }));

  this.emit('alias', to, from, options);
  this._callback(fn);
  return this;
};


/**
 * Register a `fn` to be fired when all the analytics services are ready.
 *
 * @param {Function} fn
 * @return {Analytics}
 */

Analytics.prototype.ready = function (fn) {
  if (!is.fn(fn)) return this;
  this._readied
    ? callback.async(fn)
    : this.once('ready', fn);
  return this;
};


/**
 * Set the `timeout` (in milliseconds) used for callbacks.
 *
 * @param {Number} timeout
 */

Analytics.prototype.timeout = function (timeout) {
  this._timeout = timeout;
};


/**
 * Enable or disable debug.
 *
 * @param {String or Boolean} str
 */

Analytics.prototype.debug = function(str){
  if (0 == arguments.length || str) {
    debug.enable('analytics:' + (str || '*'));
  } else {
    debug.disable();
  }
};


/**
 * Apply options.
 *
 * @param {Object} options
 * @return {Analytics}
 * @api private
 */

Analytics.prototype._options = function (options) {
  options = options || {};
  cookie.options(options.cookie);
  store.options(options.localStorage);
  user.options(options.user);
  group.options(options.group);
  return this;
};


/**
 * Callback a `fn` after our defined timeout period.
 *
 * @param {Function} fn
 * @return {Analytics}
 * @api private
 */

Analytics.prototype._callback = function (fn) {
  callback.async(fn, this._timeout);
  return this;
};


/**
 * Call `method` with `facade` on all enabled integrations.
 *
 * @param {String} method
 * @param {Facade} facade
 * @return {Analytics}
 * @api private
 */

Analytics.prototype._invoke = function (method, facade) {
  var options = facade.options();

  this.emit('invoke', facade);

  each(this._integrations, function (name, integration) {
    if (!facade.enabled(name)) return;
    integration.invoke.call(integration, method, facade);
  });

  return this;
};

/**
 * Push `args`.
 *
 * @param {Array} args
 * @api private
 */

Analytics.prototype.push = function(args){
  var method = args.shift();
  if (!this[method]) return;
  this[method].apply(this, args);
};

/**
 * Parse the query string for callable methods.
 *
 * @return {Analytics}
 * @api private
 */

Analytics.prototype._parseQuery = function () {
  // Identify and track any `ajs_uid` and `ajs_event` parameters in the URL.
  var q = querystring.parse(window.location.search);
  if (q.ajs_uid) this.identify(q.ajs_uid);
  if (q.ajs_event) this.track(q.ajs_event);
  return this;
};


/**
 * Return the canonical path for the page.
 *
 * @return {String}
 */

function canonicalPath () {
  var canon = canonical();
  if (!canon) return window.location.pathname;
  var parsed = url.parse(canon);
  return parsed.pathname;
}

/**
 * Return the canonical URL for the page concat the given `search`
 * and strip the hash.
 *
 * @param {String} search
 * @return {String}
 */

function canonicalUrl (search) {
  var canon = canonical();
  if (canon) return ~canon.indexOf('?') ? canon : canon + search;
  var url = window.location.href;
  var i = url.indexOf('#');
  return -1 == i ? url : url.slice(0, i);
}

});
require.register("analytics/lib/cookie.js", function(exports, require, module){

var bind = require('bind');
var cookie = require('cookie');
var clone = require('clone');
var defaults = require('defaults');
var json = require('json');
var topDomain = require('top-domain');


/**
 * Initialize a new `Cookie` with `options`.
 *
 * @param {Object} options
 */

function Cookie (options) {
  this.options(options);
}


/**
 * Get or set the cookie options.
 *
 * @param {Object} options
 *   @field {Number} maxage (1 year)
 *   @field {String} domain
 *   @field {String} path
 *   @field {Boolean} secure
 */

Cookie.prototype.options = function (options) {
  if (arguments.length === 0) return this._options;

  options = options || {};

  var domain = '.' + topDomain(window.location.href);

  // localhost cookies are special: http://curl.haxx.se/rfc/cookie_spec.html
  if (domain === '.localhost') domain = '';

  defaults(options, {
    maxage: 31536000000, // default to a year
    path: '/',
    domain: domain
  });

  this._options = options;
};


/**
 * Set a `key` and `value` in our cookie.
 *
 * @param {String} key
 * @param {Object} value
 * @return {Boolean} saved
 */

Cookie.prototype.set = function (key, value) {
  try {
    value = json.stringify(value);
    cookie(key, value, clone(this._options));
    return true;
  } catch (e) {
    return false;
  }
};


/**
 * Get a value from our cookie by `key`.
 *
 * @param {String} key
 * @return {Object} value
 */

Cookie.prototype.get = function (key) {
  try {
    var value = cookie(key);
    value = value ? json.parse(value) : null;
    return value;
  } catch (e) {
    return null;
  }
};


/**
 * Remove a value from our cookie by `key`.
 *
 * @param {String} key
 * @return {Boolean} removed
 */

Cookie.prototype.remove = function (key) {
  try {
    cookie(key, null, clone(this._options));
    return true;
  } catch (e) {
    return false;
  }
};


/**
 * Expose the cookie singleton.
 */

module.exports = bind.all(new Cookie());


/**
 * Expose the `Cookie` constructor.
 */

module.exports.Cookie = Cookie;
});
require.register("analytics/lib/entity.js", function(exports, require, module){

var traverse = require('isodate-traverse');
var defaults = require('defaults');
var cookie = require('./cookie');
var store = require('./store');
var extend = require('extend');
var clone = require('clone');


/**
 * Expose `Entity`
 */

module.exports = Entity;


/**
 * Initialize new `Entity` with `options`.
 *
 * @param {Object} options
 */

function Entity(options){
  this.options(options);
}


/**
 * Get or set storage `options`.
 *
 * @param {Object} options
 *   @property {Object} cookie
 *   @property {Object} localStorage
 *   @property {Boolean} persist (default: `true`)
 */

Entity.prototype.options = function (options) {
  if (arguments.length === 0) return this._options;
  options || (options = {});
  defaults(options, this.defaults || {});
  this._options = options;
};


/**
 * Get or set the entity's `id`.
 *
 * @param {String} id
 */

Entity.prototype.id = function (id) {
  switch (arguments.length) {
    case 0: return this._getId();
    case 1: return this._setId(id);
  }
};


/**
 * Get the entity's id.
 *
 * @return {String}
 */

Entity.prototype._getId = function () {
  var ret = this._options.persist
    ? cookie.get(this._options.cookie.key)
    : this._id;
  return ret === undefined ? null : ret;
};


/**
 * Set the entity's `id`.
 *
 * @param {String} id
 */

Entity.prototype._setId = function (id) {
  if (this._options.persist) {
    cookie.set(this._options.cookie.key, id);
  } else {
    this._id = id;
  }
};


/**
 * Get or set the entity's `traits`.
 *
 * BACKWARDS COMPATIBILITY: aliased to `properties`
 *
 * @param {Object} traits
 */

Entity.prototype.properties =
Entity.prototype.traits = function (traits) {
  switch (arguments.length) {
    case 0: return this._getTraits();
    case 1: return this._setTraits(traits);
  }
};


/**
 * Get the entity's traits. Always convert ISO date strings into real dates,
 * since they aren't parsed back from local storage.
 *
 * @return {Object}
 */

Entity.prototype._getTraits = function () {
  var ret = this._options.persist
    ? store.get(this._options.localStorage.key)
    : this._traits;
  return ret ? traverse(clone(ret)) : {};
};


/**
 * Set the entity's `traits`.
 *
 * @param {Object} traits
 */

Entity.prototype._setTraits = function (traits) {
  traits || (traits = {});
  if (this._options.persist) {
    store.set(this._options.localStorage.key, traits);
  } else {
    this._traits = traits;
  }
};


/**
 * Identify the entity with an `id` and `traits`. If we it's the same entity,
 * extend the existing `traits` instead of overwriting.
 *
 * @param {String} id
 * @param {Object} traits
 */

Entity.prototype.identify = function (id, traits) {
  traits || (traits = {});
  var current = this.id();
  if (current === null || current === id) traits = extend(this.traits(), traits);
  if (id) this.id(id);
  this.debug('identify %o, %o', id, traits);
  this.traits(traits);
  this.save();
};


/**
 * Save the entity to local storage and the cookie.
 *
 * @return {Boolean}
 */

Entity.prototype.save = function () {
  if (!this._options.persist) return false;
  cookie.set(this._options.cookie.key, this.id());
  store.set(this._options.localStorage.key, this.traits());
  return true;
};


/**
 * Log the entity out, reseting `id` and `traits` to defaults.
 */

Entity.prototype.logout = function () {
  this.id(null);
  this.traits({});
  cookie.remove(this._options.cookie.key);
  store.remove(this._options.localStorage.key);
};


/**
 * Reset all entity state, logging out and returning options to defaults.
 */

Entity.prototype.reset = function () {
  this.logout();
  this.options({});
};


/**
 * Load saved entity `id` or `traits` from storage.
 */

Entity.prototype.load = function () {
  this.id(cookie.get(this._options.cookie.key));
  this.traits(store.get(this._options.localStorage.key));
};


});
require.register("analytics/lib/group.js", function(exports, require, module){

var debug = require('debug')('analytics:group');
var Entity = require('./entity');
var inherit = require('inherit');
var bind = require('bind');


/**
 * Group defaults
 */

Group.defaults = {
  persist: true,
  cookie: {
    key: 'ajs_group_id'
  },
  localStorage: {
    key: 'ajs_group_properties'
  }
};


/**
 * Initialize a new `Group` with `options`.
 *
 * @param {Object} options
 */

function Group (options) {
  this.defaults = Group.defaults;
  this.debug = debug;
  Entity.call(this, options);
}


/**
 * Inherit `Entity`
 */

inherit(Group, Entity);


/**
 * Expose the group singleton.
 */

module.exports = bind.all(new Group());


/**
 * Expose the `Group` constructor.
 */

module.exports.Group = Group;

});
require.register("analytics/lib/store.js", function(exports, require, module){

var bind = require('bind');
var defaults = require('defaults');
var store = require('store');


/**
 * Initialize a new `Store` with `options`.
 *
 * @param {Object} options
 */

function Store (options) {
  this.options(options);
}


/**
 * Set the `options` for the store.
 *
 * @param {Object} options
 *   @field {Boolean} enabled (true)
 */

Store.prototype.options = function (options) {
  if (arguments.length === 0) return this._options;

  options = options || {};
  defaults(options, { enabled : true });

  this.enabled  = options.enabled && store.enabled;
  this._options = options;
};


/**
 * Set a `key` and `value` in local storage.
 *
 * @param {String} key
 * @param {Object} value
 */

Store.prototype.set = function (key, value) {
  if (!this.enabled) return false;
  return store.set(key, value);
};


/**
 * Get a value from local storage by `key`.
 *
 * @param {String} key
 * @return {Object}
 */

Store.prototype.get = function (key) {
  if (!this.enabled) return null;
  return store.get(key);
};


/**
 * Remove a value from local storage by `key`.
 *
 * @param {String} key
 */

Store.prototype.remove = function (key) {
  if (!this.enabled) return false;
  return store.remove(key);
};


/**
 * Expose the store singleton.
 */

module.exports = bind.all(new Store());


/**
 * Expose the `Store` constructor.
 */

module.exports.Store = Store;
});
require.register("analytics/lib/user.js", function(exports, require, module){

var debug = require('debug')('analytics:user');
var Entity = require('./entity');
var inherit = require('inherit');
var bind = require('bind');
var cookie = require('./cookie');


/**
 * User defaults
 */

User.defaults = {
  persist: true,
  cookie: {
    key: 'ajs_user_id',
    oldKey: 'ajs_user'
  },
  localStorage: {
    key: 'ajs_user_traits'
  }
};


/**
 * Initialize a new `User` with `options`.
 *
 * @param {Object} options
 */

function User (options) {
  this.defaults = User.defaults;
  this.debug = debug;
  Entity.call(this, options);
}


/**
 * Inherit `Entity`
 */

inherit(User, Entity);


/**
 * Load saved user `id` or `traits` from storage.
 */

User.prototype.load = function () {
  if (this._loadOldCookie()) return;
  Entity.prototype.load.call(this);
};


/**
 * BACKWARDS COMPATIBILITY: Load the old user from the cookie.
 *
 * @return {Boolean}
 * @api private
 */

User.prototype._loadOldCookie = function () {
  var user = cookie.get(this._options.cookie.oldKey);
  if (!user) return false;

  this.id(user.id);
  this.traits(user.traits);
  cookie.remove(this._options.cookie.oldKey);
  return true;
};


/**
 * Expose the user singleton.
 */

module.exports = bind.all(new User());


/**
 * Expose the `User` constructor.
 */

module.exports.User = User;

});














































require.register("segmentio-analytics.js-integrations/lib/slugs.json", function(exports, require, module){
module.exports = [
  "google-analytics",
  "intercom",
  "keen-io",
  "kissmetrics",
  "mixpanel"
]

});






































































require.alias("avetisk-defaults/index.js", "analytics/deps/defaults/index.js");
require.alias("avetisk-defaults/index.js", "defaults/index.js");

require.alias("component-clone/index.js", "analytics/deps/clone/index.js");
require.alias("component-clone/index.js", "clone/index.js");
require.alias("component-type/index.js", "component-clone/deps/type/index.js");

require.alias("component-cookie/index.js", "analytics/deps/cookie/index.js");
require.alias("component-cookie/index.js", "cookie/index.js");

require.alias("component-each/index.js", "analytics/deps/each/index.js");
require.alias("component-each/index.js", "each/index.js");
require.alias("component-type/index.js", "component-each/deps/type/index.js");

require.alias("component-emitter/index.js", "analytics/deps/emitter/index.js");
require.alias("component-emitter/index.js", "emitter/index.js");
require.alias("component-indexof/index.js", "component-emitter/deps/indexof/index.js");

require.alias("component-event/index.js", "analytics/deps/event/index.js");
require.alias("component-event/index.js", "event/index.js");

require.alias("component-inherit/index.js", "analytics/deps/inherit/index.js");
require.alias("component-inherit/index.js", "inherit/index.js");

require.alias("component-object/index.js", "analytics/deps/object/index.js");
require.alias("component-object/index.js", "object/index.js");

require.alias("component-querystring/index.js", "analytics/deps/querystring/index.js");
require.alias("component-querystring/index.js", "querystring/index.js");
require.alias("component-trim/index.js", "component-querystring/deps/trim/index.js");

require.alias("component-type/index.js", "component-querystring/deps/type/index.js");

require.alias("component-url/index.js", "analytics/deps/url/index.js");
require.alias("component-url/index.js", "url/index.js");

require.alias("ianstormtaylor-bind/index.js", "analytics/deps/bind/index.js");
require.alias("ianstormtaylor-bind/index.js", "bind/index.js");
require.alias("component-bind/index.js", "ianstormtaylor-bind/deps/bind/index.js");

require.alias("segmentio-bind-all/index.js", "ianstormtaylor-bind/deps/bind-all/index.js");
require.alias("component-bind/index.js", "segmentio-bind-all/deps/bind/index.js");

require.alias("component-type/index.js", "segmentio-bind-all/deps/type/index.js");

require.alias("ianstormtaylor-callback/index.js", "analytics/deps/callback/index.js");
require.alias("ianstormtaylor-callback/index.js", "callback/index.js");
require.alias("timoxley-next-tick/index.js", "ianstormtaylor-callback/deps/next-tick/index.js");

require.alias("ianstormtaylor-is/index.js", "analytics/deps/is/index.js");
require.alias("ianstormtaylor-is/index.js", "is/index.js");
require.alias("component-type/index.js", "ianstormtaylor-is/deps/type/index.js");

require.alias("ianstormtaylor-is-empty/index.js", "ianstormtaylor-is/deps/is-empty/index.js");

require.alias("segmentio-after/index.js", "analytics/deps/after/index.js");
require.alias("segmentio-after/index.js", "after/index.js");

require.alias("segmentio-analytics.js-integrations/index.js", "analytics/deps/integrations/index.js");
require.alias("segmentio-analytics.js-integrations/lib/google-analytics.js", "analytics/deps/integrations/lib/google-analytics.js");
require.alias("segmentio-analytics.js-integrations/lib/intercom.js", "analytics/deps/integrations/lib/intercom.js");
require.alias("segmentio-analytics.js-integrations/lib/keen-io.js", "analytics/deps/integrations/lib/keen-io.js");
require.alias("segmentio-analytics.js-integrations/lib/kissmetrics.js", "analytics/deps/integrations/lib/kissmetrics.js");
require.alias("segmentio-analytics.js-integrations/lib/mixpanel.js", "analytics/deps/integrations/lib/mixpanel.js");
require.alias("segmentio-analytics.js-integrations/index.js", "integrations/index.js");
require.alias("avetisk-defaults/index.js", "segmentio-analytics.js-integrations/deps/defaults/index.js");

require.alias("component-clone/index.js", "segmentio-analytics.js-integrations/deps/clone/index.js");
require.alias("component-type/index.js", "component-clone/deps/type/index.js");

require.alias("component-domify/index.js", "segmentio-analytics.js-integrations/deps/domify/index.js");

require.alias("component-each/index.js", "segmentio-analytics.js-integrations/deps/each/index.js");
require.alias("component-type/index.js", "component-each/deps/type/index.js");

require.alias("component-once/index.js", "segmentio-analytics.js-integrations/deps/once/index.js");

require.alias("component-type/index.js", "segmentio-analytics.js-integrations/deps/type/index.js");

require.alias("component-url/index.js", "segmentio-analytics.js-integrations/deps/url/index.js");

require.alias("ianstormtaylor-callback/index.js", "segmentio-analytics.js-integrations/deps/callback/index.js");
require.alias("timoxley-next-tick/index.js", "ianstormtaylor-callback/deps/next-tick/index.js");

require.alias("ianstormtaylor-bind/index.js", "segmentio-analytics.js-integrations/deps/bind/index.js");
require.alias("component-bind/index.js", "ianstormtaylor-bind/deps/bind/index.js");

require.alias("segmentio-bind-all/index.js", "ianstormtaylor-bind/deps/bind-all/index.js");
require.alias("component-bind/index.js", "segmentio-bind-all/deps/bind/index.js");

require.alias("component-type/index.js", "segmentio-bind-all/deps/type/index.js");

require.alias("ianstormtaylor-is/index.js", "segmentio-analytics.js-integrations/deps/is/index.js");
require.alias("component-type/index.js", "ianstormtaylor-is/deps/type/index.js");

require.alias("ianstormtaylor-is-empty/index.js", "ianstormtaylor-is/deps/is-empty/index.js");

require.alias("ianstormtaylor-is-empty/index.js", "segmentio-analytics.js-integrations/deps/is-empty/index.js");

require.alias("segmentio-alias/index.js", "segmentio-analytics.js-integrations/deps/alias/index.js");
require.alias("component-clone/index.js", "segmentio-alias/deps/clone/index.js");
require.alias("component-type/index.js", "component-clone/deps/type/index.js");

require.alias("component-type/index.js", "segmentio-alias/deps/type/index.js");

require.alias("segmentio-analytics.js-integration/lib/index.js", "segmentio-analytics.js-integrations/deps/integration/lib/index.js");
require.alias("segmentio-analytics.js-integration/lib/protos.js", "segmentio-analytics.js-integrations/deps/integration/lib/protos.js");
require.alias("segmentio-analytics.js-integration/lib/events.js", "segmentio-analytics.js-integrations/deps/integration/lib/events.js");
require.alias("segmentio-analytics.js-integration/lib/statics.js", "segmentio-analytics.js-integrations/deps/integration/lib/statics.js");
require.alias("segmentio-analytics.js-integration/lib/index.js", "segmentio-analytics.js-integrations/deps/integration/index.js");
require.alias("avetisk-defaults/index.js", "segmentio-analytics.js-integration/deps/defaults/index.js");

require.alias("component-clone/index.js", "segmentio-analytics.js-integration/deps/clone/index.js");
require.alias("component-type/index.js", "component-clone/deps/type/index.js");

require.alias("component-emitter/index.js", "segmentio-analytics.js-integration/deps/emitter/index.js");
require.alias("component-indexof/index.js", "component-emitter/deps/indexof/index.js");

require.alias("ianstormtaylor-bind/index.js", "segmentio-analytics.js-integration/deps/bind/index.js");
require.alias("component-bind/index.js", "ianstormtaylor-bind/deps/bind/index.js");

require.alias("segmentio-bind-all/index.js", "ianstormtaylor-bind/deps/bind-all/index.js");
require.alias("component-bind/index.js", "segmentio-bind-all/deps/bind/index.js");

require.alias("component-type/index.js", "segmentio-bind-all/deps/type/index.js");

require.alias("ianstormtaylor-callback/index.js", "segmentio-analytics.js-integration/deps/callback/index.js");
require.alias("timoxley-next-tick/index.js", "ianstormtaylor-callback/deps/next-tick/index.js");

require.alias("ianstormtaylor-to-no-case/index.js", "segmentio-analytics.js-integration/deps/to-no-case/index.js");

require.alias("component-type/index.js", "segmentio-analytics.js-integration/deps/type/index.js");

require.alias("segmentio-after/index.js", "segmentio-analytics.js-integration/deps/after/index.js");

require.alias("timoxley-next-tick/index.js", "segmentio-analytics.js-integration/deps/next-tick/index.js");

require.alias("yields-slug/index.js", "segmentio-analytics.js-integration/deps/slug/index.js");

require.alias("visionmedia-debug/index.js", "segmentio-analytics.js-integration/deps/debug/index.js");
require.alias("visionmedia-debug/debug.js", "segmentio-analytics.js-integration/deps/debug/debug.js");

require.alias("segmentio-analytics.js-integration/lib/index.js", "segmentio-analytics.js-integration/index.js");
require.alias("segmentio-canonical/index.js", "segmentio-analytics.js-integrations/deps/canonical/index.js");

require.alias("segmentio-convert-dates/index.js", "segmentio-analytics.js-integrations/deps/convert-dates/index.js");
require.alias("component-clone/index.js", "segmentio-convert-dates/deps/clone/index.js");
require.alias("component-type/index.js", "component-clone/deps/type/index.js");

require.alias("ianstormtaylor-is/index.js", "segmentio-convert-dates/deps/is/index.js");
require.alias("component-type/index.js", "ianstormtaylor-is/deps/type/index.js");

require.alias("ianstormtaylor-is-empty/index.js", "ianstormtaylor-is/deps/is-empty/index.js");

require.alias("segmentio-extend/index.js", "segmentio-analytics.js-integrations/deps/extend/index.js");

require.alias("segmentio-facade/lib/index.js", "segmentio-analytics.js-integrations/deps/facade/lib/index.js");
require.alias("segmentio-facade/lib/alias.js", "segmentio-analytics.js-integrations/deps/facade/lib/alias.js");
require.alias("segmentio-facade/lib/facade.js", "segmentio-analytics.js-integrations/deps/facade/lib/facade.js");
require.alias("segmentio-facade/lib/group.js", "segmentio-analytics.js-integrations/deps/facade/lib/group.js");
require.alias("segmentio-facade/lib/page.js", "segmentio-analytics.js-integrations/deps/facade/lib/page.js");
require.alias("segmentio-facade/lib/identify.js", "segmentio-analytics.js-integrations/deps/facade/lib/identify.js");
require.alias("segmentio-facade/lib/is-enabled.js", "segmentio-analytics.js-integrations/deps/facade/lib/is-enabled.js");
require.alias("segmentio-facade/lib/track.js", "segmentio-analytics.js-integrations/deps/facade/lib/track.js");
require.alias("segmentio-facade/lib/index.js", "segmentio-analytics.js-integrations/deps/facade/index.js");
require.alias("camshaft-require-component/index.js", "segmentio-facade/deps/require-component/index.js");

require.alias("segmentio-isodate-traverse/index.js", "segmentio-facade/deps/isodate-traverse/index.js");
require.alias("component-each/index.js", "segmentio-isodate-traverse/deps/each/index.js");
require.alias("component-type/index.js", "component-each/deps/type/index.js");

require.alias("ianstormtaylor-is/index.js", "segmentio-isodate-traverse/deps/is/index.js");
require.alias("component-type/index.js", "ianstormtaylor-is/deps/type/index.js");

require.alias("ianstormtaylor-is-empty/index.js", "ianstormtaylor-is/deps/is-empty/index.js");

require.alias("segmentio-isodate/index.js", "segmentio-isodate-traverse/deps/isodate/index.js");

require.alias("component-clone/index.js", "segmentio-facade/deps/clone/index.js");
require.alias("component-type/index.js", "component-clone/deps/type/index.js");

require.alias("component-inherit/index.js", "segmentio-facade/deps/inherit/index.js");

require.alias("component-trim/index.js", "segmentio-facade/deps/trim/index.js");

require.alias("segmentio-is-email/index.js", "segmentio-facade/deps/is-email/index.js");

require.alias("segmentio-new-date/lib/index.js", "segmentio-facade/deps/new-date/lib/index.js");
require.alias("segmentio-new-date/lib/milliseconds.js", "segmentio-facade/deps/new-date/lib/milliseconds.js");
require.alias("segmentio-new-date/lib/seconds.js", "segmentio-facade/deps/new-date/lib/seconds.js");
require.alias("segmentio-new-date/lib/index.js", "segmentio-facade/deps/new-date/index.js");
require.alias("ianstormtaylor-is/index.js", "segmentio-new-date/deps/is/index.js");
require.alias("component-type/index.js", "ianstormtaylor-is/deps/type/index.js");

require.alias("ianstormtaylor-is-empty/index.js", "ianstormtaylor-is/deps/is-empty/index.js");

require.alias("segmentio-isodate/index.js", "segmentio-new-date/deps/isodate/index.js");

require.alias("segmentio-new-date/lib/index.js", "segmentio-new-date/index.js");
require.alias("segmentio-obj-case/index.js", "segmentio-facade/deps/obj-case/index.js");
require.alias("segmentio-obj-case/index.js", "segmentio-facade/deps/obj-case/index.js");
require.alias("ianstormtaylor-case/lib/index.js", "segmentio-obj-case/deps/case/lib/index.js");
require.alias("ianstormtaylor-case/lib/cases.js", "segmentio-obj-case/deps/case/lib/cases.js");
require.alias("ianstormtaylor-case/lib/index.js", "segmentio-obj-case/deps/case/index.js");
require.alias("ianstormtaylor-to-camel-case/index.js", "ianstormtaylor-case/deps/to-camel-case/index.js");
require.alias("ianstormtaylor-to-space-case/index.js", "ianstormtaylor-to-camel-case/deps/to-space-case/index.js");
require.alias("ianstormtaylor-to-no-case/index.js", "ianstormtaylor-to-space-case/deps/to-no-case/index.js");

require.alias("ianstormtaylor-to-capital-case/index.js", "ianstormtaylor-case/deps/to-capital-case/index.js");
require.alias("ianstormtaylor-to-no-case/index.js", "ianstormtaylor-to-capital-case/deps/to-no-case/index.js");

require.alias("ianstormtaylor-to-constant-case/index.js", "ianstormtaylor-case/deps/to-constant-case/index.js");
require.alias("ianstormtaylor-to-snake-case/index.js", "ianstormtaylor-to-constant-case/deps/to-snake-case/index.js");
require.alias("ianstormtaylor-to-space-case/index.js", "ianstormtaylor-to-snake-case/deps/to-space-case/index.js");
require.alias("ianstormtaylor-to-no-case/index.js", "ianstormtaylor-to-space-case/deps/to-no-case/index.js");

require.alias("ianstormtaylor-to-dot-case/index.js", "ianstormtaylor-case/deps/to-dot-case/index.js");
require.alias("ianstormtaylor-to-space-case/index.js", "ianstormtaylor-to-dot-case/deps/to-space-case/index.js");
require.alias("ianstormtaylor-to-no-case/index.js", "ianstormtaylor-to-space-case/deps/to-no-case/index.js");

require.alias("ianstormtaylor-to-no-case/index.js", "ianstormtaylor-case/deps/to-no-case/index.js");

require.alias("ianstormtaylor-to-pascal-case/index.js", "ianstormtaylor-case/deps/to-pascal-case/index.js");
require.alias("ianstormtaylor-to-space-case/index.js", "ianstormtaylor-to-pascal-case/deps/to-space-case/index.js");
require.alias("ianstormtaylor-to-no-case/index.js", "ianstormtaylor-to-space-case/deps/to-no-case/index.js");

require.alias("ianstormtaylor-to-sentence-case/index.js", "ianstormtaylor-case/deps/to-sentence-case/index.js");
require.alias("ianstormtaylor-to-no-case/index.js", "ianstormtaylor-to-sentence-case/deps/to-no-case/index.js");

require.alias("ianstormtaylor-to-slug-case/index.js", "ianstormtaylor-case/deps/to-slug-case/index.js");
require.alias("ianstormtaylor-to-space-case/index.js", "ianstormtaylor-to-slug-case/deps/to-space-case/index.js");
require.alias("ianstormtaylor-to-no-case/index.js", "ianstormtaylor-to-space-case/deps/to-no-case/index.js");

require.alias("ianstormtaylor-to-snake-case/index.js", "ianstormtaylor-case/deps/to-snake-case/index.js");
require.alias("ianstormtaylor-to-space-case/index.js", "ianstormtaylor-to-snake-case/deps/to-space-case/index.js");
require.alias("ianstormtaylor-to-no-case/index.js", "ianstormtaylor-to-space-case/deps/to-no-case/index.js");

require.alias("ianstormtaylor-to-space-case/index.js", "ianstormtaylor-case/deps/to-space-case/index.js");
require.alias("ianstormtaylor-to-no-case/index.js", "ianstormtaylor-to-space-case/deps/to-no-case/index.js");

require.alias("ianstormtaylor-to-title-case/index.js", "ianstormtaylor-case/deps/to-title-case/index.js");
require.alias("component-escape-regexp/index.js", "ianstormtaylor-to-title-case/deps/escape-regexp/index.js");

require.alias("ianstormtaylor-map/index.js", "ianstormtaylor-to-title-case/deps/map/index.js");
require.alias("component-each/index.js", "ianstormtaylor-map/deps/each/index.js");
require.alias("component-type/index.js", "component-each/deps/type/index.js");

require.alias("ianstormtaylor-title-case-minors/index.js", "ianstormtaylor-to-title-case/deps/title-case-minors/index.js");

require.alias("ianstormtaylor-to-capital-case/index.js", "ianstormtaylor-to-title-case/deps/to-capital-case/index.js");
require.alias("ianstormtaylor-to-no-case/index.js", "ianstormtaylor-to-capital-case/deps/to-no-case/index.js");

require.alias("ianstormtaylor-case/lib/index.js", "ianstormtaylor-case/index.js");
require.alias("segmentio-obj-case/index.js", "segmentio-obj-case/index.js");
require.alias("segmentio-facade/lib/index.js", "segmentio-facade/index.js");
require.alias("segmentio-global-queue/index.js", "segmentio-analytics.js-integrations/deps/global-queue/index.js");

require.alias("segmentio-is-email/index.js", "segmentio-analytics.js-integrations/deps/is-email/index.js");

require.alias("segmentio-load-date/index.js", "segmentio-analytics.js-integrations/deps/load-date/index.js");

require.alias("segmentio-load-script/index.js", "segmentio-analytics.js-integrations/deps/load-script/index.js");
require.alias("component-type/index.js", "segmentio-load-script/deps/type/index.js");

require.alias("segmentio-script-onload/index.js", "segmentio-analytics.js-integrations/deps/script-onload/index.js");
require.alias("segmentio-script-onload/index.js", "segmentio-analytics.js-integrations/deps/script-onload/index.js");
require.alias("segmentio-script-onload/index.js", "segmentio-script-onload/index.js");
require.alias("segmentio-on-body/index.js", "segmentio-analytics.js-integrations/deps/on-body/index.js");
require.alias("component-each/index.js", "segmentio-on-body/deps/each/index.js");
require.alias("component-type/index.js", "component-each/deps/type/index.js");

require.alias("segmentio-on-error/index.js", "segmentio-analytics.js-integrations/deps/on-error/index.js");

require.alias("segmentio-to-iso-string/index.js", "segmentio-analytics.js-integrations/deps/to-iso-string/index.js");

require.alias("segmentio-to-unix-timestamp/index.js", "segmentio-analytics.js-integrations/deps/to-unix-timestamp/index.js");

require.alias("segmentio-use-https/index.js", "segmentio-analytics.js-integrations/deps/use-https/index.js");

require.alias("segmentio-when/index.js", "segmentio-analytics.js-integrations/deps/when/index.js");
require.alias("ianstormtaylor-callback/index.js", "segmentio-when/deps/callback/index.js");
require.alias("timoxley-next-tick/index.js", "ianstormtaylor-callback/deps/next-tick/index.js");

require.alias("timoxley-next-tick/index.js", "segmentio-analytics.js-integrations/deps/next-tick/index.js");

require.alias("yields-slug/index.js", "segmentio-analytics.js-integrations/deps/slug/index.js");

require.alias("visionmedia-batch/index.js", "segmentio-analytics.js-integrations/deps/batch/index.js");
require.alias("component-emitter/index.js", "visionmedia-batch/deps/emitter/index.js");
require.alias("component-indexof/index.js", "component-emitter/deps/indexof/index.js");

require.alias("visionmedia-debug/index.js", "segmentio-analytics.js-integrations/deps/debug/index.js");
require.alias("visionmedia-debug/debug.js", "segmentio-analytics.js-integrations/deps/debug/debug.js");

require.alias("segmentio-load-pixel/index.js", "segmentio-analytics.js-integrations/deps/load-pixel/index.js");
require.alias("segmentio-load-pixel/index.js", "segmentio-analytics.js-integrations/deps/load-pixel/index.js");
require.alias("component-querystring/index.js", "segmentio-load-pixel/deps/querystring/index.js");
require.alias("component-trim/index.js", "component-querystring/deps/trim/index.js");

require.alias("component-type/index.js", "component-querystring/deps/type/index.js");

require.alias("segmentio-substitute/index.js", "segmentio-load-pixel/deps/substitute/index.js");
require.alias("segmentio-substitute/index.js", "segmentio-load-pixel/deps/substitute/index.js");
require.alias("segmentio-substitute/index.js", "segmentio-substitute/index.js");
require.alias("segmentio-load-pixel/index.js", "segmentio-load-pixel/index.js");
require.alias("segmentio-replace-document-write/index.js", "segmentio-analytics.js-integrations/deps/replace-document-write/index.js");
require.alias("segmentio-replace-document-write/index.js", "segmentio-analytics.js-integrations/deps/replace-document-write/index.js");
require.alias("component-domify/index.js", "segmentio-replace-document-write/deps/domify/index.js");

require.alias("segmentio-replace-document-write/index.js", "segmentio-replace-document-write/index.js");
require.alias("component-indexof/index.js", "segmentio-analytics.js-integrations/deps/indexof/index.js");

require.alias("component-object/index.js", "segmentio-analytics.js-integrations/deps/object/index.js");

require.alias("segmentio-obj-case/index.js", "segmentio-analytics.js-integrations/deps/obj-case/index.js");
require.alias("segmentio-obj-case/index.js", "segmentio-analytics.js-integrations/deps/obj-case/index.js");
require.alias("ianstormtaylor-case/lib/index.js", "segmentio-obj-case/deps/case/lib/index.js");
require.alias("ianstormtaylor-case/lib/cases.js", "segmentio-obj-case/deps/case/lib/cases.js");
require.alias("ianstormtaylor-case/lib/index.js", "segmentio-obj-case/deps/case/index.js");
require.alias("ianstormtaylor-to-camel-case/index.js", "ianstormtaylor-case/deps/to-camel-case/index.js");
require.alias("ianstormtaylor-to-space-case/index.js", "ianstormtaylor-to-camel-case/deps/to-space-case/index.js");
require.alias("ianstormtaylor-to-no-case/index.js", "ianstormtaylor-to-space-case/deps/to-no-case/index.js");

require.alias("ianstormtaylor-to-capital-case/index.js", "ianstormtaylor-case/deps/to-capital-case/index.js");
require.alias("ianstormtaylor-to-no-case/index.js", "ianstormtaylor-to-capital-case/deps/to-no-case/index.js");

require.alias("ianstormtaylor-to-constant-case/index.js", "ianstormtaylor-case/deps/to-constant-case/index.js");
require.alias("ianstormtaylor-to-snake-case/index.js", "ianstormtaylor-to-constant-case/deps/to-snake-case/index.js");
require.alias("ianstormtaylor-to-space-case/index.js", "ianstormtaylor-to-snake-case/deps/to-space-case/index.js");
require.alias("ianstormtaylor-to-no-case/index.js", "ianstormtaylor-to-space-case/deps/to-no-case/index.js");

require.alias("ianstormtaylor-to-dot-case/index.js", "ianstormtaylor-case/deps/to-dot-case/index.js");
require.alias("ianstormtaylor-to-space-case/index.js", "ianstormtaylor-to-dot-case/deps/to-space-case/index.js");
require.alias("ianstormtaylor-to-no-case/index.js", "ianstormtaylor-to-space-case/deps/to-no-case/index.js");

require.alias("ianstormtaylor-to-no-case/index.js", "ianstormtaylor-case/deps/to-no-case/index.js");

require.alias("ianstormtaylor-to-pascal-case/index.js", "ianstormtaylor-case/deps/to-pascal-case/index.js");
require.alias("ianstormtaylor-to-space-case/index.js", "ianstormtaylor-to-pascal-case/deps/to-space-case/index.js");
require.alias("ianstormtaylor-to-no-case/index.js", "ianstormtaylor-to-space-case/deps/to-no-case/index.js");

require.alias("ianstormtaylor-to-sentence-case/index.js", "ianstormtaylor-case/deps/to-sentence-case/index.js");
require.alias("ianstormtaylor-to-no-case/index.js", "ianstormtaylor-to-sentence-case/deps/to-no-case/index.js");

require.alias("ianstormtaylor-to-slug-case/index.js", "ianstormtaylor-case/deps/to-slug-case/index.js");
require.alias("ianstormtaylor-to-space-case/index.js", "ianstormtaylor-to-slug-case/deps/to-space-case/index.js");
require.alias("ianstormtaylor-to-no-case/index.js", "ianstormtaylor-to-space-case/deps/to-no-case/index.js");

require.alias("ianstormtaylor-to-snake-case/index.js", "ianstormtaylor-case/deps/to-snake-case/index.js");
require.alias("ianstormtaylor-to-space-case/index.js", "ianstormtaylor-to-snake-case/deps/to-space-case/index.js");
require.alias("ianstormtaylor-to-no-case/index.js", "ianstormtaylor-to-space-case/deps/to-no-case/index.js");

require.alias("ianstormtaylor-to-space-case/index.js", "ianstormtaylor-case/deps/to-space-case/index.js");
require.alias("ianstormtaylor-to-no-case/index.js", "ianstormtaylor-to-space-case/deps/to-no-case/index.js");

require.alias("ianstormtaylor-to-title-case/index.js", "ianstormtaylor-case/deps/to-title-case/index.js");
require.alias("component-escape-regexp/index.js", "ianstormtaylor-to-title-case/deps/escape-regexp/index.js");

require.alias("ianstormtaylor-map/index.js", "ianstormtaylor-to-title-case/deps/map/index.js");
require.alias("component-each/index.js", "ianstormtaylor-map/deps/each/index.js");
require.alias("component-type/index.js", "component-each/deps/type/index.js");

require.alias("ianstormtaylor-title-case-minors/index.js", "ianstormtaylor-to-title-case/deps/title-case-minors/index.js");

require.alias("ianstormtaylor-to-capital-case/index.js", "ianstormtaylor-to-title-case/deps/to-capital-case/index.js");
require.alias("ianstormtaylor-to-no-case/index.js", "ianstormtaylor-to-capital-case/deps/to-no-case/index.js");

require.alias("ianstormtaylor-case/lib/index.js", "ianstormtaylor-case/index.js");
require.alias("segmentio-obj-case/index.js", "segmentio-obj-case/index.js");
require.alias("segmentio-canonical/index.js", "analytics/deps/canonical/index.js");
require.alias("segmentio-canonical/index.js", "canonical/index.js");

require.alias("segmentio-extend/index.js", "analytics/deps/extend/index.js");
require.alias("segmentio-extend/index.js", "extend/index.js");

require.alias("segmentio-facade/lib/index.js", "analytics/deps/facade/lib/index.js");
require.alias("segmentio-facade/lib/alias.js", "analytics/deps/facade/lib/alias.js");
require.alias("segmentio-facade/lib/facade.js", "analytics/deps/facade/lib/facade.js");
require.alias("segmentio-facade/lib/group.js", "analytics/deps/facade/lib/group.js");
require.alias("segmentio-facade/lib/page.js", "analytics/deps/facade/lib/page.js");
require.alias("segmentio-facade/lib/identify.js", "analytics/deps/facade/lib/identify.js");
require.alias("segmentio-facade/lib/is-enabled.js", "analytics/deps/facade/lib/is-enabled.js");
require.alias("segmentio-facade/lib/track.js", "analytics/deps/facade/lib/track.js");
require.alias("segmentio-facade/lib/index.js", "analytics/deps/facade/index.js");
require.alias("segmentio-facade/lib/index.js", "facade/index.js");
require.alias("camshaft-require-component/index.js", "segmentio-facade/deps/require-component/index.js");

require.alias("segmentio-isodate-traverse/index.js", "segmentio-facade/deps/isodate-traverse/index.js");
require.alias("component-each/index.js", "segmentio-isodate-traverse/deps/each/index.js");
require.alias("component-type/index.js", "component-each/deps/type/index.js");

require.alias("ianstormtaylor-is/index.js", "segmentio-isodate-traverse/deps/is/index.js");
require.alias("component-type/index.js", "ianstormtaylor-is/deps/type/index.js");

require.alias("ianstormtaylor-is-empty/index.js", "ianstormtaylor-is/deps/is-empty/index.js");

require.alias("segmentio-isodate/index.js", "segmentio-isodate-traverse/deps/isodate/index.js");

require.alias("component-clone/index.js", "segmentio-facade/deps/clone/index.js");
require.alias("component-type/index.js", "component-clone/deps/type/index.js");

require.alias("component-inherit/index.js", "segmentio-facade/deps/inherit/index.js");

require.alias("component-trim/index.js", "segmentio-facade/deps/trim/index.js");

require.alias("segmentio-is-email/index.js", "segmentio-facade/deps/is-email/index.js");

require.alias("segmentio-new-date/lib/index.js", "segmentio-facade/deps/new-date/lib/index.js");
require.alias("segmentio-new-date/lib/milliseconds.js", "segmentio-facade/deps/new-date/lib/milliseconds.js");
require.alias("segmentio-new-date/lib/seconds.js", "segmentio-facade/deps/new-date/lib/seconds.js");
require.alias("segmentio-new-date/lib/index.js", "segmentio-facade/deps/new-date/index.js");
require.alias("ianstormtaylor-is/index.js", "segmentio-new-date/deps/is/index.js");
require.alias("component-type/index.js", "ianstormtaylor-is/deps/type/index.js");

require.alias("ianstormtaylor-is-empty/index.js", "ianstormtaylor-is/deps/is-empty/index.js");

require.alias("segmentio-isodate/index.js", "segmentio-new-date/deps/isodate/index.js");

require.alias("segmentio-new-date/lib/index.js", "segmentio-new-date/index.js");
require.alias("segmentio-obj-case/index.js", "segmentio-facade/deps/obj-case/index.js");
require.alias("segmentio-obj-case/index.js", "segmentio-facade/deps/obj-case/index.js");
require.alias("ianstormtaylor-case/lib/index.js", "segmentio-obj-case/deps/case/lib/index.js");
require.alias("ianstormtaylor-case/lib/cases.js", "segmentio-obj-case/deps/case/lib/cases.js");
require.alias("ianstormtaylor-case/lib/index.js", "segmentio-obj-case/deps/case/index.js");
require.alias("ianstormtaylor-to-camel-case/index.js", "ianstormtaylor-case/deps/to-camel-case/index.js");
require.alias("ianstormtaylor-to-space-case/index.js", "ianstormtaylor-to-camel-case/deps/to-space-case/index.js");
require.alias("ianstormtaylor-to-no-case/index.js", "ianstormtaylor-to-space-case/deps/to-no-case/index.js");

require.alias("ianstormtaylor-to-capital-case/index.js", "ianstormtaylor-case/deps/to-capital-case/index.js");
require.alias("ianstormtaylor-to-no-case/index.js", "ianstormtaylor-to-capital-case/deps/to-no-case/index.js");

require.alias("ianstormtaylor-to-constant-case/index.js", "ianstormtaylor-case/deps/to-constant-case/index.js");
require.alias("ianstormtaylor-to-snake-case/index.js", "ianstormtaylor-to-constant-case/deps/to-snake-case/index.js");
require.alias("ianstormtaylor-to-space-case/index.js", "ianstormtaylor-to-snake-case/deps/to-space-case/index.js");
require.alias("ianstormtaylor-to-no-case/index.js", "ianstormtaylor-to-space-case/deps/to-no-case/index.js");

require.alias("ianstormtaylor-to-dot-case/index.js", "ianstormtaylor-case/deps/to-dot-case/index.js");
require.alias("ianstormtaylor-to-space-case/index.js", "ianstormtaylor-to-dot-case/deps/to-space-case/index.js");
require.alias("ianstormtaylor-to-no-case/index.js", "ianstormtaylor-to-space-case/deps/to-no-case/index.js");

require.alias("ianstormtaylor-to-no-case/index.js", "ianstormtaylor-case/deps/to-no-case/index.js");

require.alias("ianstormtaylor-to-pascal-case/index.js", "ianstormtaylor-case/deps/to-pascal-case/index.js");
require.alias("ianstormtaylor-to-space-case/index.js", "ianstormtaylor-to-pascal-case/deps/to-space-case/index.js");
require.alias("ianstormtaylor-to-no-case/index.js", "ianstormtaylor-to-space-case/deps/to-no-case/index.js");

require.alias("ianstormtaylor-to-sentence-case/index.js", "ianstormtaylor-case/deps/to-sentence-case/index.js");
require.alias("ianstormtaylor-to-no-case/index.js", "ianstormtaylor-to-sentence-case/deps/to-no-case/index.js");

require.alias("ianstormtaylor-to-slug-case/index.js", "ianstormtaylor-case/deps/to-slug-case/index.js");
require.alias("ianstormtaylor-to-space-case/index.js", "ianstormtaylor-to-slug-case/deps/to-space-case/index.js");
require.alias("ianstormtaylor-to-no-case/index.js", "ianstormtaylor-to-space-case/deps/to-no-case/index.js");

require.alias("ianstormtaylor-to-snake-case/index.js", "ianstormtaylor-case/deps/to-snake-case/index.js");
require.alias("ianstormtaylor-to-space-case/index.js", "ianstormtaylor-to-snake-case/deps/to-space-case/index.js");
require.alias("ianstormtaylor-to-no-case/index.js", "ianstormtaylor-to-space-case/deps/to-no-case/index.js");

require.alias("ianstormtaylor-to-space-case/index.js", "ianstormtaylor-case/deps/to-space-case/index.js");
require.alias("ianstormtaylor-to-no-case/index.js", "ianstormtaylor-to-space-case/deps/to-no-case/index.js");

require.alias("ianstormtaylor-to-title-case/index.js", "ianstormtaylor-case/deps/to-title-case/index.js");
require.alias("component-escape-regexp/index.js", "ianstormtaylor-to-title-case/deps/escape-regexp/index.js");

require.alias("ianstormtaylor-map/index.js", "ianstormtaylor-to-title-case/deps/map/index.js");
require.alias("component-each/index.js", "ianstormtaylor-map/deps/each/index.js");
require.alias("component-type/index.js", "component-each/deps/type/index.js");

require.alias("ianstormtaylor-title-case-minors/index.js", "ianstormtaylor-to-title-case/deps/title-case-minors/index.js");

require.alias("ianstormtaylor-to-capital-case/index.js", "ianstormtaylor-to-title-case/deps/to-capital-case/index.js");
require.alias("ianstormtaylor-to-no-case/index.js", "ianstormtaylor-to-capital-case/deps/to-no-case/index.js");

require.alias("ianstormtaylor-case/lib/index.js", "ianstormtaylor-case/index.js");
require.alias("segmentio-obj-case/index.js", "segmentio-obj-case/index.js");
require.alias("segmentio-facade/lib/index.js", "segmentio-facade/index.js");
require.alias("segmentio-is-email/index.js", "analytics/deps/is-email/index.js");
require.alias("segmentio-is-email/index.js", "is-email/index.js");

require.alias("segmentio-is-meta/index.js", "analytics/deps/is-meta/index.js");
require.alias("segmentio-is-meta/index.js", "is-meta/index.js");

require.alias("segmentio-isodate-traverse/index.js", "analytics/deps/isodate-traverse/index.js");
require.alias("segmentio-isodate-traverse/index.js", "isodate-traverse/index.js");
require.alias("component-each/index.js", "segmentio-isodate-traverse/deps/each/index.js");
require.alias("component-type/index.js", "component-each/deps/type/index.js");

require.alias("ianstormtaylor-is/index.js", "segmentio-isodate-traverse/deps/is/index.js");
require.alias("component-type/index.js", "ianstormtaylor-is/deps/type/index.js");

require.alias("ianstormtaylor-is-empty/index.js", "ianstormtaylor-is/deps/is-empty/index.js");

require.alias("segmentio-isodate/index.js", "segmentio-isodate-traverse/deps/isodate/index.js");

require.alias("segmentio-json/index.js", "analytics/deps/json/index.js");
require.alias("segmentio-json/index.js", "json/index.js");
require.alias("component-json-fallback/index.js", "segmentio-json/deps/json-fallback/index.js");

require.alias("segmentio-new-date/lib/index.js", "analytics/deps/new-date/lib/index.js");
require.alias("segmentio-new-date/lib/milliseconds.js", "analytics/deps/new-date/lib/milliseconds.js");
require.alias("segmentio-new-date/lib/seconds.js", "analytics/deps/new-date/lib/seconds.js");
require.alias("segmentio-new-date/lib/index.js", "analytics/deps/new-date/index.js");
require.alias("segmentio-new-date/lib/index.js", "new-date/index.js");
require.alias("ianstormtaylor-is/index.js", "segmentio-new-date/deps/is/index.js");
require.alias("component-type/index.js", "ianstormtaylor-is/deps/type/index.js");

require.alias("ianstormtaylor-is-empty/index.js", "ianstormtaylor-is/deps/is-empty/index.js");

require.alias("segmentio-isodate/index.js", "segmentio-new-date/deps/isodate/index.js");

require.alias("segmentio-new-date/lib/index.js", "segmentio-new-date/index.js");
require.alias("segmentio-store.js/store.js", "analytics/deps/store/store.js");
require.alias("segmentio-store.js/store.js", "analytics/deps/store/index.js");
require.alias("segmentio-store.js/store.js", "store/index.js");
require.alias("segmentio-store.js/store.js", "segmentio-store.js/index.js");
require.alias("segmentio-top-domain/index.js", "analytics/deps/top-domain/index.js");
require.alias("segmentio-top-domain/index.js", "analytics/deps/top-domain/index.js");
require.alias("segmentio-top-domain/index.js", "top-domain/index.js");
require.alias("component-url/index.js", "segmentio-top-domain/deps/url/index.js");

require.alias("segmentio-top-domain/index.js", "segmentio-top-domain/index.js");
require.alias("visionmedia-debug/index.js", "analytics/deps/debug/index.js");
require.alias("visionmedia-debug/debug.js", "analytics/deps/debug/debug.js");
require.alias("visionmedia-debug/index.js", "debug/index.js");

require.alias("yields-prevent/index.js", "analytics/deps/prevent/index.js");
require.alias("yields-prevent/index.js", "prevent/index.js");

require.alias("analytics/lib/index.js", "analytics/index.js");if (typeof exports == "object") {
  module.exports = require("analytics");
} else if (typeof define == "function" && define.amd) {
  define("analytics", [], function(){ return require("analytics"); });
} else {
  this["analytics"] = require("analytics");
}})();

define('aura/ext/debug', [],function() {
  

  return {
    name: 'debug',

    initialize: function(app) {
      if (typeof window.attachDebugger === 'function') {
        app.logger.log('Attaching debugger ...');
        window.attachDebugger(app);
      }
    }
  };
});

define('aura/ext/mediator', ['eventemitter', 'underscore'], function (EventEmitter, _) {
  

  return {
    name: 'mediator',

    initialize: function (app) {
      app.config.mediator = _.defaults(app.config.mediator || {}, {
        wildcard: true,
        delimiter: '.',
        newListener: true,
        maxListeners: 20
      });

      var mediator = app.config.mediatorInstance || new EventEmitter(app.config.mediator);

      app.core.mediator = mediator;

      var attachListener = function(listenerType) {
        return function (name, listener, context) {
          if (!_.isFunction(listener) || !_.isString(name)) {
            throw new Error('Invalid arguments passed to sandbox.' + listenerType);
          }
          context = context || this;
          var callback = function() {
            var args = Array.prototype.slice.call(arguments);
            try {
              listener.apply(context, args);
            } catch(e) {
              app.logger.error("Error caught in listener '" + name + "', called with arguments: ", args, "\nError:", e.message, e, args);
            }
          };

          this._events = this._events || [];
          this._events.push({ name: name, listener: listener, callback: callback });

          mediator[listenerType](name, callback);
        };
      };

      /**
       * @class  Sandbox
       *
       */

      /**
       * @method  on
       * @param {String} name         Pattern of event to subscrbibe to.
       */
      app.sandbox.on    = attachListener('on');

      /**
       * @method  once
       * @param {String} name          Pattern of event to subscrbibe to.
       */
      app.sandbox.once  = attachListener('once');

      /**
       * @method off
       * @param {String} name         Pattern of event to subscrbibe to.
       * @param {Function} listener   Listener function to stop.
       */
      app.sandbox.off = function (name, listener) {
        if(!this._events) { return; }
        this._events = _.reject(this._events, function (evt) {
          var ret = (evt.name === name && evt.listener === listener);
          if (ret) { mediator.off(name, evt.callback); }
          return ret;
        });
      };


      /**
       * @method emit
       * @param {String} name       Event name to emit
       * @param {Object} payload    Payload emitted
       */
      app.sandbox.emit = function () {
        var debug = app.config.debug;
        if(debug.enable && (debug.components.length === 0 || debug.components.indexOf("aura:mediator") !== -1)){
          var eventData = Array.prototype.slice.call(arguments);
          eventData.unshift('Event emitted');
          app.logger.log.apply(app.logger, eventData);
        }
        mediator.emit.apply(mediator, arguments);
      };

      /**
       * @method stopListening
       */

      app.sandbox.stopListening = function () {
        if (!this._events) { return; }
        _.each(this._events, function (evt) {
          mediator.off(evt.name, evt.callback);
        });
      };

      var eventName = ['aura', 'sandbox', 'stop'].join(app.config.mediator.delimiter);
      app.core.mediator.on(eventName, function (sandbox) {
        sandbox.stopListening();
      });
    }
  };
});

define('aura/platform',[],function() {
  // The bind method is used for callbacks.
  //
  // * (bind)[https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Function/bind]
  // * (You don't need to use $.proxy)[http://www.aaron-powell.com/javascript/you-dont-need-jquery-proxy]
  // * credits: taken from bind_even_never in this discussion: https://prototype.lighthouseapp.com/projects/8886/tickets/215-optimize-bind-bindaseventlistener#ticket-215-9
  if (typeof Function.prototype.bind !== "function") {
    Function.prototype.bind = function(context) {
       var fn = this, args = Array.prototype.slice.call(arguments, 1);
       return function(){
          return fn.apply(context, Array.prototype.concat.apply(args, arguments));
       };
    };
  }

  // Creates a new object with the specified prototype object and properties.
  //
  // * (create)[https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/create]

  if (!Object.create) {
    Object.create = function (o) {
      if (arguments.length > 1) {
        throw new Error('Object.create implementation only accepts the first parameter.');
      }
      function F() {}
      F.prototype = o;
      return new F();
    };
  }

});

(function() {
  if (window.jQuery) {
    define('jquery', [], function () {
      return window.jQuery;
    });
  } else {
    require.config({
      paths: {
        jquery:     'bower_components/jquery/jquery'
      },
      shim: {
        jquery:     { exports: '$' }
      }
    });
  }

  if (window._) {
    define('underscore', [], function () {
      return window._;
    });
  } else {
    require.config({
      paths: {
        underscore: 'bower_components/underscore/underscore'
      },
      shim: {
        underscore: { exports: '_' }
      }
    });
  }

  define('aura/base',['module', 'underscore', 'jquery', './platform'], function(module, _, $, platform) {

    // Auto configure aura path... if not set yet...
    if (!require.s.contexts._.config.paths.aura) {
      require.config({ paths: { aura: module.id.replace(/base$/, '') }});
    }

    var base = {};

    base.dom = {
      find: function(selector, context) {
        if (context) {
          return $(context).find(selector);  
        } else {
          return $(selector);
        }
      },
      data: function(selector, attribute, value) {
        if(value===undefined){
          return $(selector).data(attribute);
        } else {
          return $(selector).data(attribute, value);
        }
      }
    };

    base.data = {
      ajax: $.ajax,
      deferred: $.Deferred,
      //Handle an Array or arguments seamlessly, Return a Deferred.
      when:     function(){
        if(_.isArray(arguments[0])){
          return $.when.call(undefined, arguments[0]);
        } else {
          return $.when.apply(undefined, [].slice.call(arguments));
        }
      },
      // Using the following method instead of a direct call to .promise will help decouple the Promises library later
      promise:  function(dfd){
        if(_.isFunction(dfd.promise)){
          return dfd.promise();
        } else {
          return dfd.promise;
        }
      }
    },

    base.util = {
      each:   _.each,
      extend: _.extend,
      uniq:   _.uniq,
      _:      _,
      decamelize: function(camelCase, delimiter) {
        delimiter = (delimiter === undefined) ? '_' : delimiter;
        return camelCase.replace(/([A-Z])/g, delimiter + '$1').toLowerCase();
      }
    };

    base.events = {
      listen: function(context, events, selector, callback) {
        return $(context).on(events, selector, callback);
      },
      bindAll: function() {
        return _.bindAll.apply(this, arguments);
      }
    };

    base.template = {
      parse: _.template
    };

    return base;

  });

})();

define('aura/logger',[], function() {
  

  var noop    = function() {},
      console = window.console || {};

  function Logger(name) {
    this.name   = name;
    this._log   = noop;
    this._warn  = noop;
    this._error = noop;
    this._enabled = false;
    return this;
  }

  Logger.prototype.isEnabled = function () {
    return this._enabled;
  };

  Logger.prototype.setName = function(name){
    this.name = name;
  };

  Logger.prototype.enable = function() {
    this._log     = (console.log   || noop);
    this._warn    = (console.warn  || this._log);
    this._error   = (console.error || this._log);
    this._enabled = true;

    try {
      if (Function.prototype.bind && typeof console === "object") {
        var logFns = ["log", "warn", "error"];
        for (var i = 0; i < logFns.length; i++) {
          console[logFns[i]] = Function.prototype.call.bind(console[logFns[i]], console);
        }
      }
    } catch(e) {}

    return this;
  };

  Logger.prototype.write = function(output, args){
    var parameters = Array.prototype.slice.call(args);
    parameters.unshift(this.name + ":");
    output.apply(console, parameters);
  };

  Logger.prototype.log = function() {
    this.write(this._log, arguments);
  };

  Logger.prototype.warn = function() {
    this.write(this._warn, arguments);
  };

  Logger.prototype.error = function() {
    this.write(this._error, arguments);
  };

  return Logger;
});

define('aura/aura.extensions',['./base', './logger'], function(base, Logger) {

  var _ = base.util._,
      slice = Array.prototype.slice,
      deferred = base.data.deferred,
      when     = base.data.when,
      logger   = new Logger('Extensions').enable();

  function ExtManager() {
    this._extensions  = [];
    this.initStatus   = deferred();
    return this;
  }

  //---------------------------------------------------------------------------
  // Public API
  //---------------------------------------------------------------------------

  ExtManager.prototype.add = function(ext) {
    if (_.include(this._extensions, ext)) {
      var msg =  ext.ref.toString() + " is already registered.";
          msg += "Extensions can only be added once.";
      throw new Error(msg);
    }

    if (this.initStarted) {
      throw new Error("Init extensions already called");
    }

    this._extensions.push(ext);
    return this;
  };

  ExtManager.prototype.onReady = function(fn) {
    this.initStatus.then(fn);
    return this;
  };

  ExtManager.prototype.onFailure = function(fn) {
    this.initStatus.fail(fn);
    return this;
  };

  ExtManager.prototype.init = function() {

    if (this.initStarted) {
      throw new Error("Init extensions already called");
    }

    this.initStarted = true;

    var extensions    = _.compact(this._extensions.slice(0)),
        initialized   = [],
        initStatus    = this.initStatus;

    // Enforce sequencial loading of extensions.
    // The `initStatus` promise resolves to the
    // actually resolved and loaded extensions.
    (function _init(extDef) {
      if (extDef) {
        var ext = initExtension(extDef);
        initialized.push(ext);
        ext.done(function () { _init(extensions.shift()); });
        ext.fail(function (err) {
          if (!err) {
            err = "Unknown error while loading an extension";
          }
          if (!(err instanceof Error)) {
            err = new Error(err);
          }
          initStatus.reject(err);
        });
      } else if (extensions.length === 0) {
        when.apply(undefined, initialized).done(function () {
          initStatus.resolve(Array.prototype.slice.call(arguments));
        });
      }
    })(extensions.shift());

    return initStatus.promise();
  };

  //---------------------------------------------------------------------------
  // Private API
  //---------------------------------------------------------------------------

  /*!
   * Helper function that returns the first function found among its arguments.
   * If no function if found, it return a noop (empty function).
   *
   * @return {[type]} [description]
   */
  function getFn() {
    var funcs = slice.call(arguments), fn;
    for (var f = 0, l = funcs.length; f < l; f++) {
      fn = funcs[f];
      if (typeof(fn) === 'function') { return fn; }
    }
    return function () {};
  }

  /*!
   * If the value of the first argument is a function then invoke
   * it with the rest of the args, otherwise, return it.
   */
  function getVal(val) {
    if (typeof val === 'function') {
      return val.apply(undefined, slice.call(arguments, 1));
    } else {
      return val;
    }
  }

  /*!
  * Actual extension loading.
  *
  * The sequence is:
  *
  * * resolves the extension reference
  * * register and requires its dependencies if any
  * * init the extension
  *
  * This method also returns a promise that allows
  * to keep track of the app's loading sequence.
  *
  * If the extension provides a `afterAppStart` method,
  * the promise will resolve to that function that
  * will be called at the end of the app loading sequence.
  *
  * @param {String|Object|Function} extDef the reference and context of the extension
  */

  function initExtension(extDef) {
    var dfd       = deferred(),
        ref       = extDef.ref,
        context   = extDef.context;

    var req = requireExtension(ref, context);
    req.fail(dfd.reject);
    req.done(function (ext) {

      // The extension did not return anything,
      // but probably already did what it had to do.
      if (!ext) { return dfd.resolve(); }

      // Let's initialize it then...
      // If ext is a function, call it
      // Else If ext has a init method, call it
      var init = when(getFn(ext, ext.initialize)(context));
      init.done(function () { dfd.resolve(ext); });
      init.fail(dfd.reject);
    });
    return dfd.promise();
  }

  /*!
  * Extension resolution before actual loading.
  * If `ext` is a String, it is considered as a reference
  * to an AMD module that has to be loaded.
  *
  * This method returns a promise that resolves to the actual extension,
  * With all its dependencies already required' too.
  *
  * @param {String|Object|Function} ext the reference of the extension
  * @param {Object} context the thing this extension is supposed to extend
  */

  function requireExtension(ext, context) {
    var dfd = deferred();

    var resolve = function (ext) {
      ext = getVal(ext, context);
      if (ext && ext.require && ext.require.paths) {
        var deps = _.keys(ext.require.paths) || [];
        require.config(ext.require);
        require(deps, function() {
          dfd.resolve(ext);
        }, reject);
      } else {
        dfd.resolve(ext);
      }
    };

    var reject = function (err) {
      logger.error("Error loading ext:", ext, err);
      dfd.reject(err);
    };

    if (typeof ext === 'string') {
      require([ext], resolve, reject);
    } else {
      resolve(ext);
    }

    return dfd;
  }

  return ExtManager;
});

define('aura/aura',[
  './base',
  './aura.extensions',
  './logger'
  ], function(base, ExtManager, Logger) {

  var _        = base.util._,
      noop     = function() {},
      freeze   = Object.freeze || noop,
      find     = base.dom.find,
      data     = base.dom.data;

  /**
  * Aura constructor and main entry point
  *
  * Every instance of Aura defines an Aura application.
  * An Aura application is in charge of loading the various
  * extensions that will apply to it (defined either
  * programmatically or by way of configuration).
  *
  * An Aura application is the glue between all the extensions
  * and components inside its instance.
  *
  * Internally an Aura application wraps 4 important objects:
  *
  * - `config` is the object passed as the first param of the apps constructor
  * - `core`   is a container where the extensions add new features
  * - `sandbox` is an object that will be used as a prototype, to create fresh sandboxes to the components
  * - `extensions` An instance of the ExtensionManager. It contains all the extensions that will be loaded in the app.
  *
  * Extensions are here to provide features that will be used by the components...
  * They are meant to extend the apps' core & sandbox.
  * They also have access to the apps's config.
  *
  * Example of a creation of an Aura Application:
  *
  *     var app = aura({ key: 'value' });
  *     app.use('ext1').use('ext2');
  *     app.components.addSource('supercomponents', 'https://my.extern.al/components/store');
  *     app.start('body');
  *
  * @class Aura
  * @param {Object} [config] Main App config.
  * @method constructor
  */
  function Aura(config) {

    if (!(this instanceof Aura)) {
      return new Aura(config);
    }

    var extManager = new ExtManager(),
        app = this;

    /**
     * The App's internal unique reference.
     *
     * @property {String} ref
     */
    app.ref = _.uniqueId('aura_');

    /**
     * The App's config object
     *
     * @property {Object} config
     */
    app.config = config = config || {};
    app.config.sources = app.config.sources || { "default" : "./aura_components" };


    /*!
     * App Sandboxes
     */

    var appSandboxes = {};
    var baseSandbox = Object.create(base);

    /**
     * Namespace for sanboxes related methods.
     *
     * @type {Object}
     */
    app.sandboxes = {};

    /**
     * Creates a brand new sandbox, using the App's `sandbox` object as a prototype.
     *
     * @method sandboxes.create
     * @param   {String} [ref]      the Sandbox unique ref
     * @param   {Object} [options]  an object to that directly extends the Sandbox
     * @return  {Sandbox}
     */
    app.sandboxes.create = function (ref, options) {

      // Making shure we have a unique ref
      ref = ref || _.uniqueId('sandbox-');
      if (appSandboxes[ref]) {
        throw new Error("Sandbox with ref " + ref + " already exists.");
      }

      // Create a brand new sandbox based on the baseSandbox
      var sandbox = Object.create(baseSandbox);

      // Give it a ref
      sandbox.ref = ref || _.uniqueId('sandbox-');

      // Attach a Logger
      sandbox.logger = new Logger(sandbox.ref);

      // Register it in the app's sandboxes registry
      appSandboxes[sandbox.ref] = sandbox;

      var debug = config.debug;
      if(debug === true || (debug.enable && (debug.components.length === 0 || debug.components.indexOf(ref) !== -1))){
        sandbox.logger.enable();
      }

      // Extend if we have some options
      _.extend(sandbox, options || {});

      return sandbox;
    };

    /**
     * Get a sandbox by reference.
     *
     * @method sandboxes.get
     * @param  {String} ref  the Sandbox ref to retreive
     * @return {Sandbox}
     */
    app.sandboxes.get = function(ref) {
      return appSandboxes[ref];
    };

    /**
     * Tells the app to load the given extension.
     *
     * Aura extensions are loaded in the app during init.
     * they are responsible for :
     *
     * - resolving & loading external dependencies via requirejs
     * - they have direct access to the app's internals
     * - they are here to add new features to the app... that are made available through the sandboxes to the components.
     *
     * This method can only be called before the App is actually started.
     * Note that the App is started when its `start` method is called.
     *
     * @method use
     * @param  {String | Object | Function} ref the reference of the extension
     * @return {Aura} the Aura app object
     * @chainable
     */
    app.use = function(ref) {
      extManager.add({ ref: ref, context: app });
      return app;
    };

    /**
     * Namespace for components related methods.
     *
     * @type {Object}
     */
    app.components = {};

    /**
     * Adds a new source for components.
     * A Component source is an endpoint (basically a URL)
     * that is the root of a component repository.
     *
     * @method  components.addSource
     * @param {String} name    the name of the source.
     * @param {String} baseUrl the base url for those components.
     */
    app.components.addSource = function(name, baseUrl) {
      if (config.sources[name]) {
        throw new Error("Components source '" + name + "' is already registered");
      }
      config.sources[name] = baseUrl;
      return app;
    };

    /**
     * `core` is just a namespace used by the extensions to add features to the App.
     *
     * @property {Object} core
     */
    app.core = Object.create(base);

    /**
     * Application start.
     *
     * Bootstraps the extensions loading process.
     * All the extensions are resolved and loaded when `start` id called.
     * Start returns a promise that shall fail if any of the
     * extensions fails to load.
     *
     * The app's responsibility is to load its extensions,
     * make sure they are properly loaded when the app starts
     * and eventually make sure they are properly cleaned up when the app stops
     *
     * @method start
     * @param  {Object | String | Array} options start options.
     * @return {Promise} a promise that resolves when the app is started.
     */
    app.start = function(options) {

      if (app.started) {
        app.logger.error("Aura already started!");
        return extManager.initStatus;
      }

      app.logger.log("Starting Aura");

      var startOptions = options || {};

      // Support for different types of options (string, DOM Selector or Object)
      if (typeof options === 'string') {
        startOptions = { components: find(options) };
      } else if (_.isArray(options)) {
        startOptions = { components: options };
      } else if (options && options.widgets && !options.components) {
        startOptions.components = options.widgets;
      } else if (startOptions.components === undefined) {
        startOptions.components = find(app.config.components || 'body');
      }

      extManager.onReady(function(exts) {
        // Then we call all the `afterAppStart` provided by the extensions
        base.util.each(exts, function(ext, i) {
          if (ext && typeof(ext.afterAppStart) === 'function') {
            ext.afterAppStart(app);
          }
        });
      });

      // If there was an error in the boot sequence we
      // reject every body and perform a cleanup
      // TODO: Provide a better error message to the user.
      extManager.onFailure(function() {
        app.logger.error("Error initializing app:", app.config.name, arguments);
        app.stop();
      });

      app.startOptions = startOptions;
      app.started = true;

      // Finally... we return a promise that allows
      // to keep track of the loading process...
      return extManager.init();
    };

    /**
     * Stops the application and unregister its loaded dependencies.
     *
     * @method stop
     * @return {void}
     */
    app.stop = function() {
      // TODO: We ne to actually do some cleanup here.
      app.started = false;
    };

    /**
     * Sandboxes are a way to implement the facade pattern on top of the features provided by `core`.
     *
     * The `sandbox` property of an Aura App is just an Object that will be used
     * as a blueprint, once the app is started, to create new instances
     * of sandboxed environments for the Components.
     * @property {Object} sandbox
     */
    app.sandbox = baseSandbox;

    /**
     * App Logger
     *
     * @property {Logger} logger
     */
    app.logger     = new Logger(app.ref);

    /**
     * @class Sandbox
     */

    /**
     * Stop method for a Sandbox.
     * If no arguments provided, the sandbox itself and all its children are stopped.
     * If a DOM Selector is provided, all matching children will be stopped.
     *
     * @param  {undefined|String} DOM Selector
     */
    app.sandbox.stop = function(selector) {
      if (selector) {
        _.each(find(selector, this.el), function(el, i) {
          var ref = data(find(el), '__sandbox_ref__');
          stopSandbox(ref);
        });
      } else {
        stopSandbox(this);
      }
    };

    function stopSandbox(sandbox) {
      if (typeof sandbox === 'string') {
        sandbox = app.sandboxes.get(sandbox);
      }
      if (sandbox) {
        var event = ['aura', 'sandbox', 'stop'].join(app.config.mediator.delimiter);
        _.invoke(sandbox._children, 'stop');
        app.core.mediator.emit(event, sandbox);
        if (sandbox._component) {
          sandbox._component.invokeWithCallbacks('remove');
        }
        sandbox.stopped  = true;
        sandbox.el && find(sandbox.el).remove();
        appSandboxes[sandbox.ref] = null;
        delete appSandboxes[sandbox.ref]; // do we need to actually call `delete` ?
        return sandbox;
      }
    }

    // Register core extensions : debug, mediator and components.
    config.debug = config.debug || {};
    var debug = config.debug;
    if (debug === true) {
      config.debug = debug = {
        enable: true
      };
    }
    if (debug.enable) {
      if(debug.components){
        debug.components = debug.components.split(' ');
      }else{
        debug.components = [];
      }
      app.logger.enable();
      app.use('aura/ext/debug');
    }

    app.use('aura/ext/mediator');

    // Only disable components on explicit "false"
    if(config.components!==false){
      app.use('aura/ext/components');
    }

    return app;
  }

  return Aura;
});

define('lib/utils/version',[],function () { return 'ds_1.5_ember';});
(function() {

  define('lib/remote/config-normalizer',['underscore'], function(_) {
    var ConfigNormalizer, flattenSettings;
    flattenSettings = function(settings, name) {
      var nameArray;
      nameArray = name.split('_');
      if (nameArray.length > 1) {
        nameArray.pop();
      }
      return [nameArray.join('_'), settings[name] || {}];
    };
    return ConfigNormalizer = (function() {

      function ConfigNormalizer(cfg) {
        this.config = cfg;
      }

      ConfigNormalizer.prototype.sortServicesByType = function(settings, types) {
        var ret;
        ret = _.map(types, function(names, type) {
          var typeSettings;
          typeSettings = _.object(_.map(names, _.bind(flattenSettings, void 0, settings)));
          return [type, typeSettings];
        });
        return _.object(ret);
      };

      ConfigNormalizer.prototype.applyUserCredentials = function(config, creds) {
        if (creds == null) {
          creds = {};
        }
        return _.each(creds, function(c, k) {
          var _ref;
          if (!_.keys(c).length) {
            return;
          }
          if (config != null) {
            if ((_ref = config[k]) == null) {
              config[k] = {};
            }
          }
          return config != null ? config[k].credentials = c : void 0;
        });
      };

      ConfigNormalizer.prototype.normalize = function() {
        var _base, _ref;
        this.config.settings = this.sortServicesByType(this.config.services.settings, this.config.services.types);
        if ((_ref = (_base = this.config.settings).auth) == null) {
          _base.auth = {};
        }
        this.applyUserCredentials(this.config.settings.auth, this.config.data.credentials);
        return this.config;
      };

      return ConfigNormalizer;

    })();
  });

}).call(this);

(function() {

  define('lib/hull-remote',['aura/aura', 'underscore', 'lib/utils/version', 'lib/remote/config-normalizer'], function(Aura, _, version, ConfigNormalizer) {
    var Hull, availableServices, hull, isAvailable;
    availableServices = ['angellist', 'facebook', 'github', 'instagram', 'linkedin', 'soundcloud', 'tumblr', 'twitter', 'google'];
    isAvailable = _.bind(_.contains, _, availableServices);
    hull = null;
    Hull = function(config) {
      var auth_services, keys, normalizer, _ref, _ref1;
      normalizer = new ConfigNormalizer(config);
      config = normalizer.normalize();
      if (hull && hull.app) {
        return hull;
      }
      hull = {
        config: config
      };
      if ((_ref = config.debug) == null) {
        config.debug = false;
      }
      config.components = false;
      hull.app = Aura(config);
      hull.app.use('aura-extensions/aura-cookies');
      hull.app.use('aura-extensions/aura-purl');
      hull.app.use('aura-extensions/aura-uuid');
      hull.app.use('lib/remote/services');
      hull.app.use('lib/remote/handler');
      hull.app.use('lib/remote/current-user');
      hull.app.use('lib/remote/services/hull');
      hull.app.use('lib/remote/services/admin');
      keys = _.keys(((_ref1 = config.settings) != null ? _ref1.auth : void 0) || []);
      auth_services = _.filter(keys, isAvailable);
      _.each(auth_services, function(value) {
        return hull.app.use("lib/remote/services/" + value);
      });
      hull.app.start();
      return hull;
    };
    window.Hull = Hull;
    Hull.version = version;
    return Hull;
  });

}).call(this);

(function() {

  define('lib/utils/cookies',['cookie'], function(Cookies) {
    return {
      set: Cookies.set,
      get: Cookies.get,
      remove: Cookies.expire
    };
  });

}).call(this);

/*global define:true */
define('aura-extensions/aura-cookies',['lib/utils/cookies'], function(cookies) {

  var extension = {
    initialize: function(app){
      app.core.cookies = cookies;
    }
  };

  return extension;
});

define('aura-extensions/aura-purl',['purl'],function() {
  return {
    require: {
      paths: {
        purl: 'bower_components/purl/purl'
      }
    },
    initialize: function(app) {
      var purl = require('purl');
      app.core.util.purl = purl;
    }
  }
});
define('aura-extensions/aura-uuid',[],function() {

  return function(app) {

    // Private array of chars to use
    var CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');

    app.core.util.uuid = function(len, radix) {
      var chars = CHARS,
        uuid = [],
        i;
      radix = radix || chars.length;

      if (len) {
        // Compact form
        for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random() * radix];
      } else {
        // rfc4122, version 4 form
        var r;

        // rfc4122 requires these characters
        uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
        uuid[14] = '4';

        // Fill in random data.  At i==19 set the high bits of clock sequence as
        // per rfc4122, sec. 4.1.5
        for (i = 0; i < 36; i++) {
          if (!uuid[i]) {
            r = 0 | Math.random() * 16;
            uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
          }
        }
      }

      return uuid.join('');
    };

    // A more performant, but slightly bulkier, RFC4122v4 solution.  We boost performance
    // by minimizing calls to random()
    app.core.util.uuidFast = function() {
      var chars = CHARS,
        uuid = new Array(36),
        rnd = 0,
        r;
      for (var i = 0; i < 36; i++) {
        if (i == 8 || i == 13 || i == 18 || i == 23) {
          uuid[i] = '-';
        } else if (i == 14) {
          uuid[i] = '4';
        } else {
          if (rnd <= 0x02) rnd = 0x2000000 + (Math.random() * 0x1000000) | 0;
          r = rnd & 0xf;
          rnd = rnd >> 4;
          uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
        }
      }
      return uuid.join('');
    };

    // A more compact, but less performant, RFC4122v4 solution:
    app.core.util.uuidCompact = function() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0,
          v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
  };
});
(function() {

  define('lib/remote/current-user',[],function() {
    var UserManager;
    UserManager = (function() {

      function UserManager(userDesc, userCreds, updater) {
        if (userDesc == null) {
          userDesc = null;
        }
        if (userCreds == null) {
          userCreds = {};
        }
        this.currentUser = userDesc;
        this.currentSettings = userCreds;
        this.updater = updater;
      }

      UserManager.prototype.loggedIn = function() {
        return this.currentUser != null;
      };

      UserManager.prototype.is = function(userId) {
        var _ref;
        return ((_ref = this.currentUser) != null ? _ref.id : void 0) === userId;
      };

      UserManager.prototype.isUserUpdate = function(user) {
        var _ref;
        if (!user) {
          return;
        }
        return this.is(user.id) && ((_ref = this.currentUser) != null ? _ref.updated_at : void 0) !== user.updated_at;
      };

      UserManager.prototype.updateDescription = function() {
        return this.updater.handle({
          url: 'me',
          nocallback: true
        });
      };

      UserManager.prototype.updateSettings = function() {
        return this.updater.handle({
          url: 'app/settings',
          nocallback: true
        });
      };

      return UserManager;

    })();
    return {
      initialize: function(app) {
        var userManager;
        userManager = new UserManager(app.config.data.me, app.config.settings, app.core.handler);
        app.core.handler.after(function(h) {
          var p1, p2, userId;
          userId = h.headers['Hull-User-Id'];
          if (!userManager.is(userId)) {
            delete app.core.handler.headers['Hull-Access-Token'];
            p1 = userManager.updateDescription().then(function(h) {
              userManager.currentUser = h.response;
              return app.sandbox.emit('remote.user.update', h.response);
            }, function(err) {
              userManager.currentUser = {};
              return app.sandbox.emit('remote.user.update', {});
            });
            p2 = p1.then(userManager.updateSettings().then(function(h) {
              userManager.currentSettings = h.response;
              return app.sandbox.emit('remote.settings.update', h.response);
            }, function(err) {
              userManager.currentSettings = {};
              return app.sandbox.emit('remote.settings.update', {});
            }));
            return p2;
          } else if (userManager.isUserUpdate(h.response)) {
            userManager.currentUser = h.response;
            return app.sandbox.emit('remote.user.update', userManager.currentUser);
          }
        });
        app.core.currentUser = function() {
          return JSON.parse(JSON.stringify(userManager.userDesc));
        };
        return app.core.settings = function() {
          return JSON.parse(JSON.stringify(userManager.currentSettings));
        };
      }
    };
  });

}).call(this);

(function() {

  define('lib/remote/handler',['jquery', 'underscore'], function($, _) {
    var API_PATH, API_PATH_REGEXP, Handler, batchable, handler, normalizePath;
    API_PATH = '/api/v1/';
    API_PATH_REGEXP = /^\/?api\/v1\//;
    normalizePath = function(path) {
      if (API_PATH_REGEXP.test(path)) {
        return path.replace(API_PATH_REGEXP, API_PATH);
      }
      if (path[0] === '/') {
        path = path.substring(1);
      }
      return API_PATH + path;
    };
    batchable = function(threshold, fn) {
      var args, timeout;
      args = [];
      timeout = null;
      return function() {
        var context, delayed;
        context = this;
        args.push(Array.prototype.slice.call(arguments));
        delayed = function() {
          fn.call(context, args);
          timeout = null;
          return args = [];
        };
        clearTimeout(timeout);
        return timeout = setTimeout(delayed, threshold);
      };
    };
    handler = Handler = (function() {
      var RESPONSE_HEADERS;

      RESPONSE_HEADERS = ['Hull-Auth-Scope', 'Hull-Track', 'Hull-User-Id', 'Hull-User-Sig', 'X-Hits-Count', 'Link'];

      function Handler(options) {
        var _base, _base1, _base2, _ref, _ref1, _ref2;
        if (options == null) {
          options = {};
        }
        this.options = options;
        if ((_ref = (_base = this.options).min) == null) {
          _base.min = 1;
        }
        if ((_ref1 = (_base1 = this.options).max) == null) {
          _base1.max = 15;
        }
        if ((_ref2 = (_base2 = this.options).delay) == null) {
          _base2.delay = 2;
        }
        this.headers = this.options.headers || {};
        this.afterCallbacks = [];
        this.queue = batchable(this.options.delay, function(requests) {
          return this.flush(requests);
        });
      }

      Handler.prototype.handle = function(request) {
        var d, promise;
        request.url = normalizePath(request.url);
        d = new $.Deferred();
        this.queue(request, d);
        promise = d.promise();
        if (request != null ? request.nocallback : void 0) {
          return promise;
        }
        _.each(this.afterCallbacks, function(cb) {
          return promise.then(cb, cb);
        });
        return promise;
      };

      Handler.prototype.flush = function(requests) {
        var deferred, request, _ref, _results;
        if (requests.length <= this.options.min) {
          _results = [];
          while (requests.length) {
            _ref = requests.pop(), request = _ref[0], deferred = _ref[1];
            _results.push(this.handleOne(request, deferred));
          }
          return _results;
        } else {
          this.handleMultiple(requests.splice(0, this.options.max));
          if (requests.length) {
            return this.flush(requests);
          }
        }
      };

      Handler.prototype.handleOne = function(request, deferred) {
        return this.ajax(request).then(function(r, status, xhr) {
          var headers;
          headers = _.reduce(RESPONSE_HEADERS, function(memo, name) {
            var value;
            value = xhr.getResponseHeader(name);
            if (value != null) {
              memo[name] = value;
            }
            return memo;
          }, {});
          return deferred.resolve({
            response: r,
            headers: headers,
            request: request
          });
        }, function(xhr) {
          var responseJSON;
          responseJSON = xhr.responseJSON || JSON.parse(xhr.responseText);
          return deferred.reject({
            response: responseJSON,
            headers: {},
            request: request
          });
        });
      };

      Handler.prototype.handleMultiple = function(requests) {
        return this.ajax({
          type: 'post',
          url: '/api/v1/batch',
          data: this.formatBatchParams(requests)
        }).then(function(r) {
          var deferred, h, headers, i, response, _i, _len, _ref, _results;
          _ref = r.results;
          _results = [];
          for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
            response = _ref[i];
            deferred = requests[i][1];
            headers = _.reduce(RESPONSE_HEADERS, function(memo, name) {
              var value;
              value = response.headers[name];
              if (value != null) {
                memo[name] = value;
              }
              return memo;
            }, {});
            h = {
              response: response.body,
              headers: headers,
              request: requests[i]
            };
            if (response.status >= 400) {
              _results.push(deferred.reject(h));
            } else {
              _results.push(deferred.resolve(h));
            }
          }
          return _results;
        }, function(xhr) {
          var request, responseJSON, _i, _len, _results;
          _results = [];
          for (_i = 0, _len = requests.length; _i < _len; _i++) {
            request = requests[_i];
            responseJSON = xhr.responseJSON || JSON.parse(xhr.responseText);
            _results.push(request[1].reject({
              response: responseJSON,
              headers: {},
              request: request
            }));
          }
          return _results;
        });
      };

      Handler.prototype.after = function(fn) {
        return this.afterCallbacks.push(fn);
      };

      Handler.prototype.ajax = function(options) {
        var _ref;
        options = $.extend(true, options, {
          contentType: 'application/json',
          dataType: 'json',
          headers: this.headers
        });
        if ((_ref = options.type) == null) {
          options.type = 'get';
        }
        if (options.type.toLowerCase() !== 'get') {
          options.data = JSON.stringify(options.data || {});
        }
        return $.ajax(options);
      };

      Handler.prototype.formatBatchParams = function(requests) {
        var c, data, r, request;
        data = {
          sequential: true
        };
        data.ops = (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = requests.length; _i < _len; _i++) {
            request = requests[_i];
            r = request[0];
            c = {};
            c.method = r.type;
            c.url = r.url;
            if (r.data != null) {
              c.params = r.data;
            }
            if (r.headers != null) {
              c.headers = r.headers;
            }
            _results.push(c);
          }
          return _results;
        })();
        return data;
      };

      return Handler;

    })();
    return {
      handler: handler,
      initialize: function(app) {
        var accessToken, headers, options;
        headers = {
          'Hull-App-Id': app.config.appId
        };
        accessToken = app.config.access_token;
        if (accessToken) {
          headers['Hull-Access-Token'] = accessToken;
        }
        options = _.extend({}, app.config.batching || {}, {
          headers: headers
        });
        return app.core.handler = new handler(options);
      },
      afterAppStart: function(app) {
        return app.sandbox.on('remote.settings.update', function(settings) {
          var header, _ref, _ref1, _ref2;
          header = (_ref = settings.auth) != null ? (_ref1 = _ref.hull) != null ? (_ref2 = _ref1.credentials) != null ? _ref2.access_token : void 0 : void 0 : void 0;
          if (header) {
            return app.core.handler.headers['Hull-Access-Token'] = header;
          } else {
            return delete app.core.handler.headers['Hull-Access-Token'];
          }
        });
      }
    };
  });

}).call(this);

(function() {

  define('lib/remote/services',['underscore', 'xdm'], function(_, xdm) {
    var catchAll;
    catchAll = function(res) {
      return res;
    };
    return function(app) {
      var rpc;
      rpc = null;
      return {
        initialize: function(app) {
          var clearUserToken, core, dfd, onRemoteMessage, rpcFall;
          dfd = $.Deferred();
          core = app.core;
          core.routeHandlers = {};
          onRemoteMessage = function(req, callback, errback) {
            var handler, namespace, provider, __, _ref;
            if (!req.path) {
              throw new Error("Path not recognized " + (JSON.stringify(req)));
            }
            handler = core.routeHandlers[req.provider];
            if (_.isFunction(handler)) {
              return handler(req, callback, errback);
            } else {
              _ref = req.provider.match(/^(admin)\@([a-z0-9_\-]+)$/i), __ = _ref[0], provider = _ref[1], namespace = _ref[2];
              if (provider && namespace) {
                req.provider = provider;
                req.namespace = namespace;
                handler = core.routeHandlers['admin'];
                return handler(req, callback, errback);
              } else {
                return errback(catchAll(req));
              }
            }
          };
          clearUserToken = function() {
            return core.handler.headers['Hull-Access-Token'] = void 0;
          };
          try {
            rpc = new xdm.Rpc({
              acl: app.config.appDomains
            }, {
              remote: {
                message: {},
                ready: {},
                userUpdate: {},
                settingsUpdate: {},
                getClientConfig: {},
                show: {},
                hide: {}
              },
              local: {
                message: onRemoteMessage,
                clearUserToken: clearUserToken
              }
            });
            rpc.getClientConfig(function(cfg) {
              core.clientConfig = cfg;
              return dfd.resolve(cfg);
            });
          } catch (e) {
            dfd.reject(e);
            rpcFall = new xdm.Rpc({}, {
              remote: {
                message: {}
              }
            });
            rpcFall.message({
              error: "" + e.message + ", please make sure this domain is whitelisted for this app."
            });
          }
          return dfd.promise();
        },
        afterAppStart: function(app) {
          if (!rpc) {
            throw 'Unable to start Hull.';
          }
          rpc.ready(app.config);
          app.sandbox.on('remote.user.update', rpc.userUpdate.bind(rpc));
          app.sandbox.on('remote.settings.update', rpc.settingsUpdate.bind(rpc));
          app.sandbox.on('remote.iframe.show', function() {
            return rpc.show();
          });
          app.sandbox.on('remote.iframe.hide', function() {
            return rpc.hide();
          });
          return $('html').on('click', function(e) {
            return rpc.hide();
          });
        }
      };
    };
  });

}).call(this);

(function() {

  define('lib/remote/services/admin',[],function() {
    return function(app) {
      var api;
      api = function(req, callback, errback) {
        var headers, path, req_data, request, token, top_domain, url, _ref, _ref1, _ref2;
        path = req.path;
        if (path[0] === "/") {
          path = path.substring(1);
        }
        top_domain = document.location.host.split('.');
        top_domain.shift();
        url = ("" + document.location.protocol + "//" + req.namespace + "." + (top_domain.join('.')) + "/api/v1/") + path;
        if (req.method.toLowerCase() !== 'get') {
          req_data = JSON.stringify(req.params || {});
        } else {
          req_data = req.params;
        }
        headers = {};
        token = (_ref = app.core.settings().auth) != null ? (_ref1 = _ref.hull) != null ? (_ref2 = _ref1.credentials) != null ? _ref2.access_token : void 0 : void 0 : void 0;
        if (token) {
          headers['AccessToken'] = token;
        }
        request = app.core.data.ajax({
          url: url,
          type: req.method,
          data: req_data,
          contentType: 'application/json',
          dataType: 'json',
          headers: headers
        });
        request.then(function(response) {
          return callback({
            response: response,
            provider: 'admin'
          });
        }, errback);
      };
      return {
        initialize: function(app) {
          return app.core.routeHandlers.admin = api;
        }
      };
    };
  });

}).call(this);

/*
 * jQuery JSONP Core Plugin 2.4.0 (2012-08-21)
 *
 * https://github.com/jaubourg/jquery-jsonp
 *
 * Copyright (c) 2012 Julian Aubourg
 *
 * This document is licensed as free software under the terms of the
 * MIT License: http://www.opensource.org/licenses/mit-license.php
 */
(function (factory) {
  
  if (typeof define === 'function' && define.amd) {
    // Register as an anonymous AMD module:
    define('jquery-jsonp',['jquery'], factory);
  } else {
    // Browser globals:
    factory(window.jQuery);
  }
}( function( $ ) {
        
	// ###################### UTILITIES ##

	// Noop
	function noop() {
	}

	// Generic callback
	function genericCallback( data ) {
		lastValue = [ data ];
	}

	// Call if defined
	function callIfDefined( method , object , parameters ) {
		return method && method.apply( object.context || object , parameters );
	}

	// Give joining character given url
	function qMarkOrAmp( url ) {
		return /\?/ .test( url ) ? "&" : "?";
	}

	var // String constants (for better minification)
		STR_ASYNC = "async",
		STR_CHARSET = "charset",
		STR_EMPTY = "",
		STR_ERROR = "error",
		STR_INSERT_BEFORE = "insertBefore",
		STR_JQUERY_JSONP = "_jqjsp",
		STR_ON = "on",
		STR_ON_CLICK = STR_ON + "click",
		STR_ON_ERROR = STR_ON + STR_ERROR,
		STR_ON_LOAD = STR_ON + "load",
		STR_ON_READY_STATE_CHANGE = STR_ON + "readystatechange",
		STR_READY_STATE = "readyState",
		STR_REMOVE_CHILD = "removeChild",
		STR_SCRIPT_TAG = "<script>",
		STR_SUCCESS = "success",
		STR_TIMEOUT = "timeout",

		// Window
		win = window,
		// Deferred
		Deferred = $.Deferred,
		// Head element
		head = $( "head" )[ 0 ] || document.documentElement,
		// Page cache
		pageCache = {},
		// Counter
		count = 0,
		// Last returned value
		lastValue,

		// ###################### DEFAULT OPTIONS ##
		xOptionsDefaults = {
			//beforeSend: undefined,
			//cache: false,
			callback: STR_JQUERY_JSONP,
			//callbackParameter: undefined,
			//charset: undefined,
			//complete: undefined,
			//context: undefined,
			//data: "",
			//dataFilter: undefined,
			//error: undefined,
			//pageCache: false,
			//success: undefined,
			//timeout: 0,
			//traditional: false,
			url: location.href
		},

		// opera demands sniffing :/
		opera = win.opera,

		// IE < 10
		oldIE = !!$( "<div>" ).html( "<!--[if IE]><i><![endif]-->" ).find("i").length;

	// ###################### MAIN FUNCTION ##
	function jsonp( xOptions ) {

		// Build data with default
		xOptions = $.extend( {} , xOptionsDefaults , xOptions );

		// References to xOptions members (for better minification)
		var successCallback = xOptions.success,
			errorCallback = xOptions.error,
			completeCallback = xOptions.complete,
			dataFilter = xOptions.dataFilter,
			callbackParameter = xOptions.callbackParameter,
			successCallbackName = xOptions.callback,
			cacheFlag = xOptions.cache,
			pageCacheFlag = xOptions.pageCache,
			charset = xOptions.charset,
			url = xOptions.url,
			data = xOptions.data,
			timeout = xOptions.timeout,
			pageCached,

			// Abort/done flag
			done = 0,

			// Life-cycle functions
			cleanUp = noop,

			// Support vars
			supportOnload,
			supportOnreadystatechange,

			// Request execution vars
			firstChild,
			script,
			scriptAfter,
			timeoutTimer;

		// If we have Deferreds:
		// - substitute callbacks
		// - promote xOptions to a promise
		Deferred && Deferred(function( defer ) {
			defer.done( successCallback ).fail( errorCallback );
			successCallback = defer.resolve;
			errorCallback = defer.reject;
		}).promise( xOptions );

		// Create the abort method
		xOptions.abort = function() {
			!( done++ ) && cleanUp();
		};

		// Call beforeSend if provided (early abort if false returned)
		if ( callIfDefined( xOptions.beforeSend , xOptions , [ xOptions ] ) === !1 || done ) {
			return xOptions;
		}

		// Control entries
		url = url || STR_EMPTY;
		data = data ? ( (typeof data) == "string" ? data : $.param( data , xOptions.traditional ) ) : STR_EMPTY;

		// Build final url
		url += data ? ( qMarkOrAmp( url ) + data ) : STR_EMPTY;

		// Add callback parameter if provided as option
		callbackParameter && ( url += qMarkOrAmp( url ) + encodeURIComponent( callbackParameter ) + "=?" );

		// Add anticache parameter if needed
		!cacheFlag && !pageCacheFlag && ( url += qMarkOrAmp( url ) + "_" + ( new Date() ).getTime() + "=" );

		// Replace last ? by callback parameter
		url = url.replace( /=\?(&|$)/ , "=" + successCallbackName + "$1" );

		// Success notifier
		function notifySuccess( json ) {

			if ( !( done++ ) ) {

				cleanUp();
				// Pagecache if needed
				pageCacheFlag && ( pageCache [ url ] = { s: [ json ] } );
				// Apply the data filter if provided
				dataFilter && ( json = dataFilter.apply( xOptions , [ json ] ) );
				// Call success then complete
				callIfDefined( successCallback , xOptions , [ json , STR_SUCCESS, xOptions ] );
				callIfDefined( completeCallback , xOptions , [ xOptions , STR_SUCCESS ] );

			}
		}

		// Error notifier
		function notifyError( type ) {

			if ( !( done++ ) ) {

				// Clean up
				cleanUp();
				// If pure error (not timeout), cache if needed
				pageCacheFlag && type != STR_TIMEOUT && ( pageCache[ url ] = type );
				// Call error then complete
				callIfDefined( errorCallback , xOptions , [ xOptions , type ] );
				callIfDefined( completeCallback , xOptions , [ xOptions , type ] );

			}
		}

		// Check page cache
		if ( pageCacheFlag && ( pageCached = pageCache[ url ] ) ) {

			pageCached.s ? notifySuccess( pageCached.s[ 0 ] ) : notifyError( pageCached );

		} else {

			// Install the generic callback
			// (BEWARE: global namespace pollution ahoy)
			win[ successCallbackName ] = genericCallback;

			// Create the script tag
			script = $( STR_SCRIPT_TAG )[ 0 ];
			script.id = STR_JQUERY_JSONP + count++;

			// Set charset if provided
			if ( charset ) {
				script[ STR_CHARSET ] = charset;
			}

			opera && opera.version() < 11.60 ?
				// onerror is not supported: do not set as async and assume in-order execution.
				// Add a trailing script to emulate the event
				( ( scriptAfter = $( STR_SCRIPT_TAG )[ 0 ] ).text = "document.getElementById('" + script.id + "')." + STR_ON_ERROR + "()" )
			:
				// onerror is supported: set the script as async to avoid requests blocking each others
				( script[ STR_ASYNC ] = STR_ASYNC )

			;

			// Internet Explorer: event/htmlFor trick
			if ( oldIE ) {
				script.htmlFor = script.id;
				script.event = STR_ON_CLICK;
			}

			// Attached event handlers
			script[ STR_ON_LOAD ] = script[ STR_ON_ERROR ] = script[ STR_ON_READY_STATE_CHANGE ] = function ( result ) {

				// Test readyState if it exists
				if ( !script[ STR_READY_STATE ] || !/i/.test( script[ STR_READY_STATE ] ) ) {

					try {

						script[ STR_ON_CLICK ] && script[ STR_ON_CLICK ]();

					} catch( _ ) {}

					result = lastValue;
					lastValue = 0;
					result ? notifySuccess( result[ 0 ] ) : notifyError( STR_ERROR );

				}
			};

			// Set source
			script.src = url;

			// Re-declare cleanUp function
			cleanUp = function( i ) {
				timeoutTimer && clearTimeout( timeoutTimer );
				script[ STR_ON_READY_STATE_CHANGE ] = script[ STR_ON_LOAD ] = script[ STR_ON_ERROR ] = null;
				head[ STR_REMOVE_CHILD ]( script );
				scriptAfter && head[ STR_REMOVE_CHILD ]( scriptAfter );
			};

			// Append main script
			head[ STR_INSERT_BEFORE ]( script , ( firstChild = head.firstChild ) );

			// Append trailing script if needed
			scriptAfter && head[ STR_INSERT_BEFORE ]( scriptAfter , firstChild );

			// If a timeout is needed, install it
			timeoutTimer = timeout > 0 && setTimeout( function() {
				notifyError( STR_TIMEOUT );
			} , timeout );

		}

		return xOptions;
	}

	// ###################### SETUP FUNCTION ##
	jsonp.setup = function( xOptions ) {
		$.extend( xOptionsDefaults , xOptions );
	};

	// ###################### INSTALL in jQuery ##
	$.jsonp = jsonp;
        return jsonp;

}));

(function() {

  define('lib/remote/services/angellist',['jquery-jsonp'], function(jsonp) {
    return {
      initialize: function(app) {
        return app.core.routeHandlers.angellist = function(req, callback, errback) {
          var path, req_data, request, _ref;
          path = req.path;
          if (path[0] === "/") {
            path = path.substring(1);
          }
          req_data = req.params;
          if (req.method.toLowerCase() !== 'get') {
            return failure('Can only handle GET requests');
          }
          req_data.access_token = (_ref = app.core.settings().auth.angellist) != null ? _ref.token : void 0;
          request = jsonp({
            url: "https://api.angel.co/1/" + path,
            data: req_data,
            callbackParameter: 'callback'
          });
          request.then(function(response) {
            return callback({
              response: response,
              provider: 'angellist'
            });
          }, function(err) {
            return errback(er.url);
          });
        };
      }
    };
  });

}).call(this);

// vim:ts=4:sts=4:sw=4:
/*!
 *
 * Copyright 2009-2012 Kris Kowal under the terms of the MIT
 * license found at http://github.com/kriskowal/q/raw/master/LICENSE
 *
 * With parts by Tyler Close
 * Copyright 2007-2009 Tyler Close under the terms of the MIT X license found
 * at http://www.opensource.org/licenses/mit-license.html
 * Forked at ref_send.js version: 2009-05-11
 *
 * With parts by Mark Miller
 * Copyright (C) 2011 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

(function (definition) {
    // Turn off strict mode for this function so we can assign to global.Q
    /* jshint strict: false */

    // This file will function properly as a <script> tag, or a module
    // using CommonJS and NodeJS or RequireJS module formats.  In
    // Common/Node/RequireJS, the module exports the Q API and when
    // executed as a simple <script>, it creates a Q global instead.

    // Montage Require
    if (typeof bootstrap === "function") {
        bootstrap("promise", definition);

    // CommonJS
    } else if (typeof exports === "object") {
        module.exports = definition();

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
        define('promises',definition);

    // SES (Secure EcmaScript)
    } else if (typeof ses !== "undefined") {
        if (!ses.ok()) {
            return;
        } else {
            ses.makeQ = definition;
        }

    // <script>
    } else {
        Q = definition();
    }

})(function () {


var hasStacks = false;
try {
    throw new Error();
} catch (e) {
    hasStacks = !!e.stack;
}

// All code after this point will be filtered from stack traces reported
// by Q.
var qStartingLine = captureLine();
var qFileName;

// shims

// used for fallback in "allResolved"
var noop = function () {};

// Use the fastest possible means to execute a task in a future turn
// of the event loop.
var nextTick =(function () {
    // linked list of tasks (single, with head node)
    var head = {task: void 0, next: null};
    var tail = head;
    var flushing = false;
    var requestTick = void 0;
    var isNodeJS = false;

    function flush() {
        /* jshint loopfunc: true */

        while (head.next) {
            head = head.next;
            var task = head.task;
            head.task = void 0;
            var domain = head.domain;

            if (domain) {
                head.domain = void 0;
                domain.enter();
            }

            try {
                task();

            } catch (e) {
                if (isNodeJS) {
                    // In node, uncaught exceptions are considered fatal errors.
                    // Re-throw them synchronously to interrupt flushing!

                    // Ensure continuation if the uncaught exception is suppressed
                    // listening "uncaughtException" events (as domains does).
                    // Continue in next event to avoid tick recursion.
                    if (domain) {
                        domain.exit();
                    }
                    setTimeout(flush, 0);
                    if (domain) {
                        domain.enter();
                    }

                    throw e;

                } else {
                    // In browsers, uncaught exceptions are not fatal.
                    // Re-throw them asynchronously to avoid slow-downs.
                    setTimeout(function() {
                       throw e;
                    }, 0);
                }
            }

            if (domain) {
                domain.exit();
            }
        }

        flushing = false;
    }

    nextTick = function (task) {
        tail = tail.next = {
            task: task,
            domain: isNodeJS && process.domain,
            next: null
        };

        if (!flushing) {
            flushing = true;
            requestTick();
        }
    };

    if (typeof process !== "undefined" && process.nextTick) {
        // Node.js before 0.9. Note that some fake-Node environments, like the
        // Mocha test runner, introduce a `process` global without a `nextTick`.
        isNodeJS = true;

        requestTick = function () {
            process.nextTick(flush);
        };

    } else if (typeof setImmediate === "function") {
        // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
        if (typeof window !== "undefined") {
            requestTick = setImmediate.bind(window, flush);
        } else {
            requestTick = function () {
                setImmediate(flush);
            };
        }

    } else if (typeof MessageChannel !== "undefined") {
        // modern browsers
        // http://www.nonblocking.io/2011/06/windownexttick.html
        var channel = new MessageChannel();
        // At least Safari Version 6.0.5 (8536.30.1) intermittently cannot create
        // working message ports the first time a page loads.
        channel.port1.onmessage = function () {
            requestTick = requestPortTick;
            channel.port1.onmessage = flush;
            flush();
        };
        var requestPortTick = function () {
            // Opera requires us to provide a message payload, regardless of
            // whether we use it.
            channel.port2.postMessage(0);
        };
        requestTick = function () {
            setTimeout(flush, 0);
            requestPortTick();
        };

    } else {
        // old browsers
        requestTick = function () {
            setTimeout(flush, 0);
        };
    }

    return nextTick;
})();

// Attempt to make generics safe in the face of downstream
// modifications.
// There is no situation where this is necessary.
// If you need a security guarantee, these primordials need to be
// deeply frozen anyway, and if you don’t need a security guarantee,
// this is just plain paranoid.
// However, this does have the nice side-effect of reducing the size
// of the code by reducing x.call() to merely x(), eliminating many
// hard-to-minify characters.
// See Mark Miller’s explanation of what this does.
// http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
var call = Function.call;
function uncurryThis(f) {
    return function () {
        return call.apply(f, arguments);
    };
}
// This is equivalent, but slower:
// uncurryThis = Function_bind.bind(Function_bind.call);
// http://jsperf.com/uncurrythis

var array_slice = uncurryThis(Array.prototype.slice);

var array_reduce = uncurryThis(
    Array.prototype.reduce || function (callback, basis) {
        var index = 0,
            length = this.length;
        // concerning the initial value, if one is not provided
        if (arguments.length === 1) {
            // seek to the first value in the array, accounting
            // for the possibility that is is a sparse array
            do {
                if (index in this) {
                    basis = this[index++];
                    break;
                }
                if (++index >= length) {
                    throw new TypeError();
                }
            } while (1);
        }
        // reduce
        for (; index < length; index++) {
            // account for the possibility that the array is sparse
            if (index in this) {
                basis = callback(basis, this[index], index);
            }
        }
        return basis;
    }
);

var array_indexOf = uncurryThis(
    Array.prototype.indexOf || function (value) {
        // not a very good shim, but good enough for our one use of it
        for (var i = 0; i < this.length; i++) {
            if (this[i] === value) {
                return i;
            }
        }
        return -1;
    }
);

var array_map = uncurryThis(
    Array.prototype.map || function (callback, thisp) {
        var self = this;
        var collect = [];
        array_reduce(self, function (undefined, value, index) {
            collect.push(callback.call(thisp, value, index, self));
        }, void 0);
        return collect;
    }
);

var object_create = Object.create || function (prototype) {
    function Type() { }
    Type.prototype = prototype;
    return new Type();
};

var object_hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);

var object_keys = Object.keys || function (object) {
    var keys = [];
    for (var key in object) {
        if (object_hasOwnProperty(object, key)) {
            keys.push(key);
        }
    }
    return keys;
};

var object_toString = uncurryThis(Object.prototype.toString);

function isObject(value) {
    return value === Object(value);
}

// generator related shims

// FIXME: Remove this function once ES6 generators are in SpiderMonkey.
function isStopIteration(exception) {
    return (
        object_toString(exception) === "[object StopIteration]" ||
        exception instanceof QReturnValue
    );
}

// FIXME: Remove this helper and Q.return once ES6 generators are in
// SpiderMonkey.
var QReturnValue;
if (typeof ReturnValue !== "undefined") {
    QReturnValue = ReturnValue;
} else {
    QReturnValue = function (value) {
        this.value = value;
    };
}

// Until V8 3.19 / Chromium 29 is released, SpiderMonkey is the only
// engine that has a deployed base of browsers that support generators.
// However, SM's generators use the Python-inspired semantics of
// outdated ES6 drafts.  We would like to support ES6, but we'd also
// like to make it possible to use generators in deployed browsers, so
// we also support Python-style generators.  At some point we can remove
// this block.
var hasES6Generators;
try {
    /* jshint evil: true, nonew: false */
    new Function("(function* (){ yield 1; })");
    hasES6Generators = true;
} catch (e) {
    hasES6Generators = false;
}

// long stack traces

var STACK_JUMP_SEPARATOR = "From previous event:";

function makeStackTraceLong(error, promise) {
    // If possible, transform the error stack trace by removing Node and Q
    // cruft, then concatenating with the stack trace of `promise`. See #57.
    if (hasStacks &&
        promise.stack &&
        typeof error === "object" &&
        error !== null &&
        error.stack &&
        error.stack.indexOf(STACK_JUMP_SEPARATOR) === -1
    ) {
        var stacks = [];
        for (var p = promise; !!p; p = p.source) {
            if (p.stack) {
                stacks.unshift(p.stack);
            }
        }
        stacks.unshift(error.stack);

        var concatedStacks = stacks.join("\n" + STACK_JUMP_SEPARATOR + "\n");
        error.stack = filterStackString(concatedStacks);
    }
}

function filterStackString(stackString) {
    var lines = stackString.split("\n");
    var desiredLines = [];
    for (var i = 0; i < lines.length; ++i) {
        var line = lines[i];

        if (!isInternalFrame(line) && !isNodeFrame(line) && line) {
            desiredLines.push(line);
        }
    }
    return desiredLines.join("\n");
}

function isNodeFrame(stackLine) {
    return stackLine.indexOf("(module.js:") !== -1 ||
           stackLine.indexOf("(node.js:") !== -1;
}

function getFileNameAndLineNumber(stackLine) {
    // Named functions: "at functionName (filename:lineNumber:columnNumber)"
    // In IE10 function name can have spaces ("Anonymous function") O_o
    var attempt1 = /at .+ \((.+):(\d+):(?:\d+)\)$/.exec(stackLine);
    if (attempt1) {
        return [attempt1[1], Number(attempt1[2])];
    }

    // Anonymous functions: "at filename:lineNumber:columnNumber"
    var attempt2 = /at ([^ ]+):(\d+):(?:\d+)$/.exec(stackLine);
    if (attempt2) {
        return [attempt2[1], Number(attempt2[2])];
    }

    // Firefox style: "function@filename:lineNumber or @filename:lineNumber"
    var attempt3 = /.*@(.+):(\d+)$/.exec(stackLine);
    if (attempt3) {
        return [attempt3[1], Number(attempt3[2])];
    }
}

function isInternalFrame(stackLine) {
    var fileNameAndLineNumber = getFileNameAndLineNumber(stackLine);

    if (!fileNameAndLineNumber) {
        return false;
    }

    var fileName = fileNameAndLineNumber[0];
    var lineNumber = fileNameAndLineNumber[1];

    return fileName === qFileName &&
        lineNumber >= qStartingLine &&
        lineNumber <= qEndingLine;
}

// discover own file name and line number range for filtering stack
// traces
function captureLine() {
    if (!hasStacks) {
        return;
    }

    try {
        throw new Error();
    } catch (e) {
        var lines = e.stack.split("\n");
        var firstLine = lines[0].indexOf("@") > 0 ? lines[1] : lines[2];
        var fileNameAndLineNumber = getFileNameAndLineNumber(firstLine);
        if (!fileNameAndLineNumber) {
            return;
        }

        qFileName = fileNameAndLineNumber[0];
        return fileNameAndLineNumber[1];
    }
}

function deprecate(callback, name, alternative) {
    return function () {
        if (typeof console !== "undefined" &&
            typeof console.warn === "function") {
            console.warn(name + " is deprecated, use " + alternative +
                         " instead.", new Error("").stack);
        }
        return callback.apply(callback, arguments);
    };
}

// end of shims
// beginning of real work

/**
 * Constructs a promise for an immediate reference, passes promises through, or
 * coerces promises from different systems.
 * @param value immediate reference or promise
 */
function Q(value) {
    // If the object is already a Promise, return it directly.  This enables
    // the resolve function to both be used to created references from objects,
    // but to tolerably coerce non-promises to promises.
    if (isPromise(value)) {
        return value;
    }

    // assimilate thenables
    if (isPromiseAlike(value)) {
        return coerce(value);
    } else {
        return fulfill(value);
    }
}
Q.resolve = Q;

/**
 * Performs a task in a future turn of the event loop.
 * @param {Function} task
 */
Q.nextTick = nextTick;

/**
 * Controls whether or not long stack traces will be on
 */
Q.longStackSupport = false;

/**
 * Constructs a {promise, resolve, reject} object.
 *
 * `resolve` is a callback to invoke with a more resolved value for the
 * promise. To fulfill the promise, invoke `resolve` with any value that is
 * not a thenable. To reject the promise, invoke `resolve` with a rejected
 * thenable, or invoke `reject` with the reason directly. To resolve the
 * promise to another thenable, thus putting it in the same state, invoke
 * `resolve` with that other thenable.
 */
Q.defer = defer;
function defer() {
    // if "messages" is an "Array", that indicates that the promise has not yet
    // been resolved.  If it is "undefined", it has been resolved.  Each
    // element of the messages array is itself an array of complete arguments to
    // forward to the resolved promise.  We coerce the resolution value to a
    // promise using the `resolve` function because it handles both fully
    // non-thenable values and other thenables gracefully.
    var messages = [], progressListeners = [], resolvedPromise;

    var deferred = object_create(defer.prototype);
    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, operands) {
        var args = array_slice(arguments);
        if (messages) {
            messages.push(args);
            if (op === "when" && operands[1]) { // progress operand
                progressListeners.push(operands[1]);
            }
        } else {
            nextTick(function () {
                resolvedPromise.promiseDispatch.apply(resolvedPromise, args);
            });
        }
    };

    // XXX deprecated
    promise.valueOf = deprecate(function () {
        if (messages) {
            return promise;
        }
        var nearerValue = nearer(resolvedPromise);
        if (isPromise(nearerValue)) {
            resolvedPromise = nearerValue; // shorten chain
        }
        return nearerValue;
    }, "valueOf", "inspect");

    promise.inspect = function () {
        if (!resolvedPromise) {
            return { state: "pending" };
        }
        return resolvedPromise.inspect();
    };

    if (Q.longStackSupport && hasStacks) {
        try {
            throw new Error();
        } catch (e) {
            // NOTE: don't try to use `Error.captureStackTrace` or transfer the
            // accessor around; that causes memory leaks as per GH-111. Just
            // reify the stack trace as a string ASAP.
            //
            // At the same time, cut off the first line; it's always just
            // "[object Promise]\n", as per the `toString`.
            promise.stack = e.stack.substring(e.stack.indexOf("\n") + 1);
        }
    }

    // NOTE: we do the checks for `resolvedPromise` in each method, instead of
    // consolidating them into `become`, since otherwise we'd create new
    // promises with the lines `become(whatever(value))`. See e.g. GH-252.

    function become(newPromise) {
        resolvedPromise = newPromise;
        promise.source = newPromise;

        array_reduce(messages, function (undefined, message) {
            nextTick(function () {
                newPromise.promiseDispatch.apply(newPromise, message);
            });
        }, void 0);

        messages = void 0;
        progressListeners = void 0;
    }

    deferred.promise = promise;
    deferred.resolve = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(Q(value));
    };

    deferred.fulfill = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(fulfill(value));
    };
    deferred.reject = function (reason) {
        if (resolvedPromise) {
            return;
        }

        become(reject(reason));
    };
    deferred.notify = function (progress) {
        if (resolvedPromise) {
            return;
        }

        array_reduce(progressListeners, function (undefined, progressListener) {
            nextTick(function () {
                progressListener(progress);
            });
        }, void 0);
    };

    return deferred;
}

/**
 * Creates a Node-style callback that will resolve or reject the deferred
 * promise.
 * @returns a nodeback
 */
defer.prototype.makeNodeResolver = function () {
    var self = this;
    return function (error, value) {
        if (error) {
            self.reject(error);
        } else if (arguments.length > 2) {
            self.resolve(array_slice(arguments, 1));
        } else {
            self.resolve(value);
        }
    };
};

/**
 * @param resolver {Function} a function that returns nothing and accepts
 * the resolve, reject, and notify functions for a deferred.
 * @returns a promise that may be resolved with the given resolve and reject
 * functions, or rejected by a thrown exception in resolver
 */
Q.promise = promise;
function promise(resolver) {
    if (typeof resolver !== "function") {
        throw new TypeError("resolver must be a function.");
    }
    var deferred = defer();
    try {
        resolver(deferred.resolve, deferred.reject, deferred.notify);
    } catch (reason) {
        deferred.reject(reason);
    }
    return deferred.promise;
}

// XXX experimental.  This method is a way to denote that a local value is
// serializable and should be immediately dispatched to a remote upon request,
// instead of passing a reference.
Q.passByCopy = function (object) {
    //freeze(object);
    //passByCopies.set(object, true);
    return object;
};

Promise.prototype.passByCopy = function () {
    //freeze(object);
    //passByCopies.set(object, true);
    return this;
};

/**
 * If two promises eventually fulfill to the same value, promises that value,
 * but otherwise rejects.
 * @param x {Any*}
 * @param y {Any*}
 * @returns {Any*} a promise for x and y if they are the same, but a rejection
 * otherwise.
 *
 */
Q.join = function (x, y) {
    return Q(x).join(y);
};

Promise.prototype.join = function (that) {
    return Q([this, that]).spread(function (x, y) {
        if (x === y) {
            // TODO: "===" should be Object.is or equiv
            return x;
        } else {
            throw new Error("Can't join: not the same: " + x + " " + y);
        }
    });
};

/**
 * Returns a promise for the first of an array of promises to become fulfilled.
 * @param answers {Array[Any*]} promises to race
 * @returns {Any*} the first promise to be fulfilled
 */
Q.race = race;
function race(answerPs) {
    return promise(function(resolve, reject) {
        // Switch to this once we can assume at least ES5
        // answerPs.forEach(function(answerP) {
        //     Q(answerP).then(resolve, reject);
        // });
        // Use this in the meantime
        for (var i = 0, len = answerPs.length; i < len; i++) {
            Q(answerPs[i]).then(resolve, reject);
        }
    });
}

Promise.prototype.race = function () {
    return this.then(Q.race);
};

/**
 * Constructs a Promise with a promise descriptor object and optional fallback
 * function.  The descriptor contains methods like when(rejected), get(name),
 * set(name, value), post(name, args), and delete(name), which all
 * return either a value, a promise for a value, or a rejection.  The fallback
 * accepts the operation name, a resolver, and any further arguments that would
 * have been forwarded to the appropriate method above had a method been
 * provided with the proper name.  The API makes no guarantees about the nature
 * of the returned object, apart from that it is usable whereever promises are
 * bought and sold.
 */
Q.makePromise = Promise;
function Promise(descriptor, fallback, inspect) {
    if (fallback === void 0) {
        fallback = function (op) {
            return reject(new Error(
                "Promise does not support operation: " + op
            ));
        };
    }
    if (inspect === void 0) {
        inspect = function () {
            return {state: "unknown"};
        };
    }

    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, args) {
        var result;
        try {
            if (descriptor[op]) {
                result = descriptor[op].apply(promise, args);
            } else {
                result = fallback.call(promise, op, args);
            }
        } catch (exception) {
            result = reject(exception);
        }
        if (resolve) {
            resolve(result);
        }
    };

    promise.inspect = inspect;

    // XXX deprecated `valueOf` and `exception` support
    if (inspect) {
        var inspected = inspect();
        if (inspected.state === "rejected") {
            promise.exception = inspected.reason;
        }

        promise.valueOf = deprecate(function () {
            var inspected = inspect();
            if (inspected.state === "pending" ||
                inspected.state === "rejected") {
                return promise;
            }
            return inspected.value;
        });
    }

    return promise;
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.then = function (fulfilled, rejected, progressed) {
    var self = this;
    var deferred = defer();
    var done = false;   // ensure the untrusted promise makes at most a
                        // single call to one of the callbacks

    function _fulfilled(value) {
        try {
            return typeof fulfilled === "function" ? fulfilled(value) : value;
        } catch (exception) {
            return reject(exception);
        }
    }

    function _rejected(exception) {
        if (typeof rejected === "function") {
            makeStackTraceLong(exception, self);
            try {
                return rejected(exception);
            } catch (newException) {
                return reject(newException);
            }
        }
        return reject(exception);
    }

    function _progressed(value) {
        return typeof progressed === "function" ? progressed(value) : value;
    }

    nextTick(function () {
        self.promiseDispatch(function (value) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_fulfilled(value));
        }, "when", [function (exception) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_rejected(exception));
        }]);
    });

    // Progress propagator need to be attached in the current tick.
    self.promiseDispatch(void 0, "when", [void 0, function (value) {
        var newValue;
        var threw = false;
        try {
            newValue = _progressed(value);
        } catch (e) {
            threw = true;
            if (Q.onerror) {
                Q.onerror(e);
            } else {
                throw e;
            }
        }

        if (!threw) {
            deferred.notify(newValue);
        }
    }]);

    return deferred.promise;
};

/**
 * Registers an observer on a promise.
 *
 * Guarantees:
 *
 * 1. that fulfilled and rejected will be called only once.
 * 2. that either the fulfilled callback or the rejected callback will be
 *    called, but not both.
 * 3. that fulfilled and rejected will not be called in this turn.
 *
 * @param value      promise or immediate reference to observe
 * @param fulfilled  function to be called with the fulfilled value
 * @param rejected   function to be called with the rejection exception
 * @param progressed function to be called on any progress notifications
 * @return promise for the return value from the invoked callback
 */
Q.when = when;
function when(value, fulfilled, rejected, progressed) {
    return Q(value).then(fulfilled, rejected, progressed);
}

Promise.prototype.thenResolve = function (value) {
    return this.then(function () { return value; });
};

Q.thenResolve = function (promise, value) {
    return Q(promise).thenResolve(value);
};

Promise.prototype.thenReject = function (reason) {
    return this.then(function () { throw reason; });
};

Q.thenReject = function (promise, reason) {
    return Q(promise).thenReject(reason);
};

/**
 * If an object is not a promise, it is as "near" as possible.
 * If a promise is rejected, it is as "near" as possible too.
 * If it’s a fulfilled promise, the fulfillment value is nearer.
 * If it’s a deferred promise and the deferred has been resolved, the
 * resolution is "nearer".
 * @param object
 * @returns most resolved (nearest) form of the object
 */

// XXX should we re-do this?
Q.nearer = nearer;
function nearer(value) {
    if (isPromise(value)) {
        var inspected = value.inspect();
        if (inspected.state === "fulfilled") {
            return inspected.value;
        }
    }
    return value;
}

/**
 * @returns whether the given object is a promise.
 * Otherwise it is a fulfilled value.
 */
Q.isPromise = isPromise;
function isPromise(object) {
    return isObject(object) &&
        typeof object.promiseDispatch === "function" &&
        typeof object.inspect === "function";
}

Q.isPromiseAlike = isPromiseAlike;
function isPromiseAlike(object) {
    return isObject(object) && typeof object.then === "function";
}

/**
 * @returns whether the given object is a pending promise, meaning not
 * fulfilled or rejected.
 */
Q.isPending = isPending;
function isPending(object) {
    return isPromise(object) && object.inspect().state === "pending";
}

Promise.prototype.isPending = function () {
    return this.inspect().state === "pending";
};

/**
 * @returns whether the given object is a value or fulfilled
 * promise.
 */
Q.isFulfilled = isFulfilled;
function isFulfilled(object) {
    return !isPromise(object) || object.inspect().state === "fulfilled";
}

Promise.prototype.isFulfilled = function () {
    return this.inspect().state === "fulfilled";
};

/**
 * @returns whether the given object is a rejected promise.
 */
Q.isRejected = isRejected;
function isRejected(object) {
    return isPromise(object) && object.inspect().state === "rejected";
}

Promise.prototype.isRejected = function () {
    return this.inspect().state === "rejected";
};

//// BEGIN UNHANDLED REJECTION TRACKING

// This promise library consumes exceptions thrown in handlers so they can be
// handled by a subsequent promise.  The exceptions get added to this array when
// they are created, and removed when they are handled.  Note that in ES6 or
// shimmed environments, this would naturally be a `Set`.
var unhandledReasons = [];
var unhandledRejections = [];
var unhandledReasonsDisplayed = false;
var trackUnhandledRejections = true;
function displayUnhandledReasons() {
    if (
        !unhandledReasonsDisplayed &&
        typeof window !== "undefined" &&
        !window.Touch &&
        window.console
    ) {
        console.warn("[Q] Unhandled rejection reasons (should be empty):",
                     unhandledReasons);
    }

    unhandledReasonsDisplayed = true;
}

function logUnhandledReasons() {
    for (var i = 0; i < unhandledReasons.length; i++) {
        var reason = unhandledReasons[i];
        console.warn("Unhandled rejection reason:", reason);
    }
}

function resetUnhandledRejections() {
    unhandledReasons.length = 0;
    unhandledRejections.length = 0;
    unhandledReasonsDisplayed = false;

    if (!trackUnhandledRejections) {
        trackUnhandledRejections = true;

        // Show unhandled rejection reasons if Node exits without handling an
        // outstanding rejection.  (Note that Browserify presently produces a
        // `process` global without the `EventEmitter` `on` method.)
        if (typeof process !== "undefined" && process.on) {
            process.on("exit", logUnhandledReasons);
        }
    }
}

function trackRejection(promise, reason) {
    if (!trackUnhandledRejections) {
        return;
    }

    unhandledRejections.push(promise);
    if (reason && typeof reason.stack !== "undefined") {
        unhandledReasons.push(reason.stack);
    } else {
        unhandledReasons.push("(no stack) " + reason);
    }
    displayUnhandledReasons();
}

function untrackRejection(promise) {
    if (!trackUnhandledRejections) {
        return;
    }

    var at = array_indexOf(unhandledRejections, promise);
    if (at !== -1) {
        unhandledRejections.splice(at, 1);
        unhandledReasons.splice(at, 1);
    }
}

Q.resetUnhandledRejections = resetUnhandledRejections;

Q.getUnhandledReasons = function () {
    // Make a copy so that consumers can't interfere with our internal state.
    return unhandledReasons.slice();
};

Q.stopUnhandledRejectionTracking = function () {
    resetUnhandledRejections();
    if (typeof process !== "undefined" && process.on) {
        process.removeListener("exit", logUnhandledReasons);
    }
    trackUnhandledRejections = false;
};

resetUnhandledRejections();

//// END UNHANDLED REJECTION TRACKING

/**
 * Constructs a rejected promise.
 * @param reason value describing the failure
 */
Q.reject = reject;
function reject(reason) {
    var rejection = Promise({
        "when": function (rejected) {
            // note that the error has been handled
            if (rejected) {
                untrackRejection(this);
            }
            return rejected ? rejected(reason) : this;
        }
    }, function fallback() {
        return this;
    }, function inspect() {
        return { state: "rejected", reason: reason };
    });

    // Note that the reason has not been handled.
    trackRejection(rejection, reason);

    return rejection;
}

/**
 * Constructs a fulfilled promise for an immediate reference.
 * @param value immediate reference
 */
Q.fulfill = fulfill;
function fulfill(value) {
    return Promise({
        "when": function () {
            return value;
        },
        "get": function (name) {
            return value[name];
        },
        "set": function (name, rhs) {
            value[name] = rhs;
        },
        "delete": function (name) {
            delete value[name];
        },
        "post": function (name, args) {
            // Mark Miller proposes that post with no name should apply a
            // promised function.
            if (name === null || name === void 0) {
                return value.apply(void 0, args);
            } else {
                return value[name].apply(value, args);
            }
        },
        "apply": function (thisp, args) {
            return value.apply(thisp, args);
        },
        "keys": function () {
            return object_keys(value);
        }
    }, void 0, function inspect() {
        return { state: "fulfilled", value: value };
    });
}

/**
 * Converts thenables to Q promises.
 * @param promise thenable promise
 * @returns a Q promise
 */
function coerce(promise) {
    var deferred = defer();
    nextTick(function () {
        try {
            promise.then(deferred.resolve, deferred.reject, deferred.notify);
        } catch (exception) {
            deferred.reject(exception);
        }
    });
    return deferred.promise;
}

/**
 * Annotates an object such that it will never be
 * transferred away from this process over any promise
 * communication channel.
 * @param object
 * @returns promise a wrapping of that object that
 * additionally responds to the "isDef" message
 * without a rejection.
 */
Q.master = master;
function master(object) {
    return Promise({
        "isDef": function () {}
    }, function fallback(op, args) {
        return dispatch(object, op, args);
    }, function () {
        return Q(object).inspect();
    });
}

/**
 * Spreads the values of a promised array of arguments into the
 * fulfillment callback.
 * @param fulfilled callback that receives variadic arguments from the
 * promised array
 * @param rejected callback that receives the exception if the promise
 * is rejected.
 * @returns a promise for the return value or thrown exception of
 * either callback.
 */
Q.spread = spread;
function spread(value, fulfilled, rejected) {
    return Q(value).spread(fulfilled, rejected);
}

Promise.prototype.spread = function (fulfilled, rejected) {
    return this.all().then(function (array) {
        return fulfilled.apply(void 0, array);
    }, rejected);
};

/**
 * The async function is a decorator for generator functions, turning
 * them into asynchronous generators.  Although generators are only part
 * of the newest ECMAScript 6 drafts, this code does not cause syntax
 * errors in older engines.  This code should continue to work and will
 * in fact improve over time as the language improves.
 *
 * ES6 generators are currently part of V8 version 3.19 with the
 * --harmony-generators runtime flag enabled.  SpiderMonkey has had them
 * for longer, but under an older Python-inspired form.  This function
 * works on both kinds of generators.
 *
 * Decorates a generator function such that:
 *  - it may yield promises
 *  - execution will continue when that promise is fulfilled
 *  - the value of the yield expression will be the fulfilled value
 *  - it returns a promise for the return value (when the generator
 *    stops iterating)
 *  - the decorated function returns a promise for the return value
 *    of the generator or the first rejected promise among those
 *    yielded.
 *  - if an error is thrown in the generator, it propagates through
 *    every following yield until it is caught, or until it escapes
 *    the generator function altogether, and is translated into a
 *    rejection for the promise returned by the decorated generator.
 */
Q.async = async;
function async(makeGenerator) {
    return function () {
        // when verb is "send", arg is a value
        // when verb is "throw", arg is an exception
        function continuer(verb, arg) {
            var result;
            if (hasES6Generators) {
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    return reject(exception);
                }
                if (result.done) {
                    return result.value;
                } else {
                    return when(result.value, callback, errback);
                }
            } else {
                // FIXME: Remove this case when SM does ES6 generators.
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    if (isStopIteration(exception)) {
                        return exception.value;
                    } else {
                        return reject(exception);
                    }
                }
                return when(result, callback, errback);
            }
        }
        var generator = makeGenerator.apply(this, arguments);
        var callback = continuer.bind(continuer, "next");
        var errback = continuer.bind(continuer, "throw");
        return callback();
    };
}

/**
 * The spawn function is a small wrapper around async that immediately
 * calls the generator and also ends the promise chain, so that any
 * unhandled errors are thrown instead of forwarded to the error
 * handler. This is useful because it's extremely common to run
 * generators at the top-level to work with libraries.
 */
Q.spawn = spawn;
function spawn(makeGenerator) {
    Q.done(Q.async(makeGenerator)());
}

// FIXME: Remove this interface once ES6 generators are in SpiderMonkey.
/**
 * Throws a ReturnValue exception to stop an asynchronous generator.
 *
 * This interface is a stop-gap measure to support generator return
 * values in older Firefox/SpiderMonkey.  In browsers that support ES6
 * generators like Chromium 29, just use "return" in your generator
 * functions.
 *
 * @param value the return value for the surrounding generator
 * @throws ReturnValue exception with the value.
 * @example
 * // ES6 style
 * Q.async(function* () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      return foo + bar;
 * })
 * // Older SpiderMonkey style
 * Q.async(function () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      Q.return(foo + bar);
 * })
 */
Q["return"] = _return;
function _return(value) {
    throw new QReturnValue(value);
}

/**
 * The promised function decorator ensures that any promise arguments
 * are settled and passed as values (`this` is also settled and passed
 * as a value).  It will also ensure that the result of a function is
 * always a promise.
 *
 * @example
 * var add = Q.promised(function (a, b) {
 *     return a + b;
 * });
 * add(Q(a), Q(B));
 *
 * @param {function} callback The function to decorate
 * @returns {function} a function that has been decorated.
 */
Q.promised = promised;
function promised(callback) {
    return function () {
        return spread([this, all(arguments)], function (self, args) {
            return callback.apply(self, args);
        });
    };
}

/**
 * sends a message to a value in a future turn
 * @param object* the recipient
 * @param op the name of the message operation, e.g., "when",
 * @param args further arguments to be forwarded to the operation
 * @returns result {Promise} a promise for the result of the operation
 */
Q.dispatch = dispatch;
function dispatch(object, op, args) {
    return Q(object).dispatch(op, args);
}

Promise.prototype.dispatch = function (op, args) {
    var self = this;
    var deferred = defer();
    nextTick(function () {
        self.promiseDispatch(deferred.resolve, op, args);
    });
    return deferred.promise;
};

/**
 * Gets the value of a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to get
 * @return promise for the property value
 */
Q.get = function (object, key) {
    return Q(object).dispatch("get", [key]);
};

Promise.prototype.get = function (key) {
    return this.dispatch("get", [key]);
};

/**
 * Sets the value of a property in a future turn.
 * @param object    promise or immediate reference for object object
 * @param name      name of property to set
 * @param value     new value of property
 * @return promise for the return value
 */
Q.set = function (object, key, value) {
    return Q(object).dispatch("set", [key, value]);
};

Promise.prototype.set = function (key, value) {
    return this.dispatch("set", [key, value]);
};

/**
 * Deletes a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to delete
 * @return promise for the return value
 */
Q.del = // XXX legacy
Q["delete"] = function (object, key) {
    return Q(object).dispatch("delete", [key]);
};

Promise.prototype.del = // XXX legacy
Promise.prototype["delete"] = function (key) {
    return this.dispatch("delete", [key]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param value     a value to post, typically an array of
 *                  invocation arguments for promises that
 *                  are ultimately backed with `resolve` values,
 *                  as opposed to those backed with URLs
 *                  wherein the posted value can be any
 *                  JSON serializable object.
 * @return promise for the return value
 */
// bound locally because it is used by other methods
Q.mapply = // XXX As proposed by "Redsandro"
Q.post = function (object, name, args) {
    return Q(object).dispatch("post", [name, args]);
};

Promise.prototype.mapply = // XXX As proposed by "Redsandro"
Promise.prototype.post = function (name, args) {
    return this.dispatch("post", [name, args]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param ...args   array of invocation arguments
 * @return promise for the return value
 */
Q.send = // XXX Mark Miller's proposed parlance
Q.mcall = // XXX As proposed by "Redsandro"
Q.invoke = function (object, name /*...args*/) {
    return Q(object).dispatch("post", [name, array_slice(arguments, 2)]);
};

Promise.prototype.send = // XXX Mark Miller's proposed parlance
Promise.prototype.mcall = // XXX As proposed by "Redsandro"
Promise.prototype.invoke = function (name /*...args*/) {
    return this.dispatch("post", [name, array_slice(arguments, 1)]);
};

/**
 * Applies the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param args      array of application arguments
 */
Q.fapply = function (object, args) {
    return Q(object).dispatch("apply", [void 0, args]);
};

Promise.prototype.fapply = function (args) {
    return this.dispatch("apply", [void 0, args]);
};

/**
 * Calls the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q["try"] =
Q.fcall = function (object /* ...args*/) {
    return Q(object).dispatch("apply", [void 0, array_slice(arguments, 1)]);
};

Promise.prototype.fcall = function (/*...args*/) {
    return this.dispatch("apply", [void 0, array_slice(arguments)]);
};

/**
 * Binds the promised function, transforming return values into a fulfilled
 * promise and thrown errors into a rejected one.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q.fbind = function (object /*...args*/) {
    var promise = Q(object);
    var args = array_slice(arguments, 1);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};
Promise.prototype.fbind = function (/*...args*/) {
    var promise = this;
    var args = array_slice(arguments);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};

/**
 * Requests the names of the owned properties of a promised
 * object in a future turn.
 * @param object    promise or immediate reference for target object
 * @return promise for the keys of the eventually settled object
 */
Q.keys = function (object) {
    return Q(object).dispatch("keys", []);
};

Promise.prototype.keys = function () {
    return this.dispatch("keys", []);
};

/**
 * Turns an array of promises into a promise for an array.  If any of
 * the promises gets rejected, the whole array is rejected immediately.
 * @param {Array*} an array (or promise for an array) of values (or
 * promises for values)
 * @returns a promise for an array of the corresponding values
 */
// By Mark Miller
// http://wiki.ecmascript.org/doku.php?id=strawman:concurrency&rev=1308776521#allfulfilled
Q.all = all;
function all(promises) {
    return when(promises, function (promises) {
        var countDown = 0;
        var deferred = defer();
        array_reduce(promises, function (undefined, promise, index) {
            var snapshot;
            if (
                isPromise(promise) &&
                (snapshot = promise.inspect()).state === "fulfilled"
            ) {
                promises[index] = snapshot.value;
            } else {
                ++countDown;
                when(
                    promise,
                    function (value) {
                        promises[index] = value;
                        if (--countDown === 0) {
                            deferred.resolve(promises);
                        }
                    },
                    deferred.reject,
                    function (progress) {
                        deferred.notify({ index: index, value: progress });
                    }
                );
            }
        }, void 0);
        if (countDown === 0) {
            deferred.resolve(promises);
        }
        return deferred.promise;
    });
}

Promise.prototype.all = function () {
    return all(this);
};

/**
 * Waits for all promises to be settled, either fulfilled or
 * rejected.  This is distinct from `all` since that would stop
 * waiting at the first rejection.  The promise returned by
 * `allResolved` will never be rejected.
 * @param promises a promise for an array (or an array) of promises
 * (or values)
 * @return a promise for an array of promises
 */
Q.allResolved = deprecate(allResolved, "allResolved", "allSettled");
function allResolved(promises) {
    return when(promises, function (promises) {
        promises = array_map(promises, Q);
        return when(all(array_map(promises, function (promise) {
            return when(promise, noop, noop);
        })), function () {
            return promises;
        });
    });
}

Promise.prototype.allResolved = function () {
    return allResolved(this);
};

/**
 * @see Promise#allSettled
 */
Q.allSettled = allSettled;
function allSettled(promises) {
    return Q(promises).allSettled();
}

/**
 * Turns an array of promises into a promise for an array of their states (as
 * returned by `inspect`) when they have all settled.
 * @param {Array[Any*]} values an array (or promise for an array) of values (or
 * promises for values)
 * @returns {Array[State]} an array of states for the respective values.
 */
Promise.prototype.allSettled = function () {
    return this.then(function (promises) {
        return all(array_map(promises, function (promise) {
            promise = Q(promise);
            function regardless() {
                return promise.inspect();
            }
            return promise.then(regardless, regardless);
        }));
    });
};

/**
 * Captures the failure of a promise, giving an oportunity to recover
 * with a callback.  If the given promise is fulfilled, the returned
 * promise is fulfilled.
 * @param {Any*} promise for something
 * @param {Function} callback to fulfill the returned promise if the
 * given promise is rejected
 * @returns a promise for the return value of the callback
 */
Q.fail = // XXX legacy
Q["catch"] = function (object, rejected) {
    return Q(object).then(void 0, rejected);
};

Promise.prototype.fail = // XXX legacy
Promise.prototype["catch"] = function (rejected) {
    return this.then(void 0, rejected);
};

/**
 * Attaches a listener that can respond to progress notifications from a
 * promise's originating deferred. This listener receives the exact arguments
 * passed to ``deferred.notify``.
 * @param {Any*} promise for something
 * @param {Function} callback to receive any progress notifications
 * @returns the given promise, unchanged
 */
Q.progress = progress;
function progress(object, progressed) {
    return Q(object).then(void 0, void 0, progressed);
}

Promise.prototype.progress = function (progressed) {
    return this.then(void 0, void 0, progressed);
};

/**
 * Provides an opportunity to observe the settling of a promise,
 * regardless of whether the promise is fulfilled or rejected.  Forwards
 * the resolution to the returned promise when the callback is done.
 * The callback can return a promise to defer completion.
 * @param {Any*} promise
 * @param {Function} callback to observe the resolution of the given
 * promise, takes no arguments.
 * @returns a promise for the resolution of the given promise when
 * ``fin`` is done.
 */
Q.fin = // XXX legacy
Q["finally"] = function (object, callback) {
    return Q(object)["finally"](callback);
};

Promise.prototype.fin = // XXX legacy
Promise.prototype["finally"] = function (callback) {
    callback = Q(callback);
    return this.then(function (value) {
        return callback.fcall().then(function () {
            return value;
        });
    }, function (reason) {
        // TODO attempt to recycle the rejection with "this".
        return callback.fcall().then(function () {
            throw reason;
        });
    });
};

/**
 * Terminates a chain of promises, forcing rejections to be
 * thrown as exceptions.
 * @param {Any*} promise at the end of a chain of promises
 * @returns nothing
 */
Q.done = function (object, fulfilled, rejected, progress) {
    return Q(object).done(fulfilled, rejected, progress);
};

Promise.prototype.done = function (fulfilled, rejected, progress) {
    var onUnhandledError = function (error) {
        // forward to a future turn so that ``when``
        // does not catch it and turn it into a rejection.
        nextTick(function () {
            makeStackTraceLong(error, promise);
            if (Q.onerror) {
                Q.onerror(error);
            } else {
                throw error;
            }
        });
    };

    // Avoid unnecessary `nextTick`ing via an unnecessary `when`.
    var promise = fulfilled || rejected || progress ?
        this.then(fulfilled, rejected, progress) :
        this;

    if (typeof process === "object" && process && process.domain) {
        onUnhandledError = process.domain.bind(onUnhandledError);
    }

    promise.then(void 0, onUnhandledError);
};

/**
 * Causes a promise to be rejected if it does not get fulfilled before
 * some milliseconds time out.
 * @param {Any*} promise
 * @param {Number} milliseconds timeout
 * @param {String} custom error message (optional)
 * @returns a promise for the resolution of the given promise if it is
 * fulfilled before the timeout, otherwise rejected.
 */
Q.timeout = function (object, ms, message) {
    return Q(object).timeout(ms, message);
};

Promise.prototype.timeout = function (ms, message) {
    var deferred = defer();
    var timeoutId = setTimeout(function () {
        deferred.reject(new Error(message || "Timed out after " + ms + " ms"));
    }, ms);

    this.then(function (value) {
        clearTimeout(timeoutId);
        deferred.resolve(value);
    }, function (exception) {
        clearTimeout(timeoutId);
        deferred.reject(exception);
    }, deferred.notify);

    return deferred.promise;
};

/**
 * Returns a promise for the given value (or promised value), some
 * milliseconds after it resolved. Passes rejections immediately.
 * @param {Any*} promise
 * @param {Number} milliseconds
 * @returns a promise for the resolution of the given promise after milliseconds
 * time has elapsed since the resolution of the given promise.
 * If the given promise rejects, that is passed immediately.
 */
Q.delay = function (object, timeout) {
    if (timeout === void 0) {
        timeout = object;
        object = void 0;
    }
    return Q(object).delay(timeout);
};

Promise.prototype.delay = function (timeout) {
    return this.then(function (value) {
        var deferred = defer();
        setTimeout(function () {
            deferred.resolve(value);
        }, timeout);
        return deferred.promise;
    });
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided as an array, and returns a promise.
 *
 *      Q.nfapply(FS.readFile, [__filename])
 *      .then(function (content) {
 *      })
 *
 */
Q.nfapply = function (callback, args) {
    return Q(callback).nfapply(args);
};

Promise.prototype.nfapply = function (args) {
    var deferred = defer();
    var nodeArgs = array_slice(args);
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided individually, and returns a promise.
 * @example
 * Q.nfcall(FS.readFile, __filename)
 * .then(function (content) {
 * })
 *
 */
Q.nfcall = function (callback /*...args*/) {
    var args = array_slice(arguments, 1);
    return Q(callback).nfapply(args);
};

Promise.prototype.nfcall = function (/*...args*/) {
    var nodeArgs = array_slice(arguments);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Wraps a NodeJS continuation passing function and returns an equivalent
 * version that returns a promise.
 * @example
 * Q.nfbind(FS.readFile, __filename)("utf-8")
 * .then(console.log)
 * .done()
 */
Q.nfbind =
Q.denodeify = function (callback /*...args*/) {
    var baseArgs = array_slice(arguments, 1);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        Q(callback).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nfbind =
Promise.prototype.denodeify = function (/*...args*/) {
    var args = array_slice(arguments);
    args.unshift(this);
    return Q.denodeify.apply(void 0, args);
};

Q.nbind = function (callback, thisp /*...args*/) {
    var baseArgs = array_slice(arguments, 2);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        function bound() {
            return callback.apply(thisp, arguments);
        }
        Q(bound).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nbind = function (/*thisp, ...args*/) {
    var args = array_slice(arguments, 0);
    args.unshift(this);
    return Q.nbind.apply(void 0, args);
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback with a given array of arguments, plus a provided callback.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param {Array} args arguments to pass to the method; the callback
 * will be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nmapply = // XXX As proposed by "Redsandro"
Q.npost = function (object, name, args) {
    return Q(object).npost(name, args);
};

Promise.prototype.nmapply = // XXX As proposed by "Redsandro"
Promise.prototype.npost = function (name, args) {
    var nodeArgs = array_slice(args || []);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback, forwarding the given variadic arguments, plus a provided
 * callback argument.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param ...args arguments to pass to the method; the callback will
 * be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nsend = // XXX Based on Mark Miller's proposed "send"
Q.nmcall = // XXX Based on "Redsandro's" proposal
Q.ninvoke = function (object, name /*...args*/) {
    var nodeArgs = array_slice(arguments, 2);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    Q(object).dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

Promise.prototype.nsend = // XXX Based on Mark Miller's proposed "send"
Promise.prototype.nmcall = // XXX Based on "Redsandro's" proposal
Promise.prototype.ninvoke = function (name /*...args*/) {
    var nodeArgs = array_slice(arguments, 1);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * If a function would like to support both Node continuation-passing-style and
 * promise-returning-style, it can end its internal promise chain with
 * `nodeify(nodeback)`, forwarding the optional nodeback argument.  If the user
 * elects to use a nodeback, the result will be sent there.  If they do not
 * pass a nodeback, they will receive the result promise.
 * @param object a result (or a promise for a result)
 * @param {Function} nodeback a Node.js-style callback
 * @returns either the promise or nothing
 */
Q.nodeify = nodeify;
function nodeify(object, nodeback) {
    return Q(object).nodeify(nodeback);
}

Promise.prototype.nodeify = function (nodeback) {
    if (nodeback) {
        this.then(function (value) {
            nextTick(function () {
                nodeback(null, value);
            });
        }, function (error) {
            nextTick(function () {
                nodeback(error);
            });
        });
    } else {
        return this;
    }
};

// All code before this point will be filtered from stack traces.
var qEndingLine = captureLine();

return Q;

});

(function() {

  define('lib/utils/promises',['promises'], function(promises) {
    return {
      deferred: promises.defer,
      when: promises.when,
      all: promises.all
    };
  });

}).call(this);

(function() {

  define('lib/remote/services/facebook',['lib/utils/promises', 'underscore'], function(promises, _) {
    var api, ensureLoggedIn, hideIframe, resp, showIframe, slice, trackHandler, uiHandlers, utils;
    slice = Array.prototype.slice;
    showIframe = function() {};
    hideIframe = function() {};
    uiHandlers = {};
    trackHandler = function() {};
    utils = {};
    ensureLoggedIn = function(base) {
      return function() {
        var args;
        args = slice.call(arguments);
        return FB.getLoginStatus(function() {
          return base.apply(void 0, args);
        }, true);
      };
    };
    resp = function(req, callback, errback, hideIt) {
      return function(res) {
        var errorMsg;
        if (hideIt) {
          hideIframe();
        }
        if (res && !res.error) {
          return callback({
            response: res,
            provider: 'facebook'
          });
        } else {
          if (res) {
            errorMsg = "[FB Error] " + res.error.type + " : " + res.error.message;
          } else {
            errorMsg = "[FB Error] Unknown error";
          }
          return errback(errorMsg, {
            result: res,
            request: req
          });
        }
      };
    };
    api = ensureLoggedIn(function(req, callback, errback) {
      var cb, path, prms, trackParams, uiHandler;
      path = req.path;
      if (path === 'fql.query') {
        return FB.api({
          method: 'fql.query',
          query: req.params.query
        }, resp(req, callback, errback));
      } else if (/^ui\./.test(path)) {
        prms = _.clone(req.params);
        prms.method = path.replace(/^ui\./, '');
        showIframe();
        cb = resp(req, callback, errback, true);
        uiHandler = uiHandlers[path] || function() {};
        trackParams = {
          ui_request_id: (utils != null ? typeof utils.uuid === "function" ? utils.uuid() : void 0 : void 0) || (new Date()).getTime()
        };
        trackHandler({
          path: "facebook." + req.path + ".open",
          params: _.extend({}, req.params, trackParams)
        });
        return _.delay(function() {
          return FB.ui(prms, function(response) {
            path = "facebook." + req.path + ".";
            if (!response || response.error_code) {
              path += "error";
            } else {
              path += "success";
            }
            trackHandler({
              path: path,
              params: _.extend({}, response, trackParams)
            });
            uiHandler(req, response);
            return cb(response);
          });
        }, 100);
      } else {
        return FB.api(path, req.method, req.params, resp(req, callback, function(msg, res) {
          res.time = new Date();
          return callback(res);
        }));
      }
    });
    return {
      initialize: function(app) {
        var dfd, fb;
        fb = document.createElement('script');
        fb.type = 'text/javascript';
        fb.async = true;
        fb.src = "https://connect.facebook.net/en_US/all.js";
        (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(fb);
        showIframe = function() {
          return app.core.mediator.emit('remote.iframe.show');
        };
        hideIframe = function() {
          return app.core.mediator.emit('remote.iframe.hide');
        };
        dfd = promises.deferred();
        window.fbAsyncInit = function() {
          FB.init(app.config.settings.auth.facebook);
          return dfd.resolve({});
        };
        app.core.routeHandlers.facebook = function() {
          var args;
          args = arguments;
          dfd.promise.then(function() {
            return api.apply(void 0, args);
          });
          return void 0;
        };
        uiHandlers['ui.apprequests'] = function(req, res) {
          var noop, opts;
          opts = {
            path: 'services/facebook/apprequests',
            method: 'post',
            params: res
          };
          noop = function() {};
          return app.core.routeHandlers.hull(opts, noop, noop);
        };
        uiHandlers['ui.share'] = function(req, res) {
          var noop, opts;
          opts = {
            path: 'services/facebook/share',
            method: 'post',
            params: res
          };
          noop = function() {};
          return app.core.routeHandlers.hull(opts, noop, noop);
        };
        uiHandlers['ui.feed'] = uiHandlers['ui.share'];
        trackHandler = app.core.routeHandlers.track;
        return utils = app.core.util;
      }
    };
  });

}).call(this);

(function() {

  define('lib/remote/services/github',[],function() {
    return function(app) {
      var api;
      api = function(req, callback, errback) {
        var headers, path, req_data, request, token, url, _ref, _ref1, _ref2;
        path = req.path;
        if (path[0] === "/") {
          path = path.substring(1);
        }
        url = "https://api.github.com/" + path;
        if (req.method.toLowerCase() === 'delete') {
          req_data = JSON.stringify(req.params || {});
        } else {
          req_data = req.params;
        }
        headers = {};
        token = (_ref = app.core.settings().auth) != null ? (_ref1 = _ref.github) != null ? (_ref2 = _ref1.credentials) != null ? _ref2.token : void 0 : void 0 : void 0;
        if (token) {
          headers['Authorization'] = "token " + token;
        }
        request = app.core.data.ajax({
          url: url,
          type: req.method,
          data: req_data,
          headers: headers
        });
        request.then(function(response) {
          return callback({
            response: response,
            provider: 'github'
          });
        }, errback);
      };
      return {
        initialize: function(app) {
          return app.core.routeHandlers.github = api;
        }
      };
    };
  });

}).call(this);

(function() {

  define('lib/remote/services/google',['jquery-jsonp', 'underscore'], function(jsonp, _) {
    return {
      initialize: function(app) {
        return app.core.routeHandlers.google = function(req, success, failure) {
          var method, request, token, _ref, _ref1, _ref2;
          method = req.method.toLowerCase();
          token = (_ref = app.core.settings().auth) != null ? (_ref1 = _ref.google) != null ? (_ref2 = _ref1.credentials) != null ? _ref2.token : void 0 : void 0 : void 0;
          if (!token) {
            return failure('No Google+ user');
          }
          if (method !== 'get') {
            return failure('Unable to perform non-GET requests on Google+ API');
          }
          request = jsonp({
            url: "https://www.googleapis.com/plus/v1/" + req.path,
            callbackParameter: "callback",
            data: _.extend({}, req.params, {
              access_token: token
            })
          });
          request.done(function(response) {
            return success({
              response: response,
              provider: 'google'
            });
          });
          request.fail(function(req) {
            return failure(req.url);
          });
        };
      }
    };
  });

}).call(this);

(function() {

  define('lib/remote/services/hull',['jquery', 'underscore', '../handler'], function($, _, Handler) {
    return function(app) {
      var TrackEventMatcher, createOrRefreshUuid, doTrack, getBrowserId, getSessionId, handler, hullHandler, identify, initInfo, trackAction, trackHandler, _ref, _ref1;
      createOrRefreshUuid = function(key, expires) {
        var uuid;
        uuid = app.core.cookies.get(key) || app.core.util.uuid();
        app.core.cookies.set(key, uuid, {
          domain: document.location.host,
          expires: expires
        });
        return uuid;
      };
      getBrowserId = function() {
        var year;
        year = new Date().getFullYear() + 10;
        return createOrRefreshUuid('_bid', new Date(year, 0, 1));
      };
      getSessionId = function() {
        return createOrRefreshUuid('_sid', 30 * 60);
      };
      initInfo = {
        url: app.config.data.request.url.href,
        path: app.config.data.request.url.path,
        referrer: (_ref = app.config.data.request.referrer) != null ? _ref.href : void 0,
        referring_domain: (_ref1 = app.config.data.request.referrer) != null ? _ref1.host : void 0,
        browser_id: getBrowserId(),
        session_id: getSessionId()
      };
      identify = function(me) {
        var analytics, ident, identified, signInCount, _ref2;
        if (!me) {
          return;
        }
        identified = !!(me.id != null);
        if (!identified) {
          return;
        }
        analytics = require('analytics');
        signInCount = ((_ref2 = me.stats) != null ? _ref2.sign_in_count : void 0) || 0;
        if (identified && signInCount === 1) {
          analytics.alias(me.id);
        }
        ident = _.pick(me, 'name', 'email', 'id', 'picture');
        ident.created = me.created_at;
        ident.distinct_id = me.id;
        return analytics.identify(me.id, ident);
      };
      handler = app.core.handler;
      hullHandler = function(options, success, error) {
        var promise;
        promise = handler.handle({
          url: options.path,
          type: options.method,
          data: options.params
        });
        promise.then(function(h) {
          if (h.request.url === '/api/v1/me') {
            identify(h.response);
          }
          h.provider = 'hull';
          if (_.isFunction(success)) {
            return success(h);
          }
        }, function(h) {
          return error(h.response);
        });
      };
      TrackEventMatcher = (function() {

        function TrackEventMatcher(cfg) {
          if (cfg === false || ((cfg != null ? cfg.ignore : void 0) != null)) {
            this.mode = 'ignore';
            this._initMatchers(cfg.ignore);
          } else if (!(cfg != null)) {
            this.mode = 'match_all';
          } else {
            this.mode = 'match';
            this._initMatchers((cfg != null ? cfg.only : void 0) || cfg);
          }
        }

        TrackEventMatcher.prototype._initMatchers = function(m) {
          if (_.isString(m)) {
            m = [m];
          }
          return this.matchers = _.map(_.compact(m), function(c) {
            var _c;
            _c = c.toString();
            if (/^\/.*\/$/.test(_c)) {
              return new RegExp(_c.slice(1, -1));
            } else {
              return _c;
            }
          });
        };

        TrackEventMatcher.prototype.weTrackIt = function(event) {
          var ret;
          if (event == null) {
            return false;
          }
          if (this.mode === 'match_all') {
            return true;
          }
          ret = _.some(_.map(this.matchers, function(m) {
            if (_.isFunction(m.test)) {
              return m.test(event);
            } else {
              return m === event;
            }
          }));
          if (this.mode === 'ignore') {
            return !ret;
          } else {
            return ret;
          }
        };

        return TrackEventMatcher;

      })();
      doTrack = function(event, params) {
        var _ref2, _ref3, _ref4, _ref5;
        if (params == null) {
          params = {};
        }
        if (!app.core.trackMatcher.weTrackIt(event)) {
          return;
        }
        params.hull_app_id = (_ref2 = app.config) != null ? _ref2.appId : void 0;
        params.hull_app_name = (_ref3 = app.config) != null ? (_ref4 = _ref3.data) != null ? (_ref5 = _ref4.app) != null ? _ref5.name : void 0 : void 0 : void 0;
        _.defaults(params, initInfo);
        return require('analytics').track(event, params);
      };
      trackAction = function(response) {
        var eventName, track, trackParams, _ref2;
        if (!(track = response.headers['Hull-Track'])) {
          return;
        }
        try {
          _ref2 = JSON.parse(atob(track)), eventName = _ref2[0], trackParams = _ref2[1];
          return doTrack(eventName, trackParams);
        } catch (error) {
          return "Invalid Tracking header";
        }
      };
      handler.after(trackAction);
      trackHandler = function(req, callback, errback) {
        var eventName, promise, _base, _ref2;
        eventName = req.path;
        doTrack(eventName, req.params);
        if ((_ref2 = (_base = req.params).event) == null) {
          _base.event = eventName;
        }
        req.params = {
          t: btoa(JSON.stringify(req.params))
        };
        promise = handler.handle({
          url: 't',
          type: req.method || 'post',
          data: req.params
        });
        promise.then(function(h) {
          h.provider = 't';
          return callback && callback(h);
        }, function(err) {
          return errback && errback(err.response);
        });
      };
      return {
        require: {
          paths: {
            analytics: 'components/analytics/analytics',
            base64: 'components/base64/base64'
          }
        },
        initialize: function(app) {
          var analytics, analyticsSettings, settings;
          app.core.trackMatcher = new TrackEventMatcher(app.core.clientConfig.track);
          analytics = require('analytics');
          settings = app.config.settings.analytics || {};
          analyticsSettings = {};
          _.each(settings, function(s) {
            return analyticsSettings[s.name] = s;
          });
          analytics.initialize(analyticsSettings);
          if (app.config.data.me != null) {
            identify(app.config.data.me);
          }
          doTrack("hull.app.init");
          app.core.routeHandlers.hull = hullHandler;
          return app.core.routeHandlers.track = trackHandler;
        }
      };
    };
  });

}).call(this);

(function() {

  define('lib/remote/services/proxy',[],function() {
    return function(service, transport) {
      var _this = this;
      return function(req, callback, errback) {
        var path, req_data, request, url;
        path = req.path;
        if (path[0] === "/") {
          path = path.substring(1);
        }
        url = "services/" + service.path + "/" + path;
        if (req.method.toLowerCase() === 'delete') {
          req_data = JSON.stringify(req.params || {});
        } else {
          req_data = req.params;
        }
        request = transport.handle({
          url: url,
          type: req.method,
          data: req_data
        });
        request.then(function(response) {
          response.provider = service.name;
          return callback(response);
        }, errback);
      };
    };
  });

}).call(this);

(function() {

  define('lib/remote/services/instagram',['jquery-jsonp', 'lib/remote/services/proxy'], function(jsonp, proxyBuilder) {
    return function(app) {
      var handler, proxy,
        _this = this;
      proxy = proxyBuilder({
        name: 'instagram',
        path: 'instagram'
      }, app.core.handler);
      handler = function(req, callback, errback) {
        var instaConfig, method, path, request, requestParams, _ref;
        method = req.method.toLowerCase();
        path = req.path;
        if (path[0] === "/") {
          path = path.substring(1);
        }
        requestParams = {};
        instaConfig = (_ref = app.core.settings().auth) != null ? _ref.instagram : void 0;
        if (method === 'get') {
          requestParams = {
            url: "https://api.instagram.com/v1/" + path,
            data: _.extend({}, req.params, instaConfig),
            callbackParameter: 'callback'
          };
          request = jsonp(requestParams);
          request.done(function(response) {
            return callback({
              response: response.data,
              provider: 'instagram',
              headers: {
                pagination: response.pagination,
                meta: response.meta
              }
            });
          });
          request.fail(function(err) {
            return errback(err.url);
          });
        } else {
          proxy(req, callback, errback);
        }
      };
      return {
        initialize: function(app) {
          return app.core.routeHandlers.instagram = handler;
        }
      };
    };
  });

}).call(this);

(function() {

  define('lib/remote/services/linkedin',['jquery-jsonp', 'underscore'], function(jsonp, _) {
    return {
      initialize: function(app) {
        return app.core.routeHandlers.linkedin = function(req, success, failure) {
          var method, request, token, _ref, _ref1, _ref2;
          method = req.method.toLowerCase();
          token = (_ref = app.core.settings().auth) != null ? (_ref1 = _ref.linkedin) != null ? (_ref2 = _ref1.credentials) != null ? _ref2.token : void 0 : void 0 : void 0;
          if (!token) {
            return failure('No linkedIn user');
          }
          if (method !== 'get') {
            return failure('Unable to perform non-GET requests on LinkedIn');
          }
          request = jsonp({
            url: "https://api.linkedin.com/v1/" + req.path,
            callbackParameter: "callback",
            data: _.extend({}, req.params, {
              oauth2_access_token: token
            })
          });
          request.done(function(response) {
            return success({
              response: response,
              provider: 'linkedin'
            });
          });
          request.fail(function(req) {
            return failure(req.url);
          });
        };
      }
    };
  });

}).call(this);

(function() {

  define('lib/remote/services/soundcloud',['lib/remote/services/proxy'], function(proxy) {
    return {
      initialize: function(app) {
        return app.core.routeHandlers.soundcloud = proxy({
          name: 'soundcloud',
          path: 'soundcloud'
        }, app.core.handler);
      }
    };
  });

}).call(this);

(function() {

  define('lib/remote/services/tumblr',['lib/remote/services/proxy'], function(proxy) {
    return {
      initialize: function(app) {
        return app.core.routeHandlers.tumblr = proxy({
          name: 'tumblr',
          path: 'tumblr/v2'
        }, app.core.handler);
      }
    };
  });

}).call(this);

(function() {

  define('lib/remote/services/twitter',['lib/remote/services/proxy'], function(proxy) {
    return {
      initialize: function(app) {
        return app.core.routeHandlers.twitter = proxy({
          name: 'twitter',
          path: 'twitter/1.1'
        }, app.core.handler);
      }
    };
  });

}).call(this);

/*!
 * jQuery JavaScript Library v1.11.0 -css,-css/addGetHookIf,-css/curCSS,-css/defaultDisplay,-css/hiddenVisibleSelectors,-css/support,-css/swap,-css/var/cssExpand,-css/var/isHidden,-css/var/rmargin,-css/var/rnumnonpx,-effects,-effects/Tween,-effects/animatedSelector,-effects/support,-dimensions,-offset,-deprecated,-wrap,-core/ready
 * http://jquery.com/
 *
 * Includes Sizzle.js
 * http://sizzlejs.com/
 *
 * Copyright 2005, 2014 jQuery Foundation, Inc. and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: 2014-03-13T19:52Z
 */

(function( global, factory ) {

	if ( typeof module === "object" && typeof module.exports === "object" ) {
		// For CommonJS and CommonJS-like environments where a proper window is present,
		// execute the factory and get jQuery
		// For environments that do not inherently posses a window with a document
		// (such as Node.js), expose a jQuery-making factory as module.exports
		// This accentuates the need for the creation of a real window
		// e.g. var jQuery = require("jquery")(window);
		// See ticket #14549 for more info
		module.exports = global.document ?
			factory( global, true ) :
			function( w ) {
				if ( !w.document ) {
					throw new Error( "jQuery requires a window with a document" );
				}
				return factory( w );
			};
	} else {
		factory( global );
	}

// Pass this if window is not defined yet
}(typeof window !== "undefined" ? window : this, function( window, noGlobal ) {

// Can't do this because several apps including ASP.NET trace
// the stack via arguments.caller.callee and Firefox dies if
// you try to trace through "use strict" call chains. (#13335)
// Support: Firefox 18+
//

var deletedIds = [];

var slice = deletedIds.slice;

var concat = deletedIds.concat;

var push = deletedIds.push;

var indexOf = deletedIds.indexOf;

var class2type = {};

var toString = class2type.toString;

var hasOwn = class2type.hasOwnProperty;

var trim = "".trim;

var support = {};



var
	version = "1.11.0 -css,-css/addGetHookIf,-css/curCSS,-css/defaultDisplay,-css/hiddenVisibleSelectors,-css/support,-css/swap,-css/var/cssExpand,-css/var/isHidden,-css/var/rmargin,-css/var/rnumnonpx,-effects,-effects/Tween,-effects/animatedSelector,-effects/support,-dimensions,-offset,-deprecated,-wrap,-core/ready",

	// Define a local copy of jQuery
	jQuery = function( selector, context ) {
		// The jQuery object is actually just the init constructor 'enhanced'
		// Need init if jQuery is called (just allow error to be thrown if not included)
		return new jQuery.fn.init( selector, context );
	},

	// Make sure we trim BOM and NBSP (here's looking at you, Safari 5.0 and IE)
	rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,

	// Matches dashed string for camelizing
	rmsPrefix = /^-ms-/,
	rdashAlpha = /-([\da-z])/gi,

	// Used by jQuery.camelCase as callback to replace()
	fcamelCase = function( all, letter ) {
		return letter.toUpperCase();
	};

jQuery.fn = jQuery.prototype = {
	// The current version of jQuery being used
	jquery: version,

	constructor: jQuery,

	// Start with an empty selector
	selector: "",

	// The default length of a jQuery object is 0
	length: 0,

	toArray: function() {
		return slice.call( this );
	},

	// Get the Nth element in the matched element set OR
	// Get the whole matched element set as a clean array
	get: function( num ) {
		return num != null ?

			// Return a 'clean' array
			( num < 0 ? this[ num + this.length ] : this[ num ] ) :

			// Return just the object
			slice.call( this );
	},

	// Take an array of elements and push it onto the stack
	// (returning the new matched element set)
	pushStack: function( elems ) {

		// Build a new jQuery matched element set
		var ret = jQuery.merge( this.constructor(), elems );

		// Add the old object onto the stack (as a reference)
		ret.prevObject = this;
		ret.context = this.context;

		// Return the newly-formed element set
		return ret;
	},

	// Execute a callback for every element in the matched set.
	// (You can seed the arguments with an array of args, but this is
	// only used internally.)
	each: function( callback, args ) {
		return jQuery.each( this, callback, args );
	},

	map: function( callback ) {
		return this.pushStack( jQuery.map(this, function( elem, i ) {
			return callback.call( elem, i, elem );
		}));
	},

	slice: function() {
		return this.pushStack( slice.apply( this, arguments ) );
	},

	first: function() {
		return this.eq( 0 );
	},

	last: function() {
		return this.eq( -1 );
	},

	eq: function( i ) {
		var len = this.length,
			j = +i + ( i < 0 ? len : 0 );
		return this.pushStack( j >= 0 && j < len ? [ this[j] ] : [] );
	},

	end: function() {
		return this.prevObject || this.constructor(null);
	},

	// For internal use only.
	// Behaves like an Array's method, not like a jQuery method.
	push: push,
	sort: deletedIds.sort,
	splice: deletedIds.splice
};

jQuery.extend = jQuery.fn.extend = function() {
	var src, copyIsArray, copy, name, options, clone,
		target = arguments[0] || {},
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if ( typeof target === "boolean" ) {
		deep = target;

		// skip the boolean and the target
		target = arguments[ i ] || {};
		i++;
	}

	// Handle case when target is a string or something (possible in deep copy)
	if ( typeof target !== "object" && !jQuery.isFunction(target) ) {
		target = {};
	}

	// extend jQuery itself if only one argument is passed
	if ( i === length ) {
		target = this;
		i--;
	}

	for ( ; i < length; i++ ) {
		// Only deal with non-null/undefined values
		if ( (options = arguments[ i ]) != null ) {
			// Extend the base object
			for ( name in options ) {
				src = target[ name ];
				copy = options[ name ];

				// Prevent never-ending loop
				if ( target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)) ) ) {
					if ( copyIsArray ) {
						copyIsArray = false;
						clone = src && jQuery.isArray(src) ? src : [];

					} else {
						clone = src && jQuery.isPlainObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[ name ] = jQuery.extend( deep, clone, copy );

				// Don't bring in undefined values
				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};

jQuery.extend({
	// Unique for each copy of jQuery on the page
	expando: "jQuery" + ( version + Math.random() ).replace( /\D/g, "" ),

	// Assume jQuery is ready without the ready module
	isReady: true,

	error: function( msg ) {
		throw new Error( msg );
	},

	noop: function() {},

	// See test/unit/core.js for details concerning isFunction.
	// Since version 1.3, DOM methods and functions like alert
	// aren't supported. They return false on IE (#2968).
	isFunction: function( obj ) {
		return jQuery.type(obj) === "function";
	},

	isArray: Array.isArray || function( obj ) {
		return jQuery.type(obj) === "array";
	},

	isWindow: function( obj ) {
		/* jshint eqeqeq: false */
		return obj != null && obj == obj.window;
	},

	isNumeric: function( obj ) {
		// parseFloat NaNs numeric-cast false positives (null|true|false|"")
		// ...but misinterprets leading-number strings, particularly hex literals ("0x...")
		// subtraction forces infinities to NaN
		return obj - parseFloat( obj ) >= 0;
	},

	isEmptyObject: function( obj ) {
		var name;
		for ( name in obj ) {
			return false;
		}
		return true;
	},

	isPlainObject: function( obj ) {
		var key;

		// Must be an Object.
		// Because of IE, we also have to check the presence of the constructor property.
		// Make sure that DOM nodes and window objects don't pass through, as well
		if ( !obj || jQuery.type(obj) !== "object" || obj.nodeType || jQuery.isWindow( obj ) ) {
			return false;
		}

		try {
			// Not own constructor property must be Object
			if ( obj.constructor &&
				!hasOwn.call(obj, "constructor") &&
				!hasOwn.call(obj.constructor.prototype, "isPrototypeOf") ) {
				return false;
			}
		} catch ( e ) {
			// IE8,9 Will throw exceptions on certain host objects #9897
			return false;
		}

		// Support: IE<9
		// Handle iteration over inherited properties before own properties.
		if ( support.ownLast ) {
			for ( key in obj ) {
				return hasOwn.call( obj, key );
			}
		}

		// Own properties are enumerated firstly, so to speed up,
		// if last one is own, then all properties are own.
		for ( key in obj ) {}

		return key === undefined || hasOwn.call( obj, key );
	},

	type: function( obj ) {
		if ( obj == null ) {
			return obj + "";
		}
		return typeof obj === "object" || typeof obj === "function" ?
			class2type[ toString.call(obj) ] || "object" :
			typeof obj;
	},

	// Evaluates a script in a global context
	// Workarounds based on findings by Jim Driscoll
	// http://weblogs.java.net/blog/driscoll/archive/2009/09/08/eval-javascript-global-context
	globalEval: function( data ) {
		if ( data && jQuery.trim( data ) ) {
			// We use execScript on Internet Explorer
			// We use an anonymous function so that context is window
			// rather than jQuery in Firefox
			( window.execScript || function( data ) {
				window[ "eval" ].call( window, data );
			} )( data );
		}
	},

	// Convert dashed to camelCase; used by the css and data modules
	// Microsoft forgot to hump their vendor prefix (#9572)
	camelCase: function( string ) {
		return string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );
	},

	nodeName: function( elem, name ) {
		return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
	},

	// args is for internal usage only
	each: function( obj, callback, args ) {
		var value,
			i = 0,
			length = obj.length,
			isArray = isArraylike( obj );

		if ( args ) {
			if ( isArray ) {
				for ( ; i < length; i++ ) {
					value = callback.apply( obj[ i ], args );

					if ( value === false ) {
						break;
					}
				}
			} else {
				for ( i in obj ) {
					value = callback.apply( obj[ i ], args );

					if ( value === false ) {
						break;
					}
				}
			}

		// A special, fast, case for the most common use of each
		} else {
			if ( isArray ) {
				for ( ; i < length; i++ ) {
					value = callback.call( obj[ i ], i, obj[ i ] );

					if ( value === false ) {
						break;
					}
				}
			} else {
				for ( i in obj ) {
					value = callback.call( obj[ i ], i, obj[ i ] );

					if ( value === false ) {
						break;
					}
				}
			}
		}

		return obj;
	},

	// Use native String.trim function wherever possible
	trim: trim && !trim.call("\uFEFF\xA0") ?
		function( text ) {
			return text == null ?
				"" :
				trim.call( text );
		} :

		// Otherwise use our own trimming functionality
		function( text ) {
			return text == null ?
				"" :
				( text + "" ).replace( rtrim, "" );
		},

	// results is for internal usage only
	makeArray: function( arr, results ) {
		var ret = results || [];

		if ( arr != null ) {
			if ( isArraylike( Object(arr) ) ) {
				jQuery.merge( ret,
					typeof arr === "string" ?
					[ arr ] : arr
				);
			} else {
				push.call( ret, arr );
			}
		}

		return ret;
	},

	inArray: function( elem, arr, i ) {
		var len;

		if ( arr ) {
			if ( indexOf ) {
				return indexOf.call( arr, elem, i );
			}

			len = arr.length;
			i = i ? i < 0 ? Math.max( 0, len + i ) : i : 0;

			for ( ; i < len; i++ ) {
				// Skip accessing in sparse arrays
				if ( i in arr && arr[ i ] === elem ) {
					return i;
				}
			}
		}

		return -1;
	},

	merge: function( first, second ) {
		var len = +second.length,
			j = 0,
			i = first.length;

		while ( j < len ) {
			first[ i++ ] = second[ j++ ];
		}

		// Support: IE<9
		// Workaround casting of .length to NaN on otherwise arraylike objects (e.g., NodeLists)
		if ( len !== len ) {
			while ( second[j] !== undefined ) {
				first[ i++ ] = second[ j++ ];
			}
		}

		first.length = i;

		return first;
	},

	grep: function( elems, callback, invert ) {
		var callbackInverse,
			matches = [],
			i = 0,
			length = elems.length,
			callbackExpect = !invert;

		// Go through the array, only saving the items
		// that pass the validator function
		for ( ; i < length; i++ ) {
			callbackInverse = !callback( elems[ i ], i );
			if ( callbackInverse !== callbackExpect ) {
				matches.push( elems[ i ] );
			}
		}

		return matches;
	},

	// arg is for internal usage only
	map: function( elems, callback, arg ) {
		var value,
			i = 0,
			length = elems.length,
			isArray = isArraylike( elems ),
			ret = [];

		// Go through the array, translating each of the items to their new values
		if ( isArray ) {
			for ( ; i < length; i++ ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}

		// Go through every key on the object,
		} else {
			for ( i in elems ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}
		}

		// Flatten any nested arrays
		return concat.apply( [], ret );
	},

	// A global GUID counter for objects
	guid: 1,

	// Bind a function to a context, optionally partially applying any
	// arguments.
	proxy: function( fn, context ) {
		var args, proxy, tmp;

		if ( typeof context === "string" ) {
			tmp = fn[ context ];
			context = fn;
			fn = tmp;
		}

		// Quick check to determine if target is callable, in the spec
		// this throws a TypeError, but we will just return undefined.
		if ( !jQuery.isFunction( fn ) ) {
			return undefined;
		}

		// Simulated bind
		args = slice.call( arguments, 2 );
		proxy = function() {
			return fn.apply( context || this, args.concat( slice.call( arguments ) ) );
		};

		// Set the guid of unique handler to the same of original handler, so it can be removed
		proxy.guid = fn.guid = fn.guid || jQuery.guid++;

		return proxy;
	},

	now: function() {
		return +( new Date() );
	},

	// jQuery.support is not used in Core but other projects attach their
	// properties to it so it needs to exist.
	support: support
});

// Populate the class2type map
jQuery.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function(i, name) {
	class2type[ "[object " + name + "]" ] = name.toLowerCase();
});

function isArraylike( obj ) {
	var length = obj.length,
		type = jQuery.type( obj );

	if ( type === "function" || jQuery.isWindow( obj ) ) {
		return false;
	}

	if ( obj.nodeType === 1 && length ) {
		return true;
	}

	return type === "array" || length === 0 ||
		typeof length === "number" && length > 0 && ( length - 1 ) in obj;
}
var Sizzle =
/*!
 * Sizzle CSS Selector Engine v1.10.16
 * http://sizzlejs.com/
 *
 * Copyright 2013 jQuery Foundation, Inc. and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: 2014-01-13
 */
(function( window ) {

var i,
	support,
	Expr,
	getText,
	isXML,
	compile,
	outermostContext,
	sortInput,
	hasDuplicate,

	// Local document vars
	setDocument,
	document,
	docElem,
	documentIsHTML,
	rbuggyQSA,
	rbuggyMatches,
	matches,
	contains,

	// Instance-specific data
	expando = "sizzle" + -(new Date()),
	preferredDoc = window.document,
	dirruns = 0,
	done = 0,
	classCache = createCache(),
	tokenCache = createCache(),
	compilerCache = createCache(),
	sortOrder = function( a, b ) {
		if ( a === b ) {
			hasDuplicate = true;
		}
		return 0;
	},

	// General-purpose constants
	strundefined = typeof undefined,
	MAX_NEGATIVE = 1 << 31,

	// Instance methods
	hasOwn = ({}).hasOwnProperty,
	arr = [],
	pop = arr.pop,
	push_native = arr.push,
	push = arr.push,
	slice = arr.slice,
	// Use a stripped-down indexOf if we can't use a native one
	indexOf = arr.indexOf || function( elem ) {
		var i = 0,
			len = this.length;
		for ( ; i < len; i++ ) {
			if ( this[i] === elem ) {
				return i;
			}
		}
		return -1;
	},

	booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",

	// Regular expressions

	// Whitespace characters http://www.w3.org/TR/css3-selectors/#whitespace
	whitespace = "[\\x20\\t\\r\\n\\f]",
	// http://www.w3.org/TR/css3-syntax/#characters
	characterEncoding = "(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",

	// Loosely modeled on CSS identifier characters
	// An unquoted value should be a CSS identifier http://www.w3.org/TR/css3-selectors/#attribute-selectors
	// Proper syntax: http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
	identifier = characterEncoding.replace( "w", "w#" ),

	// Acceptable operators http://www.w3.org/TR/selectors/#attribute-selectors
	attributes = "\\[" + whitespace + "*(" + characterEncoding + ")" + whitespace +
		"*(?:([*^$|!~]?=)" + whitespace + "*(?:(['\"])((?:\\\\.|[^\\\\])*?)\\3|(" + identifier + ")|)|)" + whitespace + "*\\]",

	// Prefer arguments quoted,
	//   then not containing pseudos/brackets,
	//   then attribute selectors/non-parenthetical expressions,
	//   then anything else
	// These preferences are here to reduce the number of selectors
	//   needing tokenize in the PSEUDO preFilter
	pseudos = ":(" + characterEncoding + ")(?:\\(((['\"])((?:\\\\.|[^\\\\])*?)\\3|((?:\\\\.|[^\\\\()[\\]]|" + attributes.replace( 3, 8 ) + ")*)|.*)\\)|)",

	// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
	rtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g" ),

	rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),
	rcombinators = new RegExp( "^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace + "*" ),

	rattributeQuotes = new RegExp( "=" + whitespace + "*([^\\]'\"]*?)" + whitespace + "*\\]", "g" ),

	rpseudo = new RegExp( pseudos ),
	ridentifier = new RegExp( "^" + identifier + "$" ),

	matchExpr = {
		"ID": new RegExp( "^#(" + characterEncoding + ")" ),
		"CLASS": new RegExp( "^\\.(" + characterEncoding + ")" ),
		"TAG": new RegExp( "^(" + characterEncoding.replace( "w", "w*" ) + ")" ),
		"ATTR": new RegExp( "^" + attributes ),
		"PSEUDO": new RegExp( "^" + pseudos ),
		"CHILD": new RegExp( "^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace +
			"*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace +
			"*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
		"bool": new RegExp( "^(?:" + booleans + ")$", "i" ),
		// For use in libraries implementing .is()
		// We use this for POS matching in `select`
		"needsContext": new RegExp( "^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" +
			whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i" )
	},

	rinputs = /^(?:input|select|textarea|button)$/i,
	rheader = /^h\d$/i,

	rnative = /^[^{]+\{\s*\[native \w/,

	// Easily-parseable/retrievable ID or TAG or CLASS selectors
	rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,

	rsibling = /[+~]/,
	rescape = /'|\\/g,

	// CSS escapes http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
	runescape = new RegExp( "\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)", "ig" ),
	funescape = function( _, escaped, escapedWhitespace ) {
		var high = "0x" + escaped - 0x10000;
		// NaN means non-codepoint
		// Support: Firefox
		// Workaround erroneous numeric interpretation of +"0x"
		return high !== high || escapedWhitespace ?
			escaped :
			high < 0 ?
				// BMP codepoint
				String.fromCharCode( high + 0x10000 ) :
				// Supplemental Plane codepoint (surrogate pair)
				String.fromCharCode( high >> 10 | 0xD800, high & 0x3FF | 0xDC00 );
	};

// Optimize for push.apply( _, NodeList )
try {
	push.apply(
		(arr = slice.call( preferredDoc.childNodes )),
		preferredDoc.childNodes
	);
	// Support: Android<4.0
	// Detect silently failing push.apply
	arr[ preferredDoc.childNodes.length ].nodeType;
} catch ( e ) {
	push = { apply: arr.length ?

		// Leverage slice if possible
		function( target, els ) {
			push_native.apply( target, slice.call(els) );
		} :

		// Support: IE<9
		// Otherwise append directly
		function( target, els ) {
			var j = target.length,
				i = 0;
			// Can't trust NodeList.length
			while ( (target[j++] = els[i++]) ) {}
			target.length = j - 1;
		}
	};
}

function Sizzle( selector, context, results, seed ) {
	var match, elem, m, nodeType,
		// QSA vars
		i, groups, old, nid, newContext, newSelector;

	if ( ( context ? context.ownerDocument || context : preferredDoc ) !== document ) {
		setDocument( context );
	}

	context = context || document;
	results = results || [];

	if ( !selector || typeof selector !== "string" ) {
		return results;
	}

	if ( (nodeType = context.nodeType) !== 1 && nodeType !== 9 ) {
		return [];
	}

	if ( documentIsHTML && !seed ) {

		// Shortcuts
		if ( (match = rquickExpr.exec( selector )) ) {
			// Speed-up: Sizzle("#ID")
			if ( (m = match[1]) ) {
				if ( nodeType === 9 ) {
					elem = context.getElementById( m );
					// Check parentNode to catch when Blackberry 4.6 returns
					// nodes that are no longer in the document (jQuery #6963)
					if ( elem && elem.parentNode ) {
						// Handle the case where IE, Opera, and Webkit return items
						// by name instead of ID
						if ( elem.id === m ) {
							results.push( elem );
							return results;
						}
					} else {
						return results;
					}
				} else {
					// Context is not a document
					if ( context.ownerDocument && (elem = context.ownerDocument.getElementById( m )) &&
						contains( context, elem ) && elem.id === m ) {
						results.push( elem );
						return results;
					}
				}

			// Speed-up: Sizzle("TAG")
			} else if ( match[2] ) {
				push.apply( results, context.getElementsByTagName( selector ) );
				return results;

			// Speed-up: Sizzle(".CLASS")
			} else if ( (m = match[3]) && support.getElementsByClassName && context.getElementsByClassName ) {
				push.apply( results, context.getElementsByClassName( m ) );
				return results;
			}
		}

		// QSA path
		if ( support.qsa && (!rbuggyQSA || !rbuggyQSA.test( selector )) ) {
			nid = old = expando;
			newContext = context;
			newSelector = nodeType === 9 && selector;

			// qSA works strangely on Element-rooted queries
			// We can work around this by specifying an extra ID on the root
			// and working up from there (Thanks to Andrew Dupont for the technique)
			// IE 8 doesn't work on object elements
			if ( nodeType === 1 && context.nodeName.toLowerCase() !== "object" ) {
				groups = tokenize( selector );

				if ( (old = context.getAttribute("id")) ) {
					nid = old.replace( rescape, "\\$&" );
				} else {
					context.setAttribute( "id", nid );
				}
				nid = "[id='" + nid + "'] ";

				i = groups.length;
				while ( i-- ) {
					groups[i] = nid + toSelector( groups[i] );
				}
				newContext = rsibling.test( selector ) && testContext( context.parentNode ) || context;
				newSelector = groups.join(",");
			}

			if ( newSelector ) {
				try {
					push.apply( results,
						newContext.querySelectorAll( newSelector )
					);
					return results;
				} catch(qsaError) {
				} finally {
					if ( !old ) {
						context.removeAttribute("id");
					}
				}
			}
		}
	}

	// All others
	return select( selector.replace( rtrim, "$1" ), context, results, seed );
}

/**
 * Create key-value caches of limited size
 * @returns {Function(string, Object)} Returns the Object data after storing it on itself with
 *	property name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)
 *	deleting the oldest entry
 */
function createCache() {
	var keys = [];

	function cache( key, value ) {
		// Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
		if ( keys.push( key + " " ) > Expr.cacheLength ) {
			// Only keep the most recent entries
			delete cache[ keys.shift() ];
		}
		return (cache[ key + " " ] = value);
	}
	return cache;
}

/**
 * Mark a function for special use by Sizzle
 * @param {Function} fn The function to mark
 */
function markFunction( fn ) {
	fn[ expando ] = true;
	return fn;
}

/**
 * Support testing using an element
 * @param {Function} fn Passed the created div and expects a boolean result
 */
function assert( fn ) {
	var div = document.createElement("div");

	try {
		return !!fn( div );
	} catch (e) {
		return false;
	} finally {
		// Remove from its parent by default
		if ( div.parentNode ) {
			div.parentNode.removeChild( div );
		}
		// release memory in IE
		div = null;
	}
}

/**
 * Adds the same handler for all of the specified attrs
 * @param {String} attrs Pipe-separated list of attributes
 * @param {Function} handler The method that will be applied
 */
function addHandle( attrs, handler ) {
	var arr = attrs.split("|"),
		i = attrs.length;

	while ( i-- ) {
		Expr.attrHandle[ arr[i] ] = handler;
	}
}

/**
 * Checks document order of two siblings
 * @param {Element} a
 * @param {Element} b
 * @returns {Number} Returns less than 0 if a precedes b, greater than 0 if a follows b
 */
function siblingCheck( a, b ) {
	var cur = b && a,
		diff = cur && a.nodeType === 1 && b.nodeType === 1 &&
			( ~b.sourceIndex || MAX_NEGATIVE ) -
			( ~a.sourceIndex || MAX_NEGATIVE );

	// Use IE sourceIndex if available on both nodes
	if ( diff ) {
		return diff;
	}

	// Check if b follows a
	if ( cur ) {
		while ( (cur = cur.nextSibling) ) {
			if ( cur === b ) {
				return -1;
			}
		}
	}

	return a ? 1 : -1;
}

/**
 * Returns a function to use in pseudos for input types
 * @param {String} type
 */
function createInputPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return name === "input" && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for buttons
 * @param {String} type
 */
function createButtonPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return (name === "input" || name === "button") && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for positionals
 * @param {Function} fn
 */
function createPositionalPseudo( fn ) {
	return markFunction(function( argument ) {
		argument = +argument;
		return markFunction(function( seed, matches ) {
			var j,
				matchIndexes = fn( [], seed.length, argument ),
				i = matchIndexes.length;

			// Match elements found at the specified indexes
			while ( i-- ) {
				if ( seed[ (j = matchIndexes[i]) ] ) {
					seed[j] = !(matches[j] = seed[j]);
				}
			}
		});
	});
}

/**
 * Checks a node for validity as a Sizzle context
 * @param {Element|Object=} context
 * @returns {Element|Object|Boolean} The input node if acceptable, otherwise a falsy value
 */
function testContext( context ) {
	return context && typeof context.getElementsByTagName !== strundefined && context;
}

// Expose support vars for convenience
support = Sizzle.support = {};

/**
 * Detects XML nodes
 * @param {Element|Object} elem An element or a document
 * @returns {Boolean} True iff elem is a non-HTML XML node
 */
isXML = Sizzle.isXML = function( elem ) {
	// documentElement is verified for cases where it doesn't yet exist
	// (such as loading iframes in IE - #4833)
	var documentElement = elem && (elem.ownerDocument || elem).documentElement;
	return documentElement ? documentElement.nodeName !== "HTML" : false;
};

/**
 * Sets document-related variables once based on the current document
 * @param {Element|Object} [doc] An element or document object to use to set the document
 * @returns {Object} Returns the current document
 */
setDocument = Sizzle.setDocument = function( node ) {
	var hasCompare,
		doc = node ? node.ownerDocument || node : preferredDoc,
		parent = doc.defaultView;

	// If no document and documentElement is available, return
	if ( doc === document || doc.nodeType !== 9 || !doc.documentElement ) {
		return document;
	}

	// Set our document
	document = doc;
	docElem = doc.documentElement;

	// Support tests
	documentIsHTML = !isXML( doc );

	// Support: IE>8
	// If iframe document is assigned to "document" variable and if iframe has been reloaded,
	// IE will throw "permission denied" error when accessing "document" variable, see jQuery #13936
	// IE6-8 do not support the defaultView property so parent will be undefined
	if ( parent && parent !== parent.top ) {
		// IE11 does not have attachEvent, so all must suffer
		if ( parent.addEventListener ) {
			parent.addEventListener( "unload", function() {
				setDocument();
			}, false );
		} else if ( parent.attachEvent ) {
			parent.attachEvent( "onunload", function() {
				setDocument();
			});
		}
	}

	/* Attributes
	---------------------------------------------------------------------- */

	// Support: IE<8
	// Verify that getAttribute really returns attributes and not properties (excepting IE8 booleans)
	support.attributes = assert(function( div ) {
		div.className = "i";
		return !div.getAttribute("className");
	});

	/* getElement(s)By*
	---------------------------------------------------------------------- */

	// Check if getElementsByTagName("*") returns only elements
	support.getElementsByTagName = assert(function( div ) {
		div.appendChild( doc.createComment("") );
		return !div.getElementsByTagName("*").length;
	});

	// Check if getElementsByClassName can be trusted
	support.getElementsByClassName = rnative.test( doc.getElementsByClassName ) && assert(function( div ) {
		div.innerHTML = "<div class='a'></div><div class='a i'></div>";

		// Support: Safari<4
		// Catch class over-caching
		div.firstChild.className = "i";
		// Support: Opera<10
		// Catch gEBCN failure to find non-leading classes
		return div.getElementsByClassName("i").length === 2;
	});

	// Support: IE<10
	// Check if getElementById returns elements by name
	// The broken getElementById methods don't pick up programatically-set names,
	// so use a roundabout getElementsByName test
	support.getById = assert(function( div ) {
		docElem.appendChild( div ).id = expando;
		return !doc.getElementsByName || !doc.getElementsByName( expando ).length;
	});

	// ID find and filter
	if ( support.getById ) {
		Expr.find["ID"] = function( id, context ) {
			if ( typeof context.getElementById !== strundefined && documentIsHTML ) {
				var m = context.getElementById( id );
				// Check parentNode to catch when Blackberry 4.6 returns
				// nodes that are no longer in the document #6963
				return m && m.parentNode ? [m] : [];
			}
		};
		Expr.filter["ID"] = function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				return elem.getAttribute("id") === attrId;
			};
		};
	} else {
		// Support: IE6/7
		// getElementById is not reliable as a find shortcut
		delete Expr.find["ID"];

		Expr.filter["ID"] =  function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				var node = typeof elem.getAttributeNode !== strundefined && elem.getAttributeNode("id");
				return node && node.value === attrId;
			};
		};
	}

	// Tag
	Expr.find["TAG"] = support.getElementsByTagName ?
		function( tag, context ) {
			if ( typeof context.getElementsByTagName !== strundefined ) {
				return context.getElementsByTagName( tag );
			}
		} :
		function( tag, context ) {
			var elem,
				tmp = [],
				i = 0,
				results = context.getElementsByTagName( tag );

			// Filter out possible comments
			if ( tag === "*" ) {
				while ( (elem = results[i++]) ) {
					if ( elem.nodeType === 1 ) {
						tmp.push( elem );
					}
				}

				return tmp;
			}
			return results;
		};

	// Class
	Expr.find["CLASS"] = support.getElementsByClassName && function( className, context ) {
		if ( typeof context.getElementsByClassName !== strundefined && documentIsHTML ) {
			return context.getElementsByClassName( className );
		}
	};

	/* QSA/matchesSelector
	---------------------------------------------------------------------- */

	// QSA and matchesSelector support

	// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
	rbuggyMatches = [];

	// qSa(:focus) reports false when true (Chrome 21)
	// We allow this because of a bug in IE8/9 that throws an error
	// whenever `document.activeElement` is accessed on an iframe
	// So, we allow :focus to pass through QSA all the time to avoid the IE error
	// See http://bugs.jquery.com/ticket/13378
	rbuggyQSA = [];

	if ( (support.qsa = rnative.test( doc.querySelectorAll )) ) {
		// Build QSA regex
		// Regex strategy adopted from Diego Perini
		assert(function( div ) {
			// Select is set to empty string on purpose
			// This is to test IE's treatment of not explicitly
			// setting a boolean content attribute,
			// since its presence should be enough
			// http://bugs.jquery.com/ticket/12359
			div.innerHTML = "<select t=''><option selected=''></option></select>";

			// Support: IE8, Opera 10-12
			// Nothing should be selected when empty strings follow ^= or $= or *=
			if ( div.querySelectorAll("[t^='']").length ) {
				rbuggyQSA.push( "[*^$]=" + whitespace + "*(?:''|\"\")" );
			}

			// Support: IE8
			// Boolean attributes and "value" are not treated correctly
			if ( !div.querySelectorAll("[selected]").length ) {
				rbuggyQSA.push( "\\[" + whitespace + "*(?:value|" + booleans + ")" );
			}

			// Webkit/Opera - :checked should return selected option elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			// IE8 throws error here and will not see later tests
			if ( !div.querySelectorAll(":checked").length ) {
				rbuggyQSA.push(":checked");
			}
		});

		assert(function( div ) {
			// Support: Windows 8 Native Apps
			// The type and name attributes are restricted during .innerHTML assignment
			var input = doc.createElement("input");
			input.setAttribute( "type", "hidden" );
			div.appendChild( input ).setAttribute( "name", "D" );

			// Support: IE8
			// Enforce case-sensitivity of name attribute
			if ( div.querySelectorAll("[name=d]").length ) {
				rbuggyQSA.push( "name" + whitespace + "*[*^$|!~]?=" );
			}

			// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
			// IE8 throws error here and will not see later tests
			if ( !div.querySelectorAll(":enabled").length ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Opera 10-11 does not throw on post-comma invalid pseudos
			div.querySelectorAll("*,:x");
			rbuggyQSA.push(",.*:");
		});
	}

	if ( (support.matchesSelector = rnative.test( (matches = docElem.webkitMatchesSelector ||
		docElem.mozMatchesSelector ||
		docElem.oMatchesSelector ||
		docElem.msMatchesSelector) )) ) {

		assert(function( div ) {
			// Check to see if it's possible to do matchesSelector
			// on a disconnected node (IE 9)
			support.disconnectedMatch = matches.call( div, "div" );

			// This should fail with an exception
			// Gecko does not error, returns false instead
			matches.call( div, "[s!='']:x" );
			rbuggyMatches.push( "!=", pseudos );
		});
	}

	rbuggyQSA = rbuggyQSA.length && new RegExp( rbuggyQSA.join("|") );
	rbuggyMatches = rbuggyMatches.length && new RegExp( rbuggyMatches.join("|") );

	/* Contains
	---------------------------------------------------------------------- */
	hasCompare = rnative.test( docElem.compareDocumentPosition );

	// Element contains another
	// Purposefully does not implement inclusive descendent
	// As in, an element does not contain itself
	contains = hasCompare || rnative.test( docElem.contains ) ?
		function( a, b ) {
			var adown = a.nodeType === 9 ? a.documentElement : a,
				bup = b && b.parentNode;
			return a === bup || !!( bup && bup.nodeType === 1 && (
				adown.contains ?
					adown.contains( bup ) :
					a.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16
			));
		} :
		function( a, b ) {
			if ( b ) {
				while ( (b = b.parentNode) ) {
					if ( b === a ) {
						return true;
					}
				}
			}
			return false;
		};

	/* Sorting
	---------------------------------------------------------------------- */

	// Document order sorting
	sortOrder = hasCompare ?
	function( a, b ) {

		// Flag for duplicate removal
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		// Sort on method existence if only one input has compareDocumentPosition
		var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
		if ( compare ) {
			return compare;
		}

		// Calculate position if both inputs belong to the same document
		compare = ( a.ownerDocument || a ) === ( b.ownerDocument || b ) ?
			a.compareDocumentPosition( b ) :

			// Otherwise we know they are disconnected
			1;

		// Disconnected nodes
		if ( compare & 1 ||
			(!support.sortDetached && b.compareDocumentPosition( a ) === compare) ) {

			// Choose the first element that is related to our preferred document
			if ( a === doc || a.ownerDocument === preferredDoc && contains(preferredDoc, a) ) {
				return -1;
			}
			if ( b === doc || b.ownerDocument === preferredDoc && contains(preferredDoc, b) ) {
				return 1;
			}

			// Maintain original order
			return sortInput ?
				( indexOf.call( sortInput, a ) - indexOf.call( sortInput, b ) ) :
				0;
		}

		return compare & 4 ? -1 : 1;
	} :
	function( a, b ) {
		// Exit early if the nodes are identical
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		var cur,
			i = 0,
			aup = a.parentNode,
			bup = b.parentNode,
			ap = [ a ],
			bp = [ b ];

		// Parentless nodes are either documents or disconnected
		if ( !aup || !bup ) {
			return a === doc ? -1 :
				b === doc ? 1 :
				aup ? -1 :
				bup ? 1 :
				sortInput ?
				( indexOf.call( sortInput, a ) - indexOf.call( sortInput, b ) ) :
				0;

		// If the nodes are siblings, we can do a quick check
		} else if ( aup === bup ) {
			return siblingCheck( a, b );
		}

		// Otherwise we need full lists of their ancestors for comparison
		cur = a;
		while ( (cur = cur.parentNode) ) {
			ap.unshift( cur );
		}
		cur = b;
		while ( (cur = cur.parentNode) ) {
			bp.unshift( cur );
		}

		// Walk down the tree looking for a discrepancy
		while ( ap[i] === bp[i] ) {
			i++;
		}

		return i ?
			// Do a sibling check if the nodes have a common ancestor
			siblingCheck( ap[i], bp[i] ) :

			// Otherwise nodes in our document sort first
			ap[i] === preferredDoc ? -1 :
			bp[i] === preferredDoc ? 1 :
			0;
	};

	return doc;
};

Sizzle.matches = function( expr, elements ) {
	return Sizzle( expr, null, null, elements );
};

Sizzle.matchesSelector = function( elem, expr ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	// Make sure that attribute selectors are quoted
	expr = expr.replace( rattributeQuotes, "='$1']" );

	if ( support.matchesSelector && documentIsHTML &&
		( !rbuggyMatches || !rbuggyMatches.test( expr ) ) &&
		( !rbuggyQSA     || !rbuggyQSA.test( expr ) ) ) {

		try {
			var ret = matches.call( elem, expr );

			// IE 9's matchesSelector returns false on disconnected nodes
			if ( ret || support.disconnectedMatch ||
					// As well, disconnected nodes are said to be in a document
					// fragment in IE 9
					elem.document && elem.document.nodeType !== 11 ) {
				return ret;
			}
		} catch(e) {}
	}

	return Sizzle( expr, document, null, [elem] ).length > 0;
};

Sizzle.contains = function( context, elem ) {
	// Set document vars if needed
	if ( ( context.ownerDocument || context ) !== document ) {
		setDocument( context );
	}
	return contains( context, elem );
};

Sizzle.attr = function( elem, name ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	var fn = Expr.attrHandle[ name.toLowerCase() ],
		// Don't get fooled by Object.prototype properties (jQuery #13807)
		val = fn && hasOwn.call( Expr.attrHandle, name.toLowerCase() ) ?
			fn( elem, name, !documentIsHTML ) :
			undefined;

	return val !== undefined ?
		val :
		support.attributes || !documentIsHTML ?
			elem.getAttribute( name ) :
			(val = elem.getAttributeNode(name)) && val.specified ?
				val.value :
				null;
};

Sizzle.error = function( msg ) {
	throw new Error( "Syntax error, unrecognized expression: " + msg );
};

/**
 * Document sorting and removing duplicates
 * @param {ArrayLike} results
 */
Sizzle.uniqueSort = function( results ) {
	var elem,
		duplicates = [],
		j = 0,
		i = 0;

	// Unless we *know* we can detect duplicates, assume their presence
	hasDuplicate = !support.detectDuplicates;
	sortInput = !support.sortStable && results.slice( 0 );
	results.sort( sortOrder );

	if ( hasDuplicate ) {
		while ( (elem = results[i++]) ) {
			if ( elem === results[ i ] ) {
				j = duplicates.push( i );
			}
		}
		while ( j-- ) {
			results.splice( duplicates[ j ], 1 );
		}
	}

	// Clear input after sorting to release objects
	// See https://github.com/jquery/sizzle/pull/225
	sortInput = null;

	return results;
};

/**
 * Utility function for retrieving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */
getText = Sizzle.getText = function( elem ) {
	var node,
		ret = "",
		i = 0,
		nodeType = elem.nodeType;

	if ( !nodeType ) {
		// If no nodeType, this is expected to be an array
		while ( (node = elem[i++]) ) {
			// Do not traverse comment nodes
			ret += getText( node );
		}
	} else if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {
		// Use textContent for elements
		// innerText usage removed for consistency of new lines (jQuery #11153)
		if ( typeof elem.textContent === "string" ) {
			return elem.textContent;
		} else {
			// Traverse its children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				ret += getText( elem );
			}
		}
	} else if ( nodeType === 3 || nodeType === 4 ) {
		return elem.nodeValue;
	}
	// Do not include comment or processing instruction nodes

	return ret;
};

Expr = Sizzle.selectors = {

	// Can be adjusted by the user
	cacheLength: 50,

	createPseudo: markFunction,

	match: matchExpr,

	attrHandle: {},

	find: {},

	relative: {
		">": { dir: "parentNode", first: true },
		" ": { dir: "parentNode" },
		"+": { dir: "previousSibling", first: true },
		"~": { dir: "previousSibling" }
	},

	preFilter: {
		"ATTR": function( match ) {
			match[1] = match[1].replace( runescape, funescape );

			// Move the given value to match[3] whether quoted or unquoted
			match[3] = ( match[4] || match[5] || "" ).replace( runescape, funescape );

			if ( match[2] === "~=" ) {
				match[3] = " " + match[3] + " ";
			}

			return match.slice( 0, 4 );
		},

		"CHILD": function( match ) {
			/* matches from matchExpr["CHILD"]
				1 type (only|nth|...)
				2 what (child|of-type)
				3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
				4 xn-component of xn+y argument ([+-]?\d*n|)
				5 sign of xn-component
				6 x of xn-component
				7 sign of y-component
				8 y of y-component
			*/
			match[1] = match[1].toLowerCase();

			if ( match[1].slice( 0, 3 ) === "nth" ) {
				// nth-* requires argument
				if ( !match[3] ) {
					Sizzle.error( match[0] );
				}

				// numeric x and y parameters for Expr.filter.CHILD
				// remember that false/true cast respectively to 0/1
				match[4] = +( match[4] ? match[5] + (match[6] || 1) : 2 * ( match[3] === "even" || match[3] === "odd" ) );
				match[5] = +( ( match[7] + match[8] ) || match[3] === "odd" );

			// other types prohibit arguments
			} else if ( match[3] ) {
				Sizzle.error( match[0] );
			}

			return match;
		},

		"PSEUDO": function( match ) {
			var excess,
				unquoted = !match[5] && match[2];

			if ( matchExpr["CHILD"].test( match[0] ) ) {
				return null;
			}

			// Accept quoted arguments as-is
			if ( match[3] && match[4] !== undefined ) {
				match[2] = match[4];

			// Strip excess characters from unquoted arguments
			} else if ( unquoted && rpseudo.test( unquoted ) &&
				// Get excess from tokenize (recursively)
				(excess = tokenize( unquoted, true )) &&
				// advance to the next closing parenthesis
				(excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length) ) {

				// excess is a negative index
				match[0] = match[0].slice( 0, excess );
				match[2] = unquoted.slice( 0, excess );
			}

			// Return only captures needed by the pseudo filter method (type and argument)
			return match.slice( 0, 3 );
		}
	},

	filter: {

		"TAG": function( nodeNameSelector ) {
			var nodeName = nodeNameSelector.replace( runescape, funescape ).toLowerCase();
			return nodeNameSelector === "*" ?
				function() { return true; } :
				function( elem ) {
					return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
				};
		},

		"CLASS": function( className ) {
			var pattern = classCache[ className + " " ];

			return pattern ||
				(pattern = new RegExp( "(^|" + whitespace + ")" + className + "(" + whitespace + "|$)" )) &&
				classCache( className, function( elem ) {
					return pattern.test( typeof elem.className === "string" && elem.className || typeof elem.getAttribute !== strundefined && elem.getAttribute("class") || "" );
				});
		},

		"ATTR": function( name, operator, check ) {
			return function( elem ) {
				var result = Sizzle.attr( elem, name );

				if ( result == null ) {
					return operator === "!=";
				}
				if ( !operator ) {
					return true;
				}

				result += "";

				return operator === "=" ? result === check :
					operator === "!=" ? result !== check :
					operator === "^=" ? check && result.indexOf( check ) === 0 :
					operator === "*=" ? check && result.indexOf( check ) > -1 :
					operator === "$=" ? check && result.slice( -check.length ) === check :
					operator === "~=" ? ( " " + result + " " ).indexOf( check ) > -1 :
					operator === "|=" ? result === check || result.slice( 0, check.length + 1 ) === check + "-" :
					false;
			};
		},

		"CHILD": function( type, what, argument, first, last ) {
			var simple = type.slice( 0, 3 ) !== "nth",
				forward = type.slice( -4 ) !== "last",
				ofType = what === "of-type";

			return first === 1 && last === 0 ?

				// Shortcut for :nth-*(n)
				function( elem ) {
					return !!elem.parentNode;
				} :

				function( elem, context, xml ) {
					var cache, outerCache, node, diff, nodeIndex, start,
						dir = simple !== forward ? "nextSibling" : "previousSibling",
						parent = elem.parentNode,
						name = ofType && elem.nodeName.toLowerCase(),
						useCache = !xml && !ofType;

					if ( parent ) {

						// :(first|last|only)-(child|of-type)
						if ( simple ) {
							while ( dir ) {
								node = elem;
								while ( (node = node[ dir ]) ) {
									if ( ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1 ) {
										return false;
									}
								}
								// Reverse direction for :only-* (if we haven't yet done so)
								start = dir = type === "only" && !start && "nextSibling";
							}
							return true;
						}

						start = [ forward ? parent.firstChild : parent.lastChild ];

						// non-xml :nth-child(...) stores cache data on `parent`
						if ( forward && useCache ) {
							// Seek `elem` from a previously-cached index
							outerCache = parent[ expando ] || (parent[ expando ] = {});
							cache = outerCache[ type ] || [];
							nodeIndex = cache[0] === dirruns && cache[1];
							diff = cache[0] === dirruns && cache[2];
							node = nodeIndex && parent.childNodes[ nodeIndex ];

							while ( (node = ++nodeIndex && node && node[ dir ] ||

								// Fallback to seeking `elem` from the start
								(diff = nodeIndex = 0) || start.pop()) ) {

								// When found, cache indexes on `parent` and break
								if ( node.nodeType === 1 && ++diff && node === elem ) {
									outerCache[ type ] = [ dirruns, nodeIndex, diff ];
									break;
								}
							}

						// Use previously-cached element index if available
						} else if ( useCache && (cache = (elem[ expando ] || (elem[ expando ] = {}))[ type ]) && cache[0] === dirruns ) {
							diff = cache[1];

						// xml :nth-child(...) or :nth-last-child(...) or :nth(-last)?-of-type(...)
						} else {
							// Use the same loop as above to seek `elem` from the start
							while ( (node = ++nodeIndex && node && node[ dir ] ||
								(diff = nodeIndex = 0) || start.pop()) ) {

								if ( ( ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1 ) && ++diff ) {
									// Cache the index of each encountered element
									if ( useCache ) {
										(node[ expando ] || (node[ expando ] = {}))[ type ] = [ dirruns, diff ];
									}

									if ( node === elem ) {
										break;
									}
								}
							}
						}

						// Incorporate the offset, then check against cycle size
						diff -= last;
						return diff === first || ( diff % first === 0 && diff / first >= 0 );
					}
				};
		},

		"PSEUDO": function( pseudo, argument ) {
			// pseudo-class names are case-insensitive
			// http://www.w3.org/TR/selectors/#pseudo-classes
			// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
			// Remember that setFilters inherits from pseudos
			var args,
				fn = Expr.pseudos[ pseudo ] || Expr.setFilters[ pseudo.toLowerCase() ] ||
					Sizzle.error( "unsupported pseudo: " + pseudo );

			// The user may use createPseudo to indicate that
			// arguments are needed to create the filter function
			// just as Sizzle does
			if ( fn[ expando ] ) {
				return fn( argument );
			}

			// But maintain support for old signatures
			if ( fn.length > 1 ) {
				args = [ pseudo, pseudo, "", argument ];
				return Expr.setFilters.hasOwnProperty( pseudo.toLowerCase() ) ?
					markFunction(function( seed, matches ) {
						var idx,
							matched = fn( seed, argument ),
							i = matched.length;
						while ( i-- ) {
							idx = indexOf.call( seed, matched[i] );
							seed[ idx ] = !( matches[ idx ] = matched[i] );
						}
					}) :
					function( elem ) {
						return fn( elem, 0, args );
					};
			}

			return fn;
		}
	},

	pseudos: {
		// Potentially complex pseudos
		"not": markFunction(function( selector ) {
			// Trim the selector passed to compile
			// to avoid treating leading and trailing
			// spaces as combinators
			var input = [],
				results = [],
				matcher = compile( selector.replace( rtrim, "$1" ) );

			return matcher[ expando ] ?
				markFunction(function( seed, matches, context, xml ) {
					var elem,
						unmatched = matcher( seed, null, xml, [] ),
						i = seed.length;

					// Match elements unmatched by `matcher`
					while ( i-- ) {
						if ( (elem = unmatched[i]) ) {
							seed[i] = !(matches[i] = elem);
						}
					}
				}) :
				function( elem, context, xml ) {
					input[0] = elem;
					matcher( input, null, xml, results );
					return !results.pop();
				};
		}),

		"has": markFunction(function( selector ) {
			return function( elem ) {
				return Sizzle( selector, elem ).length > 0;
			};
		}),

		"contains": markFunction(function( text ) {
			return function( elem ) {
				return ( elem.textContent || elem.innerText || getText( elem ) ).indexOf( text ) > -1;
			};
		}),

		// "Whether an element is represented by a :lang() selector
		// is based solely on the element's language value
		// being equal to the identifier C,
		// or beginning with the identifier C immediately followed by "-".
		// The matching of C against the element's language value is performed case-insensitively.
		// The identifier C does not have to be a valid language name."
		// http://www.w3.org/TR/selectors/#lang-pseudo
		"lang": markFunction( function( lang ) {
			// lang value must be a valid identifier
			if ( !ridentifier.test(lang || "") ) {
				Sizzle.error( "unsupported lang: " + lang );
			}
			lang = lang.replace( runescape, funescape ).toLowerCase();
			return function( elem ) {
				var elemLang;
				do {
					if ( (elemLang = documentIsHTML ?
						elem.lang :
						elem.getAttribute("xml:lang") || elem.getAttribute("lang")) ) {

						elemLang = elemLang.toLowerCase();
						return elemLang === lang || elemLang.indexOf( lang + "-" ) === 0;
					}
				} while ( (elem = elem.parentNode) && elem.nodeType === 1 );
				return false;
			};
		}),

		// Miscellaneous
		"target": function( elem ) {
			var hash = window.location && window.location.hash;
			return hash && hash.slice( 1 ) === elem.id;
		},

		"root": function( elem ) {
			return elem === docElem;
		},

		"focus": function( elem ) {
			return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
		},

		// Boolean properties
		"enabled": function( elem ) {
			return elem.disabled === false;
		},

		"disabled": function( elem ) {
			return elem.disabled === true;
		},

		"checked": function( elem ) {
			// In CSS3, :checked should return both checked and selected elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			var nodeName = elem.nodeName.toLowerCase();
			return (nodeName === "input" && !!elem.checked) || (nodeName === "option" && !!elem.selected);
		},

		"selected": function( elem ) {
			// Accessing this property makes selected-by-default
			// options in Safari work properly
			if ( elem.parentNode ) {
				elem.parentNode.selectedIndex;
			}

			return elem.selected === true;
		},

		// Contents
		"empty": function( elem ) {
			// http://www.w3.org/TR/selectors/#empty-pseudo
			// :empty is negated by element (1) or content nodes (text: 3; cdata: 4; entity ref: 5),
			//   but not by others (comment: 8; processing instruction: 7; etc.)
			// nodeType < 6 works because attributes (2) do not appear as children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				if ( elem.nodeType < 6 ) {
					return false;
				}
			}
			return true;
		},

		"parent": function( elem ) {
			return !Expr.pseudos["empty"]( elem );
		},

		// Element/input types
		"header": function( elem ) {
			return rheader.test( elem.nodeName );
		},

		"input": function( elem ) {
			return rinputs.test( elem.nodeName );
		},

		"button": function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return name === "input" && elem.type === "button" || name === "button";
		},

		"text": function( elem ) {
			var attr;
			return elem.nodeName.toLowerCase() === "input" &&
				elem.type === "text" &&

				// Support: IE<8
				// New HTML5 attribute values (e.g., "search") appear with elem.type === "text"
				( (attr = elem.getAttribute("type")) == null || attr.toLowerCase() === "text" );
		},

		// Position-in-collection
		"first": createPositionalPseudo(function() {
			return [ 0 ];
		}),

		"last": createPositionalPseudo(function( matchIndexes, length ) {
			return [ length - 1 ];
		}),

		"eq": createPositionalPseudo(function( matchIndexes, length, argument ) {
			return [ argument < 0 ? argument + length : argument ];
		}),

		"even": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 0;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"odd": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 1;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"lt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; --i >= 0; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"gt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; ++i < length; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		})
	}
};

Expr.pseudos["nth"] = Expr.pseudos["eq"];

// Add button/input type pseudos
for ( i in { radio: true, checkbox: true, file: true, password: true, image: true } ) {
	Expr.pseudos[ i ] = createInputPseudo( i );
}
for ( i in { submit: true, reset: true } ) {
	Expr.pseudos[ i ] = createButtonPseudo( i );
}

// Easy API for creating new setFilters
function setFilters() {}
setFilters.prototype = Expr.filters = Expr.pseudos;
Expr.setFilters = new setFilters();

function tokenize( selector, parseOnly ) {
	var matched, match, tokens, type,
		soFar, groups, preFilters,
		cached = tokenCache[ selector + " " ];

	if ( cached ) {
		return parseOnly ? 0 : cached.slice( 0 );
	}

	soFar = selector;
	groups = [];
	preFilters = Expr.preFilter;

	while ( soFar ) {

		// Comma and first run
		if ( !matched || (match = rcomma.exec( soFar )) ) {
			if ( match ) {
				// Don't consume trailing commas as valid
				soFar = soFar.slice( match[0].length ) || soFar;
			}
			groups.push( (tokens = []) );
		}

		matched = false;

		// Combinators
		if ( (match = rcombinators.exec( soFar )) ) {
			matched = match.shift();
			tokens.push({
				value: matched,
				// Cast descendant combinators to space
				type: match[0].replace( rtrim, " " )
			});
			soFar = soFar.slice( matched.length );
		}

		// Filters
		for ( type in Expr.filter ) {
			if ( (match = matchExpr[ type ].exec( soFar )) && (!preFilters[ type ] ||
				(match = preFilters[ type ]( match ))) ) {
				matched = match.shift();
				tokens.push({
					value: matched,
					type: type,
					matches: match
				});
				soFar = soFar.slice( matched.length );
			}
		}

		if ( !matched ) {
			break;
		}
	}

	// Return the length of the invalid excess
	// if we're just parsing
	// Otherwise, throw an error or return tokens
	return parseOnly ?
		soFar.length :
		soFar ?
			Sizzle.error( selector ) :
			// Cache the tokens
			tokenCache( selector, groups ).slice( 0 );
}

function toSelector( tokens ) {
	var i = 0,
		len = tokens.length,
		selector = "";
	for ( ; i < len; i++ ) {
		selector += tokens[i].value;
	}
	return selector;
}

function addCombinator( matcher, combinator, base ) {
	var dir = combinator.dir,
		checkNonElements = base && dir === "parentNode",
		doneName = done++;

	return combinator.first ?
		// Check against closest ancestor/preceding element
		function( elem, context, xml ) {
			while ( (elem = elem[ dir ]) ) {
				if ( elem.nodeType === 1 || checkNonElements ) {
					return matcher( elem, context, xml );
				}
			}
		} :

		// Check against all ancestor/preceding elements
		function( elem, context, xml ) {
			var oldCache, outerCache,
				newCache = [ dirruns, doneName ];

			// We can't set arbitrary data on XML nodes, so they don't benefit from dir caching
			if ( xml ) {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						if ( matcher( elem, context, xml ) ) {
							return true;
						}
					}
				}
			} else {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						outerCache = elem[ expando ] || (elem[ expando ] = {});
						if ( (oldCache = outerCache[ dir ]) &&
							oldCache[ 0 ] === dirruns && oldCache[ 1 ] === doneName ) {

							// Assign to newCache so results back-propagate to previous elements
							return (newCache[ 2 ] = oldCache[ 2 ]);
						} else {
							// Reuse newcache so results back-propagate to previous elements
							outerCache[ dir ] = newCache;

							// A match means we're done; a fail means we have to keep checking
							if ( (newCache[ 2 ] = matcher( elem, context, xml )) ) {
								return true;
							}
						}
					}
				}
			}
		};
}

function elementMatcher( matchers ) {
	return matchers.length > 1 ?
		function( elem, context, xml ) {
			var i = matchers.length;
			while ( i-- ) {
				if ( !matchers[i]( elem, context, xml ) ) {
					return false;
				}
			}
			return true;
		} :
		matchers[0];
}

function condense( unmatched, map, filter, context, xml ) {
	var elem,
		newUnmatched = [],
		i = 0,
		len = unmatched.length,
		mapped = map != null;

	for ( ; i < len; i++ ) {
		if ( (elem = unmatched[i]) ) {
			if ( !filter || filter( elem, context, xml ) ) {
				newUnmatched.push( elem );
				if ( mapped ) {
					map.push( i );
				}
			}
		}
	}

	return newUnmatched;
}

function setMatcher( preFilter, selector, matcher, postFilter, postFinder, postSelector ) {
	if ( postFilter && !postFilter[ expando ] ) {
		postFilter = setMatcher( postFilter );
	}
	if ( postFinder && !postFinder[ expando ] ) {
		postFinder = setMatcher( postFinder, postSelector );
	}
	return markFunction(function( seed, results, context, xml ) {
		var temp, i, elem,
			preMap = [],
			postMap = [],
			preexisting = results.length,

			// Get initial elements from seed or context
			elems = seed || multipleContexts( selector || "*", context.nodeType ? [ context ] : context, [] ),

			// Prefilter to get matcher input, preserving a map for seed-results synchronization
			matcherIn = preFilter && ( seed || !selector ) ?
				condense( elems, preMap, preFilter, context, xml ) :
				elems,

			matcherOut = matcher ?
				// If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
				postFinder || ( seed ? preFilter : preexisting || postFilter ) ?

					// ...intermediate processing is necessary
					[] :

					// ...otherwise use results directly
					results :
				matcherIn;

		// Find primary matches
		if ( matcher ) {
			matcher( matcherIn, matcherOut, context, xml );
		}

		// Apply postFilter
		if ( postFilter ) {
			temp = condense( matcherOut, postMap );
			postFilter( temp, [], context, xml );

			// Un-match failing elements by moving them back to matcherIn
			i = temp.length;
			while ( i-- ) {
				if ( (elem = temp[i]) ) {
					matcherOut[ postMap[i] ] = !(matcherIn[ postMap[i] ] = elem);
				}
			}
		}

		if ( seed ) {
			if ( postFinder || preFilter ) {
				if ( postFinder ) {
					// Get the final matcherOut by condensing this intermediate into postFinder contexts
					temp = [];
					i = matcherOut.length;
					while ( i-- ) {
						if ( (elem = matcherOut[i]) ) {
							// Restore matcherIn since elem is not yet a final match
							temp.push( (matcherIn[i] = elem) );
						}
					}
					postFinder( null, (matcherOut = []), temp, xml );
				}

				// Move matched elements from seed to results to keep them synchronized
				i = matcherOut.length;
				while ( i-- ) {
					if ( (elem = matcherOut[i]) &&
						(temp = postFinder ? indexOf.call( seed, elem ) : preMap[i]) > -1 ) {

						seed[temp] = !(results[temp] = elem);
					}
				}
			}

		// Add elements to results, through postFinder if defined
		} else {
			matcherOut = condense(
				matcherOut === results ?
					matcherOut.splice( preexisting, matcherOut.length ) :
					matcherOut
			);
			if ( postFinder ) {
				postFinder( null, results, matcherOut, xml );
			} else {
				push.apply( results, matcherOut );
			}
		}
	});
}

function matcherFromTokens( tokens ) {
	var checkContext, matcher, j,
		len = tokens.length,
		leadingRelative = Expr.relative[ tokens[0].type ],
		implicitRelative = leadingRelative || Expr.relative[" "],
		i = leadingRelative ? 1 : 0,

		// The foundational matcher ensures that elements are reachable from top-level context(s)
		matchContext = addCombinator( function( elem ) {
			return elem === checkContext;
		}, implicitRelative, true ),
		matchAnyContext = addCombinator( function( elem ) {
			return indexOf.call( checkContext, elem ) > -1;
		}, implicitRelative, true ),
		matchers = [ function( elem, context, xml ) {
			return ( !leadingRelative && ( xml || context !== outermostContext ) ) || (
				(checkContext = context).nodeType ?
					matchContext( elem, context, xml ) :
					matchAnyContext( elem, context, xml ) );
		} ];

	for ( ; i < len; i++ ) {
		if ( (matcher = Expr.relative[ tokens[i].type ]) ) {
			matchers = [ addCombinator(elementMatcher( matchers ), matcher) ];
		} else {
			matcher = Expr.filter[ tokens[i].type ].apply( null, tokens[i].matches );

			// Return special upon seeing a positional matcher
			if ( matcher[ expando ] ) {
				// Find the next relative operator (if any) for proper handling
				j = ++i;
				for ( ; j < len; j++ ) {
					if ( Expr.relative[ tokens[j].type ] ) {
						break;
					}
				}
				return setMatcher(
					i > 1 && elementMatcher( matchers ),
					i > 1 && toSelector(
						// If the preceding token was a descendant combinator, insert an implicit any-element `*`
						tokens.slice( 0, i - 1 ).concat({ value: tokens[ i - 2 ].type === " " ? "*" : "" })
					).replace( rtrim, "$1" ),
					matcher,
					i < j && matcherFromTokens( tokens.slice( i, j ) ),
					j < len && matcherFromTokens( (tokens = tokens.slice( j )) ),
					j < len && toSelector( tokens )
				);
			}
			matchers.push( matcher );
		}
	}

	return elementMatcher( matchers );
}

function matcherFromGroupMatchers( elementMatchers, setMatchers ) {
	var bySet = setMatchers.length > 0,
		byElement = elementMatchers.length > 0,
		superMatcher = function( seed, context, xml, results, outermost ) {
			var elem, j, matcher,
				matchedCount = 0,
				i = "0",
				unmatched = seed && [],
				setMatched = [],
				contextBackup = outermostContext,
				// We must always have either seed elements or outermost context
				elems = seed || byElement && Expr.find["TAG"]( "*", outermost ),
				// Use integer dirruns iff this is the outermost matcher
				dirrunsUnique = (dirruns += contextBackup == null ? 1 : Math.random() || 0.1),
				len = elems.length;

			if ( outermost ) {
				outermostContext = context !== document && context;
			}

			// Add elements passing elementMatchers directly to results
			// Keep `i` a string if there are no elements so `matchedCount` will be "00" below
			// Support: IE<9, Safari
			// Tolerate NodeList properties (IE: "length"; Safari: <number>) matching elements by id
			for ( ; i !== len && (elem = elems[i]) != null; i++ ) {
				if ( byElement && elem ) {
					j = 0;
					while ( (matcher = elementMatchers[j++]) ) {
						if ( matcher( elem, context, xml ) ) {
							results.push( elem );
							break;
						}
					}
					if ( outermost ) {
						dirruns = dirrunsUnique;
					}
				}

				// Track unmatched elements for set filters
				if ( bySet ) {
					// They will have gone through all possible matchers
					if ( (elem = !matcher && elem) ) {
						matchedCount--;
					}

					// Lengthen the array for every element, matched or not
					if ( seed ) {
						unmatched.push( elem );
					}
				}
			}

			// Apply set filters to unmatched elements
			matchedCount += i;
			if ( bySet && i !== matchedCount ) {
				j = 0;
				while ( (matcher = setMatchers[j++]) ) {
					matcher( unmatched, setMatched, context, xml );
				}

				if ( seed ) {
					// Reintegrate element matches to eliminate the need for sorting
					if ( matchedCount > 0 ) {
						while ( i-- ) {
							if ( !(unmatched[i] || setMatched[i]) ) {
								setMatched[i] = pop.call( results );
							}
						}
					}

					// Discard index placeholder values to get only actual matches
					setMatched = condense( setMatched );
				}

				// Add matches to results
				push.apply( results, setMatched );

				// Seedless set matches succeeding multiple successful matchers stipulate sorting
				if ( outermost && !seed && setMatched.length > 0 &&
					( matchedCount + setMatchers.length ) > 1 ) {

					Sizzle.uniqueSort( results );
				}
			}

			// Override manipulation of globals by nested matchers
			if ( outermost ) {
				dirruns = dirrunsUnique;
				outermostContext = contextBackup;
			}

			return unmatched;
		};

	return bySet ?
		markFunction( superMatcher ) :
		superMatcher;
}

compile = Sizzle.compile = function( selector, group /* Internal Use Only */ ) {
	var i,
		setMatchers = [],
		elementMatchers = [],
		cached = compilerCache[ selector + " " ];

	if ( !cached ) {
		// Generate a function of recursive functions that can be used to check each element
		if ( !group ) {
			group = tokenize( selector );
		}
		i = group.length;
		while ( i-- ) {
			cached = matcherFromTokens( group[i] );
			if ( cached[ expando ] ) {
				setMatchers.push( cached );
			} else {
				elementMatchers.push( cached );
			}
		}

		// Cache the compiled function
		cached = compilerCache( selector, matcherFromGroupMatchers( elementMatchers, setMatchers ) );
	}
	return cached;
};

function multipleContexts( selector, contexts, results ) {
	var i = 0,
		len = contexts.length;
	for ( ; i < len; i++ ) {
		Sizzle( selector, contexts[i], results );
	}
	return results;
}

function select( selector, context, results, seed ) {
	var i, tokens, token, type, find,
		match = tokenize( selector );

	if ( !seed ) {
		// Try to minimize operations if there is only one group
		if ( match.length === 1 ) {

			// Take a shortcut and set the context if the root selector is an ID
			tokens = match[0] = match[0].slice( 0 );
			if ( tokens.length > 2 && (token = tokens[0]).type === "ID" &&
					support.getById && context.nodeType === 9 && documentIsHTML &&
					Expr.relative[ tokens[1].type ] ) {

				context = ( Expr.find["ID"]( token.matches[0].replace(runescape, funescape), context ) || [] )[0];
				if ( !context ) {
					return results;
				}
				selector = selector.slice( tokens.shift().value.length );
			}

			// Fetch a seed set for right-to-left matching
			i = matchExpr["needsContext"].test( selector ) ? 0 : tokens.length;
			while ( i-- ) {
				token = tokens[i];

				// Abort if we hit a combinator
				if ( Expr.relative[ (type = token.type) ] ) {
					break;
				}
				if ( (find = Expr.find[ type ]) ) {
					// Search, expanding context for leading sibling combinators
					if ( (seed = find(
						token.matches[0].replace( runescape, funescape ),
						rsibling.test( tokens[0].type ) && testContext( context.parentNode ) || context
					)) ) {

						// If seed is empty or no tokens remain, we can return early
						tokens.splice( i, 1 );
						selector = seed.length && toSelector( tokens );
						if ( !selector ) {
							push.apply( results, seed );
							return results;
						}

						break;
					}
				}
			}
		}
	}

	// Compile and execute a filtering function
	// Provide `match` to avoid retokenization if we modified the selector above
	compile( selector, match )(
		seed,
		context,
		!documentIsHTML,
		results,
		rsibling.test( selector ) && testContext( context.parentNode ) || context
	);
	return results;
}

// One-time assignments

// Sort stability
support.sortStable = expando.split("").sort( sortOrder ).join("") === expando;

// Support: Chrome<14
// Always assume duplicates if they aren't passed to the comparison function
support.detectDuplicates = !!hasDuplicate;

// Initialize against the default document
setDocument();

// Support: Webkit<537.32 - Safari 6.0.3/Chrome 25 (fixed in Chrome 27)
// Detached nodes confoundingly follow *each other*
support.sortDetached = assert(function( div1 ) {
	// Should return 1, but returns 4 (following)
	return div1.compareDocumentPosition( document.createElement("div") ) & 1;
});

// Support: IE<8
// Prevent attribute/property "interpolation"
// http://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
if ( !assert(function( div ) {
	div.innerHTML = "<a href='#'></a>";
	return div.firstChild.getAttribute("href") === "#" ;
}) ) {
	addHandle( "type|href|height|width", function( elem, name, isXML ) {
		if ( !isXML ) {
			return elem.getAttribute( name, name.toLowerCase() === "type" ? 1 : 2 );
		}
	});
}

// Support: IE<9
// Use defaultValue in place of getAttribute("value")
if ( !support.attributes || !assert(function( div ) {
	div.innerHTML = "<input/>";
	div.firstChild.setAttribute( "value", "" );
	return div.firstChild.getAttribute( "value" ) === "";
}) ) {
	addHandle( "value", function( elem, name, isXML ) {
		if ( !isXML && elem.nodeName.toLowerCase() === "input" ) {
			return elem.defaultValue;
		}
	});
}

// Support: IE<9
// Use getAttributeNode to fetch booleans when getAttribute lies
if ( !assert(function( div ) {
	return div.getAttribute("disabled") == null;
}) ) {
	addHandle( booleans, function( elem, name, isXML ) {
		var val;
		if ( !isXML ) {
			return elem[ name ] === true ? name.toLowerCase() :
					(val = elem.getAttributeNode( name )) && val.specified ?
					val.value :
				null;
		}
	});
}

return Sizzle;

})( window );



jQuery.find = Sizzle;
jQuery.expr = Sizzle.selectors;
jQuery.expr[":"] = jQuery.expr.pseudos;
jQuery.unique = Sizzle.uniqueSort;
jQuery.text = Sizzle.getText;
jQuery.isXMLDoc = Sizzle.isXML;
jQuery.contains = Sizzle.contains;



var rneedsContext = jQuery.expr.match.needsContext;

var rsingleTag = (/^<(\w+)\s*\/?>(?:<\/\1>|)$/);



var risSimple = /^.[^:#\[\.,]*$/;

// Implement the identical functionality for filter and not
function winnow( elements, qualifier, not ) {
	if ( jQuery.isFunction( qualifier ) ) {
		return jQuery.grep( elements, function( elem, i ) {
			/* jshint -W018 */
			return !!qualifier.call( elem, i, elem ) !== not;
		});

	}

	if ( qualifier.nodeType ) {
		return jQuery.grep( elements, function( elem ) {
			return ( elem === qualifier ) !== not;
		});

	}

	if ( typeof qualifier === "string" ) {
		if ( risSimple.test( qualifier ) ) {
			return jQuery.filter( qualifier, elements, not );
		}

		qualifier = jQuery.filter( qualifier, elements );
	}

	return jQuery.grep( elements, function( elem ) {
		return ( jQuery.inArray( elem, qualifier ) >= 0 ) !== not;
	});
}

jQuery.filter = function( expr, elems, not ) {
	var elem = elems[ 0 ];

	if ( not ) {
		expr = ":not(" + expr + ")";
	}

	return elems.length === 1 && elem.nodeType === 1 ?
		jQuery.find.matchesSelector( elem, expr ) ? [ elem ] : [] :
		jQuery.find.matches( expr, jQuery.grep( elems, function( elem ) {
			return elem.nodeType === 1;
		}));
};

jQuery.fn.extend({
	find: function( selector ) {
		var i,
			ret = [],
			self = this,
			len = self.length;

		if ( typeof selector !== "string" ) {
			return this.pushStack( jQuery( selector ).filter(function() {
				for ( i = 0; i < len; i++ ) {
					if ( jQuery.contains( self[ i ], this ) ) {
						return true;
					}
				}
			}) );
		}

		for ( i = 0; i < len; i++ ) {
			jQuery.find( selector, self[ i ], ret );
		}

		// Needed because $( selector, context ) becomes $( context ).find( selector )
		ret = this.pushStack( len > 1 ? jQuery.unique( ret ) : ret );
		ret.selector = this.selector ? this.selector + " " + selector : selector;
		return ret;
	},
	filter: function( selector ) {
		return this.pushStack( winnow(this, selector || [], false) );
	},
	not: function( selector ) {
		return this.pushStack( winnow(this, selector || [], true) );
	},
	is: function( selector ) {
		return !!winnow(
			this,

			// If this is a positional/relative selector, check membership in the returned set
			// so $("p:first").is("p:last") won't return true for a doc with two "p".
			typeof selector === "string" && rneedsContext.test( selector ) ?
				jQuery( selector ) :
				selector || [],
			false
		).length;
	}
});


// Initialize a jQuery object


// A central reference to the root jQuery(document)
var rootjQuery,

	// Use the correct document accordingly with window argument (sandbox)
	document = window.document,

	// A simple way to check for HTML strings
	// Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
	// Strict HTML recognition (#11290: must start with <)
	rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/,

	init = jQuery.fn.init = function( selector, context ) {
		var match, elem;

		// HANDLE: $(""), $(null), $(undefined), $(false)
		if ( !selector ) {
			return this;
		}

		// Handle HTML strings
		if ( typeof selector === "string" ) {
			if ( selector.charAt(0) === "<" && selector.charAt( selector.length - 1 ) === ">" && selector.length >= 3 ) {
				// Assume that strings that start and end with <> are HTML and skip the regex check
				match = [ null, selector, null ];

			} else {
				match = rquickExpr.exec( selector );
			}

			// Match html or make sure no context is specified for #id
			if ( match && (match[1] || !context) ) {

				// HANDLE: $(html) -> $(array)
				if ( match[1] ) {
					context = context instanceof jQuery ? context[0] : context;

					// scripts is true for back-compat
					// Intentionally let the error be thrown if parseHTML is not present
					jQuery.merge( this, jQuery.parseHTML(
						match[1],
						context && context.nodeType ? context.ownerDocument || context : document,
						true
					) );

					// HANDLE: $(html, props)
					if ( rsingleTag.test( match[1] ) && jQuery.isPlainObject( context ) ) {
						for ( match in context ) {
							// Properties of context are called as methods if possible
							if ( jQuery.isFunction( this[ match ] ) ) {
								this[ match ]( context[ match ] );

							// ...and otherwise set as attributes
							} else {
								this.attr( match, context[ match ] );
							}
						}
					}

					return this;

				// HANDLE: $(#id)
				} else {
					elem = document.getElementById( match[2] );

					// Check parentNode to catch when Blackberry 4.6 returns
					// nodes that are no longer in the document #6963
					if ( elem && elem.parentNode ) {
						// Handle the case where IE and Opera return items
						// by name instead of ID
						if ( elem.id !== match[2] ) {
							return rootjQuery.find( selector );
						}

						// Otherwise, we inject the element directly into the jQuery object
						this.length = 1;
						this[0] = elem;
					}

					this.context = document;
					this.selector = selector;
					return this;
				}

			// HANDLE: $(expr, $(...))
			} else if ( !context || context.jquery ) {
				return ( context || rootjQuery ).find( selector );

			// HANDLE: $(expr, context)
			// (which is just equivalent to: $(context).find(expr)
			} else {
				return this.constructor( context ).find( selector );
			}

		// HANDLE: $(DOMElement)
		} else if ( selector.nodeType ) {
			this.context = this[0] = selector;
			this.length = 1;
			return this;

		// HANDLE: $(function)
		// Shortcut for document ready
		} else if ( jQuery.isFunction( selector ) ) {
			return typeof rootjQuery.ready !== "undefined" ?
				rootjQuery.ready( selector ) :
				// Execute immediately if ready is not present
				selector( jQuery );
		}

		if ( selector.selector !== undefined ) {
			this.selector = selector.selector;
			this.context = selector.context;
		}

		return jQuery.makeArray( selector, this );
	};

// Give the init function the jQuery prototype for later instantiation
init.prototype = jQuery.fn;

// Initialize central reference
rootjQuery = jQuery( document );


var rparentsprev = /^(?:parents|prev(?:Until|All))/,
	// methods guaranteed to produce a unique set when starting from a unique set
	guaranteedUnique = {
		children: true,
		contents: true,
		next: true,
		prev: true
	};

jQuery.extend({
	dir: function( elem, dir, until ) {
		var matched = [],
			cur = elem[ dir ];

		while ( cur && cur.nodeType !== 9 && (until === undefined || cur.nodeType !== 1 || !jQuery( cur ).is( until )) ) {
			if ( cur.nodeType === 1 ) {
				matched.push( cur );
			}
			cur = cur[dir];
		}
		return matched;
	},

	sibling: function( n, elem ) {
		var r = [];

		for ( ; n; n = n.nextSibling ) {
			if ( n.nodeType === 1 && n !== elem ) {
				r.push( n );
			}
		}

		return r;
	}
});

jQuery.fn.extend({
	has: function( target ) {
		var i,
			targets = jQuery( target, this ),
			len = targets.length;

		return this.filter(function() {
			for ( i = 0; i < len; i++ ) {
				if ( jQuery.contains( this, targets[i] ) ) {
					return true;
				}
			}
		});
	},

	closest: function( selectors, context ) {
		var cur,
			i = 0,
			l = this.length,
			matched = [],
			pos = rneedsContext.test( selectors ) || typeof selectors !== "string" ?
				jQuery( selectors, context || this.context ) :
				0;

		for ( ; i < l; i++ ) {
			for ( cur = this[i]; cur && cur !== context; cur = cur.parentNode ) {
				// Always skip document fragments
				if ( cur.nodeType < 11 && (pos ?
					pos.index(cur) > -1 :

					// Don't pass non-elements to Sizzle
					cur.nodeType === 1 &&
						jQuery.find.matchesSelector(cur, selectors)) ) {

					matched.push( cur );
					break;
				}
			}
		}

		return this.pushStack( matched.length > 1 ? jQuery.unique( matched ) : matched );
	},

	// Determine the position of an element within
	// the matched set of elements
	index: function( elem ) {

		// No argument, return index in parent
		if ( !elem ) {
			return ( this[0] && this[0].parentNode ) ? this.first().prevAll().length : -1;
		}

		// index in selector
		if ( typeof elem === "string" ) {
			return jQuery.inArray( this[0], jQuery( elem ) );
		}

		// Locate the position of the desired element
		return jQuery.inArray(
			// If it receives a jQuery object, the first element is used
			elem.jquery ? elem[0] : elem, this );
	},

	add: function( selector, context ) {
		return this.pushStack(
			jQuery.unique(
				jQuery.merge( this.get(), jQuery( selector, context ) )
			)
		);
	},

	addBack: function( selector ) {
		return this.add( selector == null ?
			this.prevObject : this.prevObject.filter(selector)
		);
	}
});

function sibling( cur, dir ) {
	do {
		cur = cur[ dir ];
	} while ( cur && cur.nodeType !== 1 );

	return cur;
}

jQuery.each({
	parent: function( elem ) {
		var parent = elem.parentNode;
		return parent && parent.nodeType !== 11 ? parent : null;
	},
	parents: function( elem ) {
		return jQuery.dir( elem, "parentNode" );
	},
	parentsUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "parentNode", until );
	},
	next: function( elem ) {
		return sibling( elem, "nextSibling" );
	},
	prev: function( elem ) {
		return sibling( elem, "previousSibling" );
	},
	nextAll: function( elem ) {
		return jQuery.dir( elem, "nextSibling" );
	},
	prevAll: function( elem ) {
		return jQuery.dir( elem, "previousSibling" );
	},
	nextUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "nextSibling", until );
	},
	prevUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "previousSibling", until );
	},
	siblings: function( elem ) {
		return jQuery.sibling( ( elem.parentNode || {} ).firstChild, elem );
	},
	children: function( elem ) {
		return jQuery.sibling( elem.firstChild );
	},
	contents: function( elem ) {
		return jQuery.nodeName( elem, "iframe" ) ?
			elem.contentDocument || elem.contentWindow.document :
			jQuery.merge( [], elem.childNodes );
	}
}, function( name, fn ) {
	jQuery.fn[ name ] = function( until, selector ) {
		var ret = jQuery.map( this, fn, until );

		if ( name.slice( -5 ) !== "Until" ) {
			selector = until;
		}

		if ( selector && typeof selector === "string" ) {
			ret = jQuery.filter( selector, ret );
		}

		if ( this.length > 1 ) {
			// Remove duplicates
			if ( !guaranteedUnique[ name ] ) {
				ret = jQuery.unique( ret );
			}

			// Reverse order for parents* and prev-derivatives
			if ( rparentsprev.test( name ) ) {
				ret = ret.reverse();
			}
		}

		return this.pushStack( ret );
	};
});
var rnotwhite = (/\S+/g);



// String to Object options format cache
var optionsCache = {};

// Convert String-formatted options into Object-formatted ones and store in cache
function createOptions( options ) {
	var object = optionsCache[ options ] = {};
	jQuery.each( options.match( rnotwhite ) || [], function( _, flag ) {
		object[ flag ] = true;
	});
	return object;
}

/*
 * Create a callback list using the following parameters:
 *
 *	options: an optional list of space-separated options that will change how
 *			the callback list behaves or a more traditional option object
 *
 * By default a callback list will act like an event callback list and can be
 * "fired" multiple times.
 *
 * Possible options:
 *
 *	once:			will ensure the callback list can only be fired once (like a Deferred)
 *
 *	memory:			will keep track of previous values and will call any callback added
 *					after the list has been fired right away with the latest "memorized"
 *					values (like a Deferred)
 *
 *	unique:			will ensure a callback can only be added once (no duplicate in the list)
 *
 *	stopOnFalse:	interrupt callings when a callback returns false
 *
 */
jQuery.Callbacks = function( options ) {

	// Convert options from String-formatted to Object-formatted if needed
	// (we check in cache first)
	options = typeof options === "string" ?
		( optionsCache[ options ] || createOptions( options ) ) :
		jQuery.extend( {}, options );

	var // Flag to know if list is currently firing
		firing,
		// Last fire value (for non-forgettable lists)
		memory,
		// Flag to know if list was already fired
		fired,
		// End of the loop when firing
		firingLength,
		// Index of currently firing callback (modified by remove if needed)
		firingIndex,
		// First callback to fire (used internally by add and fireWith)
		firingStart,
		// Actual callback list
		list = [],
		// Stack of fire calls for repeatable lists
		stack = !options.once && [],
		// Fire callbacks
		fire = function( data ) {
			memory = options.memory && data;
			fired = true;
			firingIndex = firingStart || 0;
			firingStart = 0;
			firingLength = list.length;
			firing = true;
			for ( ; list && firingIndex < firingLength; firingIndex++ ) {
				if ( list[ firingIndex ].apply( data[ 0 ], data[ 1 ] ) === false && options.stopOnFalse ) {
					memory = false; // To prevent further calls using add
					break;
				}
			}
			firing = false;
			if ( list ) {
				if ( stack ) {
					if ( stack.length ) {
						fire( stack.shift() );
					}
				} else if ( memory ) {
					list = [];
				} else {
					self.disable();
				}
			}
		},
		// Actual Callbacks object
		self = {
			// Add a callback or a collection of callbacks to the list
			add: function() {
				if ( list ) {
					// First, we save the current length
					var start = list.length;
					(function add( args ) {
						jQuery.each( args, function( _, arg ) {
							var type = jQuery.type( arg );
							if ( type === "function" ) {
								if ( !options.unique || !self.has( arg ) ) {
									list.push( arg );
								}
							} else if ( arg && arg.length && type !== "string" ) {
								// Inspect recursively
								add( arg );
							}
						});
					})( arguments );
					// Do we need to add the callbacks to the
					// current firing batch?
					if ( firing ) {
						firingLength = list.length;
					// With memory, if we're not firing then
					// we should call right away
					} else if ( memory ) {
						firingStart = start;
						fire( memory );
					}
				}
				return this;
			},
			// Remove a callback from the list
			remove: function() {
				if ( list ) {
					jQuery.each( arguments, function( _, arg ) {
						var index;
						while ( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
							list.splice( index, 1 );
							// Handle firing indexes
							if ( firing ) {
								if ( index <= firingLength ) {
									firingLength--;
								}
								if ( index <= firingIndex ) {
									firingIndex--;
								}
							}
						}
					});
				}
				return this;
			},
			// Check if a given callback is in the list.
			// If no argument is given, return whether or not list has callbacks attached.
			has: function( fn ) {
				return fn ? jQuery.inArray( fn, list ) > -1 : !!( list && list.length );
			},
			// Remove all callbacks from the list
			empty: function() {
				list = [];
				firingLength = 0;
				return this;
			},
			// Have the list do nothing anymore
			disable: function() {
				list = stack = memory = undefined;
				return this;
			},
			// Is it disabled?
			disabled: function() {
				return !list;
			},
			// Lock the list in its current state
			lock: function() {
				stack = undefined;
				if ( !memory ) {
					self.disable();
				}
				return this;
			},
			// Is it locked?
			locked: function() {
				return !stack;
			},
			// Call all callbacks with the given context and arguments
			fireWith: function( context, args ) {
				if ( list && ( !fired || stack ) ) {
					args = args || [];
					args = [ context, args.slice ? args.slice() : args ];
					if ( firing ) {
						stack.push( args );
					} else {
						fire( args );
					}
				}
				return this;
			},
			// Call all the callbacks with the given arguments
			fire: function() {
				self.fireWith( this, arguments );
				return this;
			},
			// To know if the callbacks have already been called at least once
			fired: function() {
				return !!fired;
			}
		};

	return self;
};


jQuery.extend({

	Deferred: function( func ) {
		var tuples = [
				// action, add listener, listener list, final state
				[ "resolve", "done", jQuery.Callbacks("once memory"), "resolved" ],
				[ "reject", "fail", jQuery.Callbacks("once memory"), "rejected" ],
				[ "notify", "progress", jQuery.Callbacks("memory") ]
			],
			state = "pending",
			promise = {
				state: function() {
					return state;
				},
				always: function() {
					deferred.done( arguments ).fail( arguments );
					return this;
				},
				then: function( /* fnDone, fnFail, fnProgress */ ) {
					var fns = arguments;
					return jQuery.Deferred(function( newDefer ) {
						jQuery.each( tuples, function( i, tuple ) {
							var fn = jQuery.isFunction( fns[ i ] ) && fns[ i ];
							// deferred[ done | fail | progress ] for forwarding actions to newDefer
							deferred[ tuple[1] ](function() {
								var returned = fn && fn.apply( this, arguments );
								if ( returned && jQuery.isFunction( returned.promise ) ) {
									returned.promise()
										.done( newDefer.resolve )
										.fail( newDefer.reject )
										.progress( newDefer.notify );
								} else {
									newDefer[ tuple[ 0 ] + "With" ]( this === promise ? newDefer.promise() : this, fn ? [ returned ] : arguments );
								}
							});
						});
						fns = null;
					}).promise();
				},
				// Get a promise for this deferred
				// If obj is provided, the promise aspect is added to the object
				promise: function( obj ) {
					return obj != null ? jQuery.extend( obj, promise ) : promise;
				}
			},
			deferred = {};

		// Keep pipe for back-compat
		promise.pipe = promise.then;

		// Add list-specific methods
		jQuery.each( tuples, function( i, tuple ) {
			var list = tuple[ 2 ],
				stateString = tuple[ 3 ];

			// promise[ done | fail | progress ] = list.add
			promise[ tuple[1] ] = list.add;

			// Handle state
			if ( stateString ) {
				list.add(function() {
					// state = [ resolved | rejected ]
					state = stateString;

				// [ reject_list | resolve_list ].disable; progress_list.lock
				}, tuples[ i ^ 1 ][ 2 ].disable, tuples[ 2 ][ 2 ].lock );
			}

			// deferred[ resolve | reject | notify ]
			deferred[ tuple[0] ] = function() {
				deferred[ tuple[0] + "With" ]( this === deferred ? promise : this, arguments );
				return this;
			};
			deferred[ tuple[0] + "With" ] = list.fireWith;
		});

		// Make the deferred a promise
		promise.promise( deferred );

		// Call given func if any
		if ( func ) {
			func.call( deferred, deferred );
		}

		// All done!
		return deferred;
	},

	// Deferred helper
	when: function( subordinate /* , ..., subordinateN */ ) {
		var i = 0,
			resolveValues = slice.call( arguments ),
			length = resolveValues.length,

			// the count of uncompleted subordinates
			remaining = length !== 1 || ( subordinate && jQuery.isFunction( subordinate.promise ) ) ? length : 0,

			// the master Deferred. If resolveValues consist of only a single Deferred, just use that.
			deferred = remaining === 1 ? subordinate : jQuery.Deferred(),

			// Update function for both resolve and progress values
			updateFunc = function( i, contexts, values ) {
				return function( value ) {
					contexts[ i ] = this;
					values[ i ] = arguments.length > 1 ? slice.call( arguments ) : value;
					if ( values === progressValues ) {
						deferred.notifyWith( contexts, values );

					} else if ( !(--remaining) ) {
						deferred.resolveWith( contexts, values );
					}
				};
			},

			progressValues, progressContexts, resolveContexts;

		// add listeners to Deferred subordinates; treat others as resolved
		if ( length > 1 ) {
			progressValues = new Array( length );
			progressContexts = new Array( length );
			resolveContexts = new Array( length );
			for ( ; i < length; i++ ) {
				if ( resolveValues[ i ] && jQuery.isFunction( resolveValues[ i ].promise ) ) {
					resolveValues[ i ].promise()
						.done( updateFunc( i, resolveContexts, resolveValues ) )
						.fail( deferred.reject )
						.progress( updateFunc( i, progressContexts, progressValues ) );
				} else {
					--remaining;
				}
			}
		}

		// if we're not waiting on anything, resolve the master
		if ( !remaining ) {
			deferred.resolveWith( resolveContexts, resolveValues );
		}

		return deferred.promise();
	}
});
var strundefined = typeof undefined;



// Support: IE<9
// Iteration over object's inherited properties before its own
var i;
for ( i in jQuery( support ) ) {
	break;
}
support.ownLast = i !== "0";

// Note: most support tests are defined in their respective modules.
// false until the test is run
support.inlineBlockNeedsLayout = false;

jQuery(function() {
	// We need to execute this one support test ASAP because we need to know
	// if body.style.zoom needs to be set.

	var container, div,
		body = document.getElementsByTagName("body")[0];

	if ( !body ) {
		// Return for frameset docs that don't have a body
		return;
	}

	// Setup
	container = document.createElement( "div" );
	container.style.cssText = "border:0;width:0;height:0;position:absolute;top:0;left:-9999px;margin-top:1px";

	div = document.createElement( "div" );
	body.appendChild( container ).appendChild( div );

	if ( typeof div.style.zoom !== strundefined ) {
		// Support: IE<8
		// Check if natively block-level elements act like inline-block
		// elements when setting their display to 'inline' and giving
		// them layout
		div.style.cssText = "border:0;margin:0;width:1px;padding:1px;display:inline;zoom:1";

		if ( (support.inlineBlockNeedsLayout = ( div.offsetWidth === 3 )) ) {
			// Prevent IE 6 from affecting layout for positioned elements #11048
			// Prevent IE from shrinking the body in IE 7 mode #12869
			// Support: IE<8
			body.style.zoom = 1;
		}
	}

	body.removeChild( container );

	// Null elements to avoid leaks in IE
	container = div = null;
});




(function() {
	var div = document.createElement( "div" );

	// Execute the test only if not already executed in another module.
	if (support.deleteExpando == null) {
		// Support: IE<9
		support.deleteExpando = true;
		try {
			delete div.test;
		} catch( e ) {
			support.deleteExpando = false;
		}
	}

	// Null elements to avoid leaks in IE.
	div = null;
})();


/**
 * Determines whether an object can have data
 */
jQuery.acceptData = function( elem ) {
	var noData = jQuery.noData[ (elem.nodeName + " ").toLowerCase() ],
		nodeType = +elem.nodeType || 1;

	// Do not set data on non-element DOM nodes because it will not be cleared (#8335).
	return nodeType !== 1 && nodeType !== 9 ?
		false :

		// Nodes accept data unless otherwise specified; rejection can be conditional
		!noData || noData !== true && elem.getAttribute("classid") === noData;
};


var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,
	rmultiDash = /([A-Z])/g;

function dataAttr( elem, key, data ) {
	// If nothing was found internally, try to fetch any
	// data from the HTML5 data-* attribute
	if ( data === undefined && elem.nodeType === 1 ) {

		var name = "data-" + key.replace( rmultiDash, "-$1" ).toLowerCase();

		data = elem.getAttribute( name );

		if ( typeof data === "string" ) {
			try {
				data = data === "true" ? true :
					data === "false" ? false :
					data === "null" ? null :
					// Only convert to a number if it doesn't change the string
					+data + "" === data ? +data :
					rbrace.test( data ) ? jQuery.parseJSON( data ) :
					data;
			} catch( e ) {}

			// Make sure we set the data so it isn't changed later
			jQuery.data( elem, key, data );

		} else {
			data = undefined;
		}
	}

	return data;
}

// checks a cache object for emptiness
function isEmptyDataObject( obj ) {
	var name;
	for ( name in obj ) {

		// if the public data object is empty, the private is still empty
		if ( name === "data" && jQuery.isEmptyObject( obj[name] ) ) {
			continue;
		}
		if ( name !== "toJSON" ) {
			return false;
		}
	}

	return true;
}

function internalData( elem, name, data, pvt /* Internal Use Only */ ) {
	if ( !jQuery.acceptData( elem ) ) {
		return;
	}

	var ret, thisCache,
		internalKey = jQuery.expando,

		// We have to handle DOM nodes and JS objects differently because IE6-7
		// can't GC object references properly across the DOM-JS boundary
		isNode = elem.nodeType,

		// Only DOM nodes need the global jQuery cache; JS object data is
		// attached directly to the object so GC can occur automatically
		cache = isNode ? jQuery.cache : elem,

		// Only defining an ID for JS objects if its cache already exists allows
		// the code to shortcut on the same path as a DOM node with no cache
		id = isNode ? elem[ internalKey ] : elem[ internalKey ] && internalKey;

	// Avoid doing any more work than we need to when trying to get data on an
	// object that has no data at all
	if ( (!id || !cache[id] || (!pvt && !cache[id].data)) && data === undefined && typeof name === "string" ) {
		return;
	}

	if ( !id ) {
		// Only DOM nodes need a new unique ID for each element since their data
		// ends up in the global cache
		if ( isNode ) {
			id = elem[ internalKey ] = deletedIds.pop() || jQuery.guid++;
		} else {
			id = internalKey;
		}
	}

	if ( !cache[ id ] ) {
		// Avoid exposing jQuery metadata on plain JS objects when the object
		// is serialized using JSON.stringify
		cache[ id ] = isNode ? {} : { toJSON: jQuery.noop };
	}

	// An object can be passed to jQuery.data instead of a key/value pair; this gets
	// shallow copied over onto the existing cache
	if ( typeof name === "object" || typeof name === "function" ) {
		if ( pvt ) {
			cache[ id ] = jQuery.extend( cache[ id ], name );
		} else {
			cache[ id ].data = jQuery.extend( cache[ id ].data, name );
		}
	}

	thisCache = cache[ id ];

	// jQuery data() is stored in a separate object inside the object's internal data
	// cache in order to avoid key collisions between internal data and user-defined
	// data.
	if ( !pvt ) {
		if ( !thisCache.data ) {
			thisCache.data = {};
		}

		thisCache = thisCache.data;
	}

	if ( data !== undefined ) {
		thisCache[ jQuery.camelCase( name ) ] = data;
	}

	// Check for both converted-to-camel and non-converted data property names
	// If a data property was specified
	if ( typeof name === "string" ) {

		// First Try to find as-is property data
		ret = thisCache[ name ];

		// Test for null|undefined property data
		if ( ret == null ) {

			// Try to find the camelCased property
			ret = thisCache[ jQuery.camelCase( name ) ];
		}
	} else {
		ret = thisCache;
	}

	return ret;
}

function internalRemoveData( elem, name, pvt ) {
	if ( !jQuery.acceptData( elem ) ) {
		return;
	}

	var thisCache, i,
		isNode = elem.nodeType,

		// See jQuery.data for more information
		cache = isNode ? jQuery.cache : elem,
		id = isNode ? elem[ jQuery.expando ] : jQuery.expando;

	// If there is already no cache entry for this object, there is no
	// purpose in continuing
	if ( !cache[ id ] ) {
		return;
	}

	if ( name ) {

		thisCache = pvt ? cache[ id ] : cache[ id ].data;

		if ( thisCache ) {

			// Support array or space separated string names for data keys
			if ( !jQuery.isArray( name ) ) {

				// try the string as a key before any manipulation
				if ( name in thisCache ) {
					name = [ name ];
				} else {

					// split the camel cased version by spaces unless a key with the spaces exists
					name = jQuery.camelCase( name );
					if ( name in thisCache ) {
						name = [ name ];
					} else {
						name = name.split(" ");
					}
				}
			} else {
				// If "name" is an array of keys...
				// When data is initially created, via ("key", "val") signature,
				// keys will be converted to camelCase.
				// Since there is no way to tell _how_ a key was added, remove
				// both plain key and camelCase key. #12786
				// This will only penalize the array argument path.
				name = name.concat( jQuery.map( name, jQuery.camelCase ) );
			}

			i = name.length;
			while ( i-- ) {
				delete thisCache[ name[i] ];
			}

			// If there is no data left in the cache, we want to continue
			// and let the cache object itself get destroyed
			if ( pvt ? !isEmptyDataObject(thisCache) : !jQuery.isEmptyObject(thisCache) ) {
				return;
			}
		}
	}

	// See jQuery.data for more information
	if ( !pvt ) {
		delete cache[ id ].data;

		// Don't destroy the parent cache unless the internal data object
		// had been the only thing left in it
		if ( !isEmptyDataObject( cache[ id ] ) ) {
			return;
		}
	}

	// Destroy the cache
	if ( isNode ) {
		jQuery.cleanData( [ elem ], true );

	// Use delete when supported for expandos or `cache` is not a window per isWindow (#10080)
	/* jshint eqeqeq: false */
	} else if ( support.deleteExpando || cache != cache.window ) {
		/* jshint eqeqeq: true */
		delete cache[ id ];

	// When all else fails, null
	} else {
		cache[ id ] = null;
	}
}

jQuery.extend({
	cache: {},

	// The following elements (space-suffixed to avoid Object.prototype collisions)
	// throw uncatchable exceptions if you attempt to set expando properties
	noData: {
		"applet ": true,
		"embed ": true,
		// ...but Flash objects (which have this classid) *can* handle expandos
		"object ": "clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"
	},

	hasData: function( elem ) {
		elem = elem.nodeType ? jQuery.cache[ elem[jQuery.expando] ] : elem[ jQuery.expando ];
		return !!elem && !isEmptyDataObject( elem );
	},

	data: function( elem, name, data ) {
		return internalData( elem, name, data );
	},

	removeData: function( elem, name ) {
		return internalRemoveData( elem, name );
	},

	// For internal use only.
	_data: function( elem, name, data ) {
		return internalData( elem, name, data, true );
	},

	_removeData: function( elem, name ) {
		return internalRemoveData( elem, name, true );
	}
});

jQuery.fn.extend({
	data: function( key, value ) {
		var i, name, data,
			elem = this[0],
			attrs = elem && elem.attributes;

		// Special expections of .data basically thwart jQuery.access,
		// so implement the relevant behavior ourselves

		// Gets all values
		if ( key === undefined ) {
			if ( this.length ) {
				data = jQuery.data( elem );

				if ( elem.nodeType === 1 && !jQuery._data( elem, "parsedAttrs" ) ) {
					i = attrs.length;
					while ( i-- ) {
						name = attrs[i].name;

						if ( name.indexOf("data-") === 0 ) {
							name = jQuery.camelCase( name.slice(5) );

							dataAttr( elem, name, data[ name ] );
						}
					}
					jQuery._data( elem, "parsedAttrs", true );
				}
			}

			return data;
		}

		// Sets multiple values
		if ( typeof key === "object" ) {
			return this.each(function() {
				jQuery.data( this, key );
			});
		}

		return arguments.length > 1 ?

			// Sets one value
			this.each(function() {
				jQuery.data( this, key, value );
			}) :

			// Gets one value
			// Try to fetch any internally stored data first
			elem ? dataAttr( elem, key, jQuery.data( elem, key ) ) : undefined;
	},

	removeData: function( key ) {
		return this.each(function() {
			jQuery.removeData( this, key );
		});
	}
});


jQuery.extend({
	queue: function( elem, type, data ) {
		var queue;

		if ( elem ) {
			type = ( type || "fx" ) + "queue";
			queue = jQuery._data( elem, type );

			// Speed up dequeue by getting out quickly if this is just a lookup
			if ( data ) {
				if ( !queue || jQuery.isArray(data) ) {
					queue = jQuery._data( elem, type, jQuery.makeArray(data) );
				} else {
					queue.push( data );
				}
			}
			return queue || [];
		}
	},

	dequeue: function( elem, type ) {
		type = type || "fx";

		var queue = jQuery.queue( elem, type ),
			startLength = queue.length,
			fn = queue.shift(),
			hooks = jQuery._queueHooks( elem, type ),
			next = function() {
				jQuery.dequeue( elem, type );
			};

		// If the fx queue is dequeued, always remove the progress sentinel
		if ( fn === "inprogress" ) {
			fn = queue.shift();
			startLength--;
		}

		if ( fn ) {

			// Add a progress sentinel to prevent the fx queue from being
			// automatically dequeued
			if ( type === "fx" ) {
				queue.unshift( "inprogress" );
			}

			// clear up the last queue stop function
			delete hooks.stop;
			fn.call( elem, next, hooks );
		}

		if ( !startLength && hooks ) {
			hooks.empty.fire();
		}
	},

	// not intended for public consumption - generates a queueHooks object, or returns the current one
	_queueHooks: function( elem, type ) {
		var key = type + "queueHooks";
		return jQuery._data( elem, key ) || jQuery._data( elem, key, {
			empty: jQuery.Callbacks("once memory").add(function() {
				jQuery._removeData( elem, type + "queue" );
				jQuery._removeData( elem, key );
			})
		});
	}
});

jQuery.fn.extend({
	queue: function( type, data ) {
		var setter = 2;

		if ( typeof type !== "string" ) {
			data = type;
			type = "fx";
			setter--;
		}

		if ( arguments.length < setter ) {
			return jQuery.queue( this[0], type );
		}

		return data === undefined ?
			this :
			this.each(function() {
				var queue = jQuery.queue( this, type, data );

				// ensure a hooks for this queue
				jQuery._queueHooks( this, type );

				if ( type === "fx" && queue[0] !== "inprogress" ) {
					jQuery.dequeue( this, type );
				}
			});
	},
	dequeue: function( type ) {
		return this.each(function() {
			jQuery.dequeue( this, type );
		});
	},
	clearQueue: function( type ) {
		return this.queue( type || "fx", [] );
	},
	// Get a promise resolved when queues of a certain type
	// are emptied (fx is the type by default)
	promise: function( type, obj ) {
		var tmp,
			count = 1,
			defer = jQuery.Deferred(),
			elements = this,
			i = this.length,
			resolve = function() {
				if ( !( --count ) ) {
					defer.resolveWith( elements, [ elements ] );
				}
			};

		if ( typeof type !== "string" ) {
			obj = type;
			type = undefined;
		}
		type = type || "fx";

		while ( i-- ) {
			tmp = jQuery._data( elements[ i ], type + "queueHooks" );
			if ( tmp && tmp.empty ) {
				count++;
				tmp.empty.add( resolve );
			}
		}
		resolve();
		return defer.promise( obj );
	}
});
var pnum = (/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/).source;



// Multifunctional method to get and set values of a collection
// The value/s can optionally be executed if it's a function
var access = jQuery.access = function( elems, fn, key, value, chainable, emptyGet, raw ) {
	var i = 0,
		length = elems.length,
		bulk = key == null;

	// Sets many values
	if ( jQuery.type( key ) === "object" ) {
		chainable = true;
		for ( i in key ) {
			jQuery.access( elems, fn, i, key[i], true, emptyGet, raw );
		}

	// Sets one value
	} else if ( value !== undefined ) {
		chainable = true;

		if ( !jQuery.isFunction( value ) ) {
			raw = true;
		}

		if ( bulk ) {
			// Bulk operations run against the entire set
			if ( raw ) {
				fn.call( elems, value );
				fn = null;

			// ...except when executing function values
			} else {
				bulk = fn;
				fn = function( elem, key, value ) {
					return bulk.call( jQuery( elem ), value );
				};
			}
		}

		if ( fn ) {
			for ( ; i < length; i++ ) {
				fn( elems[i], key, raw ? value : value.call( elems[i], i, fn( elems[i], key ) ) );
			}
		}
	}

	return chainable ?
		elems :

		// Gets
		bulk ?
			fn.call( elems ) :
			length ? fn( elems[0], key ) : emptyGet;
};
var rcheckableType = (/^(?:checkbox|radio)$/i);



(function() {
	var fragment = document.createDocumentFragment(),
		div = document.createElement("div"),
		input = document.createElement("input");

	// Setup
	div.setAttribute( "className", "t" );
	div.innerHTML = "  <link/><table></table><a href='/a'>a</a>";

	// IE strips leading whitespace when .innerHTML is used
	support.leadingWhitespace = div.firstChild.nodeType === 3;

	// Make sure that tbody elements aren't automatically inserted
	// IE will insert them into empty tables
	support.tbody = !div.getElementsByTagName( "tbody" ).length;

	// Make sure that link elements get serialized correctly by innerHTML
	// This requires a wrapper element in IE
	support.htmlSerialize = !!div.getElementsByTagName( "link" ).length;

	// Makes sure cloning an html5 element does not cause problems
	// Where outerHTML is undefined, this still works
	support.html5Clone =
		document.createElement( "nav" ).cloneNode( true ).outerHTML !== "<:nav></:nav>";

	// Check if a disconnected checkbox will retain its checked
	// value of true after appended to the DOM (IE6/7)
	input.type = "checkbox";
	input.checked = true;
	fragment.appendChild( input );
	support.appendChecked = input.checked;

	// Make sure textarea (and checkbox) defaultValue is properly cloned
	// Support: IE6-IE11+
	div.innerHTML = "<textarea>x</textarea>";
	support.noCloneChecked = !!div.cloneNode( true ).lastChild.defaultValue;

	// #11217 - WebKit loses check when the name is after the checked attribute
	fragment.appendChild( div );
	div.innerHTML = "<input type='radio' checked='checked' name='t'/>";

	// Support: Safari 5.1, iOS 5.1, Android 4.x, Android 2.3
	// old WebKit doesn't clone checked state correctly in fragments
	support.checkClone = div.cloneNode( true ).cloneNode( true ).lastChild.checked;

	// Support: IE<9
	// Opera does not clone events (and typeof div.attachEvent === undefined).
	// IE9-10 clones events bound via attachEvent, but they don't trigger with .click()
	support.noCloneEvent = true;
	if ( div.attachEvent ) {
		div.attachEvent( "onclick", function() {
			support.noCloneEvent = false;
		});

		div.cloneNode( true ).click();
	}

	// Execute the test only if not already executed in another module.
	if (support.deleteExpando == null) {
		// Support: IE<9
		support.deleteExpando = true;
		try {
			delete div.test;
		} catch( e ) {
			support.deleteExpando = false;
		}
	}

	// Null elements to avoid leaks in IE.
	fragment = div = input = null;
})();


(function() {
	var i, eventName,
		div = document.createElement( "div" );

	// Support: IE<9 (lack submit/change bubble), Firefox 23+ (lack focusin event)
	for ( i in { submit: true, change: true, focusin: true }) {
		eventName = "on" + i;

		if ( !(support[ i + "Bubbles" ] = eventName in window) ) {
			// Beware of CSP restrictions (https://developer.mozilla.org/en/Security/CSP)
			div.setAttribute( eventName, "t" );
			support[ i + "Bubbles" ] = div.attributes[ eventName ].expando === false;
		}
	}

	// Null elements to avoid leaks in IE.
	div = null;
})();


var rformElems = /^(?:input|select|textarea)$/i,
	rkeyEvent = /^key/,
	rmouseEvent = /^(?:mouse|contextmenu)|click/,
	rfocusMorph = /^(?:focusinfocus|focusoutblur)$/,
	rtypenamespace = /^([^.]*)(?:\.(.+)|)$/;

function returnTrue() {
	return true;
}

function returnFalse() {
	return false;
}

function safeActiveElement() {
	try {
		return document.activeElement;
	} catch ( err ) { }
}

/*
 * Helper functions for managing events -- not part of the public interface.
 * Props to Dean Edwards' addEvent library for many of the ideas.
 */
jQuery.event = {

	global: {},

	add: function( elem, types, handler, data, selector ) {
		var tmp, events, t, handleObjIn,
			special, eventHandle, handleObj,
			handlers, type, namespaces, origType,
			elemData = jQuery._data( elem );

		// Don't attach events to noData or text/comment nodes (but allow plain objects)
		if ( !elemData ) {
			return;
		}

		// Caller can pass in an object of custom data in lieu of the handler
		if ( handler.handler ) {
			handleObjIn = handler;
			handler = handleObjIn.handler;
			selector = handleObjIn.selector;
		}

		// Make sure that the handler has a unique ID, used to find/remove it later
		if ( !handler.guid ) {
			handler.guid = jQuery.guid++;
		}

		// Init the element's event structure and main handler, if this is the first
		if ( !(events = elemData.events) ) {
			events = elemData.events = {};
		}
		if ( !(eventHandle = elemData.handle) ) {
			eventHandle = elemData.handle = function( e ) {
				// Discard the second event of a jQuery.event.trigger() and
				// when an event is called after a page has unloaded
				return typeof jQuery !== strundefined && (!e || jQuery.event.triggered !== e.type) ?
					jQuery.event.dispatch.apply( eventHandle.elem, arguments ) :
					undefined;
			};
			// Add elem as a property of the handle fn to prevent a memory leak with IE non-native events
			eventHandle.elem = elem;
		}

		// Handle multiple events separated by a space
		types = ( types || "" ).match( rnotwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[t] ) || [];
			type = origType = tmp[1];
			namespaces = ( tmp[2] || "" ).split( "." ).sort();

			// There *must* be a type, no attaching namespace-only handlers
			if ( !type ) {
				continue;
			}

			// If event changes its type, use the special event handlers for the changed type
			special = jQuery.event.special[ type ] || {};

			// If selector defined, determine special event api type, otherwise given type
			type = ( selector ? special.delegateType : special.bindType ) || type;

			// Update special based on newly reset type
			special = jQuery.event.special[ type ] || {};

			// handleObj is passed to all event handlers
			handleObj = jQuery.extend({
				type: type,
				origType: origType,
				data: data,
				handler: handler,
				guid: handler.guid,
				selector: selector,
				needsContext: selector && jQuery.expr.match.needsContext.test( selector ),
				namespace: namespaces.join(".")
			}, handleObjIn );

			// Init the event handler queue if we're the first
			if ( !(handlers = events[ type ]) ) {
				handlers = events[ type ] = [];
				handlers.delegateCount = 0;

				// Only use addEventListener/attachEvent if the special events handler returns false
				if ( !special.setup || special.setup.call( elem, data, namespaces, eventHandle ) === false ) {
					// Bind the global event handler to the element
					if ( elem.addEventListener ) {
						elem.addEventListener( type, eventHandle, false );

					} else if ( elem.attachEvent ) {
						elem.attachEvent( "on" + type, eventHandle );
					}
				}
			}

			if ( special.add ) {
				special.add.call( elem, handleObj );

				if ( !handleObj.handler.guid ) {
					handleObj.handler.guid = handler.guid;
				}
			}

			// Add to the element's handler list, delegates in front
			if ( selector ) {
				handlers.splice( handlers.delegateCount++, 0, handleObj );
			} else {
				handlers.push( handleObj );
			}

			// Keep track of which events have ever been used, for event optimization
			jQuery.event.global[ type ] = true;
		}

		// Nullify elem to prevent memory leaks in IE
		elem = null;
	},

	// Detach an event or set of events from an element
	remove: function( elem, types, handler, selector, mappedTypes ) {
		var j, handleObj, tmp,
			origCount, t, events,
			special, handlers, type,
			namespaces, origType,
			elemData = jQuery.hasData( elem ) && jQuery._data( elem );

		if ( !elemData || !(events = elemData.events) ) {
			return;
		}

		// Once for each type.namespace in types; type may be omitted
		types = ( types || "" ).match( rnotwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[t] ) || [];
			type = origType = tmp[1];
			namespaces = ( tmp[2] || "" ).split( "." ).sort();

			// Unbind all events (on this namespace, if provided) for the element
			if ( !type ) {
				for ( type in events ) {
					jQuery.event.remove( elem, type + types[ t ], handler, selector, true );
				}
				continue;
			}

			special = jQuery.event.special[ type ] || {};
			type = ( selector ? special.delegateType : special.bindType ) || type;
			handlers = events[ type ] || [];
			tmp = tmp[2] && new RegExp( "(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)" );

			// Remove matching events
			origCount = j = handlers.length;
			while ( j-- ) {
				handleObj = handlers[ j ];

				if ( ( mappedTypes || origType === handleObj.origType ) &&
					( !handler || handler.guid === handleObj.guid ) &&
					( !tmp || tmp.test( handleObj.namespace ) ) &&
					( !selector || selector === handleObj.selector || selector === "**" && handleObj.selector ) ) {
					handlers.splice( j, 1 );

					if ( handleObj.selector ) {
						handlers.delegateCount--;
					}
					if ( special.remove ) {
						special.remove.call( elem, handleObj );
					}
				}
			}

			// Remove generic event handler if we removed something and no more handlers exist
			// (avoids potential for endless recursion during removal of special event handlers)
			if ( origCount && !handlers.length ) {
				if ( !special.teardown || special.teardown.call( elem, namespaces, elemData.handle ) === false ) {
					jQuery.removeEvent( elem, type, elemData.handle );
				}

				delete events[ type ];
			}
		}

		// Remove the expando if it's no longer used
		if ( jQuery.isEmptyObject( events ) ) {
			delete elemData.handle;

			// removeData also checks for emptiness and clears the expando if empty
			// so use it instead of delete
			jQuery._removeData( elem, "events" );
		}
	},

	trigger: function( event, data, elem, onlyHandlers ) {
		var handle, ontype, cur,
			bubbleType, special, tmp, i,
			eventPath = [ elem || document ],
			type = hasOwn.call( event, "type" ) ? event.type : event,
			namespaces = hasOwn.call( event, "namespace" ) ? event.namespace.split(".") : [];

		cur = tmp = elem = elem || document;

		// Don't do events on text and comment nodes
		if ( elem.nodeType === 3 || elem.nodeType === 8 ) {
			return;
		}

		// focus/blur morphs to focusin/out; ensure we're not firing them right now
		if ( rfocusMorph.test( type + jQuery.event.triggered ) ) {
			return;
		}

		if ( type.indexOf(".") >= 0 ) {
			// Namespaced trigger; create a regexp to match event type in handle()
			namespaces = type.split(".");
			type = namespaces.shift();
			namespaces.sort();
		}
		ontype = type.indexOf(":") < 0 && "on" + type;

		// Caller can pass in a jQuery.Event object, Object, or just an event type string
		event = event[ jQuery.expando ] ?
			event :
			new jQuery.Event( type, typeof event === "object" && event );

		// Trigger bitmask: & 1 for native handlers; & 2 for jQuery (always true)
		event.isTrigger = onlyHandlers ? 2 : 3;
		event.namespace = namespaces.join(".");
		event.namespace_re = event.namespace ?
			new RegExp( "(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)" ) :
			null;

		// Clean up the event in case it is being reused
		event.result = undefined;
		if ( !event.target ) {
			event.target = elem;
		}

		// Clone any incoming data and prepend the event, creating the handler arg list
		data = data == null ?
			[ event ] :
			jQuery.makeArray( data, [ event ] );

		// Allow special events to draw outside the lines
		special = jQuery.event.special[ type ] || {};
		if ( !onlyHandlers && special.trigger && special.trigger.apply( elem, data ) === false ) {
			return;
		}

		// Determine event propagation path in advance, per W3C events spec (#9951)
		// Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
		if ( !onlyHandlers && !special.noBubble && !jQuery.isWindow( elem ) ) {

			bubbleType = special.delegateType || type;
			if ( !rfocusMorph.test( bubbleType + type ) ) {
				cur = cur.parentNode;
			}
			for ( ; cur; cur = cur.parentNode ) {
				eventPath.push( cur );
				tmp = cur;
			}

			// Only add window if we got to document (e.g., not plain obj or detached DOM)
			if ( tmp === (elem.ownerDocument || document) ) {
				eventPath.push( tmp.defaultView || tmp.parentWindow || window );
			}
		}

		// Fire handlers on the event path
		i = 0;
		while ( (cur = eventPath[i++]) && !event.isPropagationStopped() ) {

			event.type = i > 1 ?
				bubbleType :
				special.bindType || type;

			// jQuery handler
			handle = ( jQuery._data( cur, "events" ) || {} )[ event.type ] && jQuery._data( cur, "handle" );
			if ( handle ) {
				handle.apply( cur, data );
			}

			// Native handler
			handle = ontype && cur[ ontype ];
			if ( handle && handle.apply && jQuery.acceptData( cur ) ) {
				event.result = handle.apply( cur, data );
				if ( event.result === false ) {
					event.preventDefault();
				}
			}
		}
		event.type = type;

		// If nobody prevented the default action, do it now
		if ( !onlyHandlers && !event.isDefaultPrevented() ) {

			if ( (!special._default || special._default.apply( eventPath.pop(), data ) === false) &&
				jQuery.acceptData( elem ) ) {

				// Call a native DOM method on the target with the same name name as the event.
				// Can't use an .isFunction() check here because IE6/7 fails that test.
				// Don't do default actions on window, that's where global variables be (#6170)
				if ( ontype && elem[ type ] && !jQuery.isWindow( elem ) ) {

					// Don't re-trigger an onFOO event when we call its FOO() method
					tmp = elem[ ontype ];

					if ( tmp ) {
						elem[ ontype ] = null;
					}

					// Prevent re-triggering of the same event, since we already bubbled it above
					jQuery.event.triggered = type;
					try {
						elem[ type ]();
					} catch ( e ) {
						// IE<9 dies on focus/blur to hidden element (#1486,#12518)
						// only reproducible on winXP IE8 native, not IE9 in IE8 mode
					}
					jQuery.event.triggered = undefined;

					if ( tmp ) {
						elem[ ontype ] = tmp;
					}
				}
			}
		}

		return event.result;
	},

	dispatch: function( event ) {

		// Make a writable jQuery.Event from the native event object
		event = jQuery.event.fix( event );

		var i, ret, handleObj, matched, j,
			handlerQueue = [],
			args = slice.call( arguments ),
			handlers = ( jQuery._data( this, "events" ) || {} )[ event.type ] || [],
			special = jQuery.event.special[ event.type ] || {};

		// Use the fix-ed jQuery.Event rather than the (read-only) native event
		args[0] = event;
		event.delegateTarget = this;

		// Call the preDispatch hook for the mapped type, and let it bail if desired
		if ( special.preDispatch && special.preDispatch.call( this, event ) === false ) {
			return;
		}

		// Determine handlers
		handlerQueue = jQuery.event.handlers.call( this, event, handlers );

		// Run delegates first; they may want to stop propagation beneath us
		i = 0;
		while ( (matched = handlerQueue[ i++ ]) && !event.isPropagationStopped() ) {
			event.currentTarget = matched.elem;

			j = 0;
			while ( (handleObj = matched.handlers[ j++ ]) && !event.isImmediatePropagationStopped() ) {

				// Triggered event must either 1) have no namespace, or
				// 2) have namespace(s) a subset or equal to those in the bound event (both can have no namespace).
				if ( !event.namespace_re || event.namespace_re.test( handleObj.namespace ) ) {

					event.handleObj = handleObj;
					event.data = handleObj.data;

					ret = ( (jQuery.event.special[ handleObj.origType ] || {}).handle || handleObj.handler )
							.apply( matched.elem, args );

					if ( ret !== undefined ) {
						if ( (event.result = ret) === false ) {
							event.preventDefault();
							event.stopPropagation();
						}
					}
				}
			}
		}

		// Call the postDispatch hook for the mapped type
		if ( special.postDispatch ) {
			special.postDispatch.call( this, event );
		}

		return event.result;
	},

	handlers: function( event, handlers ) {
		var sel, handleObj, matches, i,
			handlerQueue = [],
			delegateCount = handlers.delegateCount,
			cur = event.target;

		// Find delegate handlers
		// Black-hole SVG <use> instance trees (#13180)
		// Avoid non-left-click bubbling in Firefox (#3861)
		if ( delegateCount && cur.nodeType && (!event.button || event.type !== "click") ) {

			/* jshint eqeqeq: false */
			for ( ; cur != this; cur = cur.parentNode || this ) {
				/* jshint eqeqeq: true */

				// Don't check non-elements (#13208)
				// Don't process clicks on disabled elements (#6911, #8165, #11382, #11764)
				if ( cur.nodeType === 1 && (cur.disabled !== true || event.type !== "click") ) {
					matches = [];
					for ( i = 0; i < delegateCount; i++ ) {
						handleObj = handlers[ i ];

						// Don't conflict with Object.prototype properties (#13203)
						sel = handleObj.selector + " ";

						if ( matches[ sel ] === undefined ) {
							matches[ sel ] = handleObj.needsContext ?
								jQuery( sel, this ).index( cur ) >= 0 :
								jQuery.find( sel, this, null, [ cur ] ).length;
						}
						if ( matches[ sel ] ) {
							matches.push( handleObj );
						}
					}
					if ( matches.length ) {
						handlerQueue.push({ elem: cur, handlers: matches });
					}
				}
			}
		}

		// Add the remaining (directly-bound) handlers
		if ( delegateCount < handlers.length ) {
			handlerQueue.push({ elem: this, handlers: handlers.slice( delegateCount ) });
		}

		return handlerQueue;
	},

	fix: function( event ) {
		if ( event[ jQuery.expando ] ) {
			return event;
		}

		// Create a writable copy of the event object and normalize some properties
		var i, prop, copy,
			type = event.type,
			originalEvent = event,
			fixHook = this.fixHooks[ type ];

		if ( !fixHook ) {
			this.fixHooks[ type ] = fixHook =
				rmouseEvent.test( type ) ? this.mouseHooks :
				rkeyEvent.test( type ) ? this.keyHooks :
				{};
		}
		copy = fixHook.props ? this.props.concat( fixHook.props ) : this.props;

		event = new jQuery.Event( originalEvent );

		i = copy.length;
		while ( i-- ) {
			prop = copy[ i ];
			event[ prop ] = originalEvent[ prop ];
		}

		// Support: IE<9
		// Fix target property (#1925)
		if ( !event.target ) {
			event.target = originalEvent.srcElement || document;
		}

		// Support: Chrome 23+, Safari?
		// Target should not be a text node (#504, #13143)
		if ( event.target.nodeType === 3 ) {
			event.target = event.target.parentNode;
		}

		// Support: IE<9
		// For mouse/key events, metaKey==false if it's undefined (#3368, #11328)
		event.metaKey = !!event.metaKey;

		return fixHook.filter ? fixHook.filter( event, originalEvent ) : event;
	},

	// Includes some event props shared by KeyEvent and MouseEvent
	props: "altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),

	fixHooks: {},

	keyHooks: {
		props: "char charCode key keyCode".split(" "),
		filter: function( event, original ) {

			// Add which for key events
			if ( event.which == null ) {
				event.which = original.charCode != null ? original.charCode : original.keyCode;
			}

			return event;
		}
	},

	mouseHooks: {
		props: "button buttons clientX clientY fromElement offsetX offsetY pageX pageY screenX screenY toElement".split(" "),
		filter: function( event, original ) {
			var body, eventDoc, doc,
				button = original.button,
				fromElement = original.fromElement;

			// Calculate pageX/Y if missing and clientX/Y available
			if ( event.pageX == null && original.clientX != null ) {
				eventDoc = event.target.ownerDocument || document;
				doc = eventDoc.documentElement;
				body = eventDoc.body;

				event.pageX = original.clientX + ( doc && doc.scrollLeft || body && body.scrollLeft || 0 ) - ( doc && doc.clientLeft || body && body.clientLeft || 0 );
				event.pageY = original.clientY + ( doc && doc.scrollTop  || body && body.scrollTop  || 0 ) - ( doc && doc.clientTop  || body && body.clientTop  || 0 );
			}

			// Add relatedTarget, if necessary
			if ( !event.relatedTarget && fromElement ) {
				event.relatedTarget = fromElement === event.target ? original.toElement : fromElement;
			}

			// Add which for click: 1 === left; 2 === middle; 3 === right
			// Note: button is not normalized, so don't use it
			if ( !event.which && button !== undefined ) {
				event.which = ( button & 1 ? 1 : ( button & 2 ? 3 : ( button & 4 ? 2 : 0 ) ) );
			}

			return event;
		}
	},

	special: {
		load: {
			// Prevent triggered image.load events from bubbling to window.load
			noBubble: true
		},
		focus: {
			// Fire native event if possible so blur/focus sequence is correct
			trigger: function() {
				if ( this !== safeActiveElement() && this.focus ) {
					try {
						this.focus();
						return false;
					} catch ( e ) {
						// Support: IE<9
						// If we error on focus to hidden element (#1486, #12518),
						// let .trigger() run the handlers
					}
				}
			},
			delegateType: "focusin"
		},
		blur: {
			trigger: function() {
				if ( this === safeActiveElement() && this.blur ) {
					this.blur();
					return false;
				}
			},
			delegateType: "focusout"
		},
		click: {
			// For checkbox, fire native event so checked state will be right
			trigger: function() {
				if ( jQuery.nodeName( this, "input" ) && this.type === "checkbox" && this.click ) {
					this.click();
					return false;
				}
			},

			// For cross-browser consistency, don't fire native .click() on links
			_default: function( event ) {
				return jQuery.nodeName( event.target, "a" );
			}
		},

		beforeunload: {
			postDispatch: function( event ) {

				// Even when returnValue equals to undefined Firefox will still show alert
				if ( event.result !== undefined ) {
					event.originalEvent.returnValue = event.result;
				}
			}
		}
	},

	simulate: function( type, elem, event, bubble ) {
		// Piggyback on a donor event to simulate a different one.
		// Fake originalEvent to avoid donor's stopPropagation, but if the
		// simulated event prevents default then we do the same on the donor.
		var e = jQuery.extend(
			new jQuery.Event(),
			event,
			{
				type: type,
				isSimulated: true,
				originalEvent: {}
			}
		);
		if ( bubble ) {
			jQuery.event.trigger( e, null, elem );
		} else {
			jQuery.event.dispatch.call( elem, e );
		}
		if ( e.isDefaultPrevented() ) {
			event.preventDefault();
		}
	}
};

jQuery.removeEvent = document.removeEventListener ?
	function( elem, type, handle ) {
		if ( elem.removeEventListener ) {
			elem.removeEventListener( type, handle, false );
		}
	} :
	function( elem, type, handle ) {
		var name = "on" + type;

		if ( elem.detachEvent ) {

			// #8545, #7054, preventing memory leaks for custom events in IE6-8
			// detachEvent needed property on element, by name of that event, to properly expose it to GC
			if ( typeof elem[ name ] === strundefined ) {
				elem[ name ] = null;
			}

			elem.detachEvent( name, handle );
		}
	};

jQuery.Event = function( src, props ) {
	// Allow instantiation without the 'new' keyword
	if ( !(this instanceof jQuery.Event) ) {
		return new jQuery.Event( src, props );
	}

	// Event object
	if ( src && src.type ) {
		this.originalEvent = src;
		this.type = src.type;

		// Events bubbling up the document may have been marked as prevented
		// by a handler lower down the tree; reflect the correct value.
		this.isDefaultPrevented = src.defaultPrevented ||
				src.defaultPrevented === undefined && (
				// Support: IE < 9
				src.returnValue === false ||
				// Support: Android < 4.0
				src.getPreventDefault && src.getPreventDefault() ) ?
			returnTrue :
			returnFalse;

	// Event type
	} else {
		this.type = src;
	}

	// Put explicitly provided properties onto the event object
	if ( props ) {
		jQuery.extend( this, props );
	}

	// Create a timestamp if incoming event doesn't have one
	this.timeStamp = src && src.timeStamp || jQuery.now();

	// Mark it as fixed
	this[ jQuery.expando ] = true;
};

// jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
// http://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
jQuery.Event.prototype = {
	isDefaultPrevented: returnFalse,
	isPropagationStopped: returnFalse,
	isImmediatePropagationStopped: returnFalse,

	preventDefault: function() {
		var e = this.originalEvent;

		this.isDefaultPrevented = returnTrue;
		if ( !e ) {
			return;
		}

		// If preventDefault exists, run it on the original event
		if ( e.preventDefault ) {
			e.preventDefault();

		// Support: IE
		// Otherwise set the returnValue property of the original event to false
		} else {
			e.returnValue = false;
		}
	},
	stopPropagation: function() {
		var e = this.originalEvent;

		this.isPropagationStopped = returnTrue;
		if ( !e ) {
			return;
		}
		// If stopPropagation exists, run it on the original event
		if ( e.stopPropagation ) {
			e.stopPropagation();
		}

		// Support: IE
		// Set the cancelBubble property of the original event to true
		e.cancelBubble = true;
	},
	stopImmediatePropagation: function() {
		this.isImmediatePropagationStopped = returnTrue;
		this.stopPropagation();
	}
};

// Create mouseenter/leave events using mouseover/out and event-time checks
jQuery.each({
	mouseenter: "mouseover",
	mouseleave: "mouseout"
}, function( orig, fix ) {
	jQuery.event.special[ orig ] = {
		delegateType: fix,
		bindType: fix,

		handle: function( event ) {
			var ret,
				target = this,
				related = event.relatedTarget,
				handleObj = event.handleObj;

			// For mousenter/leave call the handler if related is outside the target.
			// NB: No relatedTarget if the mouse left/entered the browser window
			if ( !related || (related !== target && !jQuery.contains( target, related )) ) {
				event.type = handleObj.origType;
				ret = handleObj.handler.apply( this, arguments );
				event.type = fix;
			}
			return ret;
		}
	};
});

// IE submit delegation
if ( !support.submitBubbles ) {

	jQuery.event.special.submit = {
		setup: function() {
			// Only need this for delegated form submit events
			if ( jQuery.nodeName( this, "form" ) ) {
				return false;
			}

			// Lazy-add a submit handler when a descendant form may potentially be submitted
			jQuery.event.add( this, "click._submit keypress._submit", function( e ) {
				// Node name check avoids a VML-related crash in IE (#9807)
				var elem = e.target,
					form = jQuery.nodeName( elem, "input" ) || jQuery.nodeName( elem, "button" ) ? elem.form : undefined;
				if ( form && !jQuery._data( form, "submitBubbles" ) ) {
					jQuery.event.add( form, "submit._submit", function( event ) {
						event._submit_bubble = true;
					});
					jQuery._data( form, "submitBubbles", true );
				}
			});
			// return undefined since we don't need an event listener
		},

		postDispatch: function( event ) {
			// If form was submitted by the user, bubble the event up the tree
			if ( event._submit_bubble ) {
				delete event._submit_bubble;
				if ( this.parentNode && !event.isTrigger ) {
					jQuery.event.simulate( "submit", this.parentNode, event, true );
				}
			}
		},

		teardown: function() {
			// Only need this for delegated form submit events
			if ( jQuery.nodeName( this, "form" ) ) {
				return false;
			}

			// Remove delegated handlers; cleanData eventually reaps submit handlers attached above
			jQuery.event.remove( this, "._submit" );
		}
	};
}

// IE change delegation and checkbox/radio fix
if ( !support.changeBubbles ) {

	jQuery.event.special.change = {

		setup: function() {

			if ( rformElems.test( this.nodeName ) ) {
				// IE doesn't fire change on a check/radio until blur; trigger it on click
				// after a propertychange. Eat the blur-change in special.change.handle.
				// This still fires onchange a second time for check/radio after blur.
				if ( this.type === "checkbox" || this.type === "radio" ) {
					jQuery.event.add( this, "propertychange._change", function( event ) {
						if ( event.originalEvent.propertyName === "checked" ) {
							this._just_changed = true;
						}
					});
					jQuery.event.add( this, "click._change", function( event ) {
						if ( this._just_changed && !event.isTrigger ) {
							this._just_changed = false;
						}
						// Allow triggered, simulated change events (#11500)
						jQuery.event.simulate( "change", this, event, true );
					});
				}
				return false;
			}
			// Delegated event; lazy-add a change handler on descendant inputs
			jQuery.event.add( this, "beforeactivate._change", function( e ) {
				var elem = e.target;

				if ( rformElems.test( elem.nodeName ) && !jQuery._data( elem, "changeBubbles" ) ) {
					jQuery.event.add( elem, "change._change", function( event ) {
						if ( this.parentNode && !event.isSimulated && !event.isTrigger ) {
							jQuery.event.simulate( "change", this.parentNode, event, true );
						}
					});
					jQuery._data( elem, "changeBubbles", true );
				}
			});
		},

		handle: function( event ) {
			var elem = event.target;

			// Swallow native change events from checkbox/radio, we already triggered them above
			if ( this !== elem || event.isSimulated || event.isTrigger || (elem.type !== "radio" && elem.type !== "checkbox") ) {
				return event.handleObj.handler.apply( this, arguments );
			}
		},

		teardown: function() {
			jQuery.event.remove( this, "._change" );

			return !rformElems.test( this.nodeName );
		}
	};
}

// Create "bubbling" focus and blur events
if ( !support.focusinBubbles ) {
	jQuery.each({ focus: "focusin", blur: "focusout" }, function( orig, fix ) {

		// Attach a single capturing handler on the document while someone wants focusin/focusout
		var handler = function( event ) {
				jQuery.event.simulate( fix, event.target, jQuery.event.fix( event ), true );
			};

		jQuery.event.special[ fix ] = {
			setup: function() {
				var doc = this.ownerDocument || this,
					attaches = jQuery._data( doc, fix );

				if ( !attaches ) {
					doc.addEventListener( orig, handler, true );
				}
				jQuery._data( doc, fix, ( attaches || 0 ) + 1 );
			},
			teardown: function() {
				var doc = this.ownerDocument || this,
					attaches = jQuery._data( doc, fix ) - 1;

				if ( !attaches ) {
					doc.removeEventListener( orig, handler, true );
					jQuery._removeData( doc, fix );
				} else {
					jQuery._data( doc, fix, attaches );
				}
			}
		};
	});
}

jQuery.fn.extend({

	on: function( types, selector, data, fn, /*INTERNAL*/ one ) {
		var type, origFn;

		// Types can be a map of types/handlers
		if ( typeof types === "object" ) {
			// ( types-Object, selector, data )
			if ( typeof selector !== "string" ) {
				// ( types-Object, data )
				data = data || selector;
				selector = undefined;
			}
			for ( type in types ) {
				this.on( type, selector, data, types[ type ], one );
			}
			return this;
		}

		if ( data == null && fn == null ) {
			// ( types, fn )
			fn = selector;
			data = selector = undefined;
		} else if ( fn == null ) {
			if ( typeof selector === "string" ) {
				// ( types, selector, fn )
				fn = data;
				data = undefined;
			} else {
				// ( types, data, fn )
				fn = data;
				data = selector;
				selector = undefined;
			}
		}
		if ( fn === false ) {
			fn = returnFalse;
		} else if ( !fn ) {
			return this;
		}

		if ( one === 1 ) {
			origFn = fn;
			fn = function( event ) {
				// Can use an empty set, since event contains the info
				jQuery().off( event );
				return origFn.apply( this, arguments );
			};
			// Use same guid so caller can remove using origFn
			fn.guid = origFn.guid || ( origFn.guid = jQuery.guid++ );
		}
		return this.each( function() {
			jQuery.event.add( this, types, fn, data, selector );
		});
	},
	one: function( types, selector, data, fn ) {
		return this.on( types, selector, data, fn, 1 );
	},
	off: function( types, selector, fn ) {
		var handleObj, type;
		if ( types && types.preventDefault && types.handleObj ) {
			// ( event )  dispatched jQuery.Event
			handleObj = types.handleObj;
			jQuery( types.delegateTarget ).off(
				handleObj.namespace ? handleObj.origType + "." + handleObj.namespace : handleObj.origType,
				handleObj.selector,
				handleObj.handler
			);
			return this;
		}
		if ( typeof types === "object" ) {
			// ( types-object [, selector] )
			for ( type in types ) {
				this.off( type, selector, types[ type ] );
			}
			return this;
		}
		if ( selector === false || typeof selector === "function" ) {
			// ( types [, fn] )
			fn = selector;
			selector = undefined;
		}
		if ( fn === false ) {
			fn = returnFalse;
		}
		return this.each(function() {
			jQuery.event.remove( this, types, fn, selector );
		});
	},

	trigger: function( type, data ) {
		return this.each(function() {
			jQuery.event.trigger( type, data, this );
		});
	},
	triggerHandler: function( type, data ) {
		var elem = this[0];
		if ( elem ) {
			return jQuery.event.trigger( type, data, elem, true );
		}
	}
});


function createSafeFragment( document ) {
	var list = nodeNames.split( "|" ),
		safeFrag = document.createDocumentFragment();

	if ( safeFrag.createElement ) {
		while ( list.length ) {
			safeFrag.createElement(
				list.pop()
			);
		}
	}
	return safeFrag;
}

var nodeNames = "abbr|article|aside|audio|bdi|canvas|data|datalist|details|figcaption|figure|footer|" +
		"header|hgroup|mark|meter|nav|output|progress|section|summary|time|video",
	rinlinejQuery = / jQuery\d+="(?:null|\d+)"/g,
	rnoshimcache = new RegExp("<(?:" + nodeNames + ")[\\s/>]", "i"),
	rleadingWhitespace = /^\s+/,
	rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,
	rtagName = /<([\w:]+)/,
	rtbody = /<tbody/i,
	rhtml = /<|&#?\w+;/,
	rnoInnerhtml = /<(?:script|style|link)/i,
	// checked="checked" or checked
	rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
	rscriptType = /^$|\/(?:java|ecma)script/i,
	rscriptTypeMasked = /^true\/(.*)/,
	rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g,

	// We have to close these tags to support XHTML (#13200)
	wrapMap = {
		option: [ 1, "<select multiple='multiple'>", "</select>" ],
		legend: [ 1, "<fieldset>", "</fieldset>" ],
		area: [ 1, "<map>", "</map>" ],
		param: [ 1, "<object>", "</object>" ],
		thead: [ 1, "<table>", "</table>" ],
		tr: [ 2, "<table><tbody>", "</tbody></table>" ],
		col: [ 2, "<table><tbody></tbody><colgroup>", "</colgroup></table>" ],
		td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],

		// IE6-8 can't serialize link, script, style, or any html5 (NoScope) tags,
		// unless wrapped in a div with non-breaking characters in front of it.
		_default: support.htmlSerialize ? [ 0, "", "" ] : [ 1, "X<div>", "</div>"  ]
	},
	safeFragment = createSafeFragment( document ),
	fragmentDiv = safeFragment.appendChild( document.createElement("div") );

wrapMap.optgroup = wrapMap.option;
wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
wrapMap.th = wrapMap.td;

function getAll( context, tag ) {
	var elems, elem,
		i = 0,
		found = typeof context.getElementsByTagName !== strundefined ? context.getElementsByTagName( tag || "*" ) :
			typeof context.querySelectorAll !== strundefined ? context.querySelectorAll( tag || "*" ) :
			undefined;

	if ( !found ) {
		for ( found = [], elems = context.childNodes || context; (elem = elems[i]) != null; i++ ) {
			if ( !tag || jQuery.nodeName( elem, tag ) ) {
				found.push( elem );
			} else {
				jQuery.merge( found, getAll( elem, tag ) );
			}
		}
	}

	return tag === undefined || tag && jQuery.nodeName( context, tag ) ?
		jQuery.merge( [ context ], found ) :
		found;
}

// Used in buildFragment, fixes the defaultChecked property
function fixDefaultChecked( elem ) {
	if ( rcheckableType.test( elem.type ) ) {
		elem.defaultChecked = elem.checked;
	}
}

// Support: IE<8
// Manipulating tables requires a tbody
function manipulationTarget( elem, content ) {
	return jQuery.nodeName( elem, "table" ) &&
		jQuery.nodeName( content.nodeType !== 11 ? content : content.firstChild, "tr" ) ?

		elem.getElementsByTagName("tbody")[0] ||
			elem.appendChild( elem.ownerDocument.createElement("tbody") ) :
		elem;
}

// Replace/restore the type attribute of script elements for safe DOM manipulation
function disableScript( elem ) {
	elem.type = (jQuery.find.attr( elem, "type" ) !== null) + "/" + elem.type;
	return elem;
}
function restoreScript( elem ) {
	var match = rscriptTypeMasked.exec( elem.type );
	if ( match ) {
		elem.type = match[1];
	} else {
		elem.removeAttribute("type");
	}
	return elem;
}

// Mark scripts as having already been evaluated
function setGlobalEval( elems, refElements ) {
	var elem,
		i = 0;
	for ( ; (elem = elems[i]) != null; i++ ) {
		jQuery._data( elem, "globalEval", !refElements || jQuery._data( refElements[i], "globalEval" ) );
	}
}

function cloneCopyEvent( src, dest ) {

	if ( dest.nodeType !== 1 || !jQuery.hasData( src ) ) {
		return;
	}

	var type, i, l,
		oldData = jQuery._data( src ),
		curData = jQuery._data( dest, oldData ),
		events = oldData.events;

	if ( events ) {
		delete curData.handle;
		curData.events = {};

		for ( type in events ) {
			for ( i = 0, l = events[ type ].length; i < l; i++ ) {
				jQuery.event.add( dest, type, events[ type ][ i ] );
			}
		}
	}

	// make the cloned public data object a copy from the original
	if ( curData.data ) {
		curData.data = jQuery.extend( {}, curData.data );
	}
}

function fixCloneNodeIssues( src, dest ) {
	var nodeName, e, data;

	// We do not need to do anything for non-Elements
	if ( dest.nodeType !== 1 ) {
		return;
	}

	nodeName = dest.nodeName.toLowerCase();

	// IE6-8 copies events bound via attachEvent when using cloneNode.
	if ( !support.noCloneEvent && dest[ jQuery.expando ] ) {
		data = jQuery._data( dest );

		for ( e in data.events ) {
			jQuery.removeEvent( dest, e, data.handle );
		}

		// Event data gets referenced instead of copied if the expando gets copied too
		dest.removeAttribute( jQuery.expando );
	}

	// IE blanks contents when cloning scripts, and tries to evaluate newly-set text
	if ( nodeName === "script" && dest.text !== src.text ) {
		disableScript( dest ).text = src.text;
		restoreScript( dest );

	// IE6-10 improperly clones children of object elements using classid.
	// IE10 throws NoModificationAllowedError if parent is null, #12132.
	} else if ( nodeName === "object" ) {
		if ( dest.parentNode ) {
			dest.outerHTML = src.outerHTML;
		}

		// This path appears unavoidable for IE9. When cloning an object
		// element in IE9, the outerHTML strategy above is not sufficient.
		// If the src has innerHTML and the destination does not,
		// copy the src.innerHTML into the dest.innerHTML. #10324
		if ( support.html5Clone && ( src.innerHTML && !jQuery.trim(dest.innerHTML) ) ) {
			dest.innerHTML = src.innerHTML;
		}

	} else if ( nodeName === "input" && rcheckableType.test( src.type ) ) {
		// IE6-8 fails to persist the checked state of a cloned checkbox
		// or radio button. Worse, IE6-7 fail to give the cloned element
		// a checked appearance if the defaultChecked value isn't also set

		dest.defaultChecked = dest.checked = src.checked;

		// IE6-7 get confused and end up setting the value of a cloned
		// checkbox/radio button to an empty string instead of "on"
		if ( dest.value !== src.value ) {
			dest.value = src.value;
		}

	// IE6-8 fails to return the selected option to the default selected
	// state when cloning options
	} else if ( nodeName === "option" ) {
		dest.defaultSelected = dest.selected = src.defaultSelected;

	// IE6-8 fails to set the defaultValue to the correct value when
	// cloning other types of input fields
	} else if ( nodeName === "input" || nodeName === "textarea" ) {
		dest.defaultValue = src.defaultValue;
	}
}

jQuery.extend({
	clone: function( elem, dataAndEvents, deepDataAndEvents ) {
		var destElements, node, clone, i, srcElements,
			inPage = jQuery.contains( elem.ownerDocument, elem );

		if ( support.html5Clone || jQuery.isXMLDoc(elem) || !rnoshimcache.test( "<" + elem.nodeName + ">" ) ) {
			clone = elem.cloneNode( true );

		// IE<=8 does not properly clone detached, unknown element nodes
		} else {
			fragmentDiv.innerHTML = elem.outerHTML;
			fragmentDiv.removeChild( clone = fragmentDiv.firstChild );
		}

		if ( (!support.noCloneEvent || !support.noCloneChecked) &&
				(elem.nodeType === 1 || elem.nodeType === 11) && !jQuery.isXMLDoc(elem) ) {

			// We eschew Sizzle here for performance reasons: http://jsperf.com/getall-vs-sizzle/2
			destElements = getAll( clone );
			srcElements = getAll( elem );

			// Fix all IE cloning issues
			for ( i = 0; (node = srcElements[i]) != null; ++i ) {
				// Ensure that the destination node is not null; Fixes #9587
				if ( destElements[i] ) {
					fixCloneNodeIssues( node, destElements[i] );
				}
			}
		}

		// Copy the events from the original to the clone
		if ( dataAndEvents ) {
			if ( deepDataAndEvents ) {
				srcElements = srcElements || getAll( elem );
				destElements = destElements || getAll( clone );

				for ( i = 0; (node = srcElements[i]) != null; i++ ) {
					cloneCopyEvent( node, destElements[i] );
				}
			} else {
				cloneCopyEvent( elem, clone );
			}
		}

		// Preserve script evaluation history
		destElements = getAll( clone, "script" );
		if ( destElements.length > 0 ) {
			setGlobalEval( destElements, !inPage && getAll( elem, "script" ) );
		}

		destElements = srcElements = node = null;

		// Return the cloned set
		return clone;
	},

	buildFragment: function( elems, context, scripts, selection ) {
		var j, elem, contains,
			tmp, tag, tbody, wrap,
			l = elems.length,

			// Ensure a safe fragment
			safe = createSafeFragment( context ),

			nodes = [],
			i = 0;

		for ( ; i < l; i++ ) {
			elem = elems[ i ];

			if ( elem || elem === 0 ) {

				// Add nodes directly
				if ( jQuery.type( elem ) === "object" ) {
					jQuery.merge( nodes, elem.nodeType ? [ elem ] : elem );

				// Convert non-html into a text node
				} else if ( !rhtml.test( elem ) ) {
					nodes.push( context.createTextNode( elem ) );

				// Convert html into DOM nodes
				} else {
					tmp = tmp || safe.appendChild( context.createElement("div") );

					// Deserialize a standard representation
					tag = (rtagName.exec( elem ) || [ "", "" ])[ 1 ].toLowerCase();
					wrap = wrapMap[ tag ] || wrapMap._default;

					tmp.innerHTML = wrap[1] + elem.replace( rxhtmlTag, "<$1></$2>" ) + wrap[2];

					// Descend through wrappers to the right content
					j = wrap[0];
					while ( j-- ) {
						tmp = tmp.lastChild;
					}

					// Manually add leading whitespace removed by IE
					if ( !support.leadingWhitespace && rleadingWhitespace.test( elem ) ) {
						nodes.push( context.createTextNode( rleadingWhitespace.exec( elem )[0] ) );
					}

					// Remove IE's autoinserted <tbody> from table fragments
					if ( !support.tbody ) {

						// String was a <table>, *may* have spurious <tbody>
						elem = tag === "table" && !rtbody.test( elem ) ?
							tmp.firstChild :

							// String was a bare <thead> or <tfoot>
							wrap[1] === "<table>" && !rtbody.test( elem ) ?
								tmp :
								0;

						j = elem && elem.childNodes.length;
						while ( j-- ) {
							if ( jQuery.nodeName( (tbody = elem.childNodes[j]), "tbody" ) && !tbody.childNodes.length ) {
								elem.removeChild( tbody );
							}
						}
					}

					jQuery.merge( nodes, tmp.childNodes );

					// Fix #12392 for WebKit and IE > 9
					tmp.textContent = "";

					// Fix #12392 for oldIE
					while ( tmp.firstChild ) {
						tmp.removeChild( tmp.firstChild );
					}

					// Remember the top-level container for proper cleanup
					tmp = safe.lastChild;
				}
			}
		}

		// Fix #11356: Clear elements from fragment
		if ( tmp ) {
			safe.removeChild( tmp );
		}

		// Reset defaultChecked for any radios and checkboxes
		// about to be appended to the DOM in IE 6/7 (#8060)
		if ( !support.appendChecked ) {
			jQuery.grep( getAll( nodes, "input" ), fixDefaultChecked );
		}

		i = 0;
		while ( (elem = nodes[ i++ ]) ) {

			// #4087 - If origin and destination elements are the same, and this is
			// that element, do not do anything
			if ( selection && jQuery.inArray( elem, selection ) !== -1 ) {
				continue;
			}

			contains = jQuery.contains( elem.ownerDocument, elem );

			// Append to fragment
			tmp = getAll( safe.appendChild( elem ), "script" );

			// Preserve script evaluation history
			if ( contains ) {
				setGlobalEval( tmp );
			}

			// Capture executables
			if ( scripts ) {
				j = 0;
				while ( (elem = tmp[ j++ ]) ) {
					if ( rscriptType.test( elem.type || "" ) ) {
						scripts.push( elem );
					}
				}
			}
		}

		tmp = null;

		return safe;
	},

	cleanData: function( elems, /* internal */ acceptData ) {
		var elem, type, id, data,
			i = 0,
			internalKey = jQuery.expando,
			cache = jQuery.cache,
			deleteExpando = support.deleteExpando,
			special = jQuery.event.special;

		for ( ; (elem = elems[i]) != null; i++ ) {
			if ( acceptData || jQuery.acceptData( elem ) ) {

				id = elem[ internalKey ];
				data = id && cache[ id ];

				if ( data ) {
					if ( data.events ) {
						for ( type in data.events ) {
							if ( special[ type ] ) {
								jQuery.event.remove( elem, type );

							// This is a shortcut to avoid jQuery.event.remove's overhead
							} else {
								jQuery.removeEvent( elem, type, data.handle );
							}
						}
					}

					// Remove cache only if it was not already removed by jQuery.event.remove
					if ( cache[ id ] ) {

						delete cache[ id ];

						// IE does not allow us to delete expando properties from nodes,
						// nor does it have a removeAttribute function on Document nodes;
						// we must handle all of these cases
						if ( deleteExpando ) {
							delete elem[ internalKey ];

						} else if ( typeof elem.removeAttribute !== strundefined ) {
							elem.removeAttribute( internalKey );

						} else {
							elem[ internalKey ] = null;
						}

						deletedIds.push( id );
					}
				}
			}
		}
	}
});

jQuery.fn.extend({
	text: function( value ) {
		return access( this, function( value ) {
			return value === undefined ?
				jQuery.text( this ) :
				this.empty().append( ( this[0] && this[0].ownerDocument || document ).createTextNode( value ) );
		}, null, value, arguments.length );
	},

	append: function() {
		return this.domManip( arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.appendChild( elem );
			}
		});
	},

	prepend: function() {
		return this.domManip( arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.insertBefore( elem, target.firstChild );
			}
		});
	},

	before: function() {
		return this.domManip( arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this );
			}
		});
	},

	after: function() {
		return this.domManip( arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this.nextSibling );
			}
		});
	},

	remove: function( selector, keepData /* Internal Use Only */ ) {
		var elem,
			elems = selector ? jQuery.filter( selector, this ) : this,
			i = 0;

		for ( ; (elem = elems[i]) != null; i++ ) {

			if ( !keepData && elem.nodeType === 1 ) {
				jQuery.cleanData( getAll( elem ) );
			}

			if ( elem.parentNode ) {
				if ( keepData && jQuery.contains( elem.ownerDocument, elem ) ) {
					setGlobalEval( getAll( elem, "script" ) );
				}
				elem.parentNode.removeChild( elem );
			}
		}

		return this;
	},

	empty: function() {
		var elem,
			i = 0;

		for ( ; (elem = this[i]) != null; i++ ) {
			// Remove element nodes and prevent memory leaks
			if ( elem.nodeType === 1 ) {
				jQuery.cleanData( getAll( elem, false ) );
			}

			// Remove any remaining nodes
			while ( elem.firstChild ) {
				elem.removeChild( elem.firstChild );
			}

			// If this is a select, ensure that it displays empty (#12336)
			// Support: IE<9
			if ( elem.options && jQuery.nodeName( elem, "select" ) ) {
				elem.options.length = 0;
			}
		}

		return this;
	},

	clone: function( dataAndEvents, deepDataAndEvents ) {
		dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
		deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;

		return this.map(function() {
			return jQuery.clone( this, dataAndEvents, deepDataAndEvents );
		});
	},

	html: function( value ) {
		return access( this, function( value ) {
			var elem = this[ 0 ] || {},
				i = 0,
				l = this.length;

			if ( value === undefined ) {
				return elem.nodeType === 1 ?
					elem.innerHTML.replace( rinlinejQuery, "" ) :
					undefined;
			}

			// See if we can take a shortcut and just use innerHTML
			if ( typeof value === "string" && !rnoInnerhtml.test( value ) &&
				( support.htmlSerialize || !rnoshimcache.test( value )  ) &&
				( support.leadingWhitespace || !rleadingWhitespace.test( value ) ) &&
				!wrapMap[ (rtagName.exec( value ) || [ "", "" ])[ 1 ].toLowerCase() ] ) {

				value = value.replace( rxhtmlTag, "<$1></$2>" );

				try {
					for (; i < l; i++ ) {
						// Remove element nodes and prevent memory leaks
						elem = this[i] || {};
						if ( elem.nodeType === 1 ) {
							jQuery.cleanData( getAll( elem, false ) );
							elem.innerHTML = value;
						}
					}

					elem = 0;

				// If using innerHTML throws an exception, use the fallback method
				} catch(e) {}
			}

			if ( elem ) {
				this.empty().append( value );
			}
		}, null, value, arguments.length );
	},

	replaceWith: function() {
		var arg = arguments[ 0 ];

		// Make the changes, replacing each context element with the new content
		this.domManip( arguments, function( elem ) {
			arg = this.parentNode;

			jQuery.cleanData( getAll( this ) );

			if ( arg ) {
				arg.replaceChild( elem, this );
			}
		});

		// Force removal if there was no new content (e.g., from empty arguments)
		return arg && (arg.length || arg.nodeType) ? this : this.remove();
	},

	detach: function( selector ) {
		return this.remove( selector, true );
	},

	domManip: function( args, callback ) {

		// Flatten any nested arrays
		args = concat.apply( [], args );

		var first, node, hasScripts,
			scripts, doc, fragment,
			i = 0,
			l = this.length,
			set = this,
			iNoClone = l - 1,
			value = args[0],
			isFunction = jQuery.isFunction( value );

		// We can't cloneNode fragments that contain checked, in WebKit
		if ( isFunction ||
				( l > 1 && typeof value === "string" &&
					!support.checkClone && rchecked.test( value ) ) ) {
			return this.each(function( index ) {
				var self = set.eq( index );
				if ( isFunction ) {
					args[0] = value.call( this, index, self.html() );
				}
				self.domManip( args, callback );
			});
		}

		if ( l ) {
			fragment = jQuery.buildFragment( args, this[ 0 ].ownerDocument, false, this );
			first = fragment.firstChild;

			if ( fragment.childNodes.length === 1 ) {
				fragment = first;
			}

			if ( first ) {
				scripts = jQuery.map( getAll( fragment, "script" ), disableScript );
				hasScripts = scripts.length;

				// Use the original fragment for the last item instead of the first because it can end up
				// being emptied incorrectly in certain situations (#8070).
				for ( ; i < l; i++ ) {
					node = fragment;

					if ( i !== iNoClone ) {
						node = jQuery.clone( node, true, true );

						// Keep references to cloned scripts for later restoration
						if ( hasScripts ) {
							jQuery.merge( scripts, getAll( node, "script" ) );
						}
					}

					callback.call( this[i], node, i );
				}

				if ( hasScripts ) {
					doc = scripts[ scripts.length - 1 ].ownerDocument;

					// Reenable scripts
					jQuery.map( scripts, restoreScript );

					// Evaluate executable scripts on first document insertion
					for ( i = 0; i < hasScripts; i++ ) {
						node = scripts[ i ];
						if ( rscriptType.test( node.type || "" ) &&
							!jQuery._data( node, "globalEval" ) && jQuery.contains( doc, node ) ) {

							if ( node.src ) {
								// Optional AJAX dependency, but won't run scripts if not present
								if ( jQuery._evalUrl ) {
									jQuery._evalUrl( node.src );
								}
							} else {
								jQuery.globalEval( ( node.text || node.textContent || node.innerHTML || "" ).replace( rcleanScript, "" ) );
							}
						}
					}
				}

				// Fix #11809: Avoid leaking memory
				fragment = first = null;
			}
		}

		return this;
	}
});

jQuery.each({
	appendTo: "append",
	prependTo: "prepend",
	insertBefore: "before",
	insertAfter: "after",
	replaceAll: "replaceWith"
}, function( name, original ) {
	jQuery.fn[ name ] = function( selector ) {
		var elems,
			i = 0,
			ret = [],
			insert = jQuery( selector ),
			last = insert.length - 1;

		for ( ; i <= last; i++ ) {
			elems = i === last ? this : this.clone(true);
			jQuery( insert[i] )[ original ]( elems );

			// Modern browsers can apply jQuery collections as arrays, but oldIE needs a .get()
			push.apply( ret, elems.get() );
		}

		return this.pushStack( ret );
	};
});


// Based off of the plugin by Clint Helfers, with permission.
// http://blindsignals.com/index.php/2009/07/jquery-delay/
jQuery.fn.delay = function( time, type ) {
	time = jQuery.fx ? jQuery.fx.speeds[ time ] || time : time;
	type = type || "fx";

	return this.queue( type, function( next, hooks ) {
		var timeout = setTimeout( next, time );
		hooks.stop = function() {
			clearTimeout( timeout );
		};
	});
};


(function() {
	var a, input, select, opt,
		div = document.createElement("div" );

	// Setup
	div.setAttribute( "className", "t" );
	div.innerHTML = "  <link/><table></table><a href='/a'>a</a><input type='checkbox'/>";
	a = div.getElementsByTagName("a")[ 0 ];

	// First batch of tests.
	select = document.createElement("select");
	opt = select.appendChild( document.createElement("option") );
	input = div.getElementsByTagName("input")[ 0 ];

	a.style.cssText = "top:1px";

	// Test setAttribute on camelCase class. If it works, we need attrFixes when doing get/setAttribute (ie6/7)
	support.getSetAttribute = div.className !== "t";

	// Get the style information from getAttribute
	// (IE uses .cssText instead)
	support.style = /top/.test( a.getAttribute("style") );

	// Make sure that URLs aren't manipulated
	// (IE normalizes it by default)
	support.hrefNormalized = a.getAttribute("href") === "/a";

	// Check the default checkbox/radio value ("" on WebKit; "on" elsewhere)
	support.checkOn = !!input.value;

	// Make sure that a selected-by-default option has a working selected property.
	// (WebKit defaults to false instead of true, IE too, if it's in an optgroup)
	support.optSelected = opt.selected;

	// Tests for enctype support on a form (#6743)
	support.enctype = !!document.createElement("form").enctype;

	// Make sure that the options inside disabled selects aren't marked as disabled
	// (WebKit marks them as disabled)
	select.disabled = true;
	support.optDisabled = !opt.disabled;

	// Support: IE8 only
	// Check if we can trust getAttribute("value")
	input = document.createElement( "input" );
	input.setAttribute( "value", "" );
	support.input = input.getAttribute( "value" ) === "";

	// Check if an input maintains its value after becoming a radio
	input.value = "t";
	input.setAttribute( "type", "radio" );
	support.radioValue = input.value === "t";

	// Null elements to avoid leaks in IE.
	a = input = select = opt = div = null;
})();


var rreturn = /\r/g;

jQuery.fn.extend({
	val: function( value ) {
		var hooks, ret, isFunction,
			elem = this[0];

		if ( !arguments.length ) {
			if ( elem ) {
				hooks = jQuery.valHooks[ elem.type ] || jQuery.valHooks[ elem.nodeName.toLowerCase() ];

				if ( hooks && "get" in hooks && (ret = hooks.get( elem, "value" )) !== undefined ) {
					return ret;
				}

				ret = elem.value;

				return typeof ret === "string" ?
					// handle most common string cases
					ret.replace(rreturn, "") :
					// handle cases where value is null/undef or number
					ret == null ? "" : ret;
			}

			return;
		}

		isFunction = jQuery.isFunction( value );

		return this.each(function( i ) {
			var val;

			if ( this.nodeType !== 1 ) {
				return;
			}

			if ( isFunction ) {
				val = value.call( this, i, jQuery( this ).val() );
			} else {
				val = value;
			}

			// Treat null/undefined as ""; convert numbers to string
			if ( val == null ) {
				val = "";
			} else if ( typeof val === "number" ) {
				val += "";
			} else if ( jQuery.isArray( val ) ) {
				val = jQuery.map( val, function( value ) {
					return value == null ? "" : value + "";
				});
			}

			hooks = jQuery.valHooks[ this.type ] || jQuery.valHooks[ this.nodeName.toLowerCase() ];

			// If set returns undefined, fall back to normal setting
			if ( !hooks || !("set" in hooks) || hooks.set( this, val, "value" ) === undefined ) {
				this.value = val;
			}
		});
	}
});

jQuery.extend({
	valHooks: {
		option: {
			get: function( elem ) {
				var val = jQuery.find.attr( elem, "value" );
				return val != null ?
					val :
					jQuery.text( elem );
			}
		},
		select: {
			get: function( elem ) {
				var value, option,
					options = elem.options,
					index = elem.selectedIndex,
					one = elem.type === "select-one" || index < 0,
					values = one ? null : [],
					max = one ? index + 1 : options.length,
					i = index < 0 ?
						max :
						one ? index : 0;

				// Loop through all the selected options
				for ( ; i < max; i++ ) {
					option = options[ i ];

					// oldIE doesn't update selected after form reset (#2551)
					if ( ( option.selected || i === index ) &&
							// Don't return options that are disabled or in a disabled optgroup
							( support.optDisabled ? !option.disabled : option.getAttribute("disabled") === null ) &&
							( !option.parentNode.disabled || !jQuery.nodeName( option.parentNode, "optgroup" ) ) ) {

						// Get the specific value for the option
						value = jQuery( option ).val();

						// We don't need an array for one selects
						if ( one ) {
							return value;
						}

						// Multi-Selects return an array
						values.push( value );
					}
				}

				return values;
			},

			set: function( elem, value ) {
				var optionSet, option,
					options = elem.options,
					values = jQuery.makeArray( value ),
					i = options.length;

				while ( i-- ) {
					option = options[ i ];

					if ( jQuery.inArray( jQuery.valHooks.option.get( option ), values ) >= 0 ) {

						// Support: IE6
						// When new option element is added to select box we need to
						// force reflow of newly added node in order to workaround delay
						// of initialization properties
						try {
							option.selected = optionSet = true;

						} catch ( _ ) {

							// Will be executed only in IE6
							option.scrollHeight;
						}

					} else {
						option.selected = false;
					}
				}

				// Force browsers to behave consistently when non-matching value is set
				if ( !optionSet ) {
					elem.selectedIndex = -1;
				}

				return options;
			}
		}
	}
});

// Radios and checkboxes getter/setter
jQuery.each([ "radio", "checkbox" ], function() {
	jQuery.valHooks[ this ] = {
		set: function( elem, value ) {
			if ( jQuery.isArray( value ) ) {
				return ( elem.checked = jQuery.inArray( jQuery(elem).val(), value ) >= 0 );
			}
		}
	};
	if ( !support.checkOn ) {
		jQuery.valHooks[ this ].get = function( elem ) {
			// Support: Webkit
			// "" is returned instead of "on" if a value isn't specified
			return elem.getAttribute("value") === null ? "on" : elem.value;
		};
	}
});




var nodeHook, boolHook,
	attrHandle = jQuery.expr.attrHandle,
	ruseDefault = /^(?:checked|selected)$/i,
	getSetAttribute = support.getSetAttribute,
	getSetInput = support.input;

jQuery.fn.extend({
	attr: function( name, value ) {
		return access( this, jQuery.attr, name, value, arguments.length > 1 );
	},

	removeAttr: function( name ) {
		return this.each(function() {
			jQuery.removeAttr( this, name );
		});
	}
});

jQuery.extend({
	attr: function( elem, name, value ) {
		var hooks, ret,
			nType = elem.nodeType;

		// don't get/set attributes on text, comment and attribute nodes
		if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		// Fallback to prop when attributes are not supported
		if ( typeof elem.getAttribute === strundefined ) {
			return jQuery.prop( elem, name, value );
		}

		// All attributes are lowercase
		// Grab necessary hook if one is defined
		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {
			name = name.toLowerCase();
			hooks = jQuery.attrHooks[ name ] ||
				( jQuery.expr.match.bool.test( name ) ? boolHook : nodeHook );
		}

		if ( value !== undefined ) {

			if ( value === null ) {
				jQuery.removeAttr( elem, name );

			} else if ( hooks && "set" in hooks && (ret = hooks.set( elem, value, name )) !== undefined ) {
				return ret;

			} else {
				elem.setAttribute( name, value + "" );
				return value;
			}

		} else if ( hooks && "get" in hooks && (ret = hooks.get( elem, name )) !== null ) {
			return ret;

		} else {
			ret = jQuery.find.attr( elem, name );

			// Non-existent attributes return null, we normalize to undefined
			return ret == null ?
				undefined :
				ret;
		}
	},

	removeAttr: function( elem, value ) {
		var name, propName,
			i = 0,
			attrNames = value && value.match( rnotwhite );

		if ( attrNames && elem.nodeType === 1 ) {
			while ( (name = attrNames[i++]) ) {
				propName = jQuery.propFix[ name ] || name;

				// Boolean attributes get special treatment (#10870)
				if ( jQuery.expr.match.bool.test( name ) ) {
					// Set corresponding property to false
					if ( getSetInput && getSetAttribute || !ruseDefault.test( name ) ) {
						elem[ propName ] = false;
					// Support: IE<9
					// Also clear defaultChecked/defaultSelected (if appropriate)
					} else {
						elem[ jQuery.camelCase( "default-" + name ) ] =
							elem[ propName ] = false;
					}

				// See #9699 for explanation of this approach (setting first, then removal)
				} else {
					jQuery.attr( elem, name, "" );
				}

				elem.removeAttribute( getSetAttribute ? name : propName );
			}
		}
	},

	attrHooks: {
		type: {
			set: function( elem, value ) {
				if ( !support.radioValue && value === "radio" && jQuery.nodeName(elem, "input") ) {
					// Setting the type on a radio button after the value resets the value in IE6-9
					// Reset value to default in case type is set after value during creation
					var val = elem.value;
					elem.setAttribute( "type", value );
					if ( val ) {
						elem.value = val;
					}
					return value;
				}
			}
		}
	}
});

// Hook for boolean attributes
boolHook = {
	set: function( elem, value, name ) {
		if ( value === false ) {
			// Remove boolean attributes when set to false
			jQuery.removeAttr( elem, name );
		} else if ( getSetInput && getSetAttribute || !ruseDefault.test( name ) ) {
			// IE<8 needs the *property* name
			elem.setAttribute( !getSetAttribute && jQuery.propFix[ name ] || name, name );

		// Use defaultChecked and defaultSelected for oldIE
		} else {
			elem[ jQuery.camelCase( "default-" + name ) ] = elem[ name ] = true;
		}

		return name;
	}
};

// Retrieve booleans specially
jQuery.each( jQuery.expr.match.bool.source.match( /\w+/g ), function( i, name ) {

	var getter = attrHandle[ name ] || jQuery.find.attr;

	attrHandle[ name ] = getSetInput && getSetAttribute || !ruseDefault.test( name ) ?
		function( elem, name, isXML ) {
			var ret, handle;
			if ( !isXML ) {
				// Avoid an infinite loop by temporarily removing this function from the getter
				handle = attrHandle[ name ];
				attrHandle[ name ] = ret;
				ret = getter( elem, name, isXML ) != null ?
					name.toLowerCase() :
					null;
				attrHandle[ name ] = handle;
			}
			return ret;
		} :
		function( elem, name, isXML ) {
			if ( !isXML ) {
				return elem[ jQuery.camelCase( "default-" + name ) ] ?
					name.toLowerCase() :
					null;
			}
		};
});

// fix oldIE attroperties
if ( !getSetInput || !getSetAttribute ) {
	jQuery.attrHooks.value = {
		set: function( elem, value, name ) {
			if ( jQuery.nodeName( elem, "input" ) ) {
				// Does not return so that setAttribute is also used
				elem.defaultValue = value;
			} else {
				// Use nodeHook if defined (#1954); otherwise setAttribute is fine
				return nodeHook && nodeHook.set( elem, value, name );
			}
		}
	};
}

// IE6/7 do not support getting/setting some attributes with get/setAttribute
if ( !getSetAttribute ) {

	// Use this for any attribute in IE6/7
	// This fixes almost every IE6/7 issue
	nodeHook = {
		set: function( elem, value, name ) {
			// Set the existing or create a new attribute node
			var ret = elem.getAttributeNode( name );
			if ( !ret ) {
				elem.setAttributeNode(
					(ret = elem.ownerDocument.createAttribute( name ))
				);
			}

			ret.value = value += "";

			// Break association with cloned elements by also using setAttribute (#9646)
			if ( name === "value" || value === elem.getAttribute( name ) ) {
				return value;
			}
		}
	};

	// Some attributes are constructed with empty-string values when not defined
	attrHandle.id = attrHandle.name = attrHandle.coords =
		function( elem, name, isXML ) {
			var ret;
			if ( !isXML ) {
				return (ret = elem.getAttributeNode( name )) && ret.value !== "" ?
					ret.value :
					null;
			}
		};

	// Fixing value retrieval on a button requires this module
	jQuery.valHooks.button = {
		get: function( elem, name ) {
			var ret = elem.getAttributeNode( name );
			if ( ret && ret.specified ) {
				return ret.value;
			}
		},
		set: nodeHook.set
	};

	// Set contenteditable to false on removals(#10429)
	// Setting to empty string throws an error as an invalid value
	jQuery.attrHooks.contenteditable = {
		set: function( elem, value, name ) {
			nodeHook.set( elem, value === "" ? false : value, name );
		}
	};

	// Set width and height to auto instead of 0 on empty string( Bug #8150 )
	// This is for removals
	jQuery.each([ "width", "height" ], function( i, name ) {
		jQuery.attrHooks[ name ] = {
			set: function( elem, value ) {
				if ( value === "" ) {
					elem.setAttribute( name, "auto" );
					return value;
				}
			}
		};
	});
}

if ( !support.style ) {
	jQuery.attrHooks.style = {
		get: function( elem ) {
			// Return undefined in the case of empty string
			// Note: IE uppercases css property names, but if we were to .toLowerCase()
			// .cssText, that would destroy case senstitivity in URL's, like in "background"
			return elem.style.cssText || undefined;
		},
		set: function( elem, value ) {
			return ( elem.style.cssText = value + "" );
		}
	};
}




var rfocusable = /^(?:input|select|textarea|button|object)$/i,
	rclickable = /^(?:a|area)$/i;

jQuery.fn.extend({
	prop: function( name, value ) {
		return access( this, jQuery.prop, name, value, arguments.length > 1 );
	},

	removeProp: function( name ) {
		name = jQuery.propFix[ name ] || name;
		return this.each(function() {
			// try/catch handles cases where IE balks (such as removing a property on window)
			try {
				this[ name ] = undefined;
				delete this[ name ];
			} catch( e ) {}
		});
	}
});

jQuery.extend({
	propFix: {
		"for": "htmlFor",
		"class": "className"
	},

	prop: function( elem, name, value ) {
		var ret, hooks, notxml,
			nType = elem.nodeType;

		// don't get/set properties on text, comment and attribute nodes
		if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		notxml = nType !== 1 || !jQuery.isXMLDoc( elem );

		if ( notxml ) {
			// Fix name and attach hooks
			name = jQuery.propFix[ name ] || name;
			hooks = jQuery.propHooks[ name ];
		}

		if ( value !== undefined ) {
			return hooks && "set" in hooks && (ret = hooks.set( elem, value, name )) !== undefined ?
				ret :
				( elem[ name ] = value );

		} else {
			return hooks && "get" in hooks && (ret = hooks.get( elem, name )) !== null ?
				ret :
				elem[ name ];
		}
	},

	propHooks: {
		tabIndex: {
			get: function( elem ) {
				// elem.tabIndex doesn't always return the correct value when it hasn't been explicitly set
				// http://fluidproject.org/blog/2008/01/09/getting-setting-and-removing-tabindex-values-with-javascript/
				// Use proper attribute retrieval(#12072)
				var tabindex = jQuery.find.attr( elem, "tabindex" );

				return tabindex ?
					parseInt( tabindex, 10 ) :
					rfocusable.test( elem.nodeName ) || rclickable.test( elem.nodeName ) && elem.href ?
						0 :
						-1;
			}
		}
	}
});

// Some attributes require a special call on IE
// http://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
if ( !support.hrefNormalized ) {
	// href/src property should get the full normalized URL (#10299/#12915)
	jQuery.each([ "href", "src" ], function( i, name ) {
		jQuery.propHooks[ name ] = {
			get: function( elem ) {
				return elem.getAttribute( name, 4 );
			}
		};
	});
}

// Support: Safari, IE9+
// mis-reports the default selected property of an option
// Accessing the parent's selectedIndex property fixes it
if ( !support.optSelected ) {
	jQuery.propHooks.selected = {
		get: function( elem ) {
			var parent = elem.parentNode;

			if ( parent ) {
				parent.selectedIndex;

				// Make sure that it also works with optgroups, see #5701
				if ( parent.parentNode ) {
					parent.parentNode.selectedIndex;
				}
			}
			return null;
		}
	};
}

jQuery.each([
	"tabIndex",
	"readOnly",
	"maxLength",
	"cellSpacing",
	"cellPadding",
	"rowSpan",
	"colSpan",
	"useMap",
	"frameBorder",
	"contentEditable"
], function() {
	jQuery.propFix[ this.toLowerCase() ] = this;
});

// IE6/7 call enctype encoding
if ( !support.enctype ) {
	jQuery.propFix.enctype = "encoding";
}




var rclass = /[\t\r\n\f]/g;

jQuery.fn.extend({
	addClass: function( value ) {
		var classes, elem, cur, clazz, j, finalValue,
			i = 0,
			len = this.length,
			proceed = typeof value === "string" && value;

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( j ) {
				jQuery( this ).addClass( value.call( this, j, this.className ) );
			});
		}

		if ( proceed ) {
			// The disjunction here is for better compressibility (see removeClass)
			classes = ( value || "" ).match( rnotwhite ) || [];

			for ( ; i < len; i++ ) {
				elem = this[ i ];
				cur = elem.nodeType === 1 && ( elem.className ?
					( " " + elem.className + " " ).replace( rclass, " " ) :
					" "
				);

				if ( cur ) {
					j = 0;
					while ( (clazz = classes[j++]) ) {
						if ( cur.indexOf( " " + clazz + " " ) < 0 ) {
							cur += clazz + " ";
						}
					}

					// only assign if different to avoid unneeded rendering.
					finalValue = jQuery.trim( cur );
					if ( elem.className !== finalValue ) {
						elem.className = finalValue;
					}
				}
			}
		}

		return this;
	},

	removeClass: function( value ) {
		var classes, elem, cur, clazz, j, finalValue,
			i = 0,
			len = this.length,
			proceed = arguments.length === 0 || typeof value === "string" && value;

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( j ) {
				jQuery( this ).removeClass( value.call( this, j, this.className ) );
			});
		}
		if ( proceed ) {
			classes = ( value || "" ).match( rnotwhite ) || [];

			for ( ; i < len; i++ ) {
				elem = this[ i ];
				// This expression is here for better compressibility (see addClass)
				cur = elem.nodeType === 1 && ( elem.className ?
					( " " + elem.className + " " ).replace( rclass, " " ) :
					""
				);

				if ( cur ) {
					j = 0;
					while ( (clazz = classes[j++]) ) {
						// Remove *all* instances
						while ( cur.indexOf( " " + clazz + " " ) >= 0 ) {
							cur = cur.replace( " " + clazz + " ", " " );
						}
					}

					// only assign if different to avoid unneeded rendering.
					finalValue = value ? jQuery.trim( cur ) : "";
					if ( elem.className !== finalValue ) {
						elem.className = finalValue;
					}
				}
			}
		}

		return this;
	},

	toggleClass: function( value, stateVal ) {
		var type = typeof value;

		if ( typeof stateVal === "boolean" && type === "string" ) {
			return stateVal ? this.addClass( value ) : this.removeClass( value );
		}

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( i ) {
				jQuery( this ).toggleClass( value.call(this, i, this.className, stateVal), stateVal );
			});
		}

		return this.each(function() {
			if ( type === "string" ) {
				// toggle individual class names
				var className,
					i = 0,
					self = jQuery( this ),
					classNames = value.match( rnotwhite ) || [];

				while ( (className = classNames[ i++ ]) ) {
					// check each className given, space separated list
					if ( self.hasClass( className ) ) {
						self.removeClass( className );
					} else {
						self.addClass( className );
					}
				}

			// Toggle whole class name
			} else if ( type === strundefined || type === "boolean" ) {
				if ( this.className ) {
					// store className if set
					jQuery._data( this, "__className__", this.className );
				}

				// If the element has a class name or if we're passed "false",
				// then remove the whole classname (if there was one, the above saved it).
				// Otherwise bring back whatever was previously saved (if anything),
				// falling back to the empty string if nothing was stored.
				this.className = this.className || value === false ? "" : jQuery._data( this, "__className__" ) || "";
			}
		});
	},

	hasClass: function( selector ) {
		var className = " " + selector + " ",
			i = 0,
			l = this.length;
		for ( ; i < l; i++ ) {
			if ( this[i].nodeType === 1 && (" " + this[i].className + " ").replace(rclass, " ").indexOf( className ) >= 0 ) {
				return true;
			}
		}

		return false;
	}
});




// Return jQuery for attributes-only inclusion


jQuery.each( ("blur focus focusin focusout load resize scroll unload click dblclick " +
	"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
	"change select submit keydown keypress keyup error contextmenu").split(" "), function( i, name ) {

	// Handle event binding
	jQuery.fn[ name ] = function( data, fn ) {
		return arguments.length > 0 ?
			this.on( name, null, data, fn ) :
			this.trigger( name );
	};
});

jQuery.fn.extend({
	hover: function( fnOver, fnOut ) {
		return this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );
	},

	bind: function( types, data, fn ) {
		return this.on( types, null, data, fn );
	},
	unbind: function( types, fn ) {
		return this.off( types, null, fn );
	},

	delegate: function( selector, types, data, fn ) {
		return this.on( types, selector, data, fn );
	},
	undelegate: function( selector, types, fn ) {
		// ( namespace ) or ( selector, types [, fn] )
		return arguments.length === 1 ? this.off( selector, "**" ) : this.off( types, selector || "**", fn );
	}
});


var nonce = jQuery.now();

var rquery = (/\?/);



var rvalidtokens = /(,)|(\[|{)|(}|])|"(?:[^"\\\r\n]|\\["\\\/bfnrt]|\\u[\da-fA-F]{4})*"\s*:?|true|false|null|-?(?!0\d)\d+(?:\.\d+|)(?:[eE][+-]?\d+|)/g;

jQuery.parseJSON = function( data ) {
	// Attempt to parse using the native JSON parser first
	if ( window.JSON && window.JSON.parse ) {
		// Support: Android 2.3
		// Workaround failure to string-cast null input
		return window.JSON.parse( data + "" );
	}

	var requireNonComma,
		depth = null,
		str = jQuery.trim( data + "" );

	// Guard against invalid (and possibly dangerous) input by ensuring that nothing remains
	// after removing valid tokens
	return str && !jQuery.trim( str.replace( rvalidtokens, function( token, comma, open, close ) {

		// Force termination if we see a misplaced comma
		if ( requireNonComma && comma ) {
			depth = 0;
		}

		// Perform no more replacements after returning to outermost depth
		if ( depth === 0 ) {
			return token;
		}

		// Commas must not follow "[", "{", or ","
		requireNonComma = open || comma;

		// Determine new depth
		// array/object open ("[" or "{"): depth += true - false (increment)
		// array/object close ("]" or "}"): depth += false - true (decrement)
		// other cases ("," or primitive): depth += true - true (numeric cast)
		depth += !close - !open;

		// Remove this token
		return "";
	}) ) ?
		( Function( "return " + str ) )() :
		jQuery.error( "Invalid JSON: " + data );
};


// Cross-browser xml parsing
jQuery.parseXML = function( data ) {
	var xml, tmp;
	if ( !data || typeof data !== "string" ) {
		return null;
	}
	try {
		if ( window.DOMParser ) { // Standard
			tmp = new DOMParser();
			xml = tmp.parseFromString( data, "text/xml" );
		} else { // IE
			xml = new ActiveXObject( "Microsoft.XMLDOM" );
			xml.async = "false";
			xml.loadXML( data );
		}
	} catch( e ) {
		xml = undefined;
	}
	if ( !xml || !xml.documentElement || xml.getElementsByTagName( "parsererror" ).length ) {
		jQuery.error( "Invalid XML: " + data );
	}
	return xml;
};


var
	// Document location
	ajaxLocParts,
	ajaxLocation,

	rhash = /#.*$/,
	rts = /([?&])_=[^&]*/,
	rheaders = /^(.*?):[ \t]*([^\r\n]*)\r?$/mg, // IE leaves an \r character at EOL
	// #7653, #8125, #8152: local protocol detection
	rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
	rnoContent = /^(?:GET|HEAD)$/,
	rprotocol = /^\/\//,
	rurl = /^([\w.+-]+:)(?:\/\/(?:[^\/?#]*@|)([^\/?#:]*)(?::(\d+)|)|)/,

	/* Prefilters
	 * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
	 * 2) These are called:
	 *    - BEFORE asking for a transport
	 *    - AFTER param serialization (s.data is a string if s.processData is true)
	 * 3) key is the dataType
	 * 4) the catchall symbol "*" can be used
	 * 5) execution will start with transport dataType and THEN continue down to "*" if needed
	 */
	prefilters = {},

	/* Transports bindings
	 * 1) key is the dataType
	 * 2) the catchall symbol "*" can be used
	 * 3) selection will start with transport dataType and THEN go to "*" if needed
	 */
	transports = {},

	// Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
	allTypes = "*/".concat("*");

// #8138, IE may throw an exception when accessing
// a field from window.location if document.domain has been set
try {
	ajaxLocation = location.href;
} catch( e ) {
	// Use the href attribute of an A element
	// since IE will modify it given document.location
	ajaxLocation = document.createElement( "a" );
	ajaxLocation.href = "";
	ajaxLocation = ajaxLocation.href;
}

// Segment location into parts
ajaxLocParts = rurl.exec( ajaxLocation.toLowerCase() ) || [];

// Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
function addToPrefiltersOrTransports( structure ) {

	// dataTypeExpression is optional and defaults to "*"
	return function( dataTypeExpression, func ) {

		if ( typeof dataTypeExpression !== "string" ) {
			func = dataTypeExpression;
			dataTypeExpression = "*";
		}

		var dataType,
			i = 0,
			dataTypes = dataTypeExpression.toLowerCase().match( rnotwhite ) || [];

		if ( jQuery.isFunction( func ) ) {
			// For each dataType in the dataTypeExpression
			while ( (dataType = dataTypes[i++]) ) {
				// Prepend if requested
				if ( dataType.charAt( 0 ) === "+" ) {
					dataType = dataType.slice( 1 ) || "*";
					(structure[ dataType ] = structure[ dataType ] || []).unshift( func );

				// Otherwise append
				} else {
					(structure[ dataType ] = structure[ dataType ] || []).push( func );
				}
			}
		}
	};
}

// Base inspection function for prefilters and transports
function inspectPrefiltersOrTransports( structure, options, originalOptions, jqXHR ) {

	var inspected = {},
		seekingTransport = ( structure === transports );

	function inspect( dataType ) {
		var selected;
		inspected[ dataType ] = true;
		jQuery.each( structure[ dataType ] || [], function( _, prefilterOrFactory ) {
			var dataTypeOrTransport = prefilterOrFactory( options, originalOptions, jqXHR );
			if ( typeof dataTypeOrTransport === "string" && !seekingTransport && !inspected[ dataTypeOrTransport ] ) {
				options.dataTypes.unshift( dataTypeOrTransport );
				inspect( dataTypeOrTransport );
				return false;
			} else if ( seekingTransport ) {
				return !( selected = dataTypeOrTransport );
			}
		});
		return selected;
	}

	return inspect( options.dataTypes[ 0 ] ) || !inspected[ "*" ] && inspect( "*" );
}

// A special extend for ajax options
// that takes "flat" options (not to be deep extended)
// Fixes #9887
function ajaxExtend( target, src ) {
	var deep, key,
		flatOptions = jQuery.ajaxSettings.flatOptions || {};

	for ( key in src ) {
		if ( src[ key ] !== undefined ) {
			( flatOptions[ key ] ? target : ( deep || (deep = {}) ) )[ key ] = src[ key ];
		}
	}
	if ( deep ) {
		jQuery.extend( true, target, deep );
	}

	return target;
}

/* Handles responses to an ajax request:
 * - finds the right dataType (mediates between content-type and expected dataType)
 * - returns the corresponding response
 */
function ajaxHandleResponses( s, jqXHR, responses ) {
	var firstDataType, ct, finalDataType, type,
		contents = s.contents,
		dataTypes = s.dataTypes;

	// Remove auto dataType and get content-type in the process
	while ( dataTypes[ 0 ] === "*" ) {
		dataTypes.shift();
		if ( ct === undefined ) {
			ct = s.mimeType || jqXHR.getResponseHeader("Content-Type");
		}
	}

	// Check if we're dealing with a known content-type
	if ( ct ) {
		for ( type in contents ) {
			if ( contents[ type ] && contents[ type ].test( ct ) ) {
				dataTypes.unshift( type );
				break;
			}
		}
	}

	// Check to see if we have a response for the expected dataType
	if ( dataTypes[ 0 ] in responses ) {
		finalDataType = dataTypes[ 0 ];
	} else {
		// Try convertible dataTypes
		for ( type in responses ) {
			if ( !dataTypes[ 0 ] || s.converters[ type + " " + dataTypes[0] ] ) {
				finalDataType = type;
				break;
			}
			if ( !firstDataType ) {
				firstDataType = type;
			}
		}
		// Or just use first one
		finalDataType = finalDataType || firstDataType;
	}

	// If we found a dataType
	// We add the dataType to the list if needed
	// and return the corresponding response
	if ( finalDataType ) {
		if ( finalDataType !== dataTypes[ 0 ] ) {
			dataTypes.unshift( finalDataType );
		}
		return responses[ finalDataType ];
	}
}

/* Chain conversions given the request and the original response
 * Also sets the responseXXX fields on the jqXHR instance
 */
function ajaxConvert( s, response, jqXHR, isSuccess ) {
	var conv2, current, conv, tmp, prev,
		converters = {},
		// Work with a copy of dataTypes in case we need to modify it for conversion
		dataTypes = s.dataTypes.slice();

	// Create converters map with lowercased keys
	if ( dataTypes[ 1 ] ) {
		for ( conv in s.converters ) {
			converters[ conv.toLowerCase() ] = s.converters[ conv ];
		}
	}

	current = dataTypes.shift();

	// Convert to each sequential dataType
	while ( current ) {

		if ( s.responseFields[ current ] ) {
			jqXHR[ s.responseFields[ current ] ] = response;
		}

		// Apply the dataFilter if provided
		if ( !prev && isSuccess && s.dataFilter ) {
			response = s.dataFilter( response, s.dataType );
		}

		prev = current;
		current = dataTypes.shift();

		if ( current ) {

			// There's only work to do if current dataType is non-auto
			if ( current === "*" ) {

				current = prev;

			// Convert response if prev dataType is non-auto and differs from current
			} else if ( prev !== "*" && prev !== current ) {

				// Seek a direct converter
				conv = converters[ prev + " " + current ] || converters[ "* " + current ];

				// If none found, seek a pair
				if ( !conv ) {
					for ( conv2 in converters ) {

						// If conv2 outputs current
						tmp = conv2.split( " " );
						if ( tmp[ 1 ] === current ) {

							// If prev can be converted to accepted input
							conv = converters[ prev + " " + tmp[ 0 ] ] ||
								converters[ "* " + tmp[ 0 ] ];
							if ( conv ) {
								// Condense equivalence converters
								if ( conv === true ) {
									conv = converters[ conv2 ];

								// Otherwise, insert the intermediate dataType
								} else if ( converters[ conv2 ] !== true ) {
									current = tmp[ 0 ];
									dataTypes.unshift( tmp[ 1 ] );
								}
								break;
							}
						}
					}
				}

				// Apply converter (if not an equivalence)
				if ( conv !== true ) {

					// Unless errors are allowed to bubble, catch and return them
					if ( conv && s[ "throws" ] ) {
						response = conv( response );
					} else {
						try {
							response = conv( response );
						} catch ( e ) {
							return { state: "parsererror", error: conv ? e : "No conversion from " + prev + " to " + current };
						}
					}
				}
			}
		}
	}

	return { state: "success", data: response };
}

jQuery.extend({

	// Counter for holding the number of active queries
	active: 0,

	// Last-Modified header cache for next request
	lastModified: {},
	etag: {},

	ajaxSettings: {
		url: ajaxLocation,
		type: "GET",
		isLocal: rlocalProtocol.test( ajaxLocParts[ 1 ] ),
		global: true,
		processData: true,
		async: true,
		contentType: "application/x-www-form-urlencoded; charset=UTF-8",
		/*
		timeout: 0,
		data: null,
		dataType: null,
		username: null,
		password: null,
		cache: null,
		throws: false,
		traditional: false,
		headers: {},
		*/

		accepts: {
			"*": allTypes,
			text: "text/plain",
			html: "text/html",
			xml: "application/xml, text/xml",
			json: "application/json, text/javascript"
		},

		contents: {
			xml: /xml/,
			html: /html/,
			json: /json/
		},

		responseFields: {
			xml: "responseXML",
			text: "responseText",
			json: "responseJSON"
		},

		// Data converters
		// Keys separate source (or catchall "*") and destination types with a single space
		converters: {

			// Convert anything to text
			"* text": String,

			// Text to html (true = no transformation)
			"text html": true,

			// Evaluate text as a json expression
			"text json": jQuery.parseJSON,

			// Parse text as xml
			"text xml": jQuery.parseXML
		},

		// For options that shouldn't be deep extended:
		// you can add your own custom options here if
		// and when you create one that shouldn't be
		// deep extended (see ajaxExtend)
		flatOptions: {
			url: true,
			context: true
		}
	},

	// Creates a full fledged settings object into target
	// with both ajaxSettings and settings fields.
	// If target is omitted, writes into ajaxSettings.
	ajaxSetup: function( target, settings ) {
		return settings ?

			// Building a settings object
			ajaxExtend( ajaxExtend( target, jQuery.ajaxSettings ), settings ) :

			// Extending ajaxSettings
			ajaxExtend( jQuery.ajaxSettings, target );
	},

	ajaxPrefilter: addToPrefiltersOrTransports( prefilters ),
	ajaxTransport: addToPrefiltersOrTransports( transports ),

	// Main method
	ajax: function( url, options ) {

		// If url is an object, simulate pre-1.5 signature
		if ( typeof url === "object" ) {
			options = url;
			url = undefined;
		}

		// Force options to be an object
		options = options || {};

		var // Cross-domain detection vars
			parts,
			// Loop variable
			i,
			// URL without anti-cache param
			cacheURL,
			// Response headers as string
			responseHeadersString,
			// timeout handle
			timeoutTimer,

			// To know if global events are to be dispatched
			fireGlobals,

			transport,
			// Response headers
			responseHeaders,
			// Create the final options object
			s = jQuery.ajaxSetup( {}, options ),
			// Callbacks context
			callbackContext = s.context || s,
			// Context for global events is callbackContext if it is a DOM node or jQuery collection
			globalEventContext = s.context && ( callbackContext.nodeType || callbackContext.jquery ) ?
				jQuery( callbackContext ) :
				jQuery.event,
			// Deferreds
			deferred = jQuery.Deferred(),
			completeDeferred = jQuery.Callbacks("once memory"),
			// Status-dependent callbacks
			statusCode = s.statusCode || {},
			// Headers (they are sent all at once)
			requestHeaders = {},
			requestHeadersNames = {},
			// The jqXHR state
			state = 0,
			// Default abort message
			strAbort = "canceled",
			// Fake xhr
			jqXHR = {
				readyState: 0,

				// Builds headers hashtable if needed
				getResponseHeader: function( key ) {
					var match;
					if ( state === 2 ) {
						if ( !responseHeaders ) {
							responseHeaders = {};
							while ( (match = rheaders.exec( responseHeadersString )) ) {
								responseHeaders[ match[1].toLowerCase() ] = match[ 2 ];
							}
						}
						match = responseHeaders[ key.toLowerCase() ];
					}
					return match == null ? null : match;
				},

				// Raw string
				getAllResponseHeaders: function() {
					return state === 2 ? responseHeadersString : null;
				},

				// Caches the header
				setRequestHeader: function( name, value ) {
					var lname = name.toLowerCase();
					if ( !state ) {
						name = requestHeadersNames[ lname ] = requestHeadersNames[ lname ] || name;
						requestHeaders[ name ] = value;
					}
					return this;
				},

				// Overrides response content-type header
				overrideMimeType: function( type ) {
					if ( !state ) {
						s.mimeType = type;
					}
					return this;
				},

				// Status-dependent callbacks
				statusCode: function( map ) {
					var code;
					if ( map ) {
						if ( state < 2 ) {
							for ( code in map ) {
								// Lazy-add the new callback in a way that preserves old ones
								statusCode[ code ] = [ statusCode[ code ], map[ code ] ];
							}
						} else {
							// Execute the appropriate callbacks
							jqXHR.always( map[ jqXHR.status ] );
						}
					}
					return this;
				},

				// Cancel the request
				abort: function( statusText ) {
					var finalText = statusText || strAbort;
					if ( transport ) {
						transport.abort( finalText );
					}
					done( 0, finalText );
					return this;
				}
			};

		// Attach deferreds
		deferred.promise( jqXHR ).complete = completeDeferred.add;
		jqXHR.success = jqXHR.done;
		jqXHR.error = jqXHR.fail;

		// Remove hash character (#7531: and string promotion)
		// Add protocol if not provided (#5866: IE7 issue with protocol-less urls)
		// Handle falsy url in the settings object (#10093: consistency with old signature)
		// We also use the url parameter if available
		s.url = ( ( url || s.url || ajaxLocation ) + "" ).replace( rhash, "" ).replace( rprotocol, ajaxLocParts[ 1 ] + "//" );

		// Alias method option to type as per ticket #12004
		s.type = options.method || options.type || s.method || s.type;

		// Extract dataTypes list
		s.dataTypes = jQuery.trim( s.dataType || "*" ).toLowerCase().match( rnotwhite ) || [ "" ];

		// A cross-domain request is in order when we have a protocol:host:port mismatch
		if ( s.crossDomain == null ) {
			parts = rurl.exec( s.url.toLowerCase() );
			s.crossDomain = !!( parts &&
				( parts[ 1 ] !== ajaxLocParts[ 1 ] || parts[ 2 ] !== ajaxLocParts[ 2 ] ||
					( parts[ 3 ] || ( parts[ 1 ] === "http:" ? "80" : "443" ) ) !==
						( ajaxLocParts[ 3 ] || ( ajaxLocParts[ 1 ] === "http:" ? "80" : "443" ) ) )
			);
		}

		// Convert data if not already a string
		if ( s.data && s.processData && typeof s.data !== "string" ) {
			s.data = jQuery.param( s.data, s.traditional );
		}

		// Apply prefilters
		inspectPrefiltersOrTransports( prefilters, s, options, jqXHR );

		// If request was aborted inside a prefilter, stop there
		if ( state === 2 ) {
			return jqXHR;
		}

		// We can fire global events as of now if asked to
		fireGlobals = s.global;

		// Watch for a new set of requests
		if ( fireGlobals && jQuery.active++ === 0 ) {
			jQuery.event.trigger("ajaxStart");
		}

		// Uppercase the type
		s.type = s.type.toUpperCase();

		// Determine if request has content
		s.hasContent = !rnoContent.test( s.type );

		// Save the URL in case we're toying with the If-Modified-Since
		// and/or If-None-Match header later on
		cacheURL = s.url;

		// More options handling for requests with no content
		if ( !s.hasContent ) {

			// If data is available, append data to url
			if ( s.data ) {
				cacheURL = ( s.url += ( rquery.test( cacheURL ) ? "&" : "?" ) + s.data );
				// #9682: remove data so that it's not used in an eventual retry
				delete s.data;
			}

			// Add anti-cache in url if needed
			if ( s.cache === false ) {
				s.url = rts.test( cacheURL ) ?

					// If there is already a '_' parameter, set its value
					cacheURL.replace( rts, "$1_=" + nonce++ ) :

					// Otherwise add one to the end
					cacheURL + ( rquery.test( cacheURL ) ? "&" : "?" ) + "_=" + nonce++;
			}
		}

		// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
		if ( s.ifModified ) {
			if ( jQuery.lastModified[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-Modified-Since", jQuery.lastModified[ cacheURL ] );
			}
			if ( jQuery.etag[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-None-Match", jQuery.etag[ cacheURL ] );
			}
		}

		// Set the correct header, if data is being sent
		if ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {
			jqXHR.setRequestHeader( "Content-Type", s.contentType );
		}

		// Set the Accepts header for the server, depending on the dataType
		jqXHR.setRequestHeader(
			"Accept",
			s.dataTypes[ 0 ] && s.accepts[ s.dataTypes[0] ] ?
				s.accepts[ s.dataTypes[0] ] + ( s.dataTypes[ 0 ] !== "*" ? ", " + allTypes + "; q=0.01" : "" ) :
				s.accepts[ "*" ]
		);

		// Check for headers option
		for ( i in s.headers ) {
			jqXHR.setRequestHeader( i, s.headers[ i ] );
		}

		// Allow custom headers/mimetypes and early abort
		if ( s.beforeSend && ( s.beforeSend.call( callbackContext, jqXHR, s ) === false || state === 2 ) ) {
			// Abort if not done already and return
			return jqXHR.abort();
		}

		// aborting is no longer a cancellation
		strAbort = "abort";

		// Install callbacks on deferreds
		for ( i in { success: 1, error: 1, complete: 1 } ) {
			jqXHR[ i ]( s[ i ] );
		}

		// Get transport
		transport = inspectPrefiltersOrTransports( transports, s, options, jqXHR );

		// If no transport, we auto-abort
		if ( !transport ) {
			done( -1, "No Transport" );
		} else {
			jqXHR.readyState = 1;

			// Send global event
			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxSend", [ jqXHR, s ] );
			}
			// Timeout
			if ( s.async && s.timeout > 0 ) {
				timeoutTimer = setTimeout(function() {
					jqXHR.abort("timeout");
				}, s.timeout );
			}

			try {
				state = 1;
				transport.send( requestHeaders, done );
			} catch ( e ) {
				// Propagate exception as error if not done
				if ( state < 2 ) {
					done( -1, e );
				// Simply rethrow otherwise
				} else {
					throw e;
				}
			}
		}

		// Callback for when everything is done
		function done( status, nativeStatusText, responses, headers ) {
			var isSuccess, success, error, response, modified,
				statusText = nativeStatusText;

			// Called once
			if ( state === 2 ) {
				return;
			}

			// State is "done" now
			state = 2;

			// Clear timeout if it exists
			if ( timeoutTimer ) {
				clearTimeout( timeoutTimer );
			}

			// Dereference transport for early garbage collection
			// (no matter how long the jqXHR object will be used)
			transport = undefined;

			// Cache response headers
			responseHeadersString = headers || "";

			// Set readyState
			jqXHR.readyState = status > 0 ? 4 : 0;

			// Determine if successful
			isSuccess = status >= 200 && status < 300 || status === 304;

			// Get response data
			if ( responses ) {
				response = ajaxHandleResponses( s, jqXHR, responses );
			}

			// Convert no matter what (that way responseXXX fields are always set)
			response = ajaxConvert( s, response, jqXHR, isSuccess );

			// If successful, handle type chaining
			if ( isSuccess ) {

				// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
				if ( s.ifModified ) {
					modified = jqXHR.getResponseHeader("Last-Modified");
					if ( modified ) {
						jQuery.lastModified[ cacheURL ] = modified;
					}
					modified = jqXHR.getResponseHeader("etag");
					if ( modified ) {
						jQuery.etag[ cacheURL ] = modified;
					}
				}

				// if no content
				if ( status === 204 || s.type === "HEAD" ) {
					statusText = "nocontent";

				// if not modified
				} else if ( status === 304 ) {
					statusText = "notmodified";

				// If we have data, let's convert it
				} else {
					statusText = response.state;
					success = response.data;
					error = response.error;
					isSuccess = !error;
				}
			} else {
				// We extract error from statusText
				// then normalize statusText and status for non-aborts
				error = statusText;
				if ( status || !statusText ) {
					statusText = "error";
					if ( status < 0 ) {
						status = 0;
					}
				}
			}

			// Set data for the fake xhr object
			jqXHR.status = status;
			jqXHR.statusText = ( nativeStatusText || statusText ) + "";

			// Success/Error
			if ( isSuccess ) {
				deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
			} else {
				deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
			}

			// Status-dependent callbacks
			jqXHR.statusCode( statusCode );
			statusCode = undefined;

			if ( fireGlobals ) {
				globalEventContext.trigger( isSuccess ? "ajaxSuccess" : "ajaxError",
					[ jqXHR, s, isSuccess ? success : error ] );
			}

			// Complete
			completeDeferred.fireWith( callbackContext, [ jqXHR, statusText ] );

			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxComplete", [ jqXHR, s ] );
				// Handle the global AJAX counter
				if ( !( --jQuery.active ) ) {
					jQuery.event.trigger("ajaxStop");
				}
			}
		}

		return jqXHR;
	},

	getJSON: function( url, data, callback ) {
		return jQuery.get( url, data, callback, "json" );
	},

	getScript: function( url, callback ) {
		return jQuery.get( url, undefined, callback, "script" );
	}
});

jQuery.each( [ "get", "post" ], function( i, method ) {
	jQuery[ method ] = function( url, data, callback, type ) {
		// shift arguments if data argument was omitted
		if ( jQuery.isFunction( data ) ) {
			type = type || callback;
			callback = data;
			data = undefined;
		}

		return jQuery.ajax({
			url: url,
			type: method,
			dataType: type,
			data: data,
			success: callback
		});
	};
});

// Attach a bunch of functions for handling common AJAX events
jQuery.each( [ "ajaxStart", "ajaxStop", "ajaxComplete", "ajaxError", "ajaxSuccess", "ajaxSend" ], function( i, type ) {
	jQuery.fn[ type ] = function( fn ) {
		return this.on( type, fn );
	};
});


jQuery._evalUrl = function( url ) {
	return jQuery.ajax({
		url: url,
		type: "GET",
		dataType: "script",
		async: false,
		global: false,
		"throws": true
	});
};


var r20 = /%20/g,
	rbracket = /\[\]$/,
	rCRLF = /\r?\n/g,
	rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
	rsubmittable = /^(?:input|select|textarea|keygen)/i;

function buildParams( prefix, obj, traditional, add ) {
	var name;

	if ( jQuery.isArray( obj ) ) {
		// Serialize array item.
		jQuery.each( obj, function( i, v ) {
			if ( traditional || rbracket.test( prefix ) ) {
				// Treat each array item as a scalar.
				add( prefix, v );

			} else {
				// Item is non-scalar (array or object), encode its numeric index.
				buildParams( prefix + "[" + ( typeof v === "object" ? i : "" ) + "]", v, traditional, add );
			}
		});

	} else if ( !traditional && jQuery.type( obj ) === "object" ) {
		// Serialize object item.
		for ( name in obj ) {
			buildParams( prefix + "[" + name + "]", obj[ name ], traditional, add );
		}

	} else {
		// Serialize scalar item.
		add( prefix, obj );
	}
}

// Serialize an array of form elements or a set of
// key/values into a query string
jQuery.param = function( a, traditional ) {
	var prefix,
		s = [],
		add = function( key, value ) {
			// If value is a function, invoke it and return its value
			value = jQuery.isFunction( value ) ? value() : ( value == null ? "" : value );
			s[ s.length ] = encodeURIComponent( key ) + "=" + encodeURIComponent( value );
		};

	// Set traditional to true for jQuery <= 1.3.2 behavior.
	if ( traditional === undefined ) {
		traditional = jQuery.ajaxSettings && jQuery.ajaxSettings.traditional;
	}

	// If an array was passed in, assume that it is an array of form elements.
	if ( jQuery.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {
		// Serialize the form elements
		jQuery.each( a, function() {
			add( this.name, this.value );
		});

	} else {
		// If traditional, encode the "old" way (the way 1.3.2 or older
		// did it), otherwise encode params recursively.
		for ( prefix in a ) {
			buildParams( prefix, a[ prefix ], traditional, add );
		}
	}

	// Return the resulting serialization
	return s.join( "&" ).replace( r20, "+" );
};

jQuery.fn.extend({
	serialize: function() {
		return jQuery.param( this.serializeArray() );
	},
	serializeArray: function() {
		return this.map(function() {
			// Can add propHook for "elements" to filter or add form elements
			var elements = jQuery.prop( this, "elements" );
			return elements ? jQuery.makeArray( elements ) : this;
		})
		.filter(function() {
			var type = this.type;
			// Use .is(":disabled") so that fieldset[disabled] works
			return this.name && !jQuery( this ).is( ":disabled" ) &&
				rsubmittable.test( this.nodeName ) && !rsubmitterTypes.test( type ) &&
				( this.checked || !rcheckableType.test( type ) );
		})
		.map(function( i, elem ) {
			var val = jQuery( this ).val();

			return val == null ?
				null :
				jQuery.isArray( val ) ?
					jQuery.map( val, function( val ) {
						return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
					}) :
					{ name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
		}).get();
	}
});


// Create the request object
// (This is still attached to ajaxSettings for backward compatibility)
jQuery.ajaxSettings.xhr = window.ActiveXObject !== undefined ?
	// Support: IE6+
	function() {

		// XHR cannot access local files, always use ActiveX for that case
		return !this.isLocal &&

			// Support: IE7-8
			// oldIE XHR does not support non-RFC2616 methods (#13240)
			// See http://msdn.microsoft.com/en-us/library/ie/ms536648(v=vs.85).aspx
			// and http://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9
			// Although this check for six methods instead of eight
			// since IE also does not support "trace" and "connect"
			/^(get|post|head|put|delete|options)$/i.test( this.type ) &&

			createStandardXHR() || createActiveXHR();
	} :
	// For all other browsers, use the standard XMLHttpRequest object
	createStandardXHR;

var xhrId = 0,
	xhrCallbacks = {},
	xhrSupported = jQuery.ajaxSettings.xhr();

// Support: IE<10
// Open requests must be manually aborted on unload (#5280)
if ( window.ActiveXObject ) {
	jQuery( window ).on( "unload", function() {
		for ( var key in xhrCallbacks ) {
			xhrCallbacks[ key ]( undefined, true );
		}
	});
}

// Determine support properties
support.cors = !!xhrSupported && ( "withCredentials" in xhrSupported );
xhrSupported = support.ajax = !!xhrSupported;

// Create transport if the browser can provide an xhr
if ( xhrSupported ) {

	jQuery.ajaxTransport(function( options ) {
		// Cross domain only allowed if supported through XMLHttpRequest
		if ( !options.crossDomain || support.cors ) {

			var callback;

			return {
				send: function( headers, complete ) {
					var i,
						xhr = options.xhr(),
						id = ++xhrId;

					// Open the socket
					xhr.open( options.type, options.url, options.async, options.username, options.password );

					// Apply custom fields if provided
					if ( options.xhrFields ) {
						for ( i in options.xhrFields ) {
							xhr[ i ] = options.xhrFields[ i ];
						}
					}

					// Override mime type if needed
					if ( options.mimeType && xhr.overrideMimeType ) {
						xhr.overrideMimeType( options.mimeType );
					}

					// X-Requested-With header
					// For cross-domain requests, seeing as conditions for a preflight are
					// akin to a jigsaw puzzle, we simply never set it to be sure.
					// (it can always be set on a per-request basis or even using ajaxSetup)
					// For same-domain requests, won't change header if already provided.
					if ( !options.crossDomain && !headers["X-Requested-With"] ) {
						headers["X-Requested-With"] = "XMLHttpRequest";
					}

					// Set headers
					for ( i in headers ) {
						// Support: IE<9
						// IE's ActiveXObject throws a 'Type Mismatch' exception when setting
						// request header to a null-value.
						//
						// To keep consistent with other XHR implementations, cast the value
						// to string and ignore `undefined`.
						if ( headers[ i ] !== undefined ) {
							xhr.setRequestHeader( i, headers[ i ] + "" );
						}
					}

					// Do send the request
					// This may raise an exception which is actually
					// handled in jQuery.ajax (so no try/catch here)
					xhr.send( ( options.hasContent && options.data ) || null );

					// Listener
					callback = function( _, isAbort ) {
						var status, statusText, responses;

						// Was never called and is aborted or complete
						if ( callback && ( isAbort || xhr.readyState === 4 ) ) {
							// Clean up
							delete xhrCallbacks[ id ];
							callback = undefined;
							xhr.onreadystatechange = jQuery.noop;

							// Abort manually if needed
							if ( isAbort ) {
								if ( xhr.readyState !== 4 ) {
									xhr.abort();
								}
							} else {
								responses = {};
								status = xhr.status;

								// Support: IE<10
								// Accessing binary-data responseText throws an exception
								// (#11426)
								if ( typeof xhr.responseText === "string" ) {
									responses.text = xhr.responseText;
								}

								// Firefox throws an exception when accessing
								// statusText for faulty cross-domain requests
								try {
									statusText = xhr.statusText;
								} catch( e ) {
									// We normalize with Webkit giving an empty statusText
									statusText = "";
								}

								// Filter status for non standard behaviors

								// If the request is local and we have data: assume a success
								// (success with no data won't get notified, that's the best we
								// can do given current implementations)
								if ( !status && options.isLocal && !options.crossDomain ) {
									status = responses.text ? 200 : 404;
								// IE - #1450: sometimes returns 1223 when it should be 204
								} else if ( status === 1223 ) {
									status = 204;
								}
							}
						}

						// Call complete if needed
						if ( responses ) {
							complete( status, statusText, responses, xhr.getAllResponseHeaders() );
						}
					};

					if ( !options.async ) {
						// if we're in sync mode we fire the callback
						callback();
					} else if ( xhr.readyState === 4 ) {
						// (IE6 & IE7) if it's in cache and has been
						// retrieved directly we need to fire the callback
						setTimeout( callback );
					} else {
						// Add to the list of active xhr callbacks
						xhr.onreadystatechange = xhrCallbacks[ id ] = callback;
					}
				},

				abort: function() {
					if ( callback ) {
						callback( undefined, true );
					}
				}
			};
		}
	});
}

// Functions to create xhrs
function createStandardXHR() {
	try {
		return new window.XMLHttpRequest();
	} catch( e ) {}
}

function createActiveXHR() {
	try {
		return new window.ActiveXObject( "Microsoft.XMLHTTP" );
	} catch( e ) {}
}




// Install script dataType
jQuery.ajaxSetup({
	accepts: {
		script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"
	},
	contents: {
		script: /(?:java|ecma)script/
	},
	converters: {
		"text script": function( text ) {
			jQuery.globalEval( text );
			return text;
		}
	}
});

// Handle cache's special case and global
jQuery.ajaxPrefilter( "script", function( s ) {
	if ( s.cache === undefined ) {
		s.cache = false;
	}
	if ( s.crossDomain ) {
		s.type = "GET";
		s.global = false;
	}
});

// Bind script tag hack transport
jQuery.ajaxTransport( "script", function(s) {

	// This transport only deals with cross domain requests
	if ( s.crossDomain ) {

		var script,
			head = document.head || jQuery("head")[0] || document.documentElement;

		return {

			send: function( _, callback ) {

				script = document.createElement("script");

				script.async = true;

				if ( s.scriptCharset ) {
					script.charset = s.scriptCharset;
				}

				script.src = s.url;

				// Attach handlers for all browsers
				script.onload = script.onreadystatechange = function( _, isAbort ) {

					if ( isAbort || !script.readyState || /loaded|complete/.test( script.readyState ) ) {

						// Handle memory leak in IE
						script.onload = script.onreadystatechange = null;

						// Remove the script
						if ( script.parentNode ) {
							script.parentNode.removeChild( script );
						}

						// Dereference the script
						script = null;

						// Callback if not abort
						if ( !isAbort ) {
							callback( 200, "success" );
						}
					}
				};

				// Circumvent IE6 bugs with base elements (#2709 and #4378) by prepending
				// Use native DOM manipulation to avoid our domManip AJAX trickery
				head.insertBefore( script, head.firstChild );
			},

			abort: function() {
				if ( script ) {
					script.onload( undefined, true );
				}
			}
		};
	}
});




var oldCallbacks = [],
	rjsonp = /(=)\?(?=&|$)|\?\?/;

// Default jsonp settings
jQuery.ajaxSetup({
	jsonp: "callback",
	jsonpCallback: function() {
		var callback = oldCallbacks.pop() || ( jQuery.expando + "_" + ( nonce++ ) );
		this[ callback ] = true;
		return callback;
	}
});

// Detect, normalize options and install callbacks for jsonp requests
jQuery.ajaxPrefilter( "json jsonp", function( s, originalSettings, jqXHR ) {

	var callbackName, overwritten, responseContainer,
		jsonProp = s.jsonp !== false && ( rjsonp.test( s.url ) ?
			"url" :
			typeof s.data === "string" && !( s.contentType || "" ).indexOf("application/x-www-form-urlencoded") && rjsonp.test( s.data ) && "data"
		);

	// Handle iff the expected data type is "jsonp" or we have a parameter to set
	if ( jsonProp || s.dataTypes[ 0 ] === "jsonp" ) {

		// Get callback name, remembering preexisting value associated with it
		callbackName = s.jsonpCallback = jQuery.isFunction( s.jsonpCallback ) ?
			s.jsonpCallback() :
			s.jsonpCallback;

		// Insert callback into url or form data
		if ( jsonProp ) {
			s[ jsonProp ] = s[ jsonProp ].replace( rjsonp, "$1" + callbackName );
		} else if ( s.jsonp !== false ) {
			s.url += ( rquery.test( s.url ) ? "&" : "?" ) + s.jsonp + "=" + callbackName;
		}

		// Use data converter to retrieve json after script execution
		s.converters["script json"] = function() {
			if ( !responseContainer ) {
				jQuery.error( callbackName + " was not called" );
			}
			return responseContainer[ 0 ];
		};

		// force json dataType
		s.dataTypes[ 0 ] = "json";

		// Install callback
		overwritten = window[ callbackName ];
		window[ callbackName ] = function() {
			responseContainer = arguments;
		};

		// Clean-up function (fires after converters)
		jqXHR.always(function() {
			// Restore preexisting value
			window[ callbackName ] = overwritten;

			// Save back as free
			if ( s[ callbackName ] ) {
				// make sure that re-using the options doesn't screw things around
				s.jsonpCallback = originalSettings.jsonpCallback;

				// save the callback name for future use
				oldCallbacks.push( callbackName );
			}

			// Call if it was a function and we have a response
			if ( responseContainer && jQuery.isFunction( overwritten ) ) {
				overwritten( responseContainer[ 0 ] );
			}

			responseContainer = overwritten = undefined;
		});

		// Delegate to script
		return "script";
	}
});




// data: string of html
// context (optional): If specified, the fragment will be created in this context, defaults to document
// keepScripts (optional): If true, will include scripts passed in the html string
jQuery.parseHTML = function( data, context, keepScripts ) {
	if ( !data || typeof data !== "string" ) {
		return null;
	}
	if ( typeof context === "boolean" ) {
		keepScripts = context;
		context = false;
	}
	context = context || document;

	var parsed = rsingleTag.exec( data ),
		scripts = !keepScripts && [];

	// Single tag
	if ( parsed ) {
		return [ context.createElement( parsed[1] ) ];
	}

	parsed = jQuery.buildFragment( [ data ], context, scripts );

	if ( scripts && scripts.length ) {
		jQuery( scripts ).remove();
	}

	return jQuery.merge( [], parsed.childNodes );
};


// Keep a copy of the old load method
var _load = jQuery.fn.load;

/**
 * Load a url into a page
 */
jQuery.fn.load = function( url, params, callback ) {
	if ( typeof url !== "string" && _load ) {
		return _load.apply( this, arguments );
	}

	var selector, response, type,
		self = this,
		off = url.indexOf(" ");

	if ( off >= 0 ) {
		selector = url.slice( off, url.length );
		url = url.slice( 0, off );
	}

	// If it's a function
	if ( jQuery.isFunction( params ) ) {

		// We assume that it's the callback
		callback = params;
		params = undefined;

	// Otherwise, build a param string
	} else if ( params && typeof params === "object" ) {
		type = "POST";
	}

	// If we have elements to modify, make the request
	if ( self.length > 0 ) {
		jQuery.ajax({
			url: url,

			// if "type" variable is undefined, then "GET" method will be used
			type: type,
			dataType: "html",
			data: params
		}).done(function( responseText ) {

			// Save response for use in complete callback
			response = arguments;

			self.html( selector ?

				// If a selector was specified, locate the right elements in a dummy div
				// Exclude scripts to avoid IE 'Permission Denied' errors
				jQuery("<div>").append( jQuery.parseHTML( responseText ) ).find( selector ) :

				// Otherwise use the full result
				responseText );

		}).complete( callback && function( jqXHR, status ) {
			self.each( callback, response || [ jqXHR.responseText, status, jqXHR ] );
		});
	}

	return this;
};




// Register as a named AMD module, since jQuery can be concatenated with other
// files that may use define, but not via a proper concatenation script that
// understands anonymous AMD modules. A named AMD is safest and most robust
// way to register. Lowercase jquery is used because AMD module names are
// derived from file names, and jQuery is normally delivered in a lowercase
// file name. Do this after creating the global so that if an AMD module wants
// to call noConflict to hide this version of jQuery, it will work.
if ( typeof define === "function" && define.amd ) {
	define( "jquery", [], function() {
		return jQuery;
	});
}




var
	// Map over jQuery in case of overwrite
	_jQuery = window.jQuery,

	// Map over the $ in case of overwrite
	_$ = window.$;

jQuery.noConflict = function( deep ) {
	if ( window.$ === jQuery ) {
		window.$ = _$;
	}

	if ( deep && window.jQuery === jQuery ) {
		window.jQuery = _jQuery;
	}

	return jQuery;
};

// Expose jQuery and $ identifiers, even in
// AMD (#7102#comment:10, https://github.com/jquery/jquery/pull/557)
// and CommonJS for browser emulators (#13566)
if ( typeof noGlobal === strundefined ) {
	window.jQuery = window.$ = jQuery;
}




return jQuery;

}));

define("vendor/jquery-bare", function(){});

