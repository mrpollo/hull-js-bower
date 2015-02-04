(function(){var require, requirejs, define, root={jQuery: window.jQuery}, HULL_ENV = 'client'; (function () {/** vim: et:ts=4:sw=4:sts=4
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

//  Underscore.string
//  (c) 2010 Esa-Matti Suuronen <esa-matti aet suuronen dot org>
//  Underscore.string is freely distributable under the terms of the MIT license.
//  Documentation: https://github.com/epeli/underscore.string
//  Some code is borrowed from MooTools and Alexandru Marasteanu.
//  Version '2.3.1'

!function(root, String){
  

  // Defining helper functions.

  var nativeTrim = String.prototype.trim;
  var nativeTrimRight = String.prototype.trimRight;
  var nativeTrimLeft = String.prototype.trimLeft;

  var parseNumber = function(source) { return source * 1 || 0; };

  var strRepeat = function(str, qty){
    if (qty < 1) return '';
    var result = '';
    while (qty > 0) {
      if (qty & 1) result += str;
      qty >>= 1, str += str;
    }
    return result;
  };

  var slice = [].slice;

  var defaultToWhiteSpace = function(characters) {
    if (characters == null)
      return '\\s';
    else if (characters.source)
      return characters.source;
    else
      return '[' + _s.escapeRegExp(characters) + ']';
  };

  var escapeChars = {
    lt: '<',
    gt: '>',
    quot: '"',
    amp: '&',
    apos: "'"
  };

  var reversedEscapeChars = {};
  for(var key in escapeChars) reversedEscapeChars[escapeChars[key]] = key;
  reversedEscapeChars["'"] = '#39';

  // sprintf() for JavaScript 0.7-beta1
  // http://www.diveintojavascript.com/projects/javascript-sprintf
  //
  // Copyright (c) Alexandru Marasteanu <alexaholic [at) gmail (dot] com>
  // All rights reserved.

  var sprintf = (function() {
    function get_type(variable) {
      return Object.prototype.toString.call(variable).slice(8, -1).toLowerCase();
    }

    var str_repeat = strRepeat;

    var str_format = function() {
      if (!str_format.cache.hasOwnProperty(arguments[0])) {
        str_format.cache[arguments[0]] = str_format.parse(arguments[0]);
      }
      return str_format.format.call(null, str_format.cache[arguments[0]], arguments);
    };

    str_format.format = function(parse_tree, argv) {
      var cursor = 1, tree_length = parse_tree.length, node_type = '', arg, output = [], i, k, match, pad, pad_character, pad_length;
      for (i = 0; i < tree_length; i++) {
        node_type = get_type(parse_tree[i]);
        if (node_type === 'string') {
          output.push(parse_tree[i]);
        }
        else if (node_type === 'array') {
          match = parse_tree[i]; // convenience purposes only
          if (match[2]) { // keyword argument
            arg = argv[cursor];
            for (k = 0; k < match[2].length; k++) {
              if (!arg.hasOwnProperty(match[2][k])) {
                throw new Error(sprintf('[_.sprintf] property "%s" does not exist', match[2][k]));
              }
              arg = arg[match[2][k]];
            }
          } else if (match[1]) { // positional argument (explicit)
            arg = argv[match[1]];
          }
          else { // positional argument (implicit)
            arg = argv[cursor++];
          }

          if (/[^s]/.test(match[8]) && (get_type(arg) != 'number')) {
            throw new Error(sprintf('[_.sprintf] expecting number but found %s', get_type(arg)));
          }
          switch (match[8]) {
            case 'b': arg = arg.toString(2); break;
            case 'c': arg = String.fromCharCode(arg); break;
            case 'd': arg = parseInt(arg, 10); break;
            case 'e': arg = match[7] ? arg.toExponential(match[7]) : arg.toExponential(); break;
            case 'f': arg = match[7] ? parseFloat(arg).toFixed(match[7]) : parseFloat(arg); break;
            case 'o': arg = arg.toString(8); break;
            case 's': arg = ((arg = String(arg)) && match[7] ? arg.substring(0, match[7]) : arg); break;
            case 'u': arg = Math.abs(arg); break;
            case 'x': arg = arg.toString(16); break;
            case 'X': arg = arg.toString(16).toUpperCase(); break;
          }
          arg = (/[def]/.test(match[8]) && match[3] && arg >= 0 ? '+'+ arg : arg);
          pad_character = match[4] ? match[4] == '0' ? '0' : match[4].charAt(1) : ' ';
          pad_length = match[6] - String(arg).length;
          pad = match[6] ? str_repeat(pad_character, pad_length) : '';
          output.push(match[5] ? arg + pad : pad + arg);
        }
      }
      return output.join('');
    };

    str_format.cache = {};

    str_format.parse = function(fmt) {
      var _fmt = fmt, match = [], parse_tree = [], arg_names = 0;
      while (_fmt) {
        if ((match = /^[^\x25]+/.exec(_fmt)) !== null) {
          parse_tree.push(match[0]);
        }
        else if ((match = /^\x25{2}/.exec(_fmt)) !== null) {
          parse_tree.push('%');
        }
        else if ((match = /^\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/.exec(_fmt)) !== null) {
          if (match[2]) {
            arg_names |= 1;
            var field_list = [], replacement_field = match[2], field_match = [];
            if ((field_match = /^([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
              field_list.push(field_match[1]);
              while ((replacement_field = replacement_field.substring(field_match[0].length)) !== '') {
                if ((field_match = /^\.([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
                  field_list.push(field_match[1]);
                }
                else if ((field_match = /^\[(\d+)\]/.exec(replacement_field)) !== null) {
                  field_list.push(field_match[1]);
                }
                else {
                  throw new Error('[_.sprintf] huh?');
                }
              }
            }
            else {
              throw new Error('[_.sprintf] huh?');
            }
            match[2] = field_list;
          }
          else {
            arg_names |= 2;
          }
          if (arg_names === 3) {
            throw new Error('[_.sprintf] mixing positional and named placeholders is not (yet) supported');
          }
          parse_tree.push(match);
        }
        else {
          throw new Error('[_.sprintf] huh?');
        }
        _fmt = _fmt.substring(match[0].length);
      }
      return parse_tree;
    };

    return str_format;
  })();



  // Defining underscore.string

  var _s = {

    VERSION: '2.3.1',

    isBlank: function(str){
      if (str == null) str = '';
      return (/^\s*$/).test(str);
    },

    stripTags: function(str){
      if (str == null) return '';
      return String(str).replace(/<\/?[^>]+>/g, '');
    },

    capitalize : function(str){
      str = str == null ? '' : String(str);
      return str.charAt(0).toUpperCase() + str.slice(1);
    },

    chop: function(str, step){
      if (str == null) return [];
      str = String(str);
      step = ~~step;
      return step > 0 ? str.match(new RegExp('.{1,' + step + '}', 'g')) : [str];
    },

    clean: function(str){
      return _s.strip(str).replace(/\s+/g, ' ');
    },

    count: function(str, substr){
      if (str == null || substr == null) return 0;

      str = String(str);
      substr = String(substr);

      var count = 0,
        pos = 0,
        length = substr.length;

      while (true) {
        pos = str.indexOf(substr, pos);
        if (pos === -1) break;
        count++;
        pos += length;
      }

      return count;
    },

    chars: function(str) {
      if (str == null) return [];
      return String(str).split('');
    },

    swapCase: function(str) {
      if (str == null) return '';
      return String(str).replace(/\S/g, function(c){
        return c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase();
      });
    },

    escapeHTML: function(str) {
      if (str == null) return '';
      return String(str).replace(/[&<>"']/g, function(m){ return '&' + reversedEscapeChars[m] + ';'; });
    },

    unescapeHTML: function(str) {
      if (str == null) return '';
      return String(str).replace(/\&([^;]+);/g, function(entity, entityCode){
        var match;

        if (entityCode in escapeChars) {
          return escapeChars[entityCode];
        } else if (match = entityCode.match(/^#x([\da-fA-F]+)$/)) {
          return String.fromCharCode(parseInt(match[1], 16));
        } else if (match = entityCode.match(/^#(\d+)$/)) {
          return String.fromCharCode(~~match[1]);
        } else {
          return entity;
        }
      });
    },

    escapeRegExp: function(str){
      if (str == null) return '';
      return String(str).replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
    },

    splice: function(str, i, howmany, substr){
      var arr = _s.chars(str);
      arr.splice(~~i, ~~howmany, substr);
      return arr.join('');
    },

    insert: function(str, i, substr){
      return _s.splice(str, i, 0, substr);
    },

    include: function(str, needle){
      if (needle === '') return true;
      if (str == null) return false;
      return String(str).indexOf(needle) !== -1;
    },

    join: function() {
      var args = slice.call(arguments),
        separator = args.shift();

      if (separator == null) separator = '';

      return args.join(separator);
    },

    lines: function(str) {
      if (str == null) return [];
      return String(str).split("\n");
    },

    reverse: function(str){
      return _s.chars(str).reverse().join('');
    },

    startsWith: function(str, starts){
      if (starts === '') return true;
      if (str == null || starts == null) return false;
      str = String(str); starts = String(starts);
      return str.length >= starts.length && str.slice(0, starts.length) === starts;
    },

    endsWith: function(str, ends){
      if (ends === '') return true;
      if (str == null || ends == null) return false;
      str = String(str); ends = String(ends);
      return str.length >= ends.length && str.slice(str.length - ends.length) === ends;
    },

    succ: function(str){
      if (str == null) return '';
      str = String(str);
      return str.slice(0, -1) + String.fromCharCode(str.charCodeAt(str.length-1) + 1);
    },

    titleize: function(str){
      if (str == null) return '';
      return String(str).replace(/(?:^|\s)\S/g, function(c){ return c.toUpperCase(); });
    },

    camelize: function(str){
      return _s.trim(str).replace(/[-_\s]+(.)?/g, function(match, c){ return c.toUpperCase(); });
    },

    underscored: function(str){
      return _s.trim(str).replace(/([a-z\d])([A-Z]+)/g, '$1_$2').replace(/[-\s]+/g, '_').toLowerCase();
    },

    dasherize: function(str){
      return _s.trim(str).replace(/([A-Z])/g, '-$1').replace(/[-_\s]+/g, '-').toLowerCase();
    },

    classify: function(str){
      return _s.titleize(String(str).replace(/[\W_]/g, ' ')).replace(/\s/g, '');
    },

    humanize: function(str){
      return _s.capitalize(_s.underscored(str).replace(/_id$/,'').replace(/_/g, ' '));
    },

    trim: function(str, characters){
      if (str == null) return '';
      if (!characters && nativeTrim) return nativeTrim.call(str);
      characters = defaultToWhiteSpace(characters);
      return String(str).replace(new RegExp('\^' + characters + '+|' + characters + '+$', 'g'), '');
    },

    ltrim: function(str, characters){
      if (str == null) return '';
      if (!characters && nativeTrimLeft) return nativeTrimLeft.call(str);
      characters = defaultToWhiteSpace(characters);
      return String(str).replace(new RegExp('^' + characters + '+'), '');
    },

    rtrim: function(str, characters){
      if (str == null) return '';
      if (!characters && nativeTrimRight) return nativeTrimRight.call(str);
      characters = defaultToWhiteSpace(characters);
      return String(str).replace(new RegExp(characters + '+$'), '');
    },

    truncate: function(str, length, truncateStr){
      if (str == null) return '';
      str = String(str); truncateStr = truncateStr || '...';
      length = ~~length;
      return str.length > length ? str.slice(0, length) + truncateStr : str;
    },

    /**
     * _s.prune: a more elegant version of truncate
     * prune extra chars, never leaving a half-chopped word.
     * @author github.com/rwz
     */
    prune: function(str, length, pruneStr){
      if (str == null) return '';

      str = String(str); length = ~~length;
      pruneStr = pruneStr != null ? String(pruneStr) : '...';

      if (str.length <= length) return str;

      var tmpl = function(c){ return c.toUpperCase() !== c.toLowerCase() ? 'A' : ' '; },
        template = str.slice(0, length+1).replace(/.(?=\W*\w*$)/g, tmpl); // 'Hello, world' -> 'HellAA AAAAA'

      if (template.slice(template.length-2).match(/\w\w/))
        template = template.replace(/\s*\S+$/, '');
      else
        template = _s.rtrim(template.slice(0, template.length-1));

      return (template+pruneStr).length > str.length ? str : str.slice(0, template.length)+pruneStr;
    },

    words: function(str, delimiter) {
      if (_s.isBlank(str)) return [];
      return _s.trim(str, delimiter).split(delimiter || /\s+/);
    },

    pad: function(str, length, padStr, type) {
      str = str == null ? '' : String(str);
      length = ~~length;

      var padlen  = 0;

      if (!padStr)
        padStr = ' ';
      else if (padStr.length > 1)
        padStr = padStr.charAt(0);

      switch(type) {
        case 'right':
          padlen = length - str.length;
          return str + strRepeat(padStr, padlen);
        case 'both':
          padlen = length - str.length;
          return strRepeat(padStr, Math.ceil(padlen/2)) + str
                  + strRepeat(padStr, Math.floor(padlen/2));
        default: // 'left'
          padlen = length - str.length;
          return strRepeat(padStr, padlen) + str;
        }
    },

    lpad: function(str, length, padStr) {
      return _s.pad(str, length, padStr);
    },

    rpad: function(str, length, padStr) {
      return _s.pad(str, length, padStr, 'right');
    },

    lrpad: function(str, length, padStr) {
      return _s.pad(str, length, padStr, 'both');
    },

    sprintf: sprintf,

    vsprintf: function(fmt, argv){
      argv.unshift(fmt);
      return sprintf.apply(null, argv);
    },

    toNumber: function(str, decimals) {
      if (!str) return 0;
      str = _s.trim(str);
      if (!str.match(/^-?\d+(?:\.\d+)?$/)) return NaN;
      return parseNumber(parseNumber(str).toFixed(~~decimals));
    },

    numberFormat : function(number, dec, dsep, tsep) {
      if (isNaN(number) || number == null) return '';

      number = number.toFixed(~~dec);
      tsep = typeof tsep == 'string' ? tsep : ',';

      var parts = number.split('.'), fnums = parts[0],
        decimals = parts[1] ? (dsep || '.') + parts[1] : '';

      return fnums.replace(/(\d)(?=(?:\d{3})+$)/g, '$1' + tsep) + decimals;
    },

    strRight: function(str, sep){
      if (str == null) return '';
      str = String(str); sep = sep != null ? String(sep) : sep;
      var pos = !sep ? -1 : str.indexOf(sep);
      return ~pos ? str.slice(pos+sep.length, str.length) : str;
    },

    strRightBack: function(str, sep){
      if (str == null) return '';
      str = String(str); sep = sep != null ? String(sep) : sep;
      var pos = !sep ? -1 : str.lastIndexOf(sep);
      return ~pos ? str.slice(pos+sep.length, str.length) : str;
    },

    strLeft: function(str, sep){
      if (str == null) return '';
      str = String(str); sep = sep != null ? String(sep) : sep;
      var pos = !sep ? -1 : str.indexOf(sep);
      return ~pos ? str.slice(0, pos) : str;
    },

    strLeftBack: function(str, sep){
      if (str == null) return '';
      str += ''; sep = sep != null ? ''+sep : sep;
      var pos = str.lastIndexOf(sep);
      return ~pos ? str.slice(0, pos) : str;
    },

    toSentence: function(array, separator, lastSeparator, serial) {
      separator = separator || ', '
      lastSeparator = lastSeparator || ' and '
      var a = array.slice(), lastMember = a.pop();

      if (array.length > 2 && serial) lastSeparator = _s.rtrim(separator) + lastSeparator;

      return a.length ? a.join(separator) + lastSeparator + lastMember : lastMember;
    },

    toSentenceSerial: function() {
      var args = slice.call(arguments);
      args[3] = true;
      return _s.toSentence.apply(_s, args);
    },

    slugify: function(str) {
      if (str == null) return '';

      var from  = "ąàáäâãåæćęèéëêìíïîłńòóöôõøùúüûñçżź",
          to    = "aaaaaaaaceeeeeiiiilnoooooouuuunczz",
          regex = new RegExp(defaultToWhiteSpace(from), 'g');

      str = String(str).toLowerCase().replace(regex, function(c){
        var index = from.indexOf(c);
        return to.charAt(index) || '-';
      });

      return _s.dasherize(str.replace(/[^\w\s-]/g, ''));
    },

    surround: function(str, wrapper) {
      return [wrapper, str, wrapper].join('');
    },

    quote: function(str) {
      return _s.surround(str, '"');
    },

    exports: function() {
      var result = {};

      for (var prop in this) {
        if (!this.hasOwnProperty(prop) || prop.match(/^(?:include|contains|reverse)$/)) continue;
        result[prop] = this[prop];
      }

      return result;
    },

    repeat: function(str, qty, separator){
      if (str == null) return '';

      qty = ~~qty;

      // using faster implementation if separator is not needed;
      if (separator == null) return strRepeat(String(str), qty);

      // this one is about 300x slower in Google Chrome
      for (var repeat = []; qty > 0; repeat[--qty] = str) {}
      return repeat.join(separator);
    },

    levenshtein: function(str1, str2) {
      if (str1 == null && str2 == null) return 0;
      if (str1 == null) return String(str2).length;
      if (str2 == null) return String(str1).length;

      str1 = String(str1); str2 = String(str2);

      var current = [], prev, value;

      for (var i = 0; i <= str2.length; i++)
        for (var j = 0; j <= str1.length; j++) {
          if (i && j)
            if (str1.charAt(j - 1) === str2.charAt(i - 1))
              value = prev;
            else
              value = Math.min(current[j], current[j - 1], prev) + 1;
          else
            value = i + j;

          prev = current[j];
          current[j] = value;
        }

      return current.pop();
    }
  };

  // Aliases

  _s.strip    = _s.trim;
  _s.lstrip   = _s.ltrim;
  _s.rstrip   = _s.rtrim;
  _s.center   = _s.lrpad;
  _s.rjust    = _s.lpad;
  _s.ljust    = _s.rpad;
  _s.contains = _s.include;
  _s.q        = _s.quote;

  // Exporting

  // CommonJS module is defined
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports)
      module.exports = _s;

    exports._s = _s;
  }

  // Register as a named module with AMD.
  if (typeof define === 'function' && define.amd)
    define('underscore.string', [], function(){ return _s; });


  // Integrate with Underscore.js if defined
  // or create our own underscore object.
  root._ = root._ || {};
  root._.string = root._.str = _s;
}(this, String);

define("string", function(){});

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

//     Backbone.js 0.9.9

//     (c) 2010-2012 Jeremy Ashkenas, DocumentCloud Inc.
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://backbonejs.org

(function(){

  // Initial Setup
  // -------------

  // Save a reference to the global object (`window` in the browser, `exports`
  // on the server).
  var root = this;

  // Save the previous value of the `Backbone` variable, so that it can be
  // restored later on, if `noConflict` is used.
  var previousBackbone = root.Backbone;

  // Create a local reference to array methods.
  var array = [];
  var push = array.push;
  var slice = array.slice;
  var splice = array.splice;

  // The top-level namespace. All public Backbone classes and modules will
  // be attached to this. Exported for both CommonJS and the browser.
  var Backbone;
  if (typeof exports !== 'undefined') {
    Backbone = exports;
  } else {
    Backbone = root.Backbone = {};
  }

  // Current version of the library. Keep in sync with `package.json`.
  Backbone.VERSION = '0.9.9';

  // Require Underscore, if we're on the server, and it's not already present.
  var _ = root._;
  if (!_ && (typeof require !== 'undefined')) _ = require('underscore');

  // For Backbone's purposes, jQuery, Zepto, or Ender owns the `$` variable.
  Backbone.$ = root.jQuery || root.Zepto || root.ender;

  // Runs Backbone.js in *noConflict* mode, returning the `Backbone` variable
  // to its previous owner. Returns a reference to this Backbone object.
  Backbone.noConflict = function() {
    root.Backbone = previousBackbone;
    return this;
  };

  // Turn on `emulateHTTP` to support legacy HTTP servers. Setting this option
  // will fake `"PUT"` and `"DELETE"` requests via the `_method` parameter and
  // set a `X-Http-Method-Override` header.
  Backbone.emulateHTTP = false;

  // Turn on `emulateJSON` to support legacy servers that can't deal with direct
  // `application/json` requests ... will encode the body as
  // `application/x-www-form-urlencoded` instead and will send the model in a
  // form param named `model`.
  Backbone.emulateJSON = false;

  // Backbone.Events
  // ---------------

  // Regular expression used to split event strings.
  var eventSplitter = /\s+/;

  // Implement fancy features of the Events API such as multiple event
  // names `"change blur"` and jQuery-style event maps `{change: action}`
  // in terms of the existing API.
  var eventsApi = function(obj, action, name, rest) {
    if (!name) return true;
    if (typeof name === 'object') {
      for (var key in name) {
        obj[action].apply(obj, [key, name[key]].concat(rest));
      }
    } else if (eventSplitter.test(name)) {
      var names = name.split(eventSplitter);
      for (var i = 0, l = names.length; i < l; i++) {
        obj[action].apply(obj, [names[i]].concat(rest));
      }
    } else {
      return true;
    }
  };

  // Optimized internal dispatch function for triggering events. Tries to
  // keep the usual cases speedy (most Backbone events have 3 arguments).
  var triggerEvents = function(obj, events, args) {
    var ev, i = -1, l = events.length;
    switch (args.length) {
    case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx);
    return;
    case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, args[0]);
    return;
    case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, args[0], args[1]);
    return;
    case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, args[0], args[1], args[2]);
    return;
    default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args);
    }
  };

  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may bind with `on` or remove with `off` callback
  // functions to an event; `trigger`-ing an event fires all callbacks in
  // succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  var Events = Backbone.Events = {

    // Bind one or more space separated events, or an events map,
    // to a `callback` function. Passing `"all"` will bind the callback to
    // all events fired.
    on: function(name, callback, context) {
      if (!(eventsApi(this, 'on', name, [callback, context]) && callback)) return this;
      this._events || (this._events = {});
      var list = this._events[name] || (this._events[name] = []);
      list.push({callback: callback, context: context, ctx: context || this});
      return this;
    },

    // Bind events to only be triggered a single time. After the first time
    // the callback is invoked, it will be removed.
    once: function(name, callback, context) {
      if (!(eventsApi(this, 'once', name, [callback, context]) && callback)) return this;
      var self = this;
      var once = _.once(function() {
        self.off(name, once);
        callback.apply(this, arguments);
      });
      once._callback = callback;
      this.on(name, once, context);
      return this;
    },

    // Remove one or many callbacks. If `context` is null, removes all
    // callbacks with that function. If `callback` is null, removes all
    // callbacks for the event. If `events` is null, removes all bound
    // callbacks for all events.
    off: function(name, callback, context) {
      var list, ev, events, names, i, l, j, k;
      if (!this._events || !eventsApi(this, 'off', name, [callback, context])) return this;
      if (!name && !callback && !context) {
        this._events = {};
        return this;
      }

      names = name ? [name] : _.keys(this._events);
      for (i = 0, l = names.length; i < l; i++) {
        name = names[i];
        if (list = this._events[name]) {
          events = [];
          if (callback || context) {
            for (j = 0, k = list.length; j < k; j++) {
              ev = list[j];
              if ((callback && callback !== (ev.callback._callback || ev.callback)) ||
                  (context && context !== ev.context)) {
                events.push(ev);
              }
            }
          }
          this._events[name] = events;
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function(name) {
      if (!this._events) return this;
      var args = slice.call(arguments, 1);
      if (!eventsApi(this, 'trigger', name, args)) return this;
      var events = this._events[name];
      var allEvents = this._events.all;
      if (events) triggerEvents(this, events, args);
      if (allEvents) triggerEvents(this, allEvents, arguments);
      return this;
    },

    // An inversion-of-control version of `on`. Tell *this* object to listen to
    // an event in another object ... keeping track of what it's listening to.
    listenTo: function(object, events, callback) {
      var listeners = this._listeners || (this._listeners = {});
      var id = object._listenerId || (object._listenerId = _.uniqueId('l'));
      listeners[id] = object;
      object.on(events, callback || this, this);
      return this;
    },

    // Tell this object to stop listening to either specific events ... or
    // to every object it's currently listening to.
    stopListening: function(object, events, callback) {
      var listeners = this._listeners;
      if (!listeners) return;
      if (object) {
        object.off(events, callback, this);
        if (!events && !callback) delete listeners[object._listenerId];
      } else {
        for (var id in listeners) {
          listeners[id].off(null, null, this);
        }
        this._listeners = {};
      }
      return this;
    }
  };

  // Aliases for backwards compatibility.
  Events.bind   = Events.on;
  Events.unbind = Events.off;

  // Allow the `Backbone` object to serve as a global event bus, for folks who
  // want global "pubsub" in a convenient place.
  _.extend(Backbone, Events);

  // Backbone.Model
  // --------------

  // Create a new model, with defined attributes. A client id (`cid`)
  // is automatically generated and assigned for you.
  var Model = Backbone.Model = function(attributes, options) {
    var defaults;
    var attrs = attributes || {};
    this.cid = _.uniqueId('c');
    this.changed = {};
    this.attributes = {};
    this._changes = [];
    if (options && options.collection) this.collection = options.collection;
    if (options && options.parse) attrs = this.parse(attrs);
    if (defaults = _.result(this, 'defaults')) _.defaults(attrs, defaults);
    this.set(attrs, {silent: true});
    this._currentAttributes = _.clone(this.attributes);
    this._previousAttributes = _.clone(this.attributes);
    this.initialize.apply(this, arguments);
  };

  // Attach all inheritable methods to the Model prototype.
  _.extend(Model.prototype, Events, {

    // A hash of attributes whose current and previous value differ.
    changed: null,

    // The default name for the JSON `id` attribute is `"id"`. MongoDB and
    // CouchDB users may want to set this to `"_id"`.
    idAttribute: 'id',

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Return a copy of the model's `attributes` object.
    toJSON: function(options) {
      return _.clone(this.attributes);
    },

    // Proxy `Backbone.sync` by default.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Get the value of an attribute.
    get: function(attr) {
      return this.attributes[attr];
    },

    // Get the HTML-escaped value of an attribute.
    escape: function(attr) {
      return _.escape(this.get(attr));
    },

    // Returns `true` if the attribute contains a value that is not null
    // or undefined.
    has: function(attr) {
      return this.get(attr) != null;
    },

    // Set a hash of model attributes on the object, firing `"change"` unless
    // you choose to silence it.
    set: function(key, val, options) {
      var attr, attrs;
      if (key == null) return this;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (_.isObject(key)) {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      // Extract attributes and options.
      var silent = options && options.silent;
      var unset = options && options.unset;

      // Run validation.
      if (!this._validate(attrs, options)) return false;

      // Check for changes of `id`.
      if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

      var now = this.attributes;

      // For each `set` attribute...
      for (attr in attrs) {
        val = attrs[attr];

        // Update or delete the current value, and track the change.
        unset ? delete now[attr] : now[attr] = val;
        this._changes.push(attr, val);
      }

      // Signal that the model's state has potentially changed, and we need
      // to recompute the actual changes.
      this._hasComputed = false;

      // Fire the `"change"` events.
      if (!silent) this.change(options);
      return this;
    },

    // Remove an attribute from the model, firing `"change"` unless you choose
    // to silence it. `unset` is a noop if the attribute doesn't exist.
    unset: function(attr, options) {
      return this.set(attr, void 0, _.extend({}, options, {unset: true}));
    },

    // Clear all attributes on the model, firing `"change"` unless you choose
    // to silence it.
    clear: function(options) {
      var attrs = {};
      for (var key in this.attributes) attrs[key] = void 0;
      return this.set(attrs, _.extend({}, options, {unset: true}));
    },

    // Fetch the model from the server. If the server's representation of the
    // model differs from its current attributes, they will be overriden,
    // triggering a `"change"` event.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
      options.success = function(resp, status, xhr) {
        if (!model.set(model.parse(resp), options)) return false;
        if (success) success(model, resp, options);
      };
      return this.sync('read', this, options);
    },

    // Set a hash of model attributes, and sync the model to the server.
    // If the server returns an attributes hash that differs, the model's
    // state will be `set` again.
    save: function(key, val, options) {
      var attrs, current, done;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (key == null || _.isObject(key)) {
        attrs = key;
        options = val;
      } else if (key != null) {
        (attrs = {})[key] = val;
      }
      options = options ? _.clone(options) : {};

      // If we're "wait"-ing to set changed attributes, validate early.
      if (options.wait) {
        if (attrs && !this._validate(attrs, options)) return false;
        current = _.clone(this.attributes);
      }

      // Regular saves `set` attributes before persisting to the server.
      var silentOptions = _.extend({}, options, {silent: true});
      if (attrs && !this.set(attrs, options.wait ? silentOptions : options)) {
        return false;
      }

      // Do not persist invalid models.
      if (!attrs && !this._validate(null, options)) return false;

      // After a successful server-side save, the client is (optionally)
      // updated with the server-side state.
      var model = this;
      var success = options.success;
      options.success = function(resp, status, xhr) {
        done = true;
        var serverAttrs = model.parse(resp);
        if (options.wait) serverAttrs = _.extend(attrs || {}, serverAttrs);
        if (!model.set(serverAttrs, options)) return false;
        if (success) success(model, resp, options);
      };

      // Finish configuring and sending the Ajax request.
      var method = this.isNew() ? 'create' : (options.patch ? 'patch' : 'update');
      if (method == 'patch') options.attrs = attrs;
      var xhr = this.sync(method, this, options);

      // When using `wait`, reset attributes to original values unless
      // `success` has been called already.
      if (!done && options.wait) {
        this.clear(silentOptions);
        this.set(current, silentOptions);
      }

      return xhr;
    },

    // Destroy this model on the server if it was already persisted.
    // Optimistically removes the model from its collection, if it has one.
    // If `wait: true` is passed, waits for the server to respond before removal.
    destroy: function(options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;

      var destroy = function() {
        model.trigger('destroy', model, model.collection, options);
      };

      options.success = function(resp) {
        if (options.wait || model.isNew()) destroy();
        if (success) success(model, resp, options);
      };

      if (this.isNew()) {
        options.success();
        return false;
      }

      var xhr = this.sync('delete', this, options);
      if (!options.wait) destroy();
      return xhr;
    },

    // Default URL for the model's representation on the server -- if you're
    // using Backbone's restful methods, override this to change the endpoint
    // that will be called.
    url: function() {
      var base = _.result(this, 'urlRoot') || _.result(this.collection, 'url') || urlError();
      if (this.isNew()) return base;
      return base + (base.charAt(base.length - 1) === '/' ? '' : '/') + encodeURIComponent(this.id);
    },

    // **parse** converts a response into the hash of attributes to be `set` on
    // the model. The default implementation is just to pass the response along.
    parse: function(resp) {
      return resp;
    },

    // Create a new model with identical attributes to this one.
    clone: function() {
      return new this.constructor(this.attributes);
    },

    // A model is new if it has never been saved to the server, and lacks an id.
    isNew: function() {
      return this.id == null;
    },

    // Call this method to manually fire a `"change"` event for this model and
    // a `"change:attribute"` event for each changed attribute.
    // Calling this will cause all objects observing the model to update.
    change: function(options) {
      var changing = this._changing;
      this._changing = true;

      // Generate the changes to be triggered on the model.
      var triggers = this._computeChanges(true);

      this._pending = !!triggers.length;

      for (var i = triggers.length - 2; i >= 0; i -= 2) {
        this.trigger('change:' + triggers[i], this, triggers[i + 1], options);
      }

      if (changing) return this;

      // Trigger a `change` while there have been changes.
      while (this._pending) {
        this._pending = false;
        this.trigger('change', this, options);
        this._previousAttributes = _.clone(this.attributes);
      }

      this._changing = false;
      return this;
    },

    // Determine if the model has changed since the last `"change"` event.
    // If you specify an attribute name, determine if that attribute has changed.
    hasChanged: function(attr) {
      if (!this._hasComputed) this._computeChanges();
      if (attr == null) return !_.isEmpty(this.changed);
      return _.has(this.changed, attr);
    },

    // Return an object containing all the attributes that have changed, or
    // false if there are no changed attributes. Useful for determining what
    // parts of a view need to be updated and/or what attributes need to be
    // persisted to the server. Unset attributes will be set to undefined.
    // You can also pass an attributes object to diff against the model,
    // determining if there *would be* a change.
    changedAttributes: function(diff) {
      if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
      var val, changed = false, old = this._previousAttributes;
      for (var attr in diff) {
        if (_.isEqual(old[attr], (val = diff[attr]))) continue;
        (changed || (changed = {}))[attr] = val;
      }
      return changed;
    },

    // Looking at the built up list of `set` attribute changes, compute how
    // many of the attributes have actually changed. If `loud`, return a
    // boiled-down list of only the real changes.
    _computeChanges: function(loud) {
      this.changed = {};
      var already = {};
      var triggers = [];
      var current = this._currentAttributes;
      var changes = this._changes;

      // Loop through the current queue of potential model changes.
      for (var i = changes.length - 2; i >= 0; i -= 2) {
        var key = changes[i], val = changes[i + 1];
        if (already[key]) continue;
        already[key] = true;

        // Check if the attribute has been modified since the last change,
        // and update `this.changed` accordingly. If we're inside of a `change`
        // call, also add a trigger to the list.
        if (current[key] !== val) {
          this.changed[key] = val;
          if (!loud) continue;
          triggers.push(key, val);
          current[key] = val;
        }
      }
      if (loud) this._changes = [];

      // Signals `this.changed` is current to prevent duplicate calls from `this.hasChanged`.
      this._hasComputed = true;
      return triggers;
    },

    // Get the previous value of an attribute, recorded at the time the last
    // `"change"` event was fired.
    previous: function(attr) {
      if (attr == null || !this._previousAttributes) return null;
      return this._previousAttributes[attr];
    },

    // Get all of the attributes of the model at the time of the previous
    // `"change"` event.
    previousAttributes: function() {
      return _.clone(this._previousAttributes);
    },

    // Run validation against the next complete set of model attributes,
    // returning `true` if all is well. If a specific `error` callback has
    // been passed, call that instead of firing the general `"error"` event.
    _validate: function(attrs, options) {
      if (!this.validate) return true;
      attrs = _.extend({}, this.attributes, attrs);
      var error = this.validate(attrs, options);
      if (!error) return true;
      if (options && options.error) options.error(this, error, options);
      this.trigger('error', this, error, options);
      return false;
    }

  });

  // Backbone.Collection
  // -------------------

  // Provides a standard collection class for our sets of models, ordered
  // or unordered. If a `comparator` is specified, the Collection will maintain
  // its models in sort order, as they're added and removed.
  var Collection = Backbone.Collection = function(models, options) {
    options || (options = {});
    if (options.model) this.model = options.model;
    if (options.comparator !== void 0) this.comparator = options.comparator;
    this._reset();
    this.initialize.apply(this, arguments);
    if (models) this.reset(models, _.extend({silent: true}, options));
  };

  // Define the Collection's inheritable methods.
  _.extend(Collection.prototype, Events, {

    // The default model for a collection is just a **Backbone.Model**.
    // This should be overridden in most cases.
    model: Model,

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // The JSON representation of a Collection is an array of the
    // models' attributes.
    toJSON: function(options) {
      return this.map(function(model){ return model.toJSON(options); });
    },

    // Proxy `Backbone.sync` by default.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Add a model, or list of models to the set. Pass **silent** to avoid
    // firing the `add` event for every new model.
    add: function(models, options) {
      var i, args, length, model, existing, needsSort;
      var at = options && options.at;
      var sort = ((options && options.sort) == null ? true : options.sort);
      models = _.isArray(models) ? models.slice() : [models];

      // Turn bare objects into model references, and prevent invalid models
      // from being added.
      for (i = models.length - 1; i >= 0; i--) {
        if(!(model = this._prepareModel(models[i], options))) {
          this.trigger("error", this, models[i], options);
          models.splice(i, 1);
          continue;
        }
        models[i] = model;

        existing = model.id != null && this._byId[model.id];
        // If a duplicate is found, prevent it from being added and
        // optionally merge it into the existing model.
        if (existing || this._byCid[model.cid]) {
          if (options && options.merge && existing) {
            existing.set(model.attributes, options);
            needsSort = sort;
          }
          models.splice(i, 1);
          continue;
        }

        // Listen to added models' events, and index models for lookup by
        // `id` and by `cid`.
        model.on('all', this._onModelEvent, this);
        this._byCid[model.cid] = model;
        if (model.id != null) this._byId[model.id] = model;
      }

      // See if sorting is needed, update `length` and splice in new models.
      if (models.length) needsSort = sort;
      this.length += models.length;
      args = [at != null ? at : this.models.length, 0];
      push.apply(args, models);
      splice.apply(this.models, args);

      // Sort the collection if appropriate.
      if (needsSort && this.comparator && at == null) this.sort({silent: true});

      if (options && options.silent) return this;

      // Trigger `add` events.
      while (model = models.shift()) {
        model.trigger('add', model, this, options);
      }

      return this;
    },

    // Remove a model, or a list of models from the set. Pass silent to avoid
    // firing the `remove` event for every model removed.
    remove: function(models, options) {
      var i, l, index, model;
      options || (options = {});
      models = _.isArray(models) ? models.slice() : [models];
      for (i = 0, l = models.length; i < l; i++) {
        model = this.get(models[i]);
        if (!model) continue;
        delete this._byId[model.id];
        delete this._byCid[model.cid];
        index = this.indexOf(model);
        this.models.splice(index, 1);
        this.length--;
        if (!options.silent) {
          options.index = index;
          model.trigger('remove', model, this, options);
        }
        this._removeReference(model);
      }
      return this;
    },

    // Add a model to the end of the collection.
    push: function(model, options) {
      model = this._prepareModel(model, options);
      this.add(model, _.extend({at: this.length}, options));
      return model;
    },

    // Remove a model from the end of the collection.
    pop: function(options) {
      var model = this.at(this.length - 1);
      this.remove(model, options);
      return model;
    },

    // Add a model to the beginning of the collection.
    unshift: function(model, options) {
      model = this._prepareModel(model, options);
      this.add(model, _.extend({at: 0}, options));
      return model;
    },

    // Remove a model from the beginning of the collection.
    shift: function(options) {
      var model = this.at(0);
      this.remove(model, options);
      return model;
    },

    // Slice out a sub-array of models from the collection.
    slice: function(begin, end) {
      return this.models.slice(begin, end);
    },

    // Get a model from the set by id.
    get: function(obj) {
      if (obj == null) return void 0;
      return this._byId[obj.id != null ? obj.id : obj] || this._byCid[obj.cid || obj];
    },

    // Get the model at the given index.
    at: function(index) {
      return this.models[index];
    },

    // Return models with matching attributes. Useful for simple cases of `filter`.
    where: function(attrs) {
      if (_.isEmpty(attrs)) return [];
      return this.filter(function(model) {
        for (var key in attrs) {
          if (attrs[key] !== model.get(key)) return false;
        }
        return true;
      });
    },

    // Force the collection to re-sort itself. You don't need to call this under
    // normal circumstances, as the set will maintain sort order as each item
    // is added.
    sort: function(options) {
      if (!this.comparator) {
        throw new Error('Cannot sort a set without a comparator');
      }

      if (_.isString(this.comparator) || this.comparator.length === 1) {
        this.models = this.sortBy(this.comparator, this);
      } else {
        this.models.sort(_.bind(this.comparator, this));
      }

      if (!options || !options.silent) this.trigger('sort', this, options);
      return this;
    },

    // Pluck an attribute from each model in the collection.
    pluck: function(attr) {
      return _.invoke(this.models, 'get', attr);
    },

    // Smartly update a collection with a change set of models, adding,
    // removing, and merging as necessary.
    update: function(models, options) {
      var model, i, l, existing;
      var add = [], remove = [], modelMap = {};
      var idAttr = this.model.prototype.idAttribute;
      options = _.extend({add: true, merge: true, remove: true}, options);
      if (options.parse) models = this.parse(models);

      // Allow a single model (or no argument) to be passed.
      if (!_.isArray(models)) models = models ? [models] : [];

      // Proxy to `add` for this case, no need to iterate...
      if (options.add && !options.remove) return this.add(models, options);

      // Determine which models to add and merge, and which to remove.
      for (i = 0, l = models.length; i < l; i++) {
        model = models[i];
        existing = this.get(model.id || model.cid || model[idAttr]);
        if (options.remove && existing) modelMap[existing.cid] = true;
        if ((options.add && !existing) || (options.merge && existing)) {
          add.push(model);
        }
      }
      if (options.remove) {
        for (i = 0, l = this.models.length; i < l; i++) {
          model = this.models[i];
          if (!modelMap[model.cid]) remove.push(model);
        }
      }

      // Remove models (if applicable) before we add and merge the rest.
      if (remove.length) this.remove(remove, options);
      if (add.length) this.add(add, options);
      return this;
    },

    // When you have more items than you want to add or remove individually,
    // you can reset the entire set with a new list of models, without firing
    // any `add` or `remove` events. Fires `reset` when finished.
    reset: function(models, options) {
      options || (options = {});
      if (options.parse) models = this.parse(models);
      for (var i = 0, l = this.models.length; i < l; i++) {
        this._removeReference(this.models[i]);
      }
      options.previousModels = this.models;
      this._reset();
      if (models) this.add(models, _.extend({silent: true}, options));
      if (!options.silent) this.trigger('reset', this, options);
      return this;
    },

    // Fetch the default set of models for this collection, resetting the
    // collection when they arrive. If `add: true` is passed, appends the
    // models to the collection instead of resetting.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var collection = this;
      var success = options.success;
      options.success = function(resp, status, xhr) {
        var method = options.update ? 'update' : 'reset';
        collection[method](resp, options);
        if (success) success(collection, resp, options);
      };
      return this.sync('read', this, options);
    },

    // Create a new instance of a model in this collection. Add the model to the
    // collection immediately, unless `wait: true` is passed, in which case we
    // wait for the server to agree.
    create: function(model, options) {
      var collection = this;
      options = options ? _.clone(options) : {};
      model = this._prepareModel(model, options);
      if (!model) return false;
      if (!options.wait) collection.add(model, options);
      var success = options.success;
      options.success = function(model, resp, options) {
        if (options.wait) collection.add(model, options);
        if (success) success(model, resp, options);
      };
      model.save(null, options);
      return model;
    },

    // **parse** converts a response into a list of models to be added to the
    // collection. The default implementation is just to pass it through.
    parse: function(resp) {
      return resp;
    },

    // Create a new collection with an identical list of models as this one.
    clone: function() {
      return new this.constructor(this.models);
    },

    // Proxy to _'s chain. Can't be proxied the same way the rest of the
    // underscore methods are proxied because it relies on the underscore
    // constructor.
    chain: function() {
      return _(this.models).chain();
    },

    // Reset all internal state. Called when the collection is reset.
    _reset: function() {
      this.length = 0;
      this.models = [];
      this._byId  = {};
      this._byCid = {};
    },

    // Prepare a model or hash of attributes to be added to this collection.
    _prepareModel: function(attrs, options) {
      if (attrs instanceof Model) {
        if (!attrs.collection) attrs.collection = this;
        return attrs;
      }
      options || (options = {});
      options.collection = this;
      var model = new this.model(attrs, options);
      if (!model._validate(attrs, options)) return false;
      return model;
    },

    // Internal method to remove a model's ties to a collection.
    _removeReference: function(model) {
      if (this === model.collection) delete model.collection;
      model.off('all', this._onModelEvent, this);
    },

    // Internal method called every time a model in the set fires an event.
    // Sets need to update their indexes when models change ids. All other
    // events simply proxy through. "add" and "remove" events that originate
    // in other collections are ignored.
    _onModelEvent: function(event, model, collection, options) {
      if ((event === 'add' || event === 'remove') && collection !== this) return;
      if (event === 'destroy') this.remove(model, options);
      if (model && event === 'change:' + model.idAttribute) {
        delete this._byId[model.previous(model.idAttribute)];
        if (model.id != null) this._byId[model.id] = model;
      }
      this.trigger.apply(this, arguments);
    }

  });

  // Underscore methods that we want to implement on the Collection.
  var methods = ['forEach', 'each', 'map', 'collect', 'reduce', 'foldl',
    'inject', 'reduceRight', 'foldr', 'find', 'detect', 'filter', 'select',
    'reject', 'every', 'all', 'some', 'any', 'include', 'contains', 'invoke',
    'max', 'min', 'sortedIndex', 'toArray', 'size', 'first', 'head', 'take',
    'initial', 'rest', 'tail', 'last', 'without', 'indexOf', 'shuffle',
    'lastIndexOf', 'isEmpty'];

  // Mix in each Underscore method as a proxy to `Collection#models`.
  _.each(methods, function(method) {
    Collection.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.models);
      return _[method].apply(_, args);
    };
  });

  // Underscore methods that take a property name as an argument.
  var attributeMethods = ['groupBy', 'countBy', 'sortBy'];

  // Use attributes instead of properties.
  _.each(attributeMethods, function(method) {
    Collection.prototype[method] = function(value, context) {
      var iterator = _.isFunction(value) ? value : function(model) {
        return model.get(value);
      };
      return _[method](this.models, iterator, context);
    };
  });

  // Backbone.Router
  // ---------------

  // Routers map faux-URLs to actions, and fire events when routes are
  // matched. Creating a new one sets its `routes` hash, if not set statically.
  var Router = Backbone.Router = function(options) {
    options || (options = {});
    if (options.routes) this.routes = options.routes;
    this._bindRoutes();
    this.initialize.apply(this, arguments);
  };

  // Cached regular expressions for matching named param parts and splatted
  // parts of route strings.
  var optionalParam = /\((.*?)\)/g;
  var namedParam    = /:\w+/g;
  var splatParam    = /\*\w+/g;
  var escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;

  // Set up all inheritable **Backbone.Router** properties and methods.
  _.extend(Router.prototype, Events, {

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    route: function(route, name, callback) {
      if (!_.isRegExp(route)) route = this._routeToRegExp(route);
      if (!callback) callback = this[name];
      Backbone.history.route(route, _.bind(function(fragment) {
        var args = this._extractParameters(route, fragment);
        callback && callback.apply(this, args);
        this.trigger.apply(this, ['route:' + name].concat(args));
        Backbone.history.trigger('route', this, name, args);
      }, this));
      return this;
    },

    // Simple proxy to `Backbone.history` to save a fragment into the history.
    navigate: function(fragment, options) {
      Backbone.history.navigate(fragment, options);
      return this;
    },

    // Bind all defined routes to `Backbone.history`. We have to reverse the
    // order of the routes here to support behavior where the most general
    // routes can be defined at the bottom of the route map.
    _bindRoutes: function() {
      if (!this.routes) return;
      var route, routes = _.keys(this.routes);
      while ((route = routes.pop()) != null) {
        this.route(route, this.routes[route]);
      }
    },

    // Convert a route string into a regular expression, suitable for matching
    // against the current location hash.
    _routeToRegExp: function(route) {
      route = route.replace(escapeRegExp, '\\$&')
                   .replace(optionalParam, '(?:$1)?')
                   .replace(namedParam, '([^\/]+)')
                   .replace(splatParam, '(.*?)');
      return new RegExp('^' + route + '$');
    },

    // Given a route, and a URL fragment that it matches, return the array of
    // extracted parameters.
    _extractParameters: function(route, fragment) {
      return route.exec(fragment).slice(1);
    }

  });

  // Backbone.History
  // ----------------

  // Handles cross-browser history management, based on URL fragments. If the
  // browser does not support `onhashchange`, falls back to polling.
  var History = Backbone.History = function() {
    this.handlers = [];
    _.bindAll(this, 'checkUrl');

    // #1653 - Ensure that `History` can be used outside of the browser.
    if (typeof window !== 'undefined') {
      this.location = window.location;
      this.history = window.history;
    }
  };

  // Cached regex for stripping a leading hash/slash and trailing space.
  var routeStripper = /^[#\/]|\s+$/g;

  // Cached regex for stripping leading and trailing slashes.
  var rootStripper = /^\/+|\/+$/g;

  // Cached regex for detecting MSIE.
  var isExplorer = /msie [\w.]+/;

  // Cached regex for removing a trailing slash.
  var trailingSlash = /\/$/;

  // Has the history handling already been started?
  History.started = false;

  // Set up all inheritable **Backbone.History** properties and methods.
  _.extend(History.prototype, Events, {

    // The default interval to poll for hash changes, if necessary, is
    // twenty times a second.
    interval: 50,

    // Gets the true hash value. Cannot use location.hash directly due to bug
    // in Firefox where location.hash will always be decoded.
    getHash: function(window) {
      var match = (window || this).location.href.match(/#(.*)$/);
      return match ? match[1] : '';
    },

    // Get the cross-browser normalized URL fragment, either from the URL,
    // the hash, or the override.
    getFragment: function(fragment, forcePushState) {
      if (fragment == null) {
        if (this._hasPushState || !this._wantsHashChange || forcePushState) {
          fragment = this.location.pathname;
          var root = this.root.replace(trailingSlash, '');
          if (!fragment.indexOf(root)) fragment = fragment.substr(root.length);
        } else {
          fragment = this.getHash();
        }
      }
      return fragment.replace(routeStripper, '');
    },

    // Start the hash change handling, returning `true` if the current URL matches
    // an existing route, and `false` otherwise.
    start: function(options) {
      if (History.started) throw new Error("Backbone.history has already been started");
      History.started = true;

      // Figure out the initial configuration. Do we need an iframe?
      // Is pushState desired ... is it available?
      this.options          = _.extend({}, {root: '/'}, this.options, options);
      this.root             = this.options.root;
      this._wantsHashChange = this.options.hashChange !== false;
      this._wantsPushState  = !!this.options.pushState;
      this._hasPushState    = !!(this.options.pushState && this.history && this.history.pushState);
      var fragment          = this.getFragment();
      var docMode           = document.documentMode;
      var oldIE             = (isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7));

      // Normalize root to always include a leading and trailing slash.
      this.root = ('/' + this.root + '/').replace(rootStripper, '/');

      if (oldIE && this._wantsHashChange) {
        this.iframe = Backbone.$('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo('body')[0].contentWindow;
        this.navigate(fragment);
      }

      // Depending on whether we're using pushState or hashes, and whether
      // 'onhashchange' is supported, determine how we check the URL state.
      if (this._hasPushState) {
        Backbone.$(window).bind('popstate', this.checkUrl);
      } else if (this._wantsHashChange && ('onhashchange' in window) && !oldIE) {
        Backbone.$(window).bind('hashchange', this.checkUrl);
      } else if (this._wantsHashChange) {
        this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
      }

      // Determine if we need to change the base url, for a pushState link
      // opened by a non-pushState browser.
      this.fragment = fragment;
      var loc = this.location;
      var atRoot = loc.pathname.replace(/[^\/]$/, '$&/') === this.root;

      // If we've started off with a route from a `pushState`-enabled browser,
      // but we're currently in a browser that doesn't support it...
      if (this._wantsHashChange && this._wantsPushState && !this._hasPushState && !atRoot) {
        this.fragment = this.getFragment(null, true);
        this.location.replace(this.root + this.location.search + '#' + this.fragment);
        // Return immediately as browser will do redirect to new url
        return true;

      // Or if we've started out with a hash-based route, but we're currently
      // in a browser where it could be `pushState`-based instead...
      } else if (this._wantsPushState && this._hasPushState && atRoot && loc.hash) {
        this.fragment = this.getHash().replace(routeStripper, '');
        this.history.replaceState({}, document.title, this.root + this.fragment + loc.search);
      }

      if (!this.options.silent) return this.loadUrl();
    },

    // Disable Backbone.history, perhaps temporarily. Not useful in a real app,
    // but possibly useful for unit testing Routers.
    stop: function() {
      Backbone.$(window).unbind('popstate', this.checkUrl).unbind('hashchange', this.checkUrl);
      clearInterval(this._checkUrlInterval);
      History.started = false;
    },

    // Add a route to be tested when the fragment changes. Routes added later
    // may override previous routes.
    route: function(route, callback) {
      this.handlers.unshift({route: route, callback: callback});
    },

    // Checks the current URL to see if it has changed, and if it has,
    // calls `loadUrl`, normalizing across the hidden iframe.
    checkUrl: function(e) {
      var current = this.getFragment();
      if (current === this.fragment && this.iframe) {
        current = this.getFragment(this.getHash(this.iframe));
      }
      if (current === this.fragment) return false;
      if (this.iframe) this.navigate(current);
      this.loadUrl() || this.loadUrl(this.getHash());
    },

    // Attempt to load the current URL fragment. If a route succeeds with a
    // match, returns `true`. If no defined routes matches the fragment,
    // returns `false`.
    loadUrl: function(fragmentOverride) {
      var fragment = this.fragment = this.getFragment(fragmentOverride);
      var matched = _.any(this.handlers, function(handler) {
        if (handler.route.test(fragment)) {
          handler.callback(fragment);
          return true;
        }
      });
      return matched;
    },

    // Save a fragment into the hash history, or replace the URL state if the
    // 'replace' option is passed. You are responsible for properly URL-encoding
    // the fragment in advance.
    //
    // The options object can contain `trigger: true` if you wish to have the
    // route callback be fired (not usually desirable), or `replace: true`, if
    // you wish to modify the current URL without adding an entry to the history.
    navigate: function(fragment, options) {
      if (!History.started) return false;
      if (!options || options === true) options = {trigger: options};
      fragment = this.getFragment(fragment || '');
      if (this.fragment === fragment) return;
      this.fragment = fragment;
      var url = this.root + fragment;

      // If pushState is available, we use it to set the fragment as a real URL.
      if (this._hasPushState) {
        this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);

      // If hash changes haven't been explicitly disabled, update the hash
      // fragment to store history.
      } else if (this._wantsHashChange) {
        this._updateHash(this.location, fragment, options.replace);
        if (this.iframe && (fragment !== this.getFragment(this.getHash(this.iframe)))) {
          // Opening and closing the iframe tricks IE7 and earlier to push a
          // history entry on hash-tag change.  When replace is true, we don't
          // want this.
          if(!options.replace) this.iframe.document.open().close();
          this._updateHash(this.iframe.location, fragment, options.replace);
        }

      // If you've told us that you explicitly don't want fallback hashchange-
      // based history, then `navigate` becomes a page refresh.
      } else {
        return this.location.assign(url);
      }
      if (options.trigger) this.loadUrl(fragment);
    },

    // Update the hash location, either replacing the current entry, or adding
    // a new one to the browser history.
    _updateHash: function(location, fragment, replace) {
      if (replace) {
        var href = location.href.replace(/(javascript:|#).*$/, '');
        location.replace(href + '#' + fragment);
      } else {
        // #1649 - Some browsers require that `hash` contains a leading #.
        location.hash = '#' + fragment;
      }
    }

  });

  // Create the default Backbone.history.
  Backbone.history = new History;

  // Backbone.View
  // -------------

  // Creating a Backbone.View creates its initial element outside of the DOM,
  // if an existing element is not provided...
  var View = Backbone.View = function(options) {
    this.cid = _.uniqueId('view');
    this._configure(options || {});
    this._ensureElement();
    this.initialize.apply(this, arguments);
    this.delegateEvents();
  };

  // Cached regex to split keys for `delegate`.
  var delegateEventSplitter = /^(\S+)\s*(.*)$/;

  // List of view options to be merged as properties.
  var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];

  // Set up all inheritable **Backbone.View** properties and methods.
  _.extend(View.prototype, Events, {

    // The default `tagName` of a View's element is `"div"`.
    tagName: 'div',

    // jQuery delegate for element lookup, scoped to DOM elements within the
    // current view. This should be prefered to global lookups where possible.
    $: function(selector) {
      return this.$el.find(selector);
    },

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // **render** is the core function that your view should override, in order
    // to populate its element (`this.el`), with the appropriate HTML. The
    // convention is for **render** to always return `this`.
    render: function() {
      return this;
    },

    // Remove this view by taking the element out of the DOM, and removing any
    // applicable Backbone.Events listeners.
    remove: function() {
      this.$el.remove();
      this.stopListening();
      return this;
    },

    // For small amounts of DOM Elements, where a full-blown template isn't
    // needed, use **make** to manufacture elements, one at a time.
    //
    //     var el = this.make('li', {'class': 'row'}, this.model.escape('title'));
    //
    make: function(tagName, attributes, content) {
      var el = document.createElement(tagName);
      if (attributes) Backbone.$(el).attr(attributes);
      if (content != null) Backbone.$(el).html(content);
      return el;
    },

    // Change the view's element (`this.el` property), including event
    // re-delegation.
    setElement: function(element, delegate) {
      if (this.$el) this.undelegateEvents();
      this.$el = element instanceof Backbone.$ ? element : Backbone.$(element);
      this.el = this.$el[0];
      if (delegate !== false) this.delegateEvents();
      return this;
    },

    // Set callbacks, where `this.events` is a hash of
    //
    // *{"event selector": "callback"}*
    //
    //     {
    //       'mousedown .title':  'edit',
    //       'click .button':     'save'
    //       'click .open':       function(e) { ... }
    //     }
    //
    // pairs. Callbacks will be bound to the view, with `this` set properly.
    // Uses event delegation for efficiency.
    // Omitting the selector binds the event to `this.el`.
    // This only works for delegate-able events: not `focus`, `blur`, and
    // not `change`, `submit`, and `reset` in Internet Explorer.
    delegateEvents: function(events) {
      if (!(events || (events = _.result(this, 'events')))) return;
      this.undelegateEvents();
      for (var key in events) {
        var method = events[key];
        if (!_.isFunction(method)) method = this[events[key]];
        if (!method) throw new Error('Method "' + events[key] + '" does not exist');
        var match = key.match(delegateEventSplitter);
        var eventName = match[1], selector = match[2];
        method = _.bind(method, this);
        eventName += '.delegateEvents' + this.cid;
        if (selector === '') {
          this.$el.bind(eventName, method);
        } else {
          this.$el.delegate(selector, eventName, method);
        }
      }
    },

    // Clears all callbacks previously bound to the view with `delegateEvents`.
    // You usually don't need to use this, but may wish to if you have multiple
    // Backbone views attached to the same DOM element.
    undelegateEvents: function() {
      this.$el.unbind('.delegateEvents' + this.cid);
    },

    // Performs the initial configuration of a View with a set of options.
    // Keys with special meaning *(model, collection, id, className)*, are
    // attached directly to the view.
    _configure: function(options) {
      if (this.options) options = _.extend({}, _.result(this, 'options'), options);
      _.extend(this, _.pick(options, viewOptions));
      this.options = options;
    },

    // Ensure that the View has a DOM element to render into.
    // If `this.el` is a string, pass it through `$()`, take the first
    // matching element, and re-assign it to `el`. Otherwise, create
    // an element from the `id`, `className` and `tagName` properties.
    _ensureElement: function() {
      if (!this.el) {
        var attrs = _.extend({}, _.result(this, 'attributes'));
        if (this.id) attrs.id = _.result(this, 'id');
        if (this.className) attrs['class'] = _.result(this, 'className');
        this.setElement(this.make(_.result(this, 'tagName'), attrs), false);
      } else {
        this.setElement(_.result(this, 'el'), false);
      }
    }

  });

  // Backbone.sync
  // -------------

  // Map from CRUD to HTTP for our default `Backbone.sync` implementation.
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'patch':  'PATCH',
    'delete': 'DELETE',
    'read':   'GET'
  };

  // Override this function to change the manner in which Backbone persists
  // models to the server. You will be passed the type of request, and the
  // model in question. By default, makes a RESTful Ajax request
  // to the model's `url()`. Some possible customizations could be:
  //
  // * Use `setTimeout` to batch rapid-fire updates into a single request.
  // * Send up the models as XML instead of JSON.
  // * Persist models via WebSockets instead of Ajax.
  //
  // Turn on `Backbone.emulateHTTP` in order to send `PUT` and `DELETE` requests
  // as `POST`, with a `_method` parameter containing the true HTTP method,
  // as well as all requests with the body as `application/x-www-form-urlencoded`
  // instead of `application/json` with the model in a param named `model`.
  // Useful when interfacing with server-side languages like **PHP** that make
  // it difficult to read the body of `PUT` requests.
  Backbone.sync = function(method, model, options) {
    var type = methodMap[method];

    // Default options, unless specified.
    _.defaults(options || (options = {}), {
      emulateHTTP: Backbone.emulateHTTP,
      emulateJSON: Backbone.emulateJSON
    });

    // Default JSON-request options.
    var params = {type: type, dataType: 'json'};

    // Ensure that we have a URL.
    if (!options.url) {
      params.url = _.result(model, 'url') || urlError();
    }

    // Ensure that we have the appropriate request data.
    if (options.data == null && model && (method === 'create' || method === 'update' || method === 'patch')) {
      params.contentType = 'application/json';
      params.data = JSON.stringify(options.attrs || model.toJSON(options));
    }

    // For older servers, emulate JSON by encoding the request into an HTML-form.
    if (options.emulateJSON) {
      params.contentType = 'application/x-www-form-urlencoded';
      params.data = params.data ? {model: params.data} : {};
    }

    // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    // And an `X-HTTP-Method-Override` header.
    if (options.emulateHTTP && (type === 'PUT' || type === 'DELETE' || type === 'PATCH')) {
      params.type = 'POST';
      if (options.emulateJSON) params.data._method = type;
      var beforeSend = options.beforeSend;
      options.beforeSend = function(xhr) {
        xhr.setRequestHeader('X-HTTP-Method-Override', type);
        if (beforeSend) return beforeSend.apply(this, arguments);
      };
    }

    // Don't process data on a non-GET request.
    if (params.type !== 'GET' && !options.emulateJSON) {
      params.processData = false;
    }

    var success = options.success;
    options.success = function(resp, status, xhr) {
      if (success) success(resp, status, xhr);
      model.trigger('sync', model, resp, options);
    };

    var error = options.error;
    options.error = function(xhr, status, thrown) {
      if (error) error(model, xhr, options);
      model.trigger('error', model, xhr, options);
    };

    // Make the request, allowing the user to override any Ajax options.
    var xhr = Backbone.ajax(_.extend(params, options));
    model.trigger('request', model, xhr, options);
    return xhr;
  };

  // Set the default implementation of `Backbone.ajax` to proxy through to `$`.
  Backbone.ajax = function() {
    return Backbone.$.ajax.apply(Backbone.$, arguments);
  };

  // Helpers
  // -------

  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
  };

  // Set up inheritance for the model, collection, router, view and history.
  Model.extend = Collection.extend = Router.extend = View.extend = History.extend = extend;

  // Throw an error when a URL is needed, and none is supplied.
  var urlError = function() {
    throw new Error('A "url" property or function must be specified');
  };

}).call(this);

define("backbone", ["underscore","jquery"], (function (global) {
    return function () {
        var ret, fn;
        return ret || global.Backbone;
    };
}(this)));

/**
 * @license RequireJS text 2.0.13 Copyright (c) 2010-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/requirejs/text for details
 */
/*jslint regexp: true */
/*global require, XMLHttpRequest, ActiveXObject,
  define, window, process, Packages,
  java, location, Components, FileUtils */

define('text',['module'], function (module) {
    

    var text, fs, Cc, Ci, xpcIsWindows,
        progIds = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'],
        xmlRegExp = /^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im,
        bodyRegExp = /<body[^>]*>\s*([\s\S]+)\s*<\/body>/im,
        hasLocation = typeof location !== 'undefined' && location.href,
        defaultProtocol = hasLocation && location.protocol && location.protocol.replace(/\:/, ''),
        defaultHostName = hasLocation && location.hostname,
        defaultPort = hasLocation && (location.port || undefined),
        buildMap = {},
        masterConfig = (module.config && module.config()) || {};

    text = {
        version: '2.0.13',

        strip: function (content) {
            //Strips <?xml ...?> declarations so that external SVG and XML
            //documents can be added to a document without worry. Also, if the string
            //is an HTML document, only the part inside the body tag is returned.
            if (content) {
                content = content.replace(xmlRegExp, "");
                var matches = content.match(bodyRegExp);
                if (matches) {
                    content = matches[1];
                }
            } else {
                content = "";
            }
            return content;
        },

        jsEscape: function (content) {
            return content.replace(/(['\\])/g, '\\$1')
                .replace(/[\f]/g, "\\f")
                .replace(/[\b]/g, "\\b")
                .replace(/[\n]/g, "\\n")
                .replace(/[\t]/g, "\\t")
                .replace(/[\r]/g, "\\r")
                .replace(/[\u2028]/g, "\\u2028")
                .replace(/[\u2029]/g, "\\u2029");
        },

        createXhr: masterConfig.createXhr || function () {
            //Would love to dump the ActiveX crap in here. Need IE 6 to die first.
            var xhr, i, progId;
            if (typeof XMLHttpRequest !== "undefined") {
                return new XMLHttpRequest();
            } else if (typeof ActiveXObject !== "undefined") {
                for (i = 0; i < 3; i += 1) {
                    progId = progIds[i];
                    try {
                        xhr = new ActiveXObject(progId);
                    } catch (e) {}

                    if (xhr) {
                        progIds = [progId];  // so faster next time
                        break;
                    }
                }
            }

            return xhr;
        },

        /**
         * Parses a resource name into its component parts. Resource names
         * look like: module/name.ext!strip, where the !strip part is
         * optional.
         * @param {String} name the resource name
         * @returns {Object} with properties "moduleName", "ext" and "strip"
         * where strip is a boolean.
         */
        parseName: function (name) {
            var modName, ext, temp,
                strip = false,
                index = name.lastIndexOf("."),
                isRelative = name.indexOf('./') === 0 ||
                             name.indexOf('../') === 0;

            if (index !== -1 && (!isRelative || index > 1)) {
                modName = name.substring(0, index);
                ext = name.substring(index + 1);
            } else {
                modName = name;
            }

            temp = ext || modName;
            index = temp.indexOf("!");
            if (index !== -1) {
                //Pull off the strip arg.
                strip = temp.substring(index + 1) === "strip";
                temp = temp.substring(0, index);
                if (ext) {
                    ext = temp;
                } else {
                    modName = temp;
                }
            }

            return {
                moduleName: modName,
                ext: ext,
                strip: strip
            };
        },

        xdRegExp: /^((\w+)\:)?\/\/([^\/\\]+)/,

        /**
         * Is an URL on another domain. Only works for browser use, returns
         * false in non-browser environments. Only used to know if an
         * optimized .js version of a text resource should be loaded
         * instead.
         * @param {String} url
         * @returns Boolean
         */
        useXhr: function (url, protocol, hostname, port) {
            var uProtocol, uHostName, uPort,
                match = text.xdRegExp.exec(url);
            if (!match) {
                return true;
            }
            uProtocol = match[2];
            uHostName = match[3];

            uHostName = uHostName.split(':');
            uPort = uHostName[1];
            uHostName = uHostName[0];

            return (!uProtocol || uProtocol === protocol) &&
                   (!uHostName || uHostName.toLowerCase() === hostname.toLowerCase()) &&
                   ((!uPort && !uHostName) || uPort === port);
        },

        finishLoad: function (name, strip, content, onLoad) {
            content = strip ? text.strip(content) : content;
            if (masterConfig.isBuild) {
                buildMap[name] = content;
            }
            onLoad(content);
        },

        load: function (name, req, onLoad, config) {
            //Name has format: some.module.filext!strip
            //The strip part is optional.
            //if strip is present, then that means only get the string contents
            //inside a body tag in an HTML string. For XML/SVG content it means
            //removing the <?xml ...?> declarations so the content can be inserted
            //into the current doc without problems.

            // Do not bother with the work if a build and text will
            // not be inlined.
            if (config && config.isBuild && !config.inlineText) {
                onLoad();
                return;
            }

            masterConfig.isBuild = config && config.isBuild;

            var parsed = text.parseName(name),
                nonStripName = parsed.moduleName +
                    (parsed.ext ? '.' + parsed.ext : ''),
                url = req.toUrl(nonStripName),
                useXhr = (masterConfig.useXhr) ||
                         text.useXhr;

            // Do not load if it is an empty: url
            if (url.indexOf('empty:') === 0) {
                onLoad();
                return;
            }

            //Load the text. Use XHR if possible and in a browser.
            if (!hasLocation || useXhr(url, defaultProtocol, defaultHostName, defaultPort)) {
                text.get(url, function (content) {
                    text.finishLoad(name, parsed.strip, content, onLoad);
                }, function (err) {
                    if (onLoad.error) {
                        onLoad.error(err);
                    }
                });
            } else {
                //Need to fetch the resource across domains. Assume
                //the resource has been optimized into a JS module. Fetch
                //by the module name + extension, but do not include the
                //!strip part to avoid file system issues.
                req([nonStripName], function (content) {
                    text.finishLoad(parsed.moduleName + '.' + parsed.ext,
                                    parsed.strip, content, onLoad);
                });
            }
        },

        write: function (pluginName, moduleName, write, config) {
            if (buildMap.hasOwnProperty(moduleName)) {
                var content = text.jsEscape(buildMap[moduleName]);
                write.asModule(pluginName + "!" + moduleName,
                               "define(function () { return '" +
                                   content +
                               "';});\n");
            }
        },

        writeFile: function (pluginName, moduleName, req, write, config) {
            var parsed = text.parseName(moduleName),
                extPart = parsed.ext ? '.' + parsed.ext : '',
                nonStripName = parsed.moduleName + extPart,
                //Use a '.js' file name so that it indicates it is a
                //script that can be loaded across domains.
                fileName = req.toUrl(parsed.moduleName + extPart) + '.js';

            //Leverage own load() method to load plugin value, but only
            //write out values that do not have the strip argument,
            //to avoid any potential issues with ! in file names.
            text.load(nonStripName, req, function (value) {
                //Use own write() method to construct full module value.
                //But need to create shell that translates writeFile's
                //write() to the right interface.
                var textWrite = function (contents) {
                    return write(fileName, contents);
                };
                textWrite.asModule = function (moduleName, contents) {
                    return write.asModule(moduleName, fileName, contents);
                };

                text.write(pluginName, nonStripName, textWrite, config);
            }, config);
        }
    };

    if (masterConfig.env === 'node' || (!masterConfig.env &&
            typeof process !== "undefined" &&
            process.versions &&
            !!process.versions.node &&
            !process.versions['node-webkit'])) {
        //Using special require.nodeRequire, something added by r.js.
        fs = require.nodeRequire('fs');

        text.get = function (url, callback, errback) {
            try {
                var file = fs.readFileSync(url, 'utf8');
                //Remove BOM (Byte Mark Order) from utf8 files if it is there.
                if (file[0] === '\uFEFF') {
                    file = file.substring(1);
                }
                callback(file);
            } catch (e) {
                if (errback) {
                    errback(e);
                }
            }
        };
    } else if (masterConfig.env === 'xhr' || (!masterConfig.env &&
            text.createXhr())) {
        text.get = function (url, callback, errback, headers) {
            var xhr = text.createXhr(), header;
            xhr.open('GET', url, true);

            //Allow plugins direct access to xhr headers
            if (headers) {
                for (header in headers) {
                    if (headers.hasOwnProperty(header)) {
                        xhr.setRequestHeader(header.toLowerCase(), headers[header]);
                    }
                }
            }

            //Allow overrides specified in config
            if (masterConfig.onXhr) {
                masterConfig.onXhr(xhr, url);
            }

            xhr.onreadystatechange = function (evt) {
                var status, err;
                //Do not explicitly handle errors, those should be
                //visible via console output in the browser.
                if (xhr.readyState === 4) {
                    status = xhr.status || 0;
                    if (status > 399 && status < 600) {
                        //An http 4xx or 5xx error. Signal an error.
                        err = new Error(url + ' HTTP status: ' + status);
                        err.xhr = xhr;
                        if (errback) {
                            errback(err);
                        }
                    } else {
                        callback(xhr.responseText);
                    }

                    if (masterConfig.onXhrComplete) {
                        masterConfig.onXhrComplete(xhr, url);
                    }
                }
            };
            xhr.send(null);
        };
    } else if (masterConfig.env === 'rhino' || (!masterConfig.env &&
            typeof Packages !== 'undefined' && typeof java !== 'undefined')) {
        //Why Java, why is this so awkward?
        text.get = function (url, callback) {
            var stringBuffer, line,
                encoding = "utf-8",
                file = new java.io.File(url),
                lineSeparator = java.lang.System.getProperty("line.separator"),
                input = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(file), encoding)),
                content = '';
            try {
                stringBuffer = new java.lang.StringBuffer();
                line = input.readLine();

                // Byte Order Mark (BOM) - The Unicode Standard, version 3.0, page 324
                // http://www.unicode.org/faq/utf_bom.html

                // Note that when we use utf-8, the BOM should appear as "EF BB BF", but it doesn't due to this bug in the JDK:
                // http://bugs.sun.com/bugdatabase/view_bug.do?bug_id=4508058
                if (line && line.length() && line.charAt(0) === 0xfeff) {
                    // Eat the BOM, since we've already found the encoding on this file,
                    // and we plan to concatenating this buffer with others; the BOM should
                    // only appear at the top of a file.
                    line = line.substring(1);
                }

                if (line !== null) {
                    stringBuffer.append(line);
                }

                while ((line = input.readLine()) !== null) {
                    stringBuffer.append(lineSeparator);
                    stringBuffer.append(line);
                }
                //Make sure we return a JavaScript string and not a Java string.
                content = String(stringBuffer.toString()); //String
            } finally {
                input.close();
            }
            callback(content);
        };
    } else if (masterConfig.env === 'xpconnect' || (!masterConfig.env &&
            typeof Components !== 'undefined' && Components.classes &&
            Components.interfaces)) {
        //Avert your gaze!
        Cc = Components.classes;
        Ci = Components.interfaces;
        Components.utils['import']('resource://gre/modules/FileUtils.jsm');
        xpcIsWindows = ('@mozilla.org/windows-registry-key;1' in Cc);

        text.get = function (url, callback) {
            var inStream, convertStream, fileObj,
                readData = {};

            if (xpcIsWindows) {
                url = url.replace(/\//g, '\\');
            }

            fileObj = new FileUtils.File(url);

            //XPCOM, you so crazy
            try {
                inStream = Cc['@mozilla.org/network/file-input-stream;1']
                           .createInstance(Ci.nsIFileInputStream);
                inStream.init(fileObj, 1, 0, false);

                convertStream = Cc['@mozilla.org/intl/converter-input-stream;1']
                                .createInstance(Ci.nsIConverterInputStream);
                convertStream.init(inStream, "utf-8", inStream.available(),
                Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);

                convertStream.readString(inStream.available(), readData);
                convertStream.close();
                inStream.close();
                callback(readData.value);
            } catch (e) {
                throw new Error((fileObj && fileObj.path || '') + ': ' + e);
            }
        };
    }
    return text;
});

/*!
  * domready (c) Dustin Diaz 2012 - License MIT
  */
!function (name, definition) {
  if (typeof module != 'undefined') module.exports = definition()
  else if (typeof define == 'function' && typeof define.amd == 'object') define('domready',definition)
  else this[name] = definition()
}('domready', function (ready) {

  var fns = [], fn, f = false
    , doc = document
    , testEl = doc.documentElement
    , hack = testEl.doScroll
    , domContentLoaded = 'DOMContentLoaded'
    , addEventListener = 'addEventListener'
    , onreadystatechange = 'onreadystatechange'
    , readyState = 'readyState'
    , loadedRgx = hack ? /^loaded|^c/ : /^loaded|c/
    , loaded = loadedRgx.test(doc[readyState])

  function flush(f) {
    loaded = 1
    while (f = fns.shift()) f()
  }

  doc[addEventListener] && doc[addEventListener](domContentLoaded, fn = function () {
    doc.removeEventListener(domContentLoaded, fn, f)
    flush()
  }, f)


  hack && doc.attachEvent(onreadystatechange, fn = function () {
    if (/^c/.test(doc[readyState])) {
      doc.detachEvent(onreadystatechange, fn)
      flush()
    }
  })

  return (ready = hack ?
    function (fn) {
      self != top ?
        loaded ? fn() : fns.push(fn) :
        function () {
          try {
            testEl.doScroll('left')
          } catch (e) {
            return setTimeout(function() { ready(fn) }, 50)
          }
          fn()
        }()
    } :
    function (fn) {
      loaded ? fn() : fns.push(fn)
    })
})
;
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

define('aura/ext/components', [],function() {

  

  return function(app) {

    var ownProp = function(obj, key) {
      return Object.prototype.hasOwnProperty.call(obj, key);
    };

    var core = app.core,
        _    = core.util._,
        find = core.dom.find,
        each = core.util.each,
        when = core.data.when,
        promise = core.data.promise;

    core.Components = core.Components || {};

    /**
     * Components registry
     * @type {Object}
     */
    var registeredComponents = {};

    /**
     * Components Callbacks
     */
    var componentsCallbacks = {};

    function invokeCallbacks(stage, fnName, context, args) {
      var callbacks = componentsCallbacks[stage + ":" + fnName] || [];
      var dfds      = [];
      each(callbacks, function(cb, i) {
        if (typeof cb === 'function') {
          dfds.push(cb.apply(context, args));
        }
      });
      var ret = promise(when.apply(undefined, dfds));
      return ret;
    }

    function invokeWithCallbacks(fn, context) {
      var result;
      var fnName;
      if (typeof fn === 'string') {
        fnName  = fn;
        fn      = context[fnName] || function() {};
      } else if (typeof fn.name === 'string') {
        fnName = fn.name;
        fn     = fn.fn || function() {};
      } else {
        throw new Error("Error invoking Component with callbacks: ", context.options.name, ". first argument should be either the name of a function or of the form : { name: 'fnName', fn: function() { ... } } ");
      }

      var dfd = core.data.deferred();
      var before, after, args = [].slice.call(arguments, 2);
      before = invokeCallbacks("before", fnName, context, args);

      before.then(function() {
        var dfd = core.data.deferred();
        try {
          result = fn.apply(context, args);
          return dfd.resolve(result);
        } catch (e) {
          return dfd.reject(e);
        }
      }).then(function(result) {
        invokeCallbacks("after", fnName, context, args).then(function() {
          dfd.resolve(result);
        }, dfd.reject);
      }).fail(function(err) {
        app.logger.error("Error in Component " + context.options.name + " " + fnName + " callback", err);
        dfd.reject(err);
      });

      return promise(dfd);
    }

    /**
     * The base Component constructor...
     * @class  Component
     * @constructor
     * @param {Object} options the options to init the component...
     */
    function Component(options) {
      var opts = _.clone(options);

      /**
       * The Components' options Object, passed to its constructor.
       * TODO: Add explanation of how options are set from HTML API + which default options are
       * set during the Component initialization.
       *
       * @property {Object} options
       */
      this.options    = _.defaults(opts || {}, this.options || {});

      /**
       * Internal, unique reference for a Component instance
       *
       * @property {String} _ref
       */
      this._ref       = opts._ref;

      /**
       * A cached jQuery object for the Components's element.
       *
       * @property {Object} $el
       */
      this.$el        = find(opts.el);

      this.invokeWithCallbacks('initialize', this.options);
      return this;
    }

    /**
     * Method called on Component's initialization.
     *
     * @method initialize
     * @param {Object} options options Object passed on Component initialization
     */
    Component.prototype.initialize = function() {};

    /**
     * A helper function to render markup and recursively start nested components.
     *
     * @method  html
     * @param  {String} markup the markup to render in the component's root el
     * @return {Component} the Component instance to allow methods chaining...
     */
    Component.prototype.html = function(markup) {
      var el = this.$el;
      el.html(markup);
      var self = this;
      _.defer(function() {
        self.sandbox.start(el, { reset: true });
      });
      return this;
    };

    /**
     * A helper function to find matching elements within the Component's root element.
     *
     * @method  $find
     * @param  {Selector | jQuery Object | Element} selector CSS selector or jQuery object.
     * @return {jQuery Object}
     */
    Component.prototype.$find = function(selector) {
      return find(selector, this.$el);
    };

    /**
     *
     * @method  invokeWithCallbacks
     * @param  {String} methodName the name of the method to invoke with callbacks
     * @return {Promise} a Promise that will resolve to the return value of the original function invoked.
     */
    Component.prototype.invokeWithCallbacks = function(methodName) {
      return invokeWithCallbacks.apply(undefined, [methodName, this].concat([].slice.call(arguments, 1)));
    };

    // Stolen from Backbone 0.9.9 !
    // Helper function to correctly set up the prototype chain, for subclasses.
    // Similar to `goog.inherits`, but uses a hash of prototype properties and
    // class properties to be extended.
    var extend = function(protoProps, staticProps) {
      var parent = this;
      var child;
      if (protoProps && ownProp(protoProps, 'constructor')) {
        child = protoProps.constructor;
      } else {
        child = function(){ parent.apply(this, arguments); };
      }
      core.util.extend(child, parent, staticProps);
      var Surrogate = function(){ this.constructor = child; };
      Surrogate.prototype = parent.prototype;
      child.prototype = new Surrogate();
      if (protoProps) { core.util.extend(child.prototype, protoProps); }
      child.__super__ = parent.prototype;
      return child;
    };

    Component.extend = extend;

    /**
     * Component loader.
     * @param  {String} name    The name of the Component to load
     * @param  {Object} options The options to pass to the new component instance.
     * @return {Promise}        A Promise that resolves to the loaded component instance.
     */
    Component.load = function(name, opts) {
      // TODO: Make it more simple / or break it down
      // in several functions...
      // it's too big !

      var dfd = core.data.deferred(),
          ref = opts.ref,
          component,
          ComponentConstructor,
          el  = opts.el;

      opts._ref  = core.util._.uniqueId(ref + '+');

      var options = _.clone(opts);

      app.logger.log("Start loading component:", name);

      dfd.fail(function(err) {
        app.logger.error("Error loading component:", name, err);
      });

      // Apply requirejs map / package configuration before the actual loading.
      require.config(options.require);

      // Here, we require the component's package definition
      require([ref], function(componentDefinition) {

        if (!componentDefinition) {
          return dfd.reject("component " + ref + " Definition is empty !");
        }

        try {

          // Ok, the component has already been loaded once, we should already have it in the registry
          if (registeredComponents[ref]) {
            ComponentConstructor = registeredComponents[ref];
          } else {

            if (componentDefinition.type) {
              // If `type` is defined, we use a constructor provided by an extension ? ex. Backbone.
              ComponentConstructor = core.Components[componentDefinition.type];
            } else {
              // Otherwise, we use the stock Component constructor.
              ComponentConstructor = Component;
            }

            if (!ComponentConstructor) {
              throw new Error("Can't find component of type '" +  componentDefinition.type + "', did you forget to include the extension that provides it ?");
            }

            if (core.util._.isObject(componentDefinition)) {
              ComponentConstructor = registeredComponents[ref] = ComponentConstructor.extend(componentDefinition);
            }
          }

          var sandbox = app.sandboxes.create(opts._ref, { el: el });

          sandbox.logger.setName("Component '" + name + "'(" + sandbox.logger.name + ')');

          // Here we inject the sandbox in the component's prototype...
          var ext = { sandbox: sandbox };

          // If the Component is just defined as a function, we use it as its `initialize` method.
          if (typeof componentDefinition === 'function') {
            ext.initialize = componentDefinition;
          }

          ComponentConstructor = ComponentConstructor.extend(ext);

          var newComponent = new ComponentConstructor(options);

          // Sandbox owns its el and vice-versa
          core.dom.data(newComponent.$el,'__sandbox_ref__', sandbox.ref);

          var initialized = when(newComponent);

          initialized.then(function(ret) { dfd.resolve(ret); });
          initialized.fail(function(err) { dfd.reject(err); });

          return initialized;
        } catch(err) {
          app.logger.error(err.message);
          dfd.reject(err);
        }
      }, function(err) { dfd.reject(err); });

      return promise(dfd);
    };

    /**
     * Parses the component's options from its element's data attributes.
     *
     * @private
     * @param  {String|DomNode} el    the element
     * @param  {String} namespace     current Component's detected namespace
     * @param  {String} opts          an Object containing the base Component's options to extend.
     * @return {Object} An object that contains the Component's options
     */
    function parseComponentOptions(el, namespace, opts) {

      var camelize = function (str) {
        return str.replace (/(?:^|[-_])(\w)/g, function (_, c) {
          return c ? c.toUpperCase () : '';
        })
      };

      var options = _.clone(opts || {});
      options.el = el;
      options.require = {};

      var name, data = core.dom.data(el);

      // Here we go through all the data attributes of the element to build the options object
      each(data, function(v, k) {
        k = k.replace(new RegExp("^" + namespace + "(-)?"), "");
        k = camelize(k);
        k = k.charAt(0).toLowerCase() + k.slice(1);
        if (k !== "component" && k !== 'widget') {
          options[k] = v;
        } else {
          name = v;
        }
      });

      return buildComponentOptions(name, options);
    }

    /**
     * Parses the component's options from its element's data attributes.
     *
     * @private
     * @param  {String} name      the Component's name
     * @param  {Object} opts      an Object containing the base Component's options to extend.
     * @return {Object}           An object that contains the component's options
     */
    function buildComponentOptions(name, options) {
      var ref              = name.split("@"),
          componentName   = core.util.decamelize(ref[0]),
          componentSource = ref[1] || "default",
          requireContext  = require.s.contexts._,
          componentsPath  = app.config.sources[componentSource] || "./aura_components";

      // Register the component as a requirejs package...
      // TODO: packages are not supported by almond, should we find another way to do this ?
      options.name              = componentName;
      options.ref               = '__component__$' + componentName + "@" + componentSource;
      options.baseUrl           = componentsPath + "/" + componentName;
      options.require           = options.require || {};
      options.require.packages  = options.require.packages || [];
      options.require.packages.push({ name: options.ref, location: componentsPath + "/" + componentName });

      return options;
    }

    /**!
     * Returns a list of components.
     * If the first argument is a String, it is considered as a DomNode reference
     * We then parse its content to find aura-components inside of it.
     *
     * @static
     * @param  {Array|String} components a list of components or a reference to a root dom node
     * @return {Array}        a list of component with their options
     */
    Component.parseList = function(components) {
      var list = [];

      if (_.isArray(components) && ! _.some(components,_.isElement)) {
        _.map(components, function(w) {
          var options = buildComponentOptions(w.name, w.options);
          list.push({ name: w.name, options: options });
        });
      } else if (components && find(components)) {
        var appNamespace = app.config.namespace;

        // Support for legacy data-*-widget
        var selector = ["[data-aura-component]", "[data-aura-widget]"];
        if (appNamespace) {
          selector.push("[data-" + appNamespace + "-component]");
          selector.push("[data-" + appNamespace + "-widget]");
        }
        selector = selector.join(",");

        each(find(selector, components || 'body'),function(el){
          var ns = "aura";
          if (appNamespace && (core.dom.data(el,appNamespace +'-component') || core.dom.data(el,appNamespace +'-widget'))) {
            ns = appNamespace;
          }
          var options = parseComponentOptions(el, ns);
          list.push({ name: options.name, options: options });
        });
      }
      return list;
    };

    /**
     * Actual start method for a list of components.
     *
     * @static
     * @param  {Array|String} components cf. `Component.parseList`
     * @return {Promise} a promise that resolves to a list of started components.
     */
    Component.startAll = function(components) {
      var componentsList = Component.parseList(components);
      var list = [];
      core.util.each(componentsList, function(w, i) {
        var ret = Component.load(w.name, w.options);
        list.push(ret);
      });
      var loadedComponents = when.apply(undefined, list);
      return promise(loadedComponents);
    };

    return {
      name: 'components',

      require: { paths: { text: 'bower_components/requirejs-text/text' } },

      initialize: function(app) {

        // Components 'classes' registry...
        core.Components.Base = Component;

        /**
         * @class Aura
         */


        /**
         * Registers a function that will be executed before the associated
         * Component method is called.
         *
         * Once registered, every time a component method will be called with the
         * `invokeWithCallbacks` method the registered callbacks will execute accordingly.
         *
         * The callback functions can return a promise if required in order to
         * postpone the execution of the called function up to when the all
         * registered callbacks results are resolved.
         *
         * The arguments passed to the callbacks are the same than those which
         * with the component will be called. The scope of the callback is
         * the component instance itself, as per the component method.
         *
         * @method components.before
         * @param  {String}   methodName    eg. 'initialize', 'remove'
         * @param  {Function} fn            actual function to run
         */
        app.components.before = function(methodName, fn) {
          var callbackName = "before:" + methodName;
          registerComponentCallback(callbackName, fn);
        };

        /**
         * Same as components.before, but executed after the method invocation.
         *
         * @method components.after
         * @param  {[type]}   methodName eg. 'initialize', 'remove'
         * @param  {Function} fn         actual function to run
         */
        app.components.after = function(methodName, fn) {
          var callbackName = "after:" + methodName;
          registerComponentCallback(callbackName, fn);
        };

        // Actually registering the callbacks in the registry.
        function registerComponentCallback(callbackName, fn) {
          componentsCallbacks[callbackName] = componentsCallbacks[callbackName] || [];
          componentsCallbacks[callbackName].push(fn);
        }

        /**
         * Register a Component Type (experimental).
         * Components type ca be used to encapsulate many custom components behaviours.
         * They will be then used while declaring your components as follows:
         *
         * ```js
         * define({
         *   type: 'myComponentType',
         *   // component declaration...
         * });
         * ```
         *
         * @method components.addType
         * @param  {String}   type a string that will identify the component type.
         * @param  {Function} def A constructor the this component type
         */
        app.components.addType = function(type, def) {
          if (core.Components[type]) {
            throw new Error("Component type " + type + " already defined");
          }
          core.Components[type] = Component.extend(def);
        };


        /**
         * @class Sandbox
         */

        /**
         * Start method.
         * This method takes either an Array of Components to start or or DOM Selector to
         * target the element that will be parsed to look for Components to start.
         *
         * @method  start
         * @param  {Array|DOM Selector} list    Array of Components to start or parent node.
         * @param  {Object} options             Available options: `reset` : if true, all current children
         *                                      will be stopped before start.
         */
        app.sandbox.start = function (list, options) {
          var event = ['aura', 'sandbox', 'start'].join(app.config.mediator.delimiter);
          core.mediator.emit(event, this);
          var children = this._children || [];
          if (options && options.reset) {
            _.invoke(this._children || [], 'stop');
            children = [];
          }
          var self = this;

          Component.startAll(list).done(function () {
            var components   = _.compact(Array.prototype.slice.call(arguments) || []);
            core.util.each(components, function (w) {
              w.sandbox._component = w;
              w.sandbox._parent = self;
              children.push(w.sandbox);
            });
            self._children = children;
          });

          return this;
        };

      },

      /**
       * When all of an application's extensions are finally loaded, the 'extensions'
       * afterAppStart methods are then called.
       *
       * @method components.afterAppStart
       * @param  {Object}   an Aura application object
       */
      afterAppStart: function(app) {
        if (app.config.components !== false && app.startOptions.components !== false) {
          var el;
          if (_.isArray(app.startOptions.components)) {
            el = find('body');
          } else {
            el = find(app.startOptions.components);
          }
          core.appSandbox = app.sandboxes.create(app.ref, { el: el });
          core.appSandbox.start(app.startOptions.components);
        }
      }
    };
  };
});

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

/*!

 handlebars v1.1.2

Copyright (C) 2011 by Yehuda Katz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

@license
*/

define(
  'handlebars/safe-string',["exports"],
  function(__exports__) {
    
    // Build out our basic SafeString type
    function SafeString(string) {
      this.string = string;
    }

    SafeString.prototype.toString = function() {
      return "" + this.string;
    };

    __exports__["default"] = SafeString;
  });
define(
  'handlebars/utils',["./safe-string","exports"],
  function(__dependency1__, __exports__) {
    
    var SafeString = __dependency1__["default"];

    var escape = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;",
      "`": "&#x60;"
    };

    var badChars = /[&<>"'`]/g;
    var possible = /[&<>"'`]/;

    function escapeChar(chr) {
      return escape[chr] || "&amp;";
    }

    function extend(obj, value) {
      for(var key in value) {
        if(value.hasOwnProperty(key)) {
          obj[key] = value[key];
        }
      }
    }

    __exports__.extend = extend;var toString = Object.prototype.toString;
    __exports__.toString = toString;
    // Sourced from lodash
    // https://github.com/bestiejs/lodash/blob/master/LICENSE.txt
    var isFunction = function(value) {
      return typeof value === 'function';
    };
    // fallback for older versions of Chrome and Safari
    if (isFunction(/x/)) {
      isFunction = function(value) {
        return typeof value === 'function' && toString.call(value) === '[object Function]';
      };
    }
    var isFunction;
    __exports__.isFunction = isFunction;
    var isArray = Array.isArray || function(value) {
      return (value && typeof value === 'object') ? toString.call(value) === '[object Array]' : false;
    };
    __exports__.isArray = isArray;

    function escapeExpression(string) {
      // don't escape SafeStrings, since they're already safe
      if (string instanceof SafeString) {
        return string.toString();
      } else if (!string && string !== 0) {
        return "";
      }

      // Force a string conversion as this will be done by the append regardless and
      // the regex test will do this transparently behind the scenes, causing issues if
      // an object's to string has escaped characters in it.
      string = "" + string;

      if(!possible.test(string)) { return string; }
      return string.replace(badChars, escapeChar);
    }

    __exports__.escapeExpression = escapeExpression;function isEmpty(value) {
      if (!value && value !== 0) {
        return true;
      } else if (isArray(value) && value.length === 0) {
        return true;
      } else {
        return false;
      }
    }

    __exports__.isEmpty = isEmpty;
  });
define(
  'handlebars/exception',["exports"],
  function(__exports__) {
    

    var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

    function Exception(/* message */) {
      var tmp = Error.prototype.constructor.apply(this, arguments);

      // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
      for (var idx = 0; idx < errorProps.length; idx++) {
        this[errorProps[idx]] = tmp[errorProps[idx]];
      }
    }

    Exception.prototype = new Error();

    __exports__["default"] = Exception;
  });
define(
  'handlebars/base',["./utils","./exception","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    
    /*globals Exception, Utils */
    var Utils = __dependency1__;
    var Exception = __dependency2__["default"];

    var VERSION = "1.1.2";
    __exports__.VERSION = VERSION;var COMPILER_REVISION = 4;
    __exports__.COMPILER_REVISION = COMPILER_REVISION;
    var REVISION_CHANGES = {
      1: '<= 1.0.rc.2', // 1.0.rc.2 is actually rev2 but doesn't report it
      2: '== 1.0.0-rc.3',
      3: '== 1.0.0-rc.4',
      4: '>= 1.0.0'
    };
    __exports__.REVISION_CHANGES = REVISION_CHANGES;
    var isArray = Utils.isArray,
        isFunction = Utils.isFunction,
        toString = Utils.toString,
        objectType = '[object Object]';

    function HandlebarsEnvironment(helpers, partials) {
      this.helpers = helpers || {};
      this.partials = partials || {};

      registerDefaultHelpers(this);
    }

    __exports__.HandlebarsEnvironment = HandlebarsEnvironment;HandlebarsEnvironment.prototype = {
      constructor: HandlebarsEnvironment,

      logger: logger,
      log: log,

      registerHelper: function(name, fn, inverse) {
        if (toString.call(name) === objectType) {
          if (inverse || fn) { throw new Exception('Arg not supported with multiple helpers'); }
          Utils.extend(this.helpers, name);
        } else {
          if (inverse) { fn.not = inverse; }
          this.helpers[name] = fn;
        }
      },

      registerPartial: function(name, str) {
        if (toString.call(name) === objectType) {
          Utils.extend(this.partials,  name);
        } else {
          this.partials[name] = str;
        }
      }
    };

    function registerDefaultHelpers(instance) {
      instance.registerHelper('helperMissing', function(arg) {
        if(arguments.length === 2) {
          return undefined;
        } else {
          throw new Error("Missing helper: '" + arg + "'");
        }
      });

      instance.registerHelper('blockHelperMissing', function(context, options) {
        var inverse = options.inverse || function() {}, fn = options.fn;

        if (isFunction(context)) { context = context.call(this); }

        if(context === true) {
          return fn(this);
        } else if(context === false || context == null) {
          return inverse(this);
        } else if (isArray(context)) {
          if(context.length > 0) {
            return instance.helpers.each(context, options);
          } else {
            return inverse(this);
          }
        } else {
          return fn(context);
        }
      });

      instance.registerHelper('each', function(context, options) {
        var fn = options.fn, inverse = options.inverse;
        var i = 0, ret = "", data;

        if (isFunction(context)) { context = context.call(this); }

        if (options.data) {
          data = createFrame(options.data);
        }

        if(context && typeof context === 'object') {
          if (isArray(context)) {
            for(var j = context.length; i<j; i++) {
              if (data) {
                data.index = i;
                data.first = (i === 0)
                data.last  = (i === (context.length-1));
              }
              ret = ret + fn(context[i], { data: data });
            }
          } else {
            for(var key in context) {
              if(context.hasOwnProperty(key)) {
                if(data) { data.key = key; }
                ret = ret + fn(context[key], {data: data});
                i++;
              }
            }
          }
        }

        if(i === 0){
          ret = inverse(this);
        }

        return ret;
      });

      instance.registerHelper('if', function(conditional, options) {
        if (isFunction(conditional)) { conditional = conditional.call(this); }

        // Default behavior is to render the positive path if the value is truthy and not empty.
        // The `includeZero` option may be set to treat the condtional as purely not empty based on the
        // behavior of isEmpty. Effectively this determines if 0 is handled by the positive path or negative.
        if ((!options.hash.includeZero && !conditional) || Utils.isEmpty(conditional)) {
          return options.inverse(this);
        } else {
          return options.fn(this);
        }
      });

      instance.registerHelper('unless', function(conditional, options) {
        return instance.helpers['if'].call(this, conditional, {fn: options.inverse, inverse: options.fn, hash: options.hash});
      });

      instance.registerHelper('with', function(context, options) {
        if (isFunction(context)) { context = context.call(this); }

        if (!Utils.isEmpty(context)) return options.fn(context);
      });

      instance.registerHelper('log', function(context, options) {
        var level = options.data && options.data.level != null ? parseInt(options.data.level, 10) : 1;
        instance.log(level, context);
      });
    }

    var logger = {
      methodMap: { 0: 'debug', 1: 'info', 2: 'warn', 3: 'error' },

      // State enum
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3,
      level: 3,

      // can be overridden in the host environment
      log: function(level, obj) {
        if (logger.level <= level) {
          var method = logger.methodMap[level];
          if (typeof console !== 'undefined' && console[method]) {
            console[method].call(console, obj);
          }
        }
      }
    };
    __exports__.logger = logger;
    function log(level, obj) { logger.log(level, obj); }

    __exports__.log = log;var createFrame = function(object) {
      var obj = {};
      Utils.extend(obj, object);
      return obj;
    };
    __exports__.createFrame = createFrame;
  });
define(
  'handlebars/runtime',["./utils","./exception","./base","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    
    /*global Utils */
    var Utils = __dependency1__;
    var Exception = __dependency2__["default"];
    var COMPILER_REVISION = __dependency3__.COMPILER_REVISION;
    var REVISION_CHANGES = __dependency3__.REVISION_CHANGES;

    function checkRevision(compilerInfo) {
      var compilerRevision = compilerInfo && compilerInfo[0] || 1,
          currentRevision = COMPILER_REVISION;

      if (compilerRevision !== currentRevision) {
        if (compilerRevision < currentRevision) {
          var runtimeVersions = REVISION_CHANGES[currentRevision],
              compilerVersions = REVISION_CHANGES[compilerRevision];
          throw new Error("Template was precompiled with an older version of Handlebars than the current runtime. "+
                "Please update your precompiler to a newer version ("+runtimeVersions+") or downgrade your runtime to an older version ("+compilerVersions+").");
        } else {
          // Use the embedded version info since the runtime doesn't know about this revision yet
          throw new Error("Template was precompiled with a newer version of Handlebars than the current runtime. "+
                "Please update your runtime to a newer version ("+compilerInfo[1]+").");
        }
      }
    }

    // TODO: Remove this line and break up compilePartial

    function template(templateSpec, env) {
      if (!env) {
        throw new Error("No environment passed to template");
      }

      var invokePartialWrapper;
      if (env.compile) {
        invokePartialWrapper = function(partial, name, context, helpers, partials, data) {
          // TODO : Check this for all inputs and the options handling (partial flag, etc). This feels
          // like there should be a common exec path
          var result = invokePartial.apply(this, arguments);
          if (result) { return result; }

          var options = { helpers: helpers, partials: partials, data: data };
          partials[name] = env.compile(partial, { data: data !== undefined }, env);
          return partials[name](context, options);
        };
      } else {
        invokePartialWrapper = function(partial, name /* , context, helpers, partials, data */) {
          var result = invokePartial.apply(this, arguments);
          if (result) { return result; }
          throw new Exception("The partial " + name + " could not be compiled when running in runtime-only mode");
        };
      }

      // Just add water
      var container = {
        escapeExpression: Utils.escapeExpression,
        invokePartial: invokePartialWrapper,
        programs: [],
        program: function(i, fn, data) {
          var programWrapper = this.programs[i];
          if(data) {
            programWrapper = program(i, fn, data);
          } else if (!programWrapper) {
            programWrapper = this.programs[i] = program(i, fn);
          }
          return programWrapper;
        },
        merge: function(param, common) {
          var ret = param || common;

          if (param && common && (param !== common)) {
            ret = {};
            Utils.extend(ret, common);
            Utils.extend(ret, param);
          }
          return ret;
        },
        programWithDepth: programWithDepth,
        noop: noop,
        compilerInfo: null
      };

      return function(context, options) {
        options = options || {};
        var namespace = options.partial ? options : env,
            helpers,
            partials;

        if (!options.partial) {
          helpers = options.helpers;
          partials = options.partials;
        }
        var result = templateSpec.call(
              container,
              namespace, context,
              helpers,
              partials,
              options.data);

        if (!options.partial) {
          checkRevision(container.compilerInfo);
        }

        return result;
      };
    }

    __exports__.template = template;function programWithDepth(i, fn, data /*, $depth */) {
      var args = Array.prototype.slice.call(arguments, 3);

      var prog = function(context, options) {
        options = options || {};

        return fn.apply(this, [context, options.data || data].concat(args));
      };
      prog.program = i;
      prog.depth = args.length;
      return prog;
    }

    __exports__.programWithDepth = programWithDepth;function program(i, fn, data) {
      var prog = function(context, options) {
        options = options || {};

        return fn(context, options.data || data);
      };
      prog.program = i;
      prog.depth = 0;
      return prog;
    }

    __exports__.program = program;function invokePartial(partial, name, context, helpers, partials, data) {
      var options = { partial: true, helpers: helpers, partials: partials, data: data };

      if(partial === undefined) {
        throw new Exception("The partial " + name + " could not be found");
      } else if(partial instanceof Function) {
        return partial(context, options);
      }
    }

    __exports__.invokePartial = invokePartial;function noop() { return ""; }

    __exports__.noop = noop;
  });
define(
  'handlebars.runtime',["./handlebars/base","./handlebars/safe-string","./handlebars/exception","./handlebars/utils","./handlebars/runtime","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    
    var base = __dependency1__;

    // Each of these augment the Handlebars object. No need to setup here.
    // (This is done to easily share code between commonjs and browse envs)
    var SafeString = __dependency2__["default"];
    var Exception = __dependency3__["default"];
    var Utils = __dependency4__;
    var runtime = __dependency5__;

    // For compatibility and usage outside of module systems, make the Handlebars object a namespace
    var create = function() {
      var hb = new base.HandlebarsEnvironment();

      Utils.extend(hb, base);
      hb.SafeString = SafeString;
      hb.Exception = Exception;
      hb.Utils = Utils;

      hb.VM = runtime;
      hb.template = function(spec) {
        return runtime.template(spec, hb);
      };

      return hb;
    };

    var Handlebars = create();
    Handlebars.create = create;

    __exports__["default"] = Handlebars;
  });
define(
  'handlebars/compiler/ast',["../exception","exports"],
  function(__dependency1__, __exports__) {
    
    var Exception = __dependency1__["default"];

    function ProgramNode(statements, inverseStrip, inverse) {
      this.type = "program";
      this.statements = statements;
      this.strip = {};

      if(inverse) {
        this.inverse = new ProgramNode(inverse, inverseStrip);
        this.strip.right = inverseStrip.left;
      } else if (inverseStrip) {
        this.strip.left = inverseStrip.right;
      }
    }

    __exports__.ProgramNode = ProgramNode;function MustacheNode(rawParams, hash, open, strip) {
      this.type = "mustache";
      this.hash = hash;
      this.strip = strip;

      var escapeFlag = open[3] || open[2];
      this.escaped = escapeFlag !== '{' && escapeFlag !== '&';

      var id = this.id = rawParams[0];
      var params = this.params = rawParams.slice(1);

      // a mustache is an eligible helper if:
      // * its id is simple (a single part, not `this` or `..`)
      var eligibleHelper = this.eligibleHelper = id.isSimple;

      // a mustache is definitely a helper if:
      // * it is an eligible helper, and
      // * it has at least one parameter or hash segment
      this.isHelper = eligibleHelper && (params.length || hash);

      // if a mustache is an eligible helper but not a definite
      // helper, it is ambiguous, and will be resolved in a later
      // pass or at runtime.
    }

    __exports__.MustacheNode = MustacheNode;function PartialNode(partialName, context, strip) {
      this.type         = "partial";
      this.partialName  = partialName;
      this.context      = context;
      this.strip = strip;
    }

    __exports__.PartialNode = PartialNode;function BlockNode(mustache, program, inverse, close) {
      if(mustache.id.original !== close.path.original) {
        throw new Exception(mustache.id.original + " doesn't match " + close.path.original);
      }

      this.type = "block";
      this.mustache = mustache;
      this.program  = program;
      this.inverse  = inverse;

      this.strip = {
        left: mustache.strip.left,
        right: close.strip.right
      };

      (program || inverse).strip.left = mustache.strip.right;
      (inverse || program).strip.right = close.strip.left;

      if (inverse && !program) {
        this.isInverse = true;
      }
    }

    __exports__.BlockNode = BlockNode;function ContentNode(string) {
      this.type = "content";
      this.string = string;
    }

    __exports__.ContentNode = ContentNode;function HashNode(pairs) {
      this.type = "hash";
      this.pairs = pairs;
    }

    __exports__.HashNode = HashNode;function IdNode(parts) {
      this.type = "ID";

      var original = "",
          dig = [],
          depth = 0;

      for(var i=0,l=parts.length; i<l; i++) {
        var part = parts[i].part;
        original += (parts[i].separator || '') + part;

        if (part === ".." || part === "." || part === "this") {
          if (dig.length > 0) { throw new Exception("Invalid path: " + original); }
          else if (part === "..") { depth++; }
          else { this.isScoped = true; }
        }
        else { dig.push(part); }
      }

      this.original = original;
      this.parts    = dig;
      this.string   = dig.join('.');
      this.depth    = depth;

      // an ID is simple if it only has one part, and that part is not
      // `..` or `this`.
      this.isSimple = parts.length === 1 && !this.isScoped && depth === 0;

      this.stringModeValue = this.string;
    }

    __exports__.IdNode = IdNode;function PartialNameNode(name) {
      this.type = "PARTIAL_NAME";
      this.name = name.original;
    }

    __exports__.PartialNameNode = PartialNameNode;function DataNode(id) {
      this.type = "DATA";
      this.id = id;
    }

    __exports__.DataNode = DataNode;function StringNode(string) {
      this.type = "STRING";
      this.original =
        this.string =
        this.stringModeValue = string;
    }

    __exports__.StringNode = StringNode;function IntegerNode(integer) {
      this.type = "INTEGER";
      this.original =
        this.integer = integer;
      this.stringModeValue = Number(integer);
    }

    __exports__.IntegerNode = IntegerNode;function BooleanNode(bool) {
      this.type = "BOOLEAN";
      this.bool = bool;
      this.stringModeValue = bool === "true";
    }

    __exports__.BooleanNode = BooleanNode;function CommentNode(comment) {
      this.type = "comment";
      this.comment = comment;
    }

    __exports__.CommentNode = CommentNode;
  });
define(
  'handlebars/compiler/parser',["exports"],
  function(__exports__) {
    
    /* Jison generated parser */
    var handlebars = (function(){
    var parser = {trace: function trace() { },
    yy: {},
    symbols_: {"error":2,"root":3,"statements":4,"EOF":5,"program":6,"simpleInverse":7,"statement":8,"openInverse":9,"closeBlock":10,"openBlock":11,"mustache":12,"partial":13,"CONTENT":14,"COMMENT":15,"OPEN_BLOCK":16,"inMustache":17,"CLOSE":18,"OPEN_INVERSE":19,"OPEN_ENDBLOCK":20,"path":21,"OPEN":22,"OPEN_UNESCAPED":23,"CLOSE_UNESCAPED":24,"OPEN_PARTIAL":25,"partialName":26,"partial_option0":27,"inMustache_repetition0":28,"inMustache_option0":29,"dataName":30,"param":31,"STRING":32,"INTEGER":33,"BOOLEAN":34,"hash":35,"hash_repetition_plus0":36,"hashSegment":37,"ID":38,"EQUALS":39,"DATA":40,"pathSegments":41,"SEP":42,"$accept":0,"$end":1},
    terminals_: {2:"error",5:"EOF",14:"CONTENT",15:"COMMENT",16:"OPEN_BLOCK",18:"CLOSE",19:"OPEN_INVERSE",20:"OPEN_ENDBLOCK",22:"OPEN",23:"OPEN_UNESCAPED",24:"CLOSE_UNESCAPED",25:"OPEN_PARTIAL",32:"STRING",33:"INTEGER",34:"BOOLEAN",38:"ID",39:"EQUALS",40:"DATA",42:"SEP"},
    productions_: [0,[3,2],[3,1],[6,2],[6,3],[6,2],[6,1],[6,1],[6,0],[4,1],[4,2],[8,3],[8,3],[8,1],[8,1],[8,1],[8,1],[11,3],[9,3],[10,3],[12,3],[12,3],[13,4],[7,2],[17,3],[17,1],[31,1],[31,1],[31,1],[31,1],[31,1],[35,1],[37,3],[26,1],[26,1],[26,1],[30,2],[21,1],[41,3],[41,1],[27,0],[27,1],[28,0],[28,2],[29,0],[29,1],[36,1],[36,2]],
    performAction: function anonymous(yytext,yyleng,yylineno,yy,yystate,$$,_$) {

    var $0 = $$.length - 1;
    switch (yystate) {
    case 1: return new yy.ProgramNode($$[$0-1]); 
    break;
    case 2: return new yy.ProgramNode([]); 
    break;
    case 3:this.$ = new yy.ProgramNode([], $$[$0-1], $$[$0]);
    break;
    case 4:this.$ = new yy.ProgramNode($$[$0-2], $$[$0-1], $$[$0]);
    break;
    case 5:this.$ = new yy.ProgramNode($$[$0-1], $$[$0], []);
    break;
    case 6:this.$ = new yy.ProgramNode($$[$0]);
    break;
    case 7:this.$ = new yy.ProgramNode([]);
    break;
    case 8:this.$ = new yy.ProgramNode([]);
    break;
    case 9:this.$ = [$$[$0]];
    break;
    case 10: $$[$0-1].push($$[$0]); this.$ = $$[$0-1]; 
    break;
    case 11:this.$ = new yy.BlockNode($$[$0-2], $$[$0-1].inverse, $$[$0-1], $$[$0]);
    break;
    case 12:this.$ = new yy.BlockNode($$[$0-2], $$[$0-1], $$[$0-1].inverse, $$[$0]);
    break;
    case 13:this.$ = $$[$0];
    break;
    case 14:this.$ = $$[$0];
    break;
    case 15:this.$ = new yy.ContentNode($$[$0]);
    break;
    case 16:this.$ = new yy.CommentNode($$[$0]);
    break;
    case 17:this.$ = new yy.MustacheNode($$[$0-1][0], $$[$0-1][1], $$[$0-2], stripFlags($$[$0-2], $$[$0]));
    break;
    case 18:this.$ = new yy.MustacheNode($$[$0-1][0], $$[$0-1][1], $$[$0-2], stripFlags($$[$0-2], $$[$0]));
    break;
    case 19:this.$ = {path: $$[$0-1], strip: stripFlags($$[$0-2], $$[$0])};
    break;
    case 20:this.$ = new yy.MustacheNode($$[$0-1][0], $$[$0-1][1], $$[$0-2], stripFlags($$[$0-2], $$[$0]));
    break;
    case 21:this.$ = new yy.MustacheNode($$[$0-1][0], $$[$0-1][1], $$[$0-2], stripFlags($$[$0-2], $$[$0]));
    break;
    case 22:this.$ = new yy.PartialNode($$[$0-2], $$[$0-1], stripFlags($$[$0-3], $$[$0]));
    break;
    case 23:this.$ = stripFlags($$[$0-1], $$[$0]);
    break;
    case 24:this.$ = [[$$[$0-2]].concat($$[$0-1]), $$[$0]];
    break;
    case 25:this.$ = [[$$[$0]], null];
    break;
    case 26:this.$ = $$[$0];
    break;
    case 27:this.$ = new yy.StringNode($$[$0]);
    break;
    case 28:this.$ = new yy.IntegerNode($$[$0]);
    break;
    case 29:this.$ = new yy.BooleanNode($$[$0]);
    break;
    case 30:this.$ = $$[$0];
    break;
    case 31:this.$ = new yy.HashNode($$[$0]);
    break;
    case 32:this.$ = [$$[$0-2], $$[$0]];
    break;
    case 33:this.$ = new yy.PartialNameNode($$[$0]);
    break;
    case 34:this.$ = new yy.PartialNameNode(new yy.StringNode($$[$0]));
    break;
    case 35:this.$ = new yy.PartialNameNode(new yy.IntegerNode($$[$0]));
    break;
    case 36:this.$ = new yy.DataNode($$[$0]);
    break;
    case 37:this.$ = new yy.IdNode($$[$0]);
    break;
    case 38: $$[$0-2].push({part: $$[$0], separator: $$[$0-1]}); this.$ = $$[$0-2]; 
    break;
    case 39:this.$ = [{part: $$[$0]}];
    break;
    case 42:this.$ = [];
    break;
    case 43:$$[$0-1].push($$[$0]);
    break;
    case 46:this.$ = [$$[$0]];
    break;
    case 47:$$[$0-1].push($$[$0]);
    break;
    }
    },
    table: [{3:1,4:2,5:[1,3],8:4,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],22:[1,13],23:[1,14],25:[1,15]},{1:[3]},{5:[1,16],8:17,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],22:[1,13],23:[1,14],25:[1,15]},{1:[2,2]},{5:[2,9],14:[2,9],15:[2,9],16:[2,9],19:[2,9],20:[2,9],22:[2,9],23:[2,9],25:[2,9]},{4:20,6:18,7:19,8:4,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,21],20:[2,8],22:[1,13],23:[1,14],25:[1,15]},{4:20,6:22,7:19,8:4,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,21],20:[2,8],22:[1,13],23:[1,14],25:[1,15]},{5:[2,13],14:[2,13],15:[2,13],16:[2,13],19:[2,13],20:[2,13],22:[2,13],23:[2,13],25:[2,13]},{5:[2,14],14:[2,14],15:[2,14],16:[2,14],19:[2,14],20:[2,14],22:[2,14],23:[2,14],25:[2,14]},{5:[2,15],14:[2,15],15:[2,15],16:[2,15],19:[2,15],20:[2,15],22:[2,15],23:[2,15],25:[2,15]},{5:[2,16],14:[2,16],15:[2,16],16:[2,16],19:[2,16],20:[2,16],22:[2,16],23:[2,16],25:[2,16]},{17:23,21:24,30:25,38:[1,28],40:[1,27],41:26},{17:29,21:24,30:25,38:[1,28],40:[1,27],41:26},{17:30,21:24,30:25,38:[1,28],40:[1,27],41:26},{17:31,21:24,30:25,38:[1,28],40:[1,27],41:26},{21:33,26:32,32:[1,34],33:[1,35],38:[1,28],41:26},{1:[2,1]},{5:[2,10],14:[2,10],15:[2,10],16:[2,10],19:[2,10],20:[2,10],22:[2,10],23:[2,10],25:[2,10]},{10:36,20:[1,37]},{4:38,8:4,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],20:[2,7],22:[1,13],23:[1,14],25:[1,15]},{7:39,8:17,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,21],20:[2,6],22:[1,13],23:[1,14],25:[1,15]},{17:23,18:[1,40],21:24,30:25,38:[1,28],40:[1,27],41:26},{10:41,20:[1,37]},{18:[1,42]},{18:[2,42],24:[2,42],28:43,32:[2,42],33:[2,42],34:[2,42],38:[2,42],40:[2,42]},{18:[2,25],24:[2,25]},{18:[2,37],24:[2,37],32:[2,37],33:[2,37],34:[2,37],38:[2,37],40:[2,37],42:[1,44]},{21:45,38:[1,28],41:26},{18:[2,39],24:[2,39],32:[2,39],33:[2,39],34:[2,39],38:[2,39],40:[2,39],42:[2,39]},{18:[1,46]},{18:[1,47]},{24:[1,48]},{18:[2,40],21:50,27:49,38:[1,28],41:26},{18:[2,33],38:[2,33]},{18:[2,34],38:[2,34]},{18:[2,35],38:[2,35]},{5:[2,11],14:[2,11],15:[2,11],16:[2,11],19:[2,11],20:[2,11],22:[2,11],23:[2,11],25:[2,11]},{21:51,38:[1,28],41:26},{8:17,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],20:[2,3],22:[1,13],23:[1,14],25:[1,15]},{4:52,8:4,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],20:[2,5],22:[1,13],23:[1,14],25:[1,15]},{14:[2,23],15:[2,23],16:[2,23],19:[2,23],20:[2,23],22:[2,23],23:[2,23],25:[2,23]},{5:[2,12],14:[2,12],15:[2,12],16:[2,12],19:[2,12],20:[2,12],22:[2,12],23:[2,12],25:[2,12]},{14:[2,18],15:[2,18],16:[2,18],19:[2,18],20:[2,18],22:[2,18],23:[2,18],25:[2,18]},{18:[2,44],21:56,24:[2,44],29:53,30:60,31:54,32:[1,57],33:[1,58],34:[1,59],35:55,36:61,37:62,38:[1,63],40:[1,27],41:26},{38:[1,64]},{18:[2,36],24:[2,36],32:[2,36],33:[2,36],34:[2,36],38:[2,36],40:[2,36]},{14:[2,17],15:[2,17],16:[2,17],19:[2,17],20:[2,17],22:[2,17],23:[2,17],25:[2,17]},{5:[2,20],14:[2,20],15:[2,20],16:[2,20],19:[2,20],20:[2,20],22:[2,20],23:[2,20],25:[2,20]},{5:[2,21],14:[2,21],15:[2,21],16:[2,21],19:[2,21],20:[2,21],22:[2,21],23:[2,21],25:[2,21]},{18:[1,65]},{18:[2,41]},{18:[1,66]},{8:17,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],20:[2,4],22:[1,13],23:[1,14],25:[1,15]},{18:[2,24],24:[2,24]},{18:[2,43],24:[2,43],32:[2,43],33:[2,43],34:[2,43],38:[2,43],40:[2,43]},{18:[2,45],24:[2,45]},{18:[2,26],24:[2,26],32:[2,26],33:[2,26],34:[2,26],38:[2,26],40:[2,26]},{18:[2,27],24:[2,27],32:[2,27],33:[2,27],34:[2,27],38:[2,27],40:[2,27]},{18:[2,28],24:[2,28],32:[2,28],33:[2,28],34:[2,28],38:[2,28],40:[2,28]},{18:[2,29],24:[2,29],32:[2,29],33:[2,29],34:[2,29],38:[2,29],40:[2,29]},{18:[2,30],24:[2,30],32:[2,30],33:[2,30],34:[2,30],38:[2,30],40:[2,30]},{18:[2,31],24:[2,31],37:67,38:[1,68]},{18:[2,46],24:[2,46],38:[2,46]},{18:[2,39],24:[2,39],32:[2,39],33:[2,39],34:[2,39],38:[2,39],39:[1,69],40:[2,39],42:[2,39]},{18:[2,38],24:[2,38],32:[2,38],33:[2,38],34:[2,38],38:[2,38],40:[2,38],42:[2,38]},{5:[2,22],14:[2,22],15:[2,22],16:[2,22],19:[2,22],20:[2,22],22:[2,22],23:[2,22],25:[2,22]},{5:[2,19],14:[2,19],15:[2,19],16:[2,19],19:[2,19],20:[2,19],22:[2,19],23:[2,19],25:[2,19]},{18:[2,47],24:[2,47],38:[2,47]},{39:[1,69]},{21:56,30:60,31:70,32:[1,57],33:[1,58],34:[1,59],38:[1,28],40:[1,27],41:26},{18:[2,32],24:[2,32],38:[2,32]}],
    defaultActions: {3:[2,2],16:[2,1],50:[2,41]},
    parseError: function parseError(str, hash) {
        throw new Error(str);
    },
    parse: function parse(input) {
        var self = this, stack = [0], vstack = [null], lstack = [], table = this.table, yytext = "", yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
        this.lexer.setInput(input);
        this.lexer.yy = this.yy;
        this.yy.lexer = this.lexer;
        this.yy.parser = this;
        if (typeof this.lexer.yylloc == "undefined")
            this.lexer.yylloc = {};
        var yyloc = this.lexer.yylloc;
        lstack.push(yyloc);
        var ranges = this.lexer.options && this.lexer.options.ranges;
        if (typeof this.yy.parseError === "function")
            this.parseError = this.yy.parseError;
        function popStack(n) {
            stack.length = stack.length - 2 * n;
            vstack.length = vstack.length - n;
            lstack.length = lstack.length - n;
        }
        function lex() {
            var token;
            token = self.lexer.lex() || 1;
            if (typeof token !== "number") {
                token = self.symbols_[token] || token;
            }
            return token;
        }
        var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
        while (true) {
            state = stack[stack.length - 1];
            if (this.defaultActions[state]) {
                action = this.defaultActions[state];
            } else {
                if (symbol === null || typeof symbol == "undefined") {
                    symbol = lex();
                }
                action = table[state] && table[state][symbol];
            }
            if (typeof action === "undefined" || !action.length || !action[0]) {
                var errStr = "";
                if (!recovering) {
                    expected = [];
                    for (p in table[state])
                        if (this.terminals_[p] && p > 2) {
                            expected.push("'" + this.terminals_[p] + "'");
                        }
                    if (this.lexer.showPosition) {
                        errStr = "Parse error on line " + (yylineno + 1) + ":\n" + this.lexer.showPosition() + "\nExpecting " + expected.join(", ") + ", got '" + (this.terminals_[symbol] || symbol) + "'";
                    } else {
                        errStr = "Parse error on line " + (yylineno + 1) + ": Unexpected " + (symbol == 1?"end of input":"'" + (this.terminals_[symbol] || symbol) + "'");
                    }
                    this.parseError(errStr, {text: this.lexer.match, token: this.terminals_[symbol] || symbol, line: this.lexer.yylineno, loc: yyloc, expected: expected});
                }
            }
            if (action[0] instanceof Array && action.length > 1) {
                throw new Error("Parse Error: multiple actions possible at state: " + state + ", token: " + symbol);
            }
            switch (action[0]) {
            case 1:
                stack.push(symbol);
                vstack.push(this.lexer.yytext);
                lstack.push(this.lexer.yylloc);
                stack.push(action[1]);
                symbol = null;
                if (!preErrorSymbol) {
                    yyleng = this.lexer.yyleng;
                    yytext = this.lexer.yytext;
                    yylineno = this.lexer.yylineno;
                    yyloc = this.lexer.yylloc;
                    if (recovering > 0)
                        recovering--;
                } else {
                    symbol = preErrorSymbol;
                    preErrorSymbol = null;
                }
                break;
            case 2:
                len = this.productions_[action[1]][1];
                yyval.$ = vstack[vstack.length - len];
                yyval._$ = {first_line: lstack[lstack.length - (len || 1)].first_line, last_line: lstack[lstack.length - 1].last_line, first_column: lstack[lstack.length - (len || 1)].first_column, last_column: lstack[lstack.length - 1].last_column};
                if (ranges) {
                    yyval._$.range = [lstack[lstack.length - (len || 1)].range[0], lstack[lstack.length - 1].range[1]];
                }
                r = this.performAction.call(yyval, yytext, yyleng, yylineno, this.yy, action[1], vstack, lstack);
                if (typeof r !== "undefined") {
                    return r;
                }
                if (len) {
                    stack = stack.slice(0, -1 * len * 2);
                    vstack = vstack.slice(0, -1 * len);
                    lstack = lstack.slice(0, -1 * len);
                }
                stack.push(this.productions_[action[1]][0]);
                vstack.push(yyval.$);
                lstack.push(yyval._$);
                newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
                stack.push(newState);
                break;
            case 3:
                return true;
            }
        }
        return true;
    }
    };


    function stripFlags(open, close) {
      return {
        left: open[2] === '~',
        right: close[0] === '~' || close[1] === '~'
      };
    }

    /* Jison generated lexer */
    var lexer = (function(){
    var lexer = ({EOF:1,
    parseError:function parseError(str, hash) {
            if (this.yy.parser) {
                this.yy.parser.parseError(str, hash);
            } else {
                throw new Error(str);
            }
        },
    setInput:function (input) {
            this._input = input;
            this._more = this._less = this.done = false;
            this.yylineno = this.yyleng = 0;
            this.yytext = this.matched = this.match = '';
            this.conditionStack = ['INITIAL'];
            this.yylloc = {first_line:1,first_column:0,last_line:1,last_column:0};
            if (this.options.ranges) this.yylloc.range = [0,0];
            this.offset = 0;
            return this;
        },
    input:function () {
            var ch = this._input[0];
            this.yytext += ch;
            this.yyleng++;
            this.offset++;
            this.match += ch;
            this.matched += ch;
            var lines = ch.match(/(?:\r\n?|\n).*/g);
            if (lines) {
                this.yylineno++;
                this.yylloc.last_line++;
            } else {
                this.yylloc.last_column++;
            }
            if (this.options.ranges) this.yylloc.range[1]++;

            this._input = this._input.slice(1);
            return ch;
        },
    unput:function (ch) {
            var len = ch.length;
            var lines = ch.split(/(?:\r\n?|\n)/g);

            this._input = ch + this._input;
            this.yytext = this.yytext.substr(0, this.yytext.length-len-1);
            //this.yyleng -= len;
            this.offset -= len;
            var oldLines = this.match.split(/(?:\r\n?|\n)/g);
            this.match = this.match.substr(0, this.match.length-1);
            this.matched = this.matched.substr(0, this.matched.length-1);

            if (lines.length-1) this.yylineno -= lines.length-1;
            var r = this.yylloc.range;

            this.yylloc = {first_line: this.yylloc.first_line,
              last_line: this.yylineno+1,
              first_column: this.yylloc.first_column,
              last_column: lines ?
                  (lines.length === oldLines.length ? this.yylloc.first_column : 0) + oldLines[oldLines.length - lines.length].length - lines[0].length:
                  this.yylloc.first_column - len
              };

            if (this.options.ranges) {
                this.yylloc.range = [r[0], r[0] + this.yyleng - len];
            }
            return this;
        },
    more:function () {
            this._more = true;
            return this;
        },
    less:function (n) {
            this.unput(this.match.slice(n));
        },
    pastInput:function () {
            var past = this.matched.substr(0, this.matched.length - this.match.length);
            return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
        },
    upcomingInput:function () {
            var next = this.match;
            if (next.length < 20) {
                next += this._input.substr(0, 20-next.length);
            }
            return (next.substr(0,20)+(next.length > 20 ? '...':'')).replace(/\n/g, "");
        },
    showPosition:function () {
            var pre = this.pastInput();
            var c = new Array(pre.length + 1).join("-");
            return pre + this.upcomingInput() + "\n" + c+"^";
        },
    next:function () {
            if (this.done) {
                return this.EOF;
            }
            if (!this._input) this.done = true;

            var token,
                match,
                tempMatch,
                index,
                col,
                lines;
            if (!this._more) {
                this.yytext = '';
                this.match = '';
            }
            var rules = this._currentRules();
            for (var i=0;i < rules.length; i++) {
                tempMatch = this._input.match(this.rules[rules[i]]);
                if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                    match = tempMatch;
                    index = i;
                    if (!this.options.flex) break;
                }
            }
            if (match) {
                lines = match[0].match(/(?:\r\n?|\n).*/g);
                if (lines) this.yylineno += lines.length;
                this.yylloc = {first_line: this.yylloc.last_line,
                               last_line: this.yylineno+1,
                               first_column: this.yylloc.last_column,
                               last_column: lines ? lines[lines.length-1].length-lines[lines.length-1].match(/\r?\n?/)[0].length : this.yylloc.last_column + match[0].length};
                this.yytext += match[0];
                this.match += match[0];
                this.matches = match;
                this.yyleng = this.yytext.length;
                if (this.options.ranges) {
                    this.yylloc.range = [this.offset, this.offset += this.yyleng];
                }
                this._more = false;
                this._input = this._input.slice(match[0].length);
                this.matched += match[0];
                token = this.performAction.call(this, this.yy, this, rules[index],this.conditionStack[this.conditionStack.length-1]);
                if (this.done && this._input) this.done = false;
                if (token) return token;
                else return;
            }
            if (this._input === "") {
                return this.EOF;
            } else {
                return this.parseError('Lexical error on line '+(this.yylineno+1)+'. Unrecognized text.\n'+this.showPosition(),
                        {text: "", token: null, line: this.yylineno});
            }
        },
    lex:function lex() {
            var r = this.next();
            if (typeof r !== 'undefined') {
                return r;
            } else {
                return this.lex();
            }
        },
    begin:function begin(condition) {
            this.conditionStack.push(condition);
        },
    popState:function popState() {
            return this.conditionStack.pop();
        },
    _currentRules:function _currentRules() {
            return this.conditions[this.conditionStack[this.conditionStack.length-1]].rules;
        },
    topState:function () {
            return this.conditionStack[this.conditionStack.length-2];
        },
    pushState:function begin(condition) {
            this.begin(condition);
        }});
    lexer.options = {};
    lexer.performAction = function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {


    function strip(start, end) {
      return yy_.yytext = yy_.yytext.substr(start, yy_.yyleng-end);
    }


    var YYSTATE=YY_START
    switch($avoiding_name_collisions) {
    case 0:
                                       if(yy_.yytext.slice(-2) === "\\\\") {
                                         strip(0,1);
                                         this.begin("mu");
                                       } else if(yy_.yytext.slice(-1) === "\\") {
                                         strip(0,1);
                                         this.begin("emu");
                                       } else {
                                         this.begin("mu");
                                       }
                                       if(yy_.yytext) return 14;
                                     
    break;
    case 1:return 14;
    break;
    case 2:
                                       if(yy_.yytext.slice(-1) !== "\\") this.popState();
                                       if(yy_.yytext.slice(-1) === "\\") strip(0,1);
                                       return 14;
                                     
    break;
    case 3:strip(0,4); this.popState(); return 15;
    break;
    case 4:return 25;
    break;
    case 5:return 16;
    break;
    case 6:return 20;
    break;
    case 7:return 19;
    break;
    case 8:return 19;
    break;
    case 9:return 23;
    break;
    case 10:return 22;
    break;
    case 11:this.popState(); this.begin('com');
    break;
    case 12:strip(3,5); this.popState(); return 15;
    break;
    case 13:return 22;
    break;
    case 14:return 39;
    break;
    case 15:return 38;
    break;
    case 16:return 38;
    break;
    case 17:return 42;
    break;
    case 18:/*ignore whitespace*/
    break;
    case 19:this.popState(); return 24;
    break;
    case 20:this.popState(); return 18;
    break;
    case 21:yy_.yytext = strip(1,2).replace(/\\"/g,'"'); return 32;
    break;
    case 22:yy_.yytext = strip(1,2).replace(/\\'/g,"'"); return 32;
    break;
    case 23:return 40;
    break;
    case 24:return 34;
    break;
    case 25:return 34;
    break;
    case 26:return 33;
    break;
    case 27:return 38;
    break;
    case 28:yy_.yytext = strip(1,2); return 38;
    break;
    case 29:return 'INVALID';
    break;
    case 30:return 5;
    break;
    }
    };
    lexer.rules = [/^(?:[^\x00]*?(?=(\{\{)))/,/^(?:[^\x00]+)/,/^(?:[^\x00]{2,}?(?=(\{\{|$)))/,/^(?:[\s\S]*?--\}\})/,/^(?:\{\{(~)?>)/,/^(?:\{\{(~)?#)/,/^(?:\{\{(~)?\/)/,/^(?:\{\{(~)?\^)/,/^(?:\{\{(~)?\s*else\b)/,/^(?:\{\{(~)?\{)/,/^(?:\{\{(~)?&)/,/^(?:\{\{!--)/,/^(?:\{\{![\s\S]*?\}\})/,/^(?:\{\{(~)?)/,/^(?:=)/,/^(?:\.\.)/,/^(?:\.(?=([=~}\s\/.])))/,/^(?:[\/.])/,/^(?:\s+)/,/^(?:\}(~)?\}\})/,/^(?:(~)?\}\})/,/^(?:"(\\["]|[^"])*")/,/^(?:'(\\[']|[^'])*')/,/^(?:@)/,/^(?:true(?=([~}\s])))/,/^(?:false(?=([~}\s])))/,/^(?:-?[0-9]+(?=([~}\s])))/,/^(?:([^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=([=~}\s\/.]))))/,/^(?:\[[^\]]*\])/,/^(?:.)/,/^(?:$)/];
    lexer.conditions = {"mu":{"rules":[4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30],"inclusive":false},"emu":{"rules":[2],"inclusive":false},"com":{"rules":[3],"inclusive":false},"INITIAL":{"rules":[0,1,30],"inclusive":true}};
    return lexer;})()
    parser.lexer = lexer;
    function Parser () { this.yy = {}; }Parser.prototype = parser;parser.Parser = Parser;
    return new Parser;
    })();__exports__["default"] = handlebars;
  });
define(
  'handlebars/compiler/base',["./parser","./ast","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    
    var parser = __dependency1__["default"];
    var AST = __dependency2__;

    __exports__.parser = parser;

    function parse(input) {
      // Just return if an already-compile AST was passed in.
      if(input.constructor === AST.ProgramNode) { return input; }

      parser.yy = AST;
      return parser.parse(input);
    }

    __exports__.parse = parse;
  });
define(
  'handlebars/compiler/javascript-compiler',["../base","exports"],
  function(__dependency1__, __exports__) {
    
    var COMPILER_REVISION = __dependency1__.COMPILER_REVISION;
    var REVISION_CHANGES = __dependency1__.REVISION_CHANGES;
    var log = __dependency1__.log;

    function Literal(value) {
      this.value = value;
    }

    function JavaScriptCompiler() {}

    JavaScriptCompiler.prototype = {
      // PUBLIC API: You can override these methods in a subclass to provide
      // alternative compiled forms for name lookup and buffering semantics
      nameLookup: function(parent, name /* , type*/) {
        var wrap,
            ret;
        if (parent.indexOf('depth') === 0) {
          wrap = true;
        }

        if (/^[0-9]+$/.test(name)) {
          ret = parent + "[" + name + "]";
        } else if (JavaScriptCompiler.isValidJavaScriptVariableName(name)) {
          ret = parent + "." + name;
        }
        else {
          ret = parent + "['" + name + "']";
        }

        if (wrap) {
          return '(' + parent + ' && ' + ret + ')';
        } else {
          return ret;
        }
      },

      appendToBuffer: function(string) {
        if (this.environment.isSimple) {
          return "return " + string + ";";
        } else {
          return {
            appendToBuffer: true,
            content: string,
            toString: function() { return "buffer += " + string + ";"; }
          };
        }
      },

      initializeBuffer: function() {
        return this.quotedString("");
      },

      namespace: "Handlebars",
      // END PUBLIC API

      compile: function(environment, options, context, asObject) {
        this.environment = environment;
        this.options = options || {};

        log('debug', this.environment.disassemble() + "\n\n");

        this.name = this.environment.name;
        this.isChild = !!context;
        this.context = context || {
          programs: [],
          environments: [],
          aliases: { }
        };

        this.preamble();

        this.stackSlot = 0;
        this.stackVars = [];
        this.registers = { list: [] };
        this.compileStack = [];
        this.inlineStack = [];

        this.compileChildren(environment, options);

        var opcodes = environment.opcodes, opcode;

        this.i = 0;

        for(var l=opcodes.length; this.i<l; this.i++) {
          opcode = opcodes[this.i];

          if(opcode.opcode === 'DECLARE') {
            this[opcode.name] = opcode.value;
          } else {
            this[opcode.opcode].apply(this, opcode.args);
          }

          // Reset the stripNext flag if it was not set by this operation.
          if (opcode.opcode !== this.stripNext) {
            this.stripNext = false;
          }
        }

        // Flush any trailing content that might be pending.
        this.pushSource('');

        return this.createFunctionContext(asObject);
      },

      preamble: function() {
        var out = [];

        if (!this.isChild) {
          var namespace = this.namespace;

          var copies = "helpers = this.merge(helpers, " + namespace + ".helpers);";
          if (this.environment.usePartial) { copies = copies + " partials = this.merge(partials, " + namespace + ".partials);"; }
          if (this.options.data) { copies = copies + " data = data || {};"; }
          out.push(copies);
        } else {
          out.push('');
        }

        if (!this.environment.isSimple) {
          out.push(", buffer = " + this.initializeBuffer());
        } else {
          out.push("");
        }

        // track the last context pushed into place to allow skipping the
        // getContext opcode when it would be a noop
        this.lastContext = 0;
        this.source = out;
      },

      createFunctionContext: function(asObject) {
        var locals = this.stackVars.concat(this.registers.list);

        if(locals.length > 0) {
          this.source[1] = this.source[1] + ", " + locals.join(", ");
        }

        // Generate minimizer alias mappings
        if (!this.isChild) {
          for (var alias in this.context.aliases) {
            if (this.context.aliases.hasOwnProperty(alias)) {
              this.source[1] = this.source[1] + ', ' + alias + '=' + this.context.aliases[alias];
            }
          }
        }

        if (this.source[1]) {
          this.source[1] = "var " + this.source[1].substring(2) + ";";
        }

        // Merge children
        if (!this.isChild) {
          this.source[1] += '\n' + this.context.programs.join('\n') + '\n';
        }

        if (!this.environment.isSimple) {
          this.pushSource("return buffer;");
        }

        var params = this.isChild ? ["depth0", "data"] : ["Handlebars", "depth0", "helpers", "partials", "data"];

        for(var i=0, l=this.environment.depths.list.length; i<l; i++) {
          params.push("depth" + this.environment.depths.list[i]);
        }

        // Perform a second pass over the output to merge content when possible
        var source = this.mergeSource();

        if (!this.isChild) {
          var revision = COMPILER_REVISION,
              versions = REVISION_CHANGES[revision];
          source = "this.compilerInfo = ["+revision+",'"+versions+"'];\n"+source;
        }

        if (asObject) {
          params.push(source);

          return Function.apply(this, params);
        } else {
          var functionSource = 'function ' + (this.name || '') + '(' + params.join(',') + ') {\n  ' + source + '}';
          log('debug', functionSource + "\n\n");
          return functionSource;
        }
      },
      mergeSource: function() {
        // WARN: We are not handling the case where buffer is still populated as the source should
        // not have buffer append operations as their final action.
        var source = '',
            buffer;
        for (var i = 0, len = this.source.length; i < len; i++) {
          var line = this.source[i];
          if (line.appendToBuffer) {
            if (buffer) {
              buffer = buffer + '\n    + ' + line.content;
            } else {
              buffer = line.content;
            }
          } else {
            if (buffer) {
              source += 'buffer += ' + buffer + ';\n  ';
              buffer = undefined;
            }
            source += line + '\n  ';
          }
        }
        return source;
      },

      // [blockValue]
      //
      // On stack, before: hash, inverse, program, value
      // On stack, after: return value of blockHelperMissing
      //
      // The purpose of this opcode is to take a block of the form
      // `{{#foo}}...{{/foo}}`, resolve the value of `foo`, and
      // replace it on the stack with the result of properly
      // invoking blockHelperMissing.
      blockValue: function() {
        this.context.aliases.blockHelperMissing = 'helpers.blockHelperMissing';

        var params = ["depth0"];
        this.setupParams(0, params);

        this.replaceStack(function(current) {
          params.splice(1, 0, current);
          return "blockHelperMissing.call(" + params.join(", ") + ")";
        });
      },

      // [ambiguousBlockValue]
      //
      // On stack, before: hash, inverse, program, value
      // Compiler value, before: lastHelper=value of last found helper, if any
      // On stack, after, if no lastHelper: same as [blockValue]
      // On stack, after, if lastHelper: value
      ambiguousBlockValue: function() {
        this.context.aliases.blockHelperMissing = 'helpers.blockHelperMissing';

        var params = ["depth0"];
        this.setupParams(0, params);

        var current = this.topStack();
        params.splice(1, 0, current);

        // Use the options value generated from the invocation
        params[params.length-1] = 'options';

        this.pushSource("if (!" + this.lastHelper + ") { " + current + " = blockHelperMissing.call(" + params.join(", ") + "); }");
      },

      // [appendContent]
      //
      // On stack, before: ...
      // On stack, after: ...
      //
      // Appends the string value of `content` to the current buffer
      appendContent: function(content) {
        if (this.pendingContent) {
          content = this.pendingContent + content;
        }
        if (this.stripNext) {
          content = content.replace(/^\s+/, '');
        }

        this.pendingContent = content;
      },

      // [strip]
      //
      // On stack, before: ...
      // On stack, after: ...
      //
      // Removes any trailing whitespace from the prior content node and flags
      // the next operation for stripping if it is a content node.
      strip: function() {
        if (this.pendingContent) {
          this.pendingContent = this.pendingContent.replace(/\s+$/, '');
        }
        this.stripNext = 'strip';
      },

      // [append]
      //
      // On stack, before: value, ...
      // On stack, after: ...
      //
      // Coerces `value` to a String and appends it to the current buffer.
      //
      // If `value` is truthy, or 0, it is coerced into a string and appended
      // Otherwise, the empty string is appended
      append: function() {
        // Force anything that is inlined onto the stack so we don't have duplication
        // when we examine local
        this.flushInline();
        var local = this.popStack();
        this.pushSource("if(" + local + " || " + local + " === 0) { " + this.appendToBuffer(local) + " }");
        if (this.environment.isSimple) {
          this.pushSource("else { " + this.appendToBuffer("''") + " }");
        }
      },

      // [appendEscaped]
      //
      // On stack, before: value, ...
      // On stack, after: ...
      //
      // Escape `value` and append it to the buffer
      appendEscaped: function() {
        this.context.aliases.escapeExpression = 'this.escapeExpression';

        this.pushSource(this.appendToBuffer("escapeExpression(" + this.popStack() + ")"));
      },

      // [getContext]
      //
      // On stack, before: ...
      // On stack, after: ...
      // Compiler value, after: lastContext=depth
      //
      // Set the value of the `lastContext` compiler value to the depth
      getContext: function(depth) {
        if(this.lastContext !== depth) {
          this.lastContext = depth;
        }
      },

      // [lookupOnContext]
      //
      // On stack, before: ...
      // On stack, after: currentContext[name], ...
      //
      // Looks up the value of `name` on the current context and pushes
      // it onto the stack.
      lookupOnContext: function(name) {
        this.push(this.nameLookup('depth' + this.lastContext, name, 'context'));
      },

      // [pushContext]
      //
      // On stack, before: ...
      // On stack, after: currentContext, ...
      //
      // Pushes the value of the current context onto the stack.
      pushContext: function() {
        this.pushStackLiteral('depth' + this.lastContext);
      },

      // [resolvePossibleLambda]
      //
      // On stack, before: value, ...
      // On stack, after: resolved value, ...
      //
      // If the `value` is a lambda, replace it on the stack by
      // the return value of the lambda
      resolvePossibleLambda: function() {
        this.context.aliases.functionType = '"function"';

        this.replaceStack(function(current) {
          return "typeof " + current + " === functionType ? " + current + ".apply(depth0) : " + current;
        });
      },

      // [lookup]
      //
      // On stack, before: value, ...
      // On stack, after: value[name], ...
      //
      // Replace the value on the stack with the result of looking
      // up `name` on `value`
      lookup: function(name) {
        this.replaceStack(function(current) {
          return current + " == null || " + current + " === false ? " + current + " : " + this.nameLookup(current, name, 'context');
        });
      },

      // [lookupData]
      //
      // On stack, before: ...
      // On stack, after: data, ...
      //
      // Push the data lookup operator
      lookupData: function() {
        this.push('data');
      },

      // [pushStringParam]
      //
      // On stack, before: ...
      // On stack, after: string, currentContext, ...
      //
      // This opcode is designed for use in string mode, which
      // provides the string value of a parameter along with its
      // depth rather than resolving it immediately.
      pushStringParam: function(string, type) {
        this.pushStackLiteral('depth' + this.lastContext);

        this.pushString(type);

        if (typeof string === 'string') {
          this.pushString(string);
        } else {
          this.pushStackLiteral(string);
        }
      },

      emptyHash: function() {
        this.pushStackLiteral('{}');

        if (this.options.stringParams) {
          this.register('hashTypes', '{}');
          this.register('hashContexts', '{}');
        }
      },
      pushHash: function() {
        this.hash = {values: [], types: [], contexts: []};
      },
      popHash: function() {
        var hash = this.hash;
        this.hash = undefined;

        if (this.options.stringParams) {
          this.register('hashContexts', '{' + hash.contexts.join(',') + '}');
          this.register('hashTypes', '{' + hash.types.join(',') + '}');
        }
        this.push('{\n    ' + hash.values.join(',\n    ') + '\n  }');
      },

      // [pushString]
      //
      // On stack, before: ...
      // On stack, after: quotedString(string), ...
      //
      // Push a quoted version of `string` onto the stack
      pushString: function(string) {
        this.pushStackLiteral(this.quotedString(string));
      },

      // [push]
      //
      // On stack, before: ...
      // On stack, after: expr, ...
      //
      // Push an expression onto the stack
      push: function(expr) {
        this.inlineStack.push(expr);
        return expr;
      },

      // [pushLiteral]
      //
      // On stack, before: ...
      // On stack, after: value, ...
      //
      // Pushes a value onto the stack. This operation prevents
      // the compiler from creating a temporary variable to hold
      // it.
      pushLiteral: function(value) {
        this.pushStackLiteral(value);
      },

      // [pushProgram]
      //
      // On stack, before: ...
      // On stack, after: program(guid), ...
      //
      // Push a program expression onto the stack. This takes
      // a compile-time guid and converts it into a runtime-accessible
      // expression.
      pushProgram: function(guid) {
        if (guid != null) {
          this.pushStackLiteral(this.programExpression(guid));
        } else {
          this.pushStackLiteral(null);
        }
      },

      // [invokeHelper]
      //
      // On stack, before: hash, inverse, program, params..., ...
      // On stack, after: result of helper invocation
      //
      // Pops off the helper's parameters, invokes the helper,
      // and pushes the helper's return value onto the stack.
      //
      // If the helper is not found, `helperMissing` is called.
      invokeHelper: function(paramSize, name) {
        this.context.aliases.helperMissing = 'helpers.helperMissing';

        var helper = this.lastHelper = this.setupHelper(paramSize, name, true);
        var nonHelper = this.nameLookup('depth' + this.lastContext, name, 'context');

        this.push(helper.name + ' || ' + nonHelper);
        this.replaceStack(function(name) {
          return name + ' ? ' + name + '.call(' +
              helper.callParams + ") " + ": helperMissing.call(" +
              helper.helperMissingParams + ")";
        });
      },

      // [invokeKnownHelper]
      //
      // On stack, before: hash, inverse, program, params..., ...
      // On stack, after: result of helper invocation
      //
      // This operation is used when the helper is known to exist,
      // so a `helperMissing` fallback is not required.
      invokeKnownHelper: function(paramSize, name) {
        var helper = this.setupHelper(paramSize, name);
        this.push(helper.name + ".call(" + helper.callParams + ")");
      },

      // [invokeAmbiguous]
      //
      // On stack, before: hash, inverse, program, params..., ...
      // On stack, after: result of disambiguation
      //
      // This operation is used when an expression like `{{foo}}`
      // is provided, but we don't know at compile-time whether it
      // is a helper or a path.
      //
      // This operation emits more code than the other options,
      // and can be avoided by passing the `knownHelpers` and
      // `knownHelpersOnly` flags at compile-time.
      invokeAmbiguous: function(name, helperCall) {
        this.context.aliases.functionType = '"function"';

        this.pushStackLiteral('{}');    // Hash value
        var helper = this.setupHelper(0, name, helperCall);

        var helperName = this.lastHelper = this.nameLookup('helpers', name, 'helper');

        var nonHelper = this.nameLookup('depth' + this.lastContext, name, 'context');
        var nextStack = this.nextStack();

        this.pushSource('if (' + nextStack + ' = ' + helperName + ') { ' + nextStack + ' = ' + nextStack + '.call(' + helper.callParams + '); }');
        this.pushSource('else { ' + nextStack + ' = ' + nonHelper + '; ' + nextStack + ' = typeof ' + nextStack + ' === functionType ? ' + nextStack + '.call(' + helper.callParams + ') : ' + nextStack + '; }');
      },

      // [invokePartial]
      //
      // On stack, before: context, ...
      // On stack after: result of partial invocation
      //
      // This operation pops off a context, invokes a partial with that context,
      // and pushes the result of the invocation back.
      invokePartial: function(name) {
        var params = [this.nameLookup('partials', name, 'partial'), "'" + name + "'", this.popStack(), "helpers", "partials"];

        if (this.options.data) {
          params.push("data");
        }

        this.context.aliases.self = "this";
        this.push("self.invokePartial(" + params.join(", ") + ")");
      },

      // [assignToHash]
      //
      // On stack, before: value, hash, ...
      // On stack, after: hash, ...
      //
      // Pops a value and hash off the stack, assigns `hash[key] = value`
      // and pushes the hash back onto the stack.
      assignToHash: function(key) {
        var value = this.popStack(),
            context,
            type;

        if (this.options.stringParams) {
          type = this.popStack();
          context = this.popStack();
        }

        var hash = this.hash;
        if (context) {
          hash.contexts.push("'" + key + "': " + context);
        }
        if (type) {
          hash.types.push("'" + key + "': " + type);
        }
        hash.values.push("'" + key + "': (" + value + ")");
      },

      // HELPERS

      compiler: JavaScriptCompiler,

      compileChildren: function(environment, options) {
        var children = environment.children, child, compiler;

        for(var i=0, l=children.length; i<l; i++) {
          child = children[i];
          compiler = new this.compiler();

          var index = this.matchExistingProgram(child);

          if (index == null) {
            this.context.programs.push('');     // Placeholder to prevent name conflicts for nested children
            index = this.context.programs.length;
            child.index = index;
            child.name = 'program' + index;
            this.context.programs[index] = compiler.compile(child, options, this.context);
            this.context.environments[index] = child;
          } else {
            child.index = index;
            child.name = 'program' + index;
          }
        }
      },
      matchExistingProgram: function(child) {
        for (var i = 0, len = this.context.environments.length; i < len; i++) {
          var environment = this.context.environments[i];
          if (environment && environment.equals(child)) {
            return i;
          }
        }
      },

      programExpression: function(guid) {
        this.context.aliases.self = "this";

        if(guid == null) {
          return "self.noop";
        }

        var child = this.environment.children[guid],
            depths = child.depths.list, depth;

        var programParams = [child.index, child.name, "data"];

        for(var i=0, l = depths.length; i<l; i++) {
          depth = depths[i];

          if(depth === 1) { programParams.push("depth0"); }
          else { programParams.push("depth" + (depth - 1)); }
        }

        return (depths.length === 0 ? "self.program(" : "self.programWithDepth(") + programParams.join(", ") + ")";
      },

      register: function(name, val) {
        this.useRegister(name);
        this.pushSource(name + " = " + val + ";");
      },

      useRegister: function(name) {
        if(!this.registers[name]) {
          this.registers[name] = true;
          this.registers.list.push(name);
        }
      },

      pushStackLiteral: function(item) {
        return this.push(new Literal(item));
      },

      pushSource: function(source) {
        if (this.pendingContent) {
          this.source.push(this.appendToBuffer(this.quotedString(this.pendingContent)));
          this.pendingContent = undefined;
        }

        if (source) {
          this.source.push(source);
        }
      },

      pushStack: function(item) {
        this.flushInline();

        var stack = this.incrStack();
        if (item) {
          this.pushSource(stack + " = " + item + ";");
        }
        this.compileStack.push(stack);
        return stack;
      },

      replaceStack: function(callback) {
        var prefix = '',
            inline = this.isInline(),
            stack;

        // If we are currently inline then we want to merge the inline statement into the
        // replacement statement via ','
        if (inline) {
          var top = this.popStack(true);

          if (top instanceof Literal) {
            // Literals do not need to be inlined
            stack = top.value;
          } else {
            // Get or create the current stack name for use by the inline
            var name = this.stackSlot ? this.topStackName() : this.incrStack();

            prefix = '(' + this.push(name) + ' = ' + top + '),';
            stack = this.topStack();
          }
        } else {
          stack = this.topStack();
        }

        var item = callback.call(this, stack);

        if (inline) {
          if (this.inlineStack.length || this.compileStack.length) {
            this.popStack();
          }
          this.push('(' + prefix + item + ')');
        } else {
          // Prevent modification of the context depth variable. Through replaceStack
          if (!/^stack/.test(stack)) {
            stack = this.nextStack();
          }

          this.pushSource(stack + " = (" + prefix + item + ");");
        }
        return stack;
      },

      nextStack: function() {
        return this.pushStack();
      },

      incrStack: function() {
        this.stackSlot++;
        if(this.stackSlot > this.stackVars.length) { this.stackVars.push("stack" + this.stackSlot); }
        return this.topStackName();
      },
      topStackName: function() {
        return "stack" + this.stackSlot;
      },
      flushInline: function() {
        var inlineStack = this.inlineStack;
        if (inlineStack.length) {
          this.inlineStack = [];
          for (var i = 0, len = inlineStack.length; i < len; i++) {
            var entry = inlineStack[i];
            if (entry instanceof Literal) {
              this.compileStack.push(entry);
            } else {
              this.pushStack(entry);
            }
          }
        }
      },
      isInline: function() {
        return this.inlineStack.length;
      },

      popStack: function(wrapped) {
        var inline = this.isInline(),
            item = (inline ? this.inlineStack : this.compileStack).pop();

        if (!wrapped && (item instanceof Literal)) {
          return item.value;
        } else {
          if (!inline) {
            this.stackSlot--;
          }
          return item;
        }
      },

      topStack: function(wrapped) {
        var stack = (this.isInline() ? this.inlineStack : this.compileStack),
            item = stack[stack.length - 1];

        if (!wrapped && (item instanceof Literal)) {
          return item.value;
        } else {
          return item;
        }
      },

      quotedString: function(str) {
        return '"' + str
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\u2028/g, '\\u2028')   // Per Ecma-262 7.3 + 7.8.4
          .replace(/\u2029/g, '\\u2029') + '"';
      },

      setupHelper: function(paramSize, name, missingParams) {
        var params = [];
        this.setupParams(paramSize, params, missingParams);
        var foundHelper = this.nameLookup('helpers', name, 'helper');

        return {
          params: params,
          name: foundHelper,
          callParams: ["depth0"].concat(params).join(", "),
          helperMissingParams: missingParams && ["depth0", this.quotedString(name)].concat(params).join(", ")
        };
      },

      // the params and contexts arguments are passed in arrays
      // to fill in
      setupParams: function(paramSize, params, useRegister) {
        var options = [], contexts = [], types = [], param, inverse, program;

        options.push("hash:" + this.popStack());

        inverse = this.popStack();
        program = this.popStack();

        // Avoid setting fn and inverse if neither are set. This allows
        // helpers to do a check for `if (options.fn)`
        if (program || inverse) {
          if (!program) {
            this.context.aliases.self = "this";
            program = "self.noop";
          }

          if (!inverse) {
           this.context.aliases.self = "this";
            inverse = "self.noop";
          }

          options.push("inverse:" + inverse);
          options.push("fn:" + program);
        }

        for(var i=0; i<paramSize; i++) {
          param = this.popStack();
          params.push(param);

          if(this.options.stringParams) {
            types.push(this.popStack());
            contexts.push(this.popStack());
          }
        }

        if (this.options.stringParams) {
          options.push("contexts:[" + contexts.join(",") + "]");
          options.push("types:[" + types.join(",") + "]");
          options.push("hashContexts:hashContexts");
          options.push("hashTypes:hashTypes");
        }

        if(this.options.data) {
          options.push("data:data");
        }

        options = "{" + options.join(",") + "}";
        if (useRegister) {
          this.register('options', options);
          params.push('options');
        } else {
          params.push(options);
        }
        return params.join(", ");
      }
    };

    var reservedWords = (
      "break else new var" +
      " case finally return void" +
      " catch for switch while" +
      " continue function this with" +
      " default if throw" +
      " delete in try" +
      " do instanceof typeof" +
      " abstract enum int short" +
      " boolean export interface static" +
      " byte extends long super" +
      " char final native synchronized" +
      " class float package throws" +
      " const goto private transient" +
      " debugger implements protected volatile" +
      " double import public let yield"
    ).split(" ");

    var compilerWords = JavaScriptCompiler.RESERVED_WORDS = {};

    for(var i=0, l=reservedWords.length; i<l; i++) {
      compilerWords[reservedWords[i]] = true;
    }

    JavaScriptCompiler.isValidJavaScriptVariableName = function(name) {
      if(!JavaScriptCompiler.RESERVED_WORDS[name] && /^[a-zA-Z_$][0-9a-zA-Z_$]+$/.test(name)) {
        return true;
      }
      return false;
    };

    __exports__["default"] = JavaScriptCompiler;
  });
define(
  'handlebars/compiler/compiler',["../exception","./base","./javascript-compiler","./ast","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    
    var Exception = __dependency1__["default"];
    var parse = __dependency2__.parse;
    var JavaScriptCompiler = __dependency3__["default"];
    var AST = __dependency4__;

    function Compiler() {}

    __exports__.Compiler = Compiler;// the foundHelper register will disambiguate helper lookup from finding a
    // function in a context. This is necessary for mustache compatibility, which
    // requires that context functions in blocks are evaluated by blockHelperMissing,
    // and then proceed as if the resulting value was provided to blockHelperMissing.

    Compiler.prototype = {
      compiler: Compiler,

      disassemble: function() {
        var opcodes = this.opcodes, opcode, out = [], params, param;

        for (var i=0, l=opcodes.length; i<l; i++) {
          opcode = opcodes[i];

          if (opcode.opcode === 'DECLARE') {
            out.push("DECLARE " + opcode.name + "=" + opcode.value);
          } else {
            params = [];
            for (var j=0; j<opcode.args.length; j++) {
              param = opcode.args[j];
              if (typeof param === "string") {
                param = "\"" + param.replace("\n", "\\n") + "\"";
              }
              params.push(param);
            }
            out.push(opcode.opcode + " " + params.join(" "));
          }
        }

        return out.join("\n");
      },

      equals: function(other) {
        var len = this.opcodes.length;
        if (other.opcodes.length !== len) {
          return false;
        }

        for (var i = 0; i < len; i++) {
          var opcode = this.opcodes[i],
              otherOpcode = other.opcodes[i];
          if (opcode.opcode !== otherOpcode.opcode || opcode.args.length !== otherOpcode.args.length) {
            return false;
          }
          for (var j = 0; j < opcode.args.length; j++) {
            if (opcode.args[j] !== otherOpcode.args[j]) {
              return false;
            }
          }
        }

        len = this.children.length;
        if (other.children.length !== len) {
          return false;
        }
        for (i = 0; i < len; i++) {
          if (!this.children[i].equals(other.children[i])) {
            return false;
          }
        }

        return true;
      },

      guid: 0,

      compile: function(program, options) {
        this.opcodes = [];
        this.children = [];
        this.depths = {list: []};
        this.options = options;

        // These changes will propagate to the other compiler components
        var knownHelpers = this.options.knownHelpers;
        this.options.knownHelpers = {
          'helperMissing': true,
          'blockHelperMissing': true,
          'each': true,
          'if': true,
          'unless': true,
          'with': true,
          'log': true
        };
        if (knownHelpers) {
          for (var name in knownHelpers) {
            this.options.knownHelpers[name] = knownHelpers[name];
          }
        }

        return this.accept(program);
      },

      accept: function(node) {
        var strip = node.strip || {},
            ret;
        if (strip.left) {
          this.opcode('strip');
        }

        ret = this[node.type](node);

        if (strip.right) {
          this.opcode('strip');
        }

        return ret;
      },

      program: function(program) {
        var statements = program.statements;

        for(var i=0, l=statements.length; i<l; i++) {
          this.accept(statements[i]);
        }
        this.isSimple = l === 1;

        this.depths.list = this.depths.list.sort(function(a, b) {
          return a - b;
        });

        return this;
      },

      compileProgram: function(program) {
        var result = new this.compiler().compile(program, this.options);
        var guid = this.guid++, depth;

        this.usePartial = this.usePartial || result.usePartial;

        this.children[guid] = result;

        for(var i=0, l=result.depths.list.length; i<l; i++) {
          depth = result.depths.list[i];

          if(depth < 2) { continue; }
          else { this.addDepth(depth - 1); }
        }

        return guid;
      },

      block: function(block) {
        var mustache = block.mustache,
            program = block.program,
            inverse = block.inverse;

        if (program) {
          program = this.compileProgram(program);
        }

        if (inverse) {
          inverse = this.compileProgram(inverse);
        }

        var type = this.classifyMustache(mustache);

        if (type === "helper") {
          this.helperMustache(mustache, program, inverse);
        } else if (type === "simple") {
          this.simpleMustache(mustache);

          // now that the simple mustache is resolved, we need to
          // evaluate it by executing `blockHelperMissing`
          this.opcode('pushProgram', program);
          this.opcode('pushProgram', inverse);
          this.opcode('emptyHash');
          this.opcode('blockValue');
        } else {
          this.ambiguousMustache(mustache, program, inverse);

          // now that the simple mustache is resolved, we need to
          // evaluate it by executing `blockHelperMissing`
          this.opcode('pushProgram', program);
          this.opcode('pushProgram', inverse);
          this.opcode('emptyHash');
          this.opcode('ambiguousBlockValue');
        }

        this.opcode('append');
      },

      hash: function(hash) {
        var pairs = hash.pairs, pair, val;

        this.opcode('pushHash');

        for(var i=0, l=pairs.length; i<l; i++) {
          pair = pairs[i];
          val  = pair[1];

          if (this.options.stringParams) {
            if(val.depth) {
              this.addDepth(val.depth);
            }
            this.opcode('getContext', val.depth || 0);
            this.opcode('pushStringParam', val.stringModeValue, val.type);
          } else {
            this.accept(val);
          }

          this.opcode('assignToHash', pair[0]);
        }
        this.opcode('popHash');
      },

      partial: function(partial) {
        var partialName = partial.partialName;
        this.usePartial = true;

        if(partial.context) {
          this.ID(partial.context);
        } else {
          this.opcode('push', 'depth0');
        }

        this.opcode('invokePartial', partialName.name);
        this.opcode('append');
      },

      content: function(content) {
        this.opcode('appendContent', content.string);
      },

      mustache: function(mustache) {
        var options = this.options;
        var type = this.classifyMustache(mustache);

        if (type === "simple") {
          this.simpleMustache(mustache);
        } else if (type === "helper") {
          this.helperMustache(mustache);
        } else {
          this.ambiguousMustache(mustache);
        }

        if(mustache.escaped && !options.noEscape) {
          this.opcode('appendEscaped');
        } else {
          this.opcode('append');
        }
      },

      ambiguousMustache: function(mustache, program, inverse) {
        var id = mustache.id,
            name = id.parts[0],
            isBlock = program != null || inverse != null;

        this.opcode('getContext', id.depth);

        this.opcode('pushProgram', program);
        this.opcode('pushProgram', inverse);

        this.opcode('invokeAmbiguous', name, isBlock);
      },

      simpleMustache: function(mustache) {
        var id = mustache.id;

        if (id.type === 'DATA') {
          this.DATA(id);
        } else if (id.parts.length) {
          this.ID(id);
        } else {
          // Simplified ID for `this`
          this.addDepth(id.depth);
          this.opcode('getContext', id.depth);
          this.opcode('pushContext');
        }

        this.opcode('resolvePossibleLambda');
      },

      helperMustache: function(mustache, program, inverse) {
        var params = this.setupFullMustacheParams(mustache, program, inverse),
            name = mustache.id.parts[0];

        if (this.options.knownHelpers[name]) {
          this.opcode('invokeKnownHelper', params.length, name);
        } else if (this.options.knownHelpersOnly) {
          throw new Error("You specified knownHelpersOnly, but used the unknown helper " + name);
        } else {
          this.opcode('invokeHelper', params.length, name);
        }
      },

      ID: function(id) {
        this.addDepth(id.depth);
        this.opcode('getContext', id.depth);

        var name = id.parts[0];
        if (!name) {
          this.opcode('pushContext');
        } else {
          this.opcode('lookupOnContext', id.parts[0]);
        }

        for(var i=1, l=id.parts.length; i<l; i++) {
          this.opcode('lookup', id.parts[i]);
        }
      },

      DATA: function(data) {
        this.options.data = true;
        if (data.id.isScoped || data.id.depth) {
          throw new Exception('Scoped data references are not supported: ' + data.original);
        }

        this.opcode('lookupData');
        var parts = data.id.parts;
        for(var i=0, l=parts.length; i<l; i++) {
          this.opcode('lookup', parts[i]);
        }
      },

      STRING: function(string) {
        this.opcode('pushString', string.string);
      },

      INTEGER: function(integer) {
        this.opcode('pushLiteral', integer.integer);
      },

      BOOLEAN: function(bool) {
        this.opcode('pushLiteral', bool.bool);
      },

      comment: function() {},

      // HELPERS
      opcode: function(name) {
        this.opcodes.push({ opcode: name, args: [].slice.call(arguments, 1) });
      },

      declare: function(name, value) {
        this.opcodes.push({ opcode: 'DECLARE', name: name, value: value });
      },

      addDepth: function(depth) {
        if(isNaN(depth)) { throw new Error("EWOT"); }
        if(depth === 0) { return; }

        if(!this.depths[depth]) {
          this.depths[depth] = true;
          this.depths.list.push(depth);
        }
      },

      classifyMustache: function(mustache) {
        var isHelper   = mustache.isHelper;
        var isEligible = mustache.eligibleHelper;
        var options    = this.options;

        // if ambiguous, we can possibly resolve the ambiguity now
        if (isEligible && !isHelper) {
          var name = mustache.id.parts[0];

          if (options.knownHelpers[name]) {
            isHelper = true;
          } else if (options.knownHelpersOnly) {
            isEligible = false;
          }
        }

        if (isHelper) { return "helper"; }
        else if (isEligible) { return "ambiguous"; }
        else { return "simple"; }
      },

      pushParams: function(params) {
        var i = params.length, param;

        while(i--) {
          param = params[i];

          if(this.options.stringParams) {
            if(param.depth) {
              this.addDepth(param.depth);
            }

            this.opcode('getContext', param.depth || 0);
            this.opcode('pushStringParam', param.stringModeValue, param.type);
          } else {
            this[param.type](param);
          }
        }
      },

      setupMustacheParams: function(mustache) {
        var params = mustache.params;
        this.pushParams(params);

        if(mustache.hash) {
          this.hash(mustache.hash);
        } else {
          this.opcode('emptyHash');
        }

        return params;
      },

      // this will replace setupMustacheParams when we're done
      setupFullMustacheParams: function(mustache, program, inverse) {
        var params = mustache.params;
        this.pushParams(params);

        this.opcode('pushProgram', program);
        this.opcode('pushProgram', inverse);

        if(mustache.hash) {
          this.hash(mustache.hash);
        } else {
          this.opcode('emptyHash');
        }

        return params;
      }
    };

    function precompile(input, options) {
      if (input == null || (typeof input !== 'string' && input.constructor !== AST.ProgramNode)) {
        throw new Exception("You must pass a string or Handlebars AST to Handlebars.precompile. You passed " + input);
      }

      options = options || {};
      if (!('data' in options)) {
        options.data = true;
      }

      var ast = parse(input);
      var environment = new Compiler().compile(ast, options);
      return new JavaScriptCompiler().compile(environment, options);
    }

    __exports__.precompile = precompile;function compile(input, options, env) {
      if (input == null || (typeof input !== 'string' && input.constructor !== AST.ProgramNode)) {
        throw new Exception("You must pass a string or Handlebars AST to Handlebars.compile. You passed " + input);
      }

      options = options || {};

      if (!('data' in options)) {
        options.data = true;
      }

      var compiled;

      function compileInput() {
        var ast = parse(input);
        var environment = new Compiler().compile(ast, options);
        var templateSpec = new JavaScriptCompiler().compile(environment, options, undefined, true);
        return env.template(templateSpec);
      }

      // Template is only compiled on first use and cached after that point.
      return function(context, options) {
        if (!compiled) {
          compiled = compileInput();
        }
        return compiled.call(this, context, options);
      };
    }

    __exports__.compile = compile;
  });
define(
  'handlebars',["./handlebars.runtime","./handlebars/compiler/ast","./handlebars/compiler/base","./handlebars/compiler/compiler","./handlebars/compiler/javascript-compiler","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    
    var Handlebars = __dependency1__["default"];

    // Compiler imports
    var AST = __dependency2__;
    var Parser = __dependency3__.parser;
    var parse = __dependency3__.parse;
    var Compiler = __dependency4__.Compiler;
    var compile = __dependency4__.compile;
    var precompile = __dependency4__.precompile;
    var JavaScriptCompiler = __dependency5__["default"];

    var _create = Handlebars.create;
    var create = function() {
      var hb = _create();

      hb.compile = function(input, options) {
        return compile(input, options, hb);
      };
      hb.precompile = precompile;

      hb.AST = AST;
      hb.Compiler = Compiler;
      hb.JavaScriptCompiler = JavaScriptCompiler;
      hb.Parser = Parser;
      hb.parse = parse;

      return hb;
    };

    Handlebars = create();
    Handlebars.create = create;

    __exports__["default"] = Handlebars;
  });
(function() {

  define('lib/utils/handlebars',['handlebars'], function(Handlebars) {
    var instance;
    instance = Handlebars["default"].create();
    return instance;
  });

}).call(this);

(function() {
  var methods;

  methods = ['on', 'onAny', 'offAny', 'once', 'many', 'off', 'removeAllListeners', 'listeners', 'listenersAny', 'emit', 'setMaxListeners'];

  define('lib/utils/emitter',['underscore', 'eventemitter'], function(_, EventEmitter2) {
    return function() {
      var ee, method, _ee, _i, _len;
      _ee = new EventEmitter2({
        wildcard: true,
        delimiter: '.',
        newListener: false,
        maxListeners: 100
      });
      ee = {};
      for (_i = 0, _len = methods.length; _i < _len; _i++) {
        method = methods[_i];
        ee[method] = _.bind(_ee[method], _ee);
      }
      return ee;
    };
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

define('lib/utils/version',[],function () { return 'ds_1.5_ember';});
(function() {

  define('lib/api/params',['underscore'], function(_) {
    /*
      # Parses the parameters for an API call. At this point, they can have two forms
      # * [String, ...] where the String is an uri. The request will be made to the default provider
      # * [Object, ...] where the Object describes more completely the request. It must provide a "path" key, can provide a "provider" key as well as some default parameters in the "params" key
      # In the second form, the optional params can be overridden through parameters at data.api calls
      #
      # The normalized form is the first one.
      #
      # @param {Array} the parameters for the API calls
      # @return {Array} The normalized form of parameters
    */

    var defaultProvider, _objectDescription, _stringDescription;
    defaultProvider = 'hull';
    _stringDescription = function(desc) {
      return [desc, defaultProvider, {}];
    };
    _objectDescription = function(desc) {
      var params, path, provider;
      path = desc.path;
      provider = desc.provider || defaultProvider;
      params = desc.params || {};
      return [path, provider, params];
    };
    return {
      parse: function(argsArray) {
        var callback, description, errback, method, next, params, path, provider, ret, type, _ref, _ref1;
        description = argsArray.shift();
        if (_.isString(description)) {
          _ref = _stringDescription(description), path = _ref[0], provider = _ref[1], params = _ref[2];
        }
        if (_.isObject(description)) {
          _ref1 = _objectDescription(description), path = _ref1[0], provider = _ref1[1], params = _ref1[2];
        }
        if (!path) {
          throw 'No URI provided for the API call';
        }
        if (path[0] === "/") {
          path = path.substring(1);
        }
        ret = [];
        if (params != null) {
          ret.push(params);
        }
        ret = ret.concat(argsArray);
        callback = errback = null;
        params = {};
        while ((next = ret.shift())) {
          type = typeof next;
          if (type === 'string' && !method) {
            method = next.toLowerCase();
          } else if (type === 'function' && (!callback || !errback)) {
            if (!callback) {
              callback = next;
            } else if (!errback) {
              errback = next;
            }
          } else if (type === 'object') {
            params = _.extend(params, next);
          } else {
            throw new TypeError("Invalid argument passed to Hull.api(): " + next);
          }
        }
        if (method == null) {
          method = 'get';
        }
        if (callback == null) {
          callback = function() {};
        }
        if (errback == null) {
          errback = function(data) {
            return console.error('The request has failed: ', data);
          };
        }
        return [
          {
            provider: provider,
            path: path,
            method: method,
            params: params
          }, callback, errback
        ];
      }
    };
  });

}).call(this);

(function() {
  var hash;

  try {
    hash = JSON.parse(atob(document.location.hash.replace('#', '')));
    if (window.opener && window.opener.Hull && window.opener.__hull_login_status__ && (hash != null)) {
      window.opener.__hull_login_status__(hash);
      window.close();
    }
  } catch (_error) {}

  define('lib/api/auth',['underscore', '../utils/promises', '../utils/version'], function(_, promises, version) {
    return function(apiFn, config, emitter, authServices) {
      var authModule, authenticating, emailLoginComplete, generateAuthUrl, isMobile, login, loginComplete, loginFailed, loginWithProvider, logout, module, onCompleteAuthentication, postForm, signup, _popupInterval;
      if (authServices == null) {
        authServices = [];
      }
      authenticating = null;
      _popupInterval = null;
      loginComplete = function(provider, me) {
        var dfd, promise, rejectable;
        dfd = promises.deferred();
        promise = dfd.promise;
        promise.then(function() {
          var _ref;
          emitter.emit('hull.auth.login', me, provider);
          if ((me != null ? (_ref = me.stats) != null ? _ref.sign_in_count : void 0 : void 0) == null) {
            return emitter.emit('hull.auth.create', me);
          }
        }, function(err) {
          return emitter.emit('hull.auth.fail', err);
        });
        emitter.once('hull.settings.update', function() {
          return dfd.resolve(me);
        });
        rejectable = _.bind(dfd.reject, dfd);
        _.delay(rejectable, 30000, new Error('Timeout for login'));
        return promise;
      };
      loginFailed = function(err) {
        emitter.emit('hull.auth.fail', err);
        throw err;
        return err;
      };
      emailLoginComplete = _.bind(loginComplete, void 0, 'email');
      signup = function(user) {
        return apiFn('users', 'post', user).then(emailLoginComplete, loginFailed);
      };
      postForm = function(path, method, params) {
        var form, hiddenField, key;
        if (method == null) {
          method = 'post';
        }
        if (params == null) {
          params = {};
        }
        form = document.createElement("form");
        form.setAttribute("method", method);
        form.setAttribute("action", path);
        for (key in params) {
          if (params.hasOwnProperty(key)) {
            hiddenField = document.createElement("input");
            hiddenField.setAttribute("type", "hidden");
            hiddenField.setAttribute("name", key);
            hiddenField.setAttribute("value", params[key]);
            form.appendChild(hiddenField);
          }
        }
        document.body.appendChild(form);
        return form.submit();
      };
      isMobile = function() {
        var n;
        n = navigator.userAgent || navigator.vendor || window.opera;
        return !!/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(n) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(n.substr(0, 4));
      };
      login = function(opts, params, callback) {
        var evtPromise, promise, refresh, _base;
        if (params == null) {
          params = {};
        }
        refresh = function() {
          apiFn.clearToken();
          return apiFn('me');
        };
        if (_.isString(opts)) {
          if (_.isString(params)) {
            opts = {
              login: opts,
              password: params
            };
          } else {
            opts = {
              provider: opts
            };
          }
        }
        if (!_.isObject(opts.params)) {
          opts.params || (opts.params = params);
        }
        if (opts.provider === 'facebook') {
          (_base = opts.params).display || (_base.display = opts.strategy === 'redirect' ? 'page' : 'popup');
        }
        if (opts.strategy === 'redirect') {
          opts.redirect_url || (opts.redirect_url = window.location.href);
        }
        if (opts.provider != null) {
          promise = loginWithProvider(opts).then(refresh);
          evtPromise = promise.then(_.bind(loginComplete, void 0, opts), loginFailed);
        } else {
          if (!((opts.login != null) && (opts.password != null))) {
            throw new Error('Seems like something is wrong in your Hull.login() call, We need a login and password fields to login. Read up here: http://www.hull.io/docs/references/hull_js/#user-signup-and-login');
          }
          delete opts.params;
          if (opts.strategy === 'redirect') {
            return postForm(config.orgUrl + '/api/v1/users/login', 'post', opts);
          }
          promise = apiFn('users/login', 'post', _.pick(opts, 'login', 'password')).then(refresh);
          evtPromise = promise.then(emailLoginComplete, loginFailed);
        }
        if (_.isFunction(callback)) {
          evtPromise.then(callback);
        }
        return promise;
      };
      loginWithProvider = function(opts) {
        var authUrl;
        if (module.isAuthenticating()) {
          return module.isAuthenticating();
        }
        authenticating = promises.deferred();
        if (!~(_.indexOf(authServices, opts.provider))) {
          authenticating.reject({
            message: "No authentication service " + opts.provider + " configured for the app",
            reason: 'no_such_service'
          });
          return authenticating.promise;
        }
        authenticating.provider = opts.provider;
        authUrl = module.authUrl(config, opts);
        if (opts.strategy === 'redirect') {
          window.location.href = authUrl;
        } else {
          module.authHelper(authUrl, opts);
        }
        return authenticating.promise;
      };
      logout = function(callback) {
        var promise;
        promise = apiFn('logout');
        promise.done(function() {
          if (_.isFunction(callback)) {
            return callback();
          }
        });
        return promise.then(function() {
          return emitter.emit('hull.auth.logout');
        });
      };
      onCompleteAuthentication = function(hash) {
        var error, k, v, _auth, _ref;
        _auth = authenticating;
        if (!authenticating) {
          return;
        }
        if (hash.success) {
          authenticating.resolve({});
        } else {
          error = new Error('Login failed');
          _ref = hash.error;
          for (k in _ref) {
            v = _ref[k];
            error[k] = v;
          }
          authenticating.reject(error);
        }
        authenticating = null;
        clearInterval(_popupInterval);
        _popupInterval = null;
        return _auth;
      };
      generateAuthUrl = function(config, opts) {
        var params, querystring;
        if (opts == null) {
          opts = {};
        }
        module.createCallback();
        params = opts.params || {};
        params.app_id = config.appId;
        params.callback_url = opts.redirect_url || params.callback_url || config.callback_url || config.callbackUrl || module.location.toString();
        params.auth_referer = module.location.toString();
        params.version = version;
        querystring = _.map(params, function(v, k) {
          return encodeURIComponent(k) + '=' + encodeURIComponent(v);
        }).join('&');
        return "" + config.orgUrl + "/auth/" + opts.provider + "?" + querystring;
      };
      module = {
        isAuthenticating: function() {
          return authenticating != null;
        },
        location: document.location,
        authUrl: generateAuthUrl,
        createCallback: function() {
          return window.__hull_login_status__ = function(hash) {
            window.__hull_login_status__ = null;
            return onCompleteAuthentication(hash);
          };
        },
        authHelper: function(path, opts) {
          var height, openerString, w, width, _ref;
          if (opts == null) {
            opts = {};
          }
          openerString = "location=0,status=0";
          if (opts.provider === 'facebook' && opts.params.display === 'popup') {
            width = 500;
            height = 400;
          } else {
            width = 1030;
            height = 550;
          }
          openerString = "" + openerString + ",width=" + width + ",height=" + height;
          w = window.open(path, "_auth", openerString);
          if ((_ref = window.device) != null ? _ref.cordova : void 0) {
            if (w != null) {
              w.addEventListener('loadstart', function(event) {
                hash = (function() {
                  try {
                    return JSON.parse(atob(event.url.split('#')[1]));
                  } catch (_error) {}
                })();
                if (hash) {
                  window.__hull_login_status__(hash);
                  return w.close();
                }
              });
            }
          }
          return _popupInterval = (w != null) && setInterval(function() {
            if (w != null ? w.closed : void 0) {
              return onCompleteAuthentication({
                success: false,
                error: {
                  reason: 'window_closed'
                }
              });
            }
          }, 200);
        },
        onCompleteAuth: onCompleteAuthentication
      };
      authModule = {
        signup: signup,
        login: login,
        logout: logout,
        isAuthenticating: module.isAuthenticating
      };
      return authModule;
    };
  });

}).call(this);

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

(function() {

  define('lib/api/xdm',['domready', 'lib/utils/promises', 'xdm', 'lib/utils/version', 'underscore'], function(domready, promises, xdm, version, _) {
    var buildRemoteUrl;
    buildRemoteUrl = function(config) {
      var accessToken, remoteUrl;
      remoteUrl = "" + config.orgUrl + "/api/v1/" + config.appId + "/remote.html?v=" + version;
      if (config.jsUrl) {
        remoteUrl += "&js=" + config.jsUrl;
      }
      if (config.uid) {
        remoteUrl += "&uid=" + config.uid;
      }
      if (config.debugRemote) {
        remoteUrl += "&debug_remote=true";
      }
      accessToken = config.accessToken || config.appSecret;
      if (accessToken != null) {
        remoteUrl += "&access_token=" + accessToken;
      }
      if (config.userHash !== void 0) {
        remoteUrl += "&user_hash=" + config.userHash;
      }
      remoteUrl += "&r=" + (encodeURIComponent(document.referrer));
      return remoteUrl;
    };
    return function(config, emitter) {
      var applyFrameStyle, deferred, getClientConfig, hiddenFrameStyle, hideIframe, onMessage, readyFn, rpc, settingsUpdate, showIframe, shownFrameStyle, timeout, userUpdate;
      timeout = null;
      rpc = null;
      deferred = promises.deferred();
      onMessage = function(e) {
        console.log('remoteMessage', e);
        if (e.error) {
          return deferred.reject(e.error);
        } else {
          return console.warn("RPC Message", arguments);
        }
      };
      settingsUpdate = function(currentSettings) {
        return emitter.emit('hull.settings.update', currentSettings);
      };
      userUpdate = function(currentUser) {
        return emitter.emit('hull.auth.update', currentUser);
      };
      readyFn = function(remoteConfig) {
        window.clearTimeout(timeout);
        return deferred.resolve({
          rpc: rpc,
          config: remoteConfig
        });
      };
      getClientConfig = function() {
        return config;
      };
      hiddenFrameStyle = {
        top: '-20px',
        left: '-20px',
        bottom: 'auto',
        right: 'auto',
        width: '1px',
        height: '1px',
        display: 'block',
        position: 'fixed',
        zIndex: void 0,
        overflow: 'hidden'
      };
      shownFrameStyle = {
        top: '0px',
        left: '0px',
        right: '0px',
        bottom: '0px',
        width: '100%',
        height: '100%',
        display: 'block',
        position: 'fixed',
        zIndex: 10000,
        overflow: 'auto'
      };
      showIframe = function() {
        return applyFrameStyle(shownFrameStyle);
      };
      hideIframe = function() {
        return applyFrameStyle(hiddenFrameStyle);
      };
      applyFrameStyle = function(styles) {
        return _.map(styles, function(v, k) {
          return rpc.iframe.style[k] = v;
        });
      };
      domready(function() {
        timeout = setTimeout(function() {
          return deferred.reject('Remote loading has failed. Please check "orgUrl" and "appId" in your configuration. This may also be about connectivity.');
        }, 30000);
        return rpc = new xdm.Rpc({
          remote: buildRemoteUrl(config),
          container: document.body,
          channel: config.appId,
          props: {
            tabIndex: -1,
            height: "0",
            width: "1px",
            style: {
              position: 'fixed',
              width: "1px",
              height: "1px",
              top: '-20px',
              left: '-20px',
              overflow: 'hidden'
            }
          }
        }, {
          remote: {
            message: {},
            ready: {},
            clearUserToken: {}
          },
          local: {
            message: onMessage,
            ready: readyFn,
            userUpdate: userUpdate,
            settingsUpdate: settingsUpdate,
            getClientConfig: getClientConfig,
            show: showIframe,
            hide: hideIframe
          }
        });
      });
      return deferred.promise;
    };
  });

}).call(this);

(function() {

  define('lib/api/api',['underscore', '../utils/cookies', '../utils/version', '../api/params', '../api/auth', '../utils/promises', 'lib/api/xdm'], function(_, cookie, version, apiParams, authModule, promises, xdm) {
    var currentUserSignature, slice;
    slice = Array.prototype.slice;
    currentUserSignature = false;
    return {
      init: function(config, emitter) {
        var api, dfd, message, onRemoteReady, rpc, setCurrentUser;
        if (config == null) {
          config = {};
        }
        dfd = promises.deferred();
        if (!(config.orgUrl && config.appId)) {
          if (!config.orgUrl) {
            dfd.reject(new ReferenceError('no organizationURL provided. Can\'t proceed'));
          }
          if (!config.appId) {
            dfd.reject(new ReferenceError('no applicationID provided. Can\'t proceed'));
          }
          return dfd.promise;
        }
        try {
          if (window.jQuery && _.isFunction(window.jQuery.fn.ajaxSend)) {
            window.jQuery(document).ajaxSend(function(e, xhr, opts) {
              if (currentUserSignature && !opts.crossDomain) {
                return xhr.setRequestHeader('Hull-User-Sig', currentUserSignature);
              }
            });
          }
        } catch (e) {

        }
        message = null;
        api = function() {
          return message.apply(void 0, apiParams.parse(slice.call(arguments)));
        };
        _.each(['get', 'post', 'put', 'delete'], function(method) {
          return api[method] = function() {
            var args, req;
            args = apiParams.parse(slice.call(arguments));
            req = args[0];
            req.method = method;
            return message.apply(api, args);
          };
        });
        api.parseRoute = apiParams.parse;
        setCurrentUser = function(headers) {
          var cookieName, val;
          if (headers == null) {
            headers = {};
          }
          if (!config.appId) {
            return;
          }
          cookieName = "hull_" + config.appId;
          if (headers && headers['Hull-User-Id'] && headers['Hull-User-Sig']) {
            val = btoa(JSON.stringify(headers));
            currentUserSignature = val;
            return cookie.set(cookieName, val, {
              path: "/"
            });
          } else {
            currentUserSignature = false;
            return cookie.remove(cookieName, {
              path: "/"
            });
          }
        };
        rpc = null;
        api.clearToken = function() {
          return rpc.clearUserToken();
        };
        onRemoteReady = function(remoteObj) {
          var authScope, data, remoteConfig, _ref;
          rpc = remoteObj.rpc;
          remoteConfig = remoteObj.config;
          data = remoteConfig.data;
          setCurrentUser(data.headers);
          if ((_ref = data.headers) != null ? _ref['Hull-Auth-Scope'] : void 0) {
            authScope = data.headers['Hull-Auth-Scope'].split(":")[0];
          }
          return {
            auth: authModule(api, config, emitter, _.keys(remoteConfig.settings.auth || {})),
            remoteConfig: remoteConfig,
            authScope: authScope || '',
            api: api,
            init: function() {
              return dfd.promise;
            }
          };
        };
        xdm(config, emitter).then(onRemoteReady).then(dfd.resolve, dfd.reject);
        /*
            # Sends the message described by @params to xdm
            # @param {Object} contains the provider, uri and parameters for the message
            # @param {Function} optional a success callback
            # @param {Function} optional an error callback
            # @return {Promise}
        */

        message = function(params, callback, errback) {
          var deferred, onError, onSuccess;
          if (!rpc) {
            console.error("Api not initialized yet");
          }
          deferred = promises.deferred();
          onSuccess = function(res) {
            var eventName, headers, hullTrack, trackParams, _ref;
            if (res == null) {
              res = {};
            }
            if (res.provider === 'hull') {
              setCurrentUser(res.headers);
            }
            headers = res != null ? res.headers : void 0;
            if ((headers != null) && res.provider === 'hull') {
              hullTrack = headers['Hull-Track'];
              if (hullTrack) {
                try {
                  _ref = JSON.parse(atob(hullTrack)), eventName = _ref[0], trackParams = _ref[1];
                  emitter.emit(eventName, trackParams);
                } catch (error) {
                  false;
                }
              }
            }
            callback(res.response, res.headers);
            return deferred.resolve(res.response);
          };
          onError = function(err) {
            if (err == null) {
              err = {};
            }
            errback(err.message);
            return deferred.reject(err.message);
          };
          rpc.message(params, onSuccess, onError);
          return deferred.promise;
        };
        return dfd.promise;
      }
    };
  });

}).call(this);

(function() {

  define('lib/api/reporting',['underscore'], function(_) {
    return {
      init: function(apiObject) {
        return {
          track: function(eventName, params) {
            var data;
            data = _.extend({
              url: window.location.href,
              referrer: document.referrer
            }, params);
            return apiObject.api({
              provider: "track",
              path: eventName
            }, 'post', data);
          },
          flag: function(id) {
            return apiObject.api({
              provider: "hull",
              path: [id, 'flag'].join('/')
            }, 'post');
          }
        };
      }
    };
  });

}).call(this);

(function() {

  define('lib/utils/base64',[],function() {
    var utilsContainer;
    utilsContainer = window;
    return {
      utils: utilsContainer,
      decode: function(str) {
        return utilsContainer.decodeURIComponent(utilsContainer.escape(utilsContainer.atob(str)));
      },
      encode: function(str) {
        return utilsContainer.btoa(utilsContainer.unescape(utilsContainer.encodeURIComponent(str)));
      },
      utilsContainer: window
    };
  });

}).call(this);

(function() {

  define('lib/utils/entity',['underscore', 'lib/utils/base64'], function(_, base64) {
    return {
      decode: function(str) {
        if (/^~[a-z0-9_\-\+\/\=]+$/i.test(str) && (str.length - 1) % 4 === 0) {
          return base64.decode(str.substr(1), true);
        } else {
          return str;
        }
      },
      encode: function(str) {
        return "~" + (base64.encode(str, true));
      }
    };
  });

}).call(this);

(function() {

  define('lib/utils/config',['underscore'], function(_) {
    var configParser, dirtyClone;
    dirtyClone = function(obj) {
      if (obj !== void 0) {
        return JSON.parse(JSON.stringify(obj));
      }
    };
    configParser = function(config, emitter) {
      if (emitter) {
        emitter.on('hull.settings.update', function(settings) {
          return config.services = settings;
        });
      }
      return function(key) {
        var _cursor;
        _cursor = config;
        if (!key) {
          return dirtyClone(config);
        }
        _.each(key.split('.'), function(k) {
          if (_cursor === void 0) {
            return _cursor;
          }
          if (_.contains(_.keys(_cursor), k)) {
            return _cursor = _cursor[k];
          } else {
            return _cursor = void 0;
          }
        });
        return dirtyClone(_cursor);
      };
    };
    return function(config, emitter) {
      return configParser(config, emitter);
    };
  });

}).call(this);

(function() {

  define('lib/api/current-user',[],function() {
    return function(emitter) {
      var _currentUser;
      _currentUser = false;
      emitter.on('hull.init', function(hull, me, app, org) {
        return _currentUser = me;
      });
      emitter.on('hull.auth.login', function(me) {
        return _currentUser = me;
      });
      emitter.on('hull.auth.update', function(me) {
        if (_currentUser != null ? _currentUser.id : void 0) {
          if (_currentUser.id === me.id) {
            return _currentUser = me;
          } else if (!(me != null ? me.id : void 0)) {
            return emitter.emit('hull.auth.logout');
          } else {
            return emitter.emit('hull.auth.login', me);
          }
        }
      });
      emitter.on('hull.auth.logout', function() {
        return _currentUser = false;
      });
      return function() {
        return _currentUser;
      };
    };
  });

}).call(this);

(function() {

  define('lib/traits/base',['underscore'], function(_) {
    var Trait, config;
    Trait = (function() {

      function Trait(api, name, value) {
        this.api = api;
        this.name = name;
        this.value = value;
        this.api || (this.api = function() {});
        if (!_.isUndefined(this.value)) {
          this.set(this.value);
        }
      }

      Trait.prototype.inc = function(step) {
        if (step == null) {
          step = 1;
        }
        return this.api('me/traits', 'put', {
          name: this.name,
          operation: 'inc',
          value: step
        });
      };

      Trait.prototype.dec = function(step) {
        if (step == null) {
          step = 1;
        }
        return this.api('me/traits', 'put', {
          name: this.name,
          operation: 'dec',
          value: step
        });
      };

      Trait.prototype.set = function(value) {
        return this.api('me/traits', 'put', {
          name: this.name,
          operation: 'set',
          value: value
        });
      };

      return Trait;

    })();
    config = {
      api: null
    };
    return {
      setup: function(transport) {
        config.api = transport;
        return {
          build: function(name, value) {
            return new Trait(config.api, name, value);
          }
        };
      }
    };
  });

}).call(this);

(function() {

  define('lib/share/base',['underscore', '../utils/promises'], function(_, promises) {
    var facebookPopup, facebookShare, genericPopup, hasIdentity, isMobile, to_qs, twitterPopup, twitterShare;
    isMobile = function() {
      var n;
      n = navigator.userAgent || navigator.vendor || window.opera;
      return !!/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(n) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(n.substr(0, 4));
    };
    hasIdentity = function(provider) {
      var identities, _ref;
      identities = (_ref = Hull.currentUser()) != null ? _ref.identities : void 0;
      if (!(identities && provider)) {
        return false;
      }
      return _.some(identities, function(i) {
        return i.provider === provider;
      });
    };
    to_qs = function(params) {
      return _.map(params, function(v, k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(v);
      }).join('&');
    };
    facebookShare = function(opts) {
      var params, sharePromise;
      opts.method || (opts.method = 'share');
      params = opts.params;
      if (opts.method === 'share') {
        params.href || (params.href = window.location.href);
      }
      if (opts.method === 'feed') {
        params.link || (params.link = window.location.href);
      }
      sharePromise = function() {
        return Hull.api({
          provider: opts.provider,
          path: "ui." + opts.method
        }, params);
      };
      if (isMobile() || params.display === 'popup') {
        return facebookPopup(opts);
      }
      if (opts.anonymous || hasIdentity('facebook')) {
        return sharePromise();
      }
      return Hull.login({
        provider: 'facebook',
        strategy: 'popup'
      }).then(sharePromise);
    };
    genericPopup = function(location, opts) {
      var dfd, interval, querystring, share;
      querystring = to_qs(opts.params);
      share = window.open("" + location + "?" + querystring, 'hull_share', "location=0,status=0,width=" + opts.width + ",height=" + opts.height);
      dfd = promises.deferred();
      interval = setInterval(function() {
        try {
          if (share === null || share.closed) {
            window.clearInterval(interval);
            return dfd.resolve({
              display: "popup"
            });
          }
        } catch (e) {
          return 1 === 1;
        }
      }, 500);
      return dfd.promise;
    };
    facebookPopup = function(opts) {
      var params, _ref;
      params = opts.params;
      params.redirect_uri = window.location.href;
      params.app_id = Hull.config('services').auth.facebook.appId;
      _ref = params.display === 'popup' ? [500, 400] : [1030, 550], opts.width = _ref[0], opts.height = _ref[1];
      return genericPopup("https://www.facebook.com/dialog/" + opts.method, opts);
    };
    twitterPopup = function(opts) {
      var _ref;
      _ref = [550, 420], opts.width = _ref[0], opts.height = _ref[1];
      return genericPopup("https://twitter.com/intent/tweet", opts);
    };
    twitterShare = function(opts) {
      var params;
      params = opts.params;
      params.url || (params.url = window.location.href);
      return twitterPopup(opts);
    };
    return function(opts) {
      var dfd, sharePromise;
      if (!(_.isObject(opts) && _.isObject(opts.params) && (opts.provider != null))) {
        dfd = promises.deferred();
        dfd.reject();
        return dfd;
      }
      sharePromise = (function() {
        switch (opts.provider) {
          case 'facebook':
            return facebookShare(opts);
          case 'twitter':
            return twitterShare(opts);
        }
      })();
      return sharePromise.then(function(response) {
        Hull.track("hull." + opts.provider + ".share", {
          params: opts.params,
          response: response
        });
        return response;
      });
    };
  });

}).call(this);

(function() {
  var __slice = [].slice;

  define('lib/hull.api',['underscore', 'lib/utils/promises', 'lib/utils/emitter', 'lib/api/api', 'lib/api/reporting', 'lib/utils/entity', 'lib/utils/config', 'lib/api/current-user', 'lib/traits/base', 'lib/share/base'], function(_, promises, emitter, api, reporting, entity, configParser, currentUser, Traits, share) {
    var create, failure;
    create = function(config) {
      var _emitter;
      _emitter = emitter();
      return api.init(config, _emitter).then(function(api) {
        var created, noCurentUserDeferred, _reporting;
        _reporting = reporting.init(api);
        _emitter.on('hull.auth.create', function(me) {
          var providers;
          providers = _.pluck(me.identities, 'provider');
          return _reporting.track('hull.auth.create', {
            providers: providers,
            main_identity: me.main_identity
          });
        });
        _emitter.on('hull.auth.login', function(me, provider) {
          var providers;
          providers = _.pluck(me.identities, 'provider');
          provider = provider || me.main_identity;
          return _reporting.track('hull.auth.login', {
            provider: provider,
            providers: providers,
            main_identity: me.main_identity
          });
        });
        _emitter.on('hull.auth.logout', function() {
          return _reporting.track('hull.auth.logout');
        });
        noCurentUserDeferred = promises.deferred();
        noCurentUserDeferred.promise.fail(function() {});
        noCurentUserDeferred.reject({
          reason: 'no_current_user',
          message: 'User must be logged in to perform this action'
        });
        config.services = api.remoteConfig.settings;
        created = {
          config: configParser(config, _emitter),
          on: _emitter.on,
          off: _emitter.off,
          emit: _emitter.emit,
          track: _reporting.track,
          flag: _reporting.flag,
          api: api.api,
          currentUser: currentUser(_emitter),
          signup: function() {
            var args, signupPromise, _ref;
            args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
            signupPromise = (_ref = api.auth).signup.apply(_ref, args);
            return signupPromise;
          },
          login: function() {
            var args, _ref;
            args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
            if (api.auth.isAuthenticating()) {
              return console.info("Authentication is in progress. Use `Hull.on('hull.auth.login', fn)` to call `fn` when done.");
            }
            return (_ref = api.auth).login.apply(_ref, args);
          },
          logout: api.auth.logout,
          linkIdentity: function(provider, options, callback) {
            if (options == null) {
              options = {};
            }
            if (!created.currentUser()) {
              return noCurentUserDeferred.promise;
            }
            options.mode = 'connect';
            return created.login(provider, options, callback);
          },
          unlinkIdentity: function(provider, callback) {
            var promise;
            if (!created.currentUser()) {
              return noCurentUserDeferred.promise;
            }
            promise = api.api("me/identities/" + provider, 'delete').then(api.api.bind(api, 'me'));
            promise.then(function(user) {
              _emitter.emit('hull.auth.login', user);
              return callback(user);
            });
            return promise;
          },
          util: {
            entity: entity
          },
          trait: Traits.setup(api.api).build,
          share: share
        };
        created.api.create = create;
        return {
          raw: api,
          api: created,
          eventEmitter: _emitter
        };
      });
    };
    failure = function(error) {
      console.error('Unable to start Hull.api', error.message);
      throw error;
    };
    return {
      init: function(config) {
        return create(config);
      },
      success: function(successResult) {
        return {
          exports: successResult.api,
          context: {
            me: successResult.raw.remoteConfig.data.me,
            app: successResult.raw.remoteConfig.data.app,
            org: successResult.raw.remoteConfig.data.org
          }
        };
      },
      failure: failure
    };
  });

}).call(this);

(function() {

  define('lib/client/component/registrar',[],function() {
    var _normalizeComponentName;
    _normalizeComponentName = function(name) {
      var source, _ref;
      _ref = name.split('@'), name = _ref[0], source = _ref[1];
      if (source == null) {
        source = 'default';
      }
      return "__component__$" + name + "@" + source;
    };
    return function(_define) {
      return function(componentName, componentDef) {
        var _ref;
        if (!componentDef) {
          componentDef = componentName;
          componentName = null;
        }
        if (componentName && !Object.prototype.toString.apply(componentName) === '[object String]') {
          throw 'The component identifier must be a String';
        }
        if (Object.prototype.toString.apply(componentDef) === '[object Function]') {
          componentDef = componentDef();
        }
        if (Object.prototype.toString.apply(componentDef) !== '[object Object]') {
          throw "A component must have a definition";
        }
        if ((_ref = componentDef.type) == null) {
          componentDef.type = "Hull";
        }
        if (componentName) {
          _define(_normalizeComponentName(componentName), componentDef);
        } else {
          _define(['module'], function(module) {
            _define(module.id, componentDef);
            return componentDef;
          });
        }
        return componentDef;
      };
    };
  });

}).call(this);

(function() {

  define('lib/helpers/login',[],function() {
    return {
      update: function(model, mediator, attributes) {
        if (attributes == null) {
          attributes = {};
        }
        if (!model) {
          return;
        }
        attributes._id = 'me';
        return model('me').set(attributes);
      },
      login: function(model, mediator, attributes) {
        if (attributes == null) {
          attributes = {};
        }
        if (!model) {
          return;
        }
        attributes._id = 'me';
        model('me').clear({
          silent: true
        });
        return model('me').set(attributes);
      },
      logout: function(model, mediator) {
        if (!model) {
          return;
        }
        model('me').clear();
        return model('me').set({
          _id: 'me'
        }, {
          silent: true
        });
      }
    };
  });

}).call(this);

(function() {

  if (!window.jQuery) {
    throw 'jQuery must be available for components to work';
  }

  define('flavour',['underscore', 'lib/utils/promises', 'aura/aura', 'lib/utils/handlebars', 'lib/hull.api', 'lib/utils/emitter', 'lib/client/component/registrar', 'lib/helpers/login'], function(_, promises, Aura, Handlebars, HullAPI, emitterInstance, componentRegistrar, loginHelpers) {
    var hullApiMiddleware, setupApp;
    hullApiMiddleware = function(api) {
      return {
        name: 'Hull',
        initialize: function(app) {
          app.core.mediator.setMaxListeners(100);
          return app.core.data.hullApi = api;
        },
        afterAppStart: function(app) {
          var sb;
          _ = app.core.util._;
          return sb = app.sandboxes.create();
        }
      };
    };
    setupApp = function(app, api, extensions) {
      var ext, _i, _len;
      if (extensions == null) {
        extensions = [];
      }
      app.use(hullApiMiddleware(api)).use('aura-extensions/aura-base64').use('aura-extensions/aura-cookies').use('aura-extensions/aura-backbone').use('aura-extensions/aura-moment').use('aura-extensions/aura-twitter-text').use('aura-extensions/hull-reporting').use('aura-extensions/hull-entities').use('aura-extensions/hull-helpers').use('aura-extensions/hull-utils').use('aura-extensions/aura-form-serialize').use('aura-extensions/aura-purl').use('aura-extensions/aura-mobile-detect').use('aura-extensions/aura-component-validate-options').use('aura-extensions/aura-component-require').use('aura-extensions/hull-component-normalize-id').use('aura-extensions/hull-component-reporting').use('lib/client/component/api').use('lib/client/component/actions').use('lib/client/component/component').use('lib/client/component/templates').use('lib/client/component/datasource');
      for (_i = 0, _len = extensions.length; _i < _len; _i++) {
        ext = extensions[_i];
        app.use(ext);
      }
      return app;
    };
    return {
      init: function(config) {
        var appPromise;
        appPromise = HullAPI.init(config);
        if (config.apiOnly === true) {
          return appPromise;
        }
        return appPromise.then(function(successResult) {
          var app, deps;
          app = new Aura(_.extend(config, {
            mediatorInstance: successResult.eventEmitter
          }));
          deps = {
            api: successResult.raw.api,
            authScope: successResult.raw.authScope,
            remoteConfig: successResult.raw.remoteConfig,
            login: successResult.api.login,
            logout: successResult.api.logout
          };
          return {
            app: setupApp(app, deps, config.extensions || []),
            api: successResult,
            components: true
          };
        });
      },
      success: function(appParts) {
        var apiParts, appStarted, booted;
        apiParts = HullAPI.success(appParts.api);
        booted = apiParts.exports;
        if (!appParts.components) {
          return booted;
        }
        booted.component = componentRegistrar(define);
        appParts.app.sandbox.currentUser = apiParts.exports.currentUser;
        appParts.app.sandbox.promises = promises;
        booted.util = appParts.app.sandbox.util;
        booted.util.Handlebars = Handlebars;
        booted.define = define;
        appStarted = appParts.app.start({
          components: 'body'
        });
        booted.parse = function(el, options) {
          if (options == null) {
            options = {};
          }
          return appStarted.then(function() {
            return appParts.app.core.appSandbox.start(el, options);
          });
        };
        appStarted.then(function() {
          booted.on('hull.auth.login', _.bind(loginHelpers.login, void 0, appParts.app.sandbox.data.api.model, appParts.app.core.mediator));
          booted.on('hull.auth.update', _.bind(loginHelpers.update, void 0, appParts.app.sandbox.data.api.model, appParts.app.core.mediator));
          return booted.on('hull.auth.logout', _.bind(loginHelpers.logout, void 0, appParts.app.sandbox.data.api.model, appParts.app.core.mediator));
        }, function(e) {
          console.error('Unable to start Aura app:', e);
          return appParts.app.stop();
        });
        return {
          exports: booted,
          context: apiParts.context
        };
      },
      failure: function(error) {
        console.error(error.message || error);
        return error;
      }
    };
  });

}).call(this);

(function() {
  var ENV, createLock, createPool, currentFlavour, deletePool, failureCb, getTrackConfig, initApi, initMain, lock, preInit, rerun, successCb, _extend, _hull, _mainCalled, _pool,
    __slice = [].slice;

  if (!(window.console && console.log)) {
    (function() {
      var console, length, methods, noop, _results;
      noop = function() {};
      methods = ["assert", "clear", "count", "debug", "dir", "dirxml", "error", "exception", "group", "groupCollapsed", "groupEnd", "info", "log", "markTimeline", "profile", "profileEnd", "markTimeline", "table", "time", "timeEnd", "timeStamp", "trace", "warn"];
      length = methods.length;
      console = window.console = {};
      _results = [];
      while (length--) {
        _results.push(console[methods[length]] = noop);
      }
      return _results;
    })();
  }

  ENV = typeof HULL_ENV !== "undefined" && HULL_ENV !== null ? HULL_ENV : '';

  _extend = null;

  currentFlavour = null;

  createLock = function() {
    var _cbs, _open;
    _open = false;
    _cbs = [];
    return {
      run: function(cb) {
        if (_open) {
          return cb();
        } else {
          return _cbs.push(cb);
        }
      },
      unlock: function() {
        var cb, _i, _len, _results;
        _open = true;
        _results = [];
        for (_i = 0, _len = _cbs.length; _i < _len; _i++) {
          cb = _cbs[_i];
          _results.push(cb());
        }
        return _results;
      }
    };
  };

  _pool = _pool || {};

  createPool = function(name) {
    var _ref;
    if ((_ref = _pool[name]) == null) {
      _pool[name] = [];
    }
    return function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return _pool[name].push(args);
    };
  };

  deletePool = function(name) {
    return delete _pool[name];
  };

  rerun = function(name, withObj) {
    var data, _i, _len, _ref;
    _ref = _pool[name];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      data = _ref[_i];
      withObj[name].apply(withObj, data);
    }
    return deletePool(name);
  };

  lock = createLock();

  _mainCalled = false;

  preInit = function(isMain, config, cb, errb) {
    if (isMain && _mainCalled) {
      throw new Error('Hull.init can be called only once');
    }
    if (isMain) {
      _mainCalled = true;
    }
    return lock.run(function() {
      var _config, _failure, _success;
      _config = _extend({}, config);
      if (_config.track != null) {
        _config.track = getTrackConfig(_config.track);
      }
      _config.namespace = 'hull';
      _config.debug = config.debug && {
        enable: true
      };
      _success = function() {
        var args;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        return successCb.apply(null, [config, isMain, cb || function() {}].concat(args));
      };
      _failure = function() {
        var args;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        return failureCb.apply(null, [isMain, errb || function() {}].concat(args));
      };
      currentFlavour.init(_config).then(_success, _failure).done();
      return console.info("Hull.js version \"" + _hull.version + "\" started");
    });
  };

  initApi = function() {
    var args, config;
    config = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    config.apiOnly = true;
    return preInit.apply(null, [false, config].concat(args));
  };

  initMain = function() {
    var args, config;
    config = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    return preInit.apply(null, [true, config].concat(args));
  };

  getTrackConfig = function(cfg) {
    var m, ret, stringify;
    if (cfg == null) {
      return;
    }
    stringify = function(a) {};
    ret = (function() {
      switch ((Object.prototype.toString.call(cfg).match(/^\[object (.*)\]$/)[1])) {
        case "Object":
          if (cfg.only != null) {
            return {
              only: (function() {
                var _i, _len, _ref, _results;
                _ref = cfg.only;
                _results = [];
                for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                  m = _ref[_i];
                  _results.push(m.toString());
                }
                return _results;
              })()
            };
          } else if (cfg.ignore != null) {
            return {
              ignore: (function() {
                var _i, _len, _ref, _results;
                _ref = cfg.ignore;
                _results = [];
                for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                  m = _ref[_i];
                  _results.push(m.toString());
                }
                return _results;
              })()
            };
          }
          break;
        case "RegExp":
          return {
            only: cfg.toString()
          };
        case "Array":
          return {
            only: (function() {
              var _i, _len, _results;
              _results = [];
              for (_i = 0, _len = cfg.length; _i < _len; _i++) {
                m = cfg[_i];
                _results.push(m.toString());
              }
              return _results;
            })()
          };
      }
    })();
    return ret;
  };

  _hull = window.Hull = {
    on: createPool('on'),
    track: createPool('track'),
    ready: createPool('ready'),
    init: initMain
  };

  _hull.init.api = initApi;

  if (ENV === "client") {
    _hull.component = createPool('component');
  }

  successCb = function() {
    var args, config, context, extension, isMain, success, _config, _final;
    config = arguments[0], isMain = arguments[1], success = arguments[2], args = 4 <= arguments.length ? __slice.call(arguments, 3) : [];
    extension = currentFlavour.success.apply(currentFlavour, args);
    context = extension.context;
    _config = _extend({}, config);
    _final = _extend({}, _hull, extension.exports, {
      ready: function(fn) {
        return fn(_final, context.me, context.app, context.org);
      }
    });
    if (isMain) {
      window.Hull = _final;
      rerun('on', _final);
      rerun('track', _final);
      if (ENV === "client") {
        rerun('component', _final);
      }
    } else {
      delete _final.component;
    }
    rerun('ready', _final);
    _final.emit('hull.init', _final, extension.context.me, extension.context.app, extension.context.org);
    success(_final, extension.context.me, extension.context.app, extension.context.org);
    return _final;
  };

  failureCb = function() {
    var args, err, isMain, userFailureFn;
    isMain = arguments[0], userFailureFn = arguments[1], err = arguments[2], args = 4 <= arguments.length ? __slice.call(arguments, 3) : [];
    currentFlavour.failure(err);
    return userFailureFn.apply(null, [err].concat(args));
  };

  require(['flavour', 'underscore', 'lib/utils/version'], function(flavour, _, version) {
    _hull.version = version;
    _extend = _.extend;
    currentFlavour = flavour;
    return lock.unlock();
  });

}).call(this);

define("lib/bootstrap", function(){});

//! moment.js
//! version : 2.6.0
//! authors : Tim Wood, Iskren Chernev, Moment.js contributors
//! license : MIT
//! momentjs.com

(function (undefined) {

    /************************************
        Constants
    ************************************/

    var moment,
        VERSION = "2.6.0",
        // the global-scope this is NOT the global object in Node.js
        globalScope = typeof global !== 'undefined' ? global : this,
        oldGlobalMoment,
        round = Math.round,
        i,

        YEAR = 0,
        MONTH = 1,
        DATE = 2,
        HOUR = 3,
        MINUTE = 4,
        SECOND = 5,
        MILLISECOND = 6,

        // internal storage for language config files
        languages = {},

        // moment internal properties
        momentProperties = {
            _isAMomentObject: null,
            _i : null,
            _f : null,
            _l : null,
            _strict : null,
            _isUTC : null,
            _offset : null,  // optional. Combine with _isUTC
            _pf : null,
            _lang : null  // optional
        },

        // check for nodeJS
        hasModule = (typeof module !== 'undefined' && module.exports),

        // ASP.NET json date format regex
        aspNetJsonRegex = /^\/?Date\((\-?\d+)/i,
        aspNetTimeSpanJsonRegex = /(\-)?(?:(\d*)\.)?(\d+)\:(\d+)(?:\:(\d+)\.?(\d{3})?)?/,

        // from http://docs.closure-library.googlecode.com/git/closure_goog_date_date.js.source.html
        // somewhat more in line with 4.4.3.2 2004 spec, but allows decimal anywhere
        isoDurationRegex = /^(-)?P(?:(?:([0-9,.]*)Y)?(?:([0-9,.]*)M)?(?:([0-9,.]*)D)?(?:T(?:([0-9,.]*)H)?(?:([0-9,.]*)M)?(?:([0-9,.]*)S)?)?|([0-9,.]*)W)$/,

        // format tokens
        formattingTokens = /(\[[^\[]*\])|(\\)?(Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Q|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|mm?|ss?|S{1,4}|X|zz?|ZZ?|.)/g,
        localFormattingTokens = /(\[[^\[]*\])|(\\)?(LT|LL?L?L?|l{1,4})/g,

        // parsing token regexes
        parseTokenOneOrTwoDigits = /\d\d?/, // 0 - 99
        parseTokenOneToThreeDigits = /\d{1,3}/, // 0 - 999
        parseTokenOneToFourDigits = /\d{1,4}/, // 0 - 9999
        parseTokenOneToSixDigits = /[+\-]?\d{1,6}/, // -999,999 - 999,999
        parseTokenDigits = /\d+/, // nonzero number of digits
        parseTokenWord = /[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i, // any word (or two) characters or numbers including two/three word month in arabic.
        parseTokenTimezone = /Z|[\+\-]\d\d:?\d\d/gi, // +00:00 -00:00 +0000 -0000 or Z
        parseTokenT = /T/i, // T (ISO separator)
        parseTokenTimestampMs = /[\+\-]?\d+(\.\d{1,3})?/, // 123456789 123456789.123
        parseTokenOrdinal = /\d{1,2}/,

        //strict parsing regexes
        parseTokenOneDigit = /\d/, // 0 - 9
        parseTokenTwoDigits = /\d\d/, // 00 - 99
        parseTokenThreeDigits = /\d{3}/, // 000 - 999
        parseTokenFourDigits = /\d{4}/, // 0000 - 9999
        parseTokenSixDigits = /[+-]?\d{6}/, // -999,999 - 999,999
        parseTokenSignedNumber = /[+-]?\d+/, // -inf - inf

        // iso 8601 regex
        // 0000-00-00 0000-W00 or 0000-W00-0 + T + 00 or 00:00 or 00:00:00 or 00:00:00.000 + +00:00 or +0000 or +00)
        isoRegex = /^\s*(?:[+-]\d{6}|\d{4})-(?:(\d\d-\d\d)|(W\d\d$)|(W\d\d-\d)|(\d\d\d))((T| )(\d\d(:\d\d(:\d\d(\.\d+)?)?)?)?([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/,

        isoFormat = 'YYYY-MM-DDTHH:mm:ssZ',

        isoDates = [
            ['YYYYYY-MM-DD', /[+-]\d{6}-\d{2}-\d{2}/],
            ['YYYY-MM-DD', /\d{4}-\d{2}-\d{2}/],
            ['GGGG-[W]WW-E', /\d{4}-W\d{2}-\d/],
            ['GGGG-[W]WW', /\d{4}-W\d{2}/],
            ['YYYY-DDD', /\d{4}-\d{3}/]
        ],

        // iso time formats and regexes
        isoTimes = [
            ['HH:mm:ss.SSSS', /(T| )\d\d:\d\d:\d\d\.\d+/],
            ['HH:mm:ss', /(T| )\d\d:\d\d:\d\d/],
            ['HH:mm', /(T| )\d\d:\d\d/],
            ['HH', /(T| )\d\d/]
        ],

        // timezone chunker "+10:00" > ["10", "00"] or "-1530" > ["-15", "30"]
        parseTimezoneChunker = /([\+\-]|\d\d)/gi,

        // getter and setter names
        proxyGettersAndSetters = 'Date|Hours|Minutes|Seconds|Milliseconds'.split('|'),
        unitMillisecondFactors = {
            'Milliseconds' : 1,
            'Seconds' : 1e3,
            'Minutes' : 6e4,
            'Hours' : 36e5,
            'Days' : 864e5,
            'Months' : 2592e6,
            'Years' : 31536e6
        },

        unitAliases = {
            ms : 'millisecond',
            s : 'second',
            m : 'minute',
            h : 'hour',
            d : 'day',
            D : 'date',
            w : 'week',
            W : 'isoWeek',
            M : 'month',
            Q : 'quarter',
            y : 'year',
            DDD : 'dayOfYear',
            e : 'weekday',
            E : 'isoWeekday',
            gg: 'weekYear',
            GG: 'isoWeekYear'
        },

        camelFunctions = {
            dayofyear : 'dayOfYear',
            isoweekday : 'isoWeekday',
            isoweek : 'isoWeek',
            weekyear : 'weekYear',
            isoweekyear : 'isoWeekYear'
        },

        // format function strings
        formatFunctions = {},

        // tokens to ordinalize and pad
        ordinalizeTokens = 'DDD w W M D d'.split(' '),
        paddedTokens = 'M D H h m s w W'.split(' '),

        formatTokenFunctions = {
            M    : function () {
                return this.month() + 1;
            },
            MMM  : function (format) {
                return this.lang().monthsShort(this, format);
            },
            MMMM : function (format) {
                return this.lang().months(this, format);
            },
            D    : function () {
                return this.date();
            },
            DDD  : function () {
                return this.dayOfYear();
            },
            d    : function () {
                return this.day();
            },
            dd   : function (format) {
                return this.lang().weekdaysMin(this, format);
            },
            ddd  : function (format) {
                return this.lang().weekdaysShort(this, format);
            },
            dddd : function (format) {
                return this.lang().weekdays(this, format);
            },
            w    : function () {
                return this.week();
            },
            W    : function () {
                return this.isoWeek();
            },
            YY   : function () {
                return leftZeroFill(this.year() % 100, 2);
            },
            YYYY : function () {
                return leftZeroFill(this.year(), 4);
            },
            YYYYY : function () {
                return leftZeroFill(this.year(), 5);
            },
            YYYYYY : function () {
                var y = this.year(), sign = y >= 0 ? '+' : '-';
                return sign + leftZeroFill(Math.abs(y), 6);
            },
            gg   : function () {
                return leftZeroFill(this.weekYear() % 100, 2);
            },
            gggg : function () {
                return leftZeroFill(this.weekYear(), 4);
            },
            ggggg : function () {
                return leftZeroFill(this.weekYear(), 5);
            },
            GG   : function () {
                return leftZeroFill(this.isoWeekYear() % 100, 2);
            },
            GGGG : function () {
                return leftZeroFill(this.isoWeekYear(), 4);
            },
            GGGGG : function () {
                return leftZeroFill(this.isoWeekYear(), 5);
            },
            e : function () {
                return this.weekday();
            },
            E : function () {
                return this.isoWeekday();
            },
            a    : function () {
                return this.lang().meridiem(this.hours(), this.minutes(), true);
            },
            A    : function () {
                return this.lang().meridiem(this.hours(), this.minutes(), false);
            },
            H    : function () {
                return this.hours();
            },
            h    : function () {
                return this.hours() % 12 || 12;
            },
            m    : function () {
                return this.minutes();
            },
            s    : function () {
                return this.seconds();
            },
            S    : function () {
                return toInt(this.milliseconds() / 100);
            },
            SS   : function () {
                return leftZeroFill(toInt(this.milliseconds() / 10), 2);
            },
            SSS  : function () {
                return leftZeroFill(this.milliseconds(), 3);
            },
            SSSS : function () {
                return leftZeroFill(this.milliseconds(), 3);
            },
            Z    : function () {
                var a = -this.zone(),
                    b = "+";
                if (a < 0) {
                    a = -a;
                    b = "-";
                }
                return b + leftZeroFill(toInt(a / 60), 2) + ":" + leftZeroFill(toInt(a) % 60, 2);
            },
            ZZ   : function () {
                var a = -this.zone(),
                    b = "+";
                if (a < 0) {
                    a = -a;
                    b = "-";
                }
                return b + leftZeroFill(toInt(a / 60), 2) + leftZeroFill(toInt(a) % 60, 2);
            },
            z : function () {
                return this.zoneAbbr();
            },
            zz : function () {
                return this.zoneName();
            },
            X    : function () {
                return this.unix();
            },
            Q : function () {
                return this.quarter();
            }
        },

        lists = ['months', 'monthsShort', 'weekdays', 'weekdaysShort', 'weekdaysMin'];

    function defaultParsingFlags() {
        // We need to deep clone this object, and es5 standard is not very
        // helpful.
        return {
            empty : false,
            unusedTokens : [],
            unusedInput : [],
            overflow : -2,
            charsLeftOver : 0,
            nullInput : false,
            invalidMonth : null,
            invalidFormat : false,
            userInvalidated : false,
            iso: false
        };
    }

    function deprecate(msg, fn) {
        var firstTime = true;
        function printMsg() {
            if (moment.suppressDeprecationWarnings === false &&
                    typeof console !== 'undefined' && console.warn) {
                console.warn("Deprecation warning: " + msg);
            }
        }
        return extend(function () {
            if (firstTime) {
                printMsg();
                firstTime = false;
            }
            return fn.apply(this, arguments);
        }, fn);
    }

    function padToken(func, count) {
        return function (a) {
            return leftZeroFill(func.call(this, a), count);
        };
    }
    function ordinalizeToken(func, period) {
        return function (a) {
            return this.lang().ordinal(func.call(this, a), period);
        };
    }

    while (ordinalizeTokens.length) {
        i = ordinalizeTokens.pop();
        formatTokenFunctions[i + 'o'] = ordinalizeToken(formatTokenFunctions[i], i);
    }
    while (paddedTokens.length) {
        i = paddedTokens.pop();
        formatTokenFunctions[i + i] = padToken(formatTokenFunctions[i], 2);
    }
    formatTokenFunctions.DDDD = padToken(formatTokenFunctions.DDD, 3);


    /************************************
        Constructors
    ************************************/

    function Language() {

    }

    // Moment prototype object
    function Moment(config) {
        checkOverflow(config);
        extend(this, config);
    }

    // Duration Constructor
    function Duration(duration) {
        var normalizedInput = normalizeObjectUnits(duration),
            years = normalizedInput.year || 0,
            quarters = normalizedInput.quarter || 0,
            months = normalizedInput.month || 0,
            weeks = normalizedInput.week || 0,
            days = normalizedInput.day || 0,
            hours = normalizedInput.hour || 0,
            minutes = normalizedInput.minute || 0,
            seconds = normalizedInput.second || 0,
            milliseconds = normalizedInput.millisecond || 0;

        // representation for dateAddRemove
        this._milliseconds = +milliseconds +
            seconds * 1e3 + // 1000
            minutes * 6e4 + // 1000 * 60
            hours * 36e5; // 1000 * 60 * 60
        // Because of dateAddRemove treats 24 hours as different from a
        // day when working around DST, we need to store them separately
        this._days = +days +
            weeks * 7;
        // It is impossible translate months into days without knowing
        // which months you are are talking about, so we have to store
        // it separately.
        this._months = +months +
            quarters * 3 +
            years * 12;

        this._data = {};

        this._bubble();
    }

    /************************************
        Helpers
    ************************************/


    function extend(a, b) {
        for (var i in b) {
            if (b.hasOwnProperty(i)) {
                a[i] = b[i];
            }
        }

        if (b.hasOwnProperty("toString")) {
            a.toString = b.toString;
        }

        if (b.hasOwnProperty("valueOf")) {
            a.valueOf = b.valueOf;
        }

        return a;
    }

    function cloneMoment(m) {
        var result = {}, i;
        for (i in m) {
            if (m.hasOwnProperty(i) && momentProperties.hasOwnProperty(i)) {
                result[i] = m[i];
            }
        }

        return result;
    }

    function absRound(number) {
        if (number < 0) {
            return Math.ceil(number);
        } else {
            return Math.floor(number);
        }
    }

    // left zero fill a number
    // see http://jsperf.com/left-zero-filling for performance comparison
    function leftZeroFill(number, targetLength, forceSign) {
        var output = '' + Math.abs(number),
            sign = number >= 0;

        while (output.length < targetLength) {
            output = '0' + output;
        }
        return (sign ? (forceSign ? '+' : '') : '-') + output;
    }

    // helper function for _.addTime and _.subtractTime
    function addOrSubtractDurationFromMoment(mom, duration, isAdding, updateOffset) {
        var milliseconds = duration._milliseconds,
            days = duration._days,
            months = duration._months;
        updateOffset = updateOffset == null ? true : updateOffset;

        if (milliseconds) {
            mom._d.setTime(+mom._d + milliseconds * isAdding);
        }
        if (days) {
            rawSetter(mom, 'Date', rawGetter(mom, 'Date') + days * isAdding);
        }
        if (months) {
            rawMonthSetter(mom, rawGetter(mom, 'Month') + months * isAdding);
        }
        if (updateOffset) {
            moment.updateOffset(mom, days || months);
        }
    }

    // check if is an array
    function isArray(input) {
        return Object.prototype.toString.call(input) === '[object Array]';
    }

    function isDate(input) {
        return  Object.prototype.toString.call(input) === '[object Date]' ||
                input instanceof Date;
    }

    // compare two arrays, return the number of differences
    function compareArrays(array1, array2, dontConvert) {
        var len = Math.min(array1.length, array2.length),
            lengthDiff = Math.abs(array1.length - array2.length),
            diffs = 0,
            i;
        for (i = 0; i < len; i++) {
            if ((dontConvert && array1[i] !== array2[i]) ||
                (!dontConvert && toInt(array1[i]) !== toInt(array2[i]))) {
                diffs++;
            }
        }
        return diffs + lengthDiff;
    }

    function normalizeUnits(units) {
        if (units) {
            var lowered = units.toLowerCase().replace(/(.)s$/, '$1');
            units = unitAliases[units] || camelFunctions[lowered] || lowered;
        }
        return units;
    }

    function normalizeObjectUnits(inputObject) {
        var normalizedInput = {},
            normalizedProp,
            prop;

        for (prop in inputObject) {
            if (inputObject.hasOwnProperty(prop)) {
                normalizedProp = normalizeUnits(prop);
                if (normalizedProp) {
                    normalizedInput[normalizedProp] = inputObject[prop];
                }
            }
        }

        return normalizedInput;
    }

    function makeList(field) {
        var count, setter;

        if (field.indexOf('week') === 0) {
            count = 7;
            setter = 'day';
        }
        else if (field.indexOf('month') === 0) {
            count = 12;
            setter = 'month';
        }
        else {
            return;
        }

        moment[field] = function (format, index) {
            var i, getter,
                method = moment.fn._lang[field],
                results = [];

            if (typeof format === 'number') {
                index = format;
                format = undefined;
            }

            getter = function (i) {
                var m = moment().utc().set(setter, i);
                return method.call(moment.fn._lang, m, format || '');
            };

            if (index != null) {
                return getter(index);
            }
            else {
                for (i = 0; i < count; i++) {
                    results.push(getter(i));
                }
                return results;
            }
        };
    }

    function toInt(argumentForCoercion) {
        var coercedNumber = +argumentForCoercion,
            value = 0;

        if (coercedNumber !== 0 && isFinite(coercedNumber)) {
            if (coercedNumber >= 0) {
                value = Math.floor(coercedNumber);
            } else {
                value = Math.ceil(coercedNumber);
            }
        }

        return value;
    }

    function daysInMonth(year, month) {
        return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    }

    function weeksInYear(year, dow, doy) {
        return weekOfYear(moment([year, 11, 31 + dow - doy]), dow, doy).week;
    }

    function daysInYear(year) {
        return isLeapYear(year) ? 366 : 365;
    }

    function isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    }

    function checkOverflow(m) {
        var overflow;
        if (m._a && m._pf.overflow === -2) {
            overflow =
                m._a[MONTH] < 0 || m._a[MONTH] > 11 ? MONTH :
                m._a[DATE] < 1 || m._a[DATE] > daysInMonth(m._a[YEAR], m._a[MONTH]) ? DATE :
                m._a[HOUR] < 0 || m._a[HOUR] > 23 ? HOUR :
                m._a[MINUTE] < 0 || m._a[MINUTE] > 59 ? MINUTE :
                m._a[SECOND] < 0 || m._a[SECOND] > 59 ? SECOND :
                m._a[MILLISECOND] < 0 || m._a[MILLISECOND] > 999 ? MILLISECOND :
                -1;

            if (m._pf._overflowDayOfYear && (overflow < YEAR || overflow > DATE)) {
                overflow = DATE;
            }

            m._pf.overflow = overflow;
        }
    }

    function isValid(m) {
        if (m._isValid == null) {
            m._isValid = !isNaN(m._d.getTime()) &&
                m._pf.overflow < 0 &&
                !m._pf.empty &&
                !m._pf.invalidMonth &&
                !m._pf.nullInput &&
                !m._pf.invalidFormat &&
                !m._pf.userInvalidated;

            if (m._strict) {
                m._isValid = m._isValid &&
                    m._pf.charsLeftOver === 0 &&
                    m._pf.unusedTokens.length === 0;
            }
        }
        return m._isValid;
    }

    function normalizeLanguage(key) {
        return key ? key.toLowerCase().replace('_', '-') : key;
    }

    // Return a moment from input, that is local/utc/zone equivalent to model.
    function makeAs(input, model) {
        return model._isUTC ? moment(input).zone(model._offset || 0) :
            moment(input).local();
    }

    /************************************
        Languages
    ************************************/


    extend(Language.prototype, {

        set : function (config) {
            var prop, i;
            for (i in config) {
                prop = config[i];
                if (typeof prop === 'function') {
                    this[i] = prop;
                } else {
                    this['_' + i] = prop;
                }
            }
        },

        _months : "January_February_March_April_May_June_July_August_September_October_November_December".split("_"),
        months : function (m) {
            return this._months[m.month()];
        },

        _monthsShort : "Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_"),
        monthsShort : function (m) {
            return this._monthsShort[m.month()];
        },

        monthsParse : function (monthName) {
            var i, mom, regex;

            if (!this._monthsParse) {
                this._monthsParse = [];
            }

            for (i = 0; i < 12; i++) {
                // make the regex if we don't have it already
                if (!this._monthsParse[i]) {
                    mom = moment.utc([2000, i]);
                    regex = '^' + this.months(mom, '') + '|^' + this.monthsShort(mom, '');
                    this._monthsParse[i] = new RegExp(regex.replace('.', ''), 'i');
                }
                // test the regex
                if (this._monthsParse[i].test(monthName)) {
                    return i;
                }
            }
        },

        _weekdays : "Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),
        weekdays : function (m) {
            return this._weekdays[m.day()];
        },

        _weekdaysShort : "Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_"),
        weekdaysShort : function (m) {
            return this._weekdaysShort[m.day()];
        },

        _weekdaysMin : "Su_Mo_Tu_We_Th_Fr_Sa".split("_"),
        weekdaysMin : function (m) {
            return this._weekdaysMin[m.day()];
        },

        weekdaysParse : function (weekdayName) {
            var i, mom, regex;

            if (!this._weekdaysParse) {
                this._weekdaysParse = [];
            }

            for (i = 0; i < 7; i++) {
                // make the regex if we don't have it already
                if (!this._weekdaysParse[i]) {
                    mom = moment([2000, 1]).day(i);
                    regex = '^' + this.weekdays(mom, '') + '|^' + this.weekdaysShort(mom, '') + '|^' + this.weekdaysMin(mom, '');
                    this._weekdaysParse[i] = new RegExp(regex.replace('.', ''), 'i');
                }
                // test the regex
                if (this._weekdaysParse[i].test(weekdayName)) {
                    return i;
                }
            }
        },

        _longDateFormat : {
            LT : "h:mm A",
            L : "MM/DD/YYYY",
            LL : "MMMM D YYYY",
            LLL : "MMMM D YYYY LT",
            LLLL : "dddd, MMMM D YYYY LT"
        },
        longDateFormat : function (key) {
            var output = this._longDateFormat[key];
            if (!output && this._longDateFormat[key.toUpperCase()]) {
                output = this._longDateFormat[key.toUpperCase()].replace(/MMMM|MM|DD|dddd/g, function (val) {
                    return val.slice(1);
                });
                this._longDateFormat[key] = output;
            }
            return output;
        },

        isPM : function (input) {
            // IE8 Quirks Mode & IE7 Standards Mode do not allow accessing strings like arrays
            // Using charAt should be more compatible.
            return ((input + '').toLowerCase().charAt(0) === 'p');
        },

        _meridiemParse : /[ap]\.?m?\.?/i,
        meridiem : function (hours, minutes, isLower) {
            if (hours > 11) {
                return isLower ? 'pm' : 'PM';
            } else {
                return isLower ? 'am' : 'AM';
            }
        },

        _calendar : {
            sameDay : '[Today at] LT',
            nextDay : '[Tomorrow at] LT',
            nextWeek : 'dddd [at] LT',
            lastDay : '[Yesterday at] LT',
            lastWeek : '[Last] dddd [at] LT',
            sameElse : 'L'
        },
        calendar : function (key, mom) {
            var output = this._calendar[key];
            return typeof output === 'function' ? output.apply(mom) : output;
        },

        _relativeTime : {
            future : "in %s",
            past : "%s ago",
            s : "a few seconds",
            m : "a minute",
            mm : "%d minutes",
            h : "an hour",
            hh : "%d hours",
            d : "a day",
            dd : "%d days",
            M : "a month",
            MM : "%d months",
            y : "a year",
            yy : "%d years"
        },
        relativeTime : function (number, withoutSuffix, string, isFuture) {
            var output = this._relativeTime[string];
            return (typeof output === 'function') ?
                output(number, withoutSuffix, string, isFuture) :
                output.replace(/%d/i, number);
        },
        pastFuture : function (diff, output) {
            var format = this._relativeTime[diff > 0 ? 'future' : 'past'];
            return typeof format === 'function' ? format(output) : format.replace(/%s/i, output);
        },

        ordinal : function (number) {
            return this._ordinal.replace("%d", number);
        },
        _ordinal : "%d",

        preparse : function (string) {
            return string;
        },

        postformat : function (string) {
            return string;
        },

        week : function (mom) {
            return weekOfYear(mom, this._week.dow, this._week.doy).week;
        },

        _week : {
            dow : 0, // Sunday is the first day of the week.
            doy : 6  // The week that contains Jan 1st is the first week of the year.
        },

        _invalidDate: 'Invalid date',
        invalidDate: function () {
            return this._invalidDate;
        }
    });

    // Loads a language definition into the `languages` cache.  The function
    // takes a key and optionally values.  If not in the browser and no values
    // are provided, it will load the language file module.  As a convenience,
    // this function also returns the language values.
    function loadLang(key, values) {
        values.abbr = key;
        if (!languages[key]) {
            languages[key] = new Language();
        }
        languages[key].set(values);
        return languages[key];
    }

    // Remove a language from the `languages` cache. Mostly useful in tests.
    function unloadLang(key) {
        delete languages[key];
    }

    // Determines which language definition to use and returns it.
    //
    // With no parameters, it will return the global language.  If you
    // pass in a language key, such as 'en', it will return the
    // definition for 'en', so long as 'en' has already been loaded using
    // moment.lang.
    function getLangDefinition(key) {
        var i = 0, j, lang, next, split,
            get = function (k) {
                if (!languages[k] && hasModule) {
                    try {
                        require('./lang/' + k);
                    } catch (e) { }
                }
                return languages[k];
            };

        if (!key) {
            return moment.fn._lang;
        }

        if (!isArray(key)) {
            //short-circuit everything else
            lang = get(key);
            if (lang) {
                return lang;
            }
            key = [key];
        }

        //pick the language from the array
        //try ['en-au', 'en-gb'] as 'en-au', 'en-gb', 'en', as in move through the list trying each
        //substring from most specific to least, but move to the next array item if it's a more specific variant than the current root
        while (i < key.length) {
            split = normalizeLanguage(key[i]).split('-');
            j = split.length;
            next = normalizeLanguage(key[i + 1]);
            next = next ? next.split('-') : null;
            while (j > 0) {
                lang = get(split.slice(0, j).join('-'));
                if (lang) {
                    return lang;
                }
                if (next && next.length >= j && compareArrays(split, next, true) >= j - 1) {
                    //the next array item is better than a shallower substring of this one
                    break;
                }
                j--;
            }
            i++;
        }
        return moment.fn._lang;
    }

    /************************************
        Formatting
    ************************************/


    function removeFormattingTokens(input) {
        if (input.match(/\[[\s\S]/)) {
            return input.replace(/^\[|\]$/g, "");
        }
        return input.replace(/\\/g, "");
    }

    function makeFormatFunction(format) {
        var array = format.match(formattingTokens), i, length;

        for (i = 0, length = array.length; i < length; i++) {
            if (formatTokenFunctions[array[i]]) {
                array[i] = formatTokenFunctions[array[i]];
            } else {
                array[i] = removeFormattingTokens(array[i]);
            }
        }

        return function (mom) {
            var output = "";
            for (i = 0; i < length; i++) {
                output += array[i] instanceof Function ? array[i].call(mom, format) : array[i];
            }
            return output;
        };
    }

    // format date using native date object
    function formatMoment(m, format) {

        if (!m.isValid()) {
            return m.lang().invalidDate();
        }

        format = expandFormat(format, m.lang());

        if (!formatFunctions[format]) {
            formatFunctions[format] = makeFormatFunction(format);
        }

        return formatFunctions[format](m);
    }

    function expandFormat(format, lang) {
        var i = 5;

        function replaceLongDateFormatTokens(input) {
            return lang.longDateFormat(input) || input;
        }

        localFormattingTokens.lastIndex = 0;
        while (i >= 0 && localFormattingTokens.test(format)) {
            format = format.replace(localFormattingTokens, replaceLongDateFormatTokens);
            localFormattingTokens.lastIndex = 0;
            i -= 1;
        }

        return format;
    }


    /************************************
        Parsing
    ************************************/


    // get the regex to find the next token
    function getParseRegexForToken(token, config) {
        var a, strict = config._strict;
        switch (token) {
        case 'Q':
            return parseTokenOneDigit;
        case 'DDDD':
            return parseTokenThreeDigits;
        case 'YYYY':
        case 'GGGG':
        case 'gggg':
            return strict ? parseTokenFourDigits : parseTokenOneToFourDigits;
        case 'Y':
        case 'G':
        case 'g':
            return parseTokenSignedNumber;
        case 'YYYYYY':
        case 'YYYYY':
        case 'GGGGG':
        case 'ggggg':
            return strict ? parseTokenSixDigits : parseTokenOneToSixDigits;
        case 'S':
            if (strict) { return parseTokenOneDigit; }
            /* falls through */
        case 'SS':
            if (strict) { return parseTokenTwoDigits; }
            /* falls through */
        case 'SSS':
            if (strict) { return parseTokenThreeDigits; }
            /* falls through */
        case 'DDD':
            return parseTokenOneToThreeDigits;
        case 'MMM':
        case 'MMMM':
        case 'dd':
        case 'ddd':
        case 'dddd':
            return parseTokenWord;
        case 'a':
        case 'A':
            return getLangDefinition(config._l)._meridiemParse;
        case 'X':
            return parseTokenTimestampMs;
        case 'Z':
        case 'ZZ':
            return parseTokenTimezone;
        case 'T':
            return parseTokenT;
        case 'SSSS':
            return parseTokenDigits;
        case 'MM':
        case 'DD':
        case 'YY':
        case 'GG':
        case 'gg':
        case 'HH':
        case 'hh':
        case 'mm':
        case 'ss':
        case 'ww':
        case 'WW':
            return strict ? parseTokenTwoDigits : parseTokenOneOrTwoDigits;
        case 'M':
        case 'D':
        case 'd':
        case 'H':
        case 'h':
        case 'm':
        case 's':
        case 'w':
        case 'W':
        case 'e':
        case 'E':
            return parseTokenOneOrTwoDigits;
        case 'Do':
            return parseTokenOrdinal;
        default :
            a = new RegExp(regexpEscape(unescapeFormat(token.replace('\\', '')), "i"));
            return a;
        }
    }

    function timezoneMinutesFromString(string) {
        string = string || "";
        var possibleTzMatches = (string.match(parseTokenTimezone) || []),
            tzChunk = possibleTzMatches[possibleTzMatches.length - 1] || [],
            parts = (tzChunk + '').match(parseTimezoneChunker) || ['-', 0, 0],
            minutes = +(parts[1] * 60) + toInt(parts[2]);

        return parts[0] === '+' ? -minutes : minutes;
    }

    // function to convert string input to date
    function addTimeToArrayFromToken(token, input, config) {
        var a, datePartArray = config._a;

        switch (token) {
        // QUARTER
        case 'Q':
            if (input != null) {
                datePartArray[MONTH] = (toInt(input) - 1) * 3;
            }
            break;
        // MONTH
        case 'M' : // fall through to MM
        case 'MM' :
            if (input != null) {
                datePartArray[MONTH] = toInt(input) - 1;
            }
            break;
        case 'MMM' : // fall through to MMMM
        case 'MMMM' :
            a = getLangDefinition(config._l).monthsParse(input);
            // if we didn't find a month name, mark the date as invalid.
            if (a != null) {
                datePartArray[MONTH] = a;
            } else {
                config._pf.invalidMonth = input;
            }
            break;
        // DAY OF MONTH
        case 'D' : // fall through to DD
        case 'DD' :
            if (input != null) {
                datePartArray[DATE] = toInt(input);
            }
            break;
        case 'Do' :
            if (input != null) {
                datePartArray[DATE] = toInt(parseInt(input, 10));
            }
            break;
        // DAY OF YEAR
        case 'DDD' : // fall through to DDDD
        case 'DDDD' :
            if (input != null) {
                config._dayOfYear = toInt(input);
            }

            break;
        // YEAR
        case 'YY' :
            datePartArray[YEAR] = moment.parseTwoDigitYear(input);
            break;
        case 'YYYY' :
        case 'YYYYY' :
        case 'YYYYYY' :
            datePartArray[YEAR] = toInt(input);
            break;
        // AM / PM
        case 'a' : // fall through to A
        case 'A' :
            config._isPm = getLangDefinition(config._l).isPM(input);
            break;
        // 24 HOUR
        case 'H' : // fall through to hh
        case 'HH' : // fall through to hh
        case 'h' : // fall through to hh
        case 'hh' :
            datePartArray[HOUR] = toInt(input);
            break;
        // MINUTE
        case 'm' : // fall through to mm
        case 'mm' :
            datePartArray[MINUTE] = toInt(input);
            break;
        // SECOND
        case 's' : // fall through to ss
        case 'ss' :
            datePartArray[SECOND] = toInt(input);
            break;
        // MILLISECOND
        case 'S' :
        case 'SS' :
        case 'SSS' :
        case 'SSSS' :
            datePartArray[MILLISECOND] = toInt(('0.' + input) * 1000);
            break;
        // UNIX TIMESTAMP WITH MS
        case 'X':
            config._d = new Date(parseFloat(input) * 1000);
            break;
        // TIMEZONE
        case 'Z' : // fall through to ZZ
        case 'ZZ' :
            config._useUTC = true;
            config._tzm = timezoneMinutesFromString(input);
            break;
        case 'w':
        case 'ww':
        case 'W':
        case 'WW':
        case 'd':
        case 'dd':
        case 'ddd':
        case 'dddd':
        case 'e':
        case 'E':
            token = token.substr(0, 1);
            /* falls through */
        case 'gg':
        case 'gggg':
        case 'GG':
        case 'GGGG':
        case 'GGGGG':
            token = token.substr(0, 2);
            if (input) {
                config._w = config._w || {};
                config._w[token] = input;
            }
            break;
        }
    }

    // convert an array to a date.
    // the array should mirror the parameters below
    // note: all values past the year are optional and will default to the lowest possible value.
    // [year, month, day , hour, minute, second, millisecond]
    function dateFromConfig(config) {
        var i, date, input = [], currentDate,
            yearToUse, fixYear, w, temp, lang, weekday, week;

        if (config._d) {
            return;
        }

        currentDate = currentDateArray(config);

        //compute day of the year from weeks and weekdays
        if (config._w && config._a[DATE] == null && config._a[MONTH] == null) {
            fixYear = function (val) {
                var intVal = parseInt(val, 10);
                return val ?
                  (val.length < 3 ? (intVal > 68 ? 1900 + intVal : 2000 + intVal) : intVal) :
                  (config._a[YEAR] == null ? moment().weekYear() : config._a[YEAR]);
            };

            w = config._w;
            if (w.GG != null || w.W != null || w.E != null) {
                temp = dayOfYearFromWeeks(fixYear(w.GG), w.W || 1, w.E, 4, 1);
            }
            else {
                lang = getLangDefinition(config._l);
                weekday = w.d != null ?  parseWeekday(w.d, lang) :
                  (w.e != null ?  parseInt(w.e, 10) + lang._week.dow : 0);

                week = parseInt(w.w, 10) || 1;

                //if we're parsing 'd', then the low day numbers may be next week
                if (w.d != null && weekday < lang._week.dow) {
                    week++;
                }

                temp = dayOfYearFromWeeks(fixYear(w.gg), week, weekday, lang._week.doy, lang._week.dow);
            }

            config._a[YEAR] = temp.year;
            config._dayOfYear = temp.dayOfYear;
        }

        //if the day of the year is set, figure out what it is
        if (config._dayOfYear) {
            yearToUse = config._a[YEAR] == null ? currentDate[YEAR] : config._a[YEAR];

            if (config._dayOfYear > daysInYear(yearToUse)) {
                config._pf._overflowDayOfYear = true;
            }

            date = makeUTCDate(yearToUse, 0, config._dayOfYear);
            config._a[MONTH] = date.getUTCMonth();
            config._a[DATE] = date.getUTCDate();
        }

        // Default to current date.
        // * if no year, month, day of month are given, default to today
        // * if day of month is given, default month and year
        // * if month is given, default only year
        // * if year is given, don't default anything
        for (i = 0; i < 3 && config._a[i] == null; ++i) {
            config._a[i] = input[i] = currentDate[i];
        }

        // Zero out whatever was not defaulted, including time
        for (; i < 7; i++) {
            config._a[i] = input[i] = (config._a[i] == null) ? (i === 2 ? 1 : 0) : config._a[i];
        }

        // add the offsets to the time to be parsed so that we can have a clean array for checking isValid
        input[HOUR] += toInt((config._tzm || 0) / 60);
        input[MINUTE] += toInt((config._tzm || 0) % 60);

        config._d = (config._useUTC ? makeUTCDate : makeDate).apply(null, input);
    }

    function dateFromObject(config) {
        var normalizedInput;

        if (config._d) {
            return;
        }

        normalizedInput = normalizeObjectUnits(config._i);
        config._a = [
            normalizedInput.year,
            normalizedInput.month,
            normalizedInput.day,
            normalizedInput.hour,
            normalizedInput.minute,
            normalizedInput.second,
            normalizedInput.millisecond
        ];

        dateFromConfig(config);
    }

    function currentDateArray(config) {
        var now = new Date();
        if (config._useUTC) {
            return [
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate()
            ];
        } else {
            return [now.getFullYear(), now.getMonth(), now.getDate()];
        }
    }

    // date from string and format string
    function makeDateFromStringAndFormat(config) {

        config._a = [];
        config._pf.empty = true;

        // This array is used to make a Date, either with `new Date` or `Date.UTC`
        var lang = getLangDefinition(config._l),
            string = '' + config._i,
            i, parsedInput, tokens, token, skipped,
            stringLength = string.length,
            totalParsedInputLength = 0;

        tokens = expandFormat(config._f, lang).match(formattingTokens) || [];

        for (i = 0; i < tokens.length; i++) {
            token = tokens[i];
            parsedInput = (string.match(getParseRegexForToken(token, config)) || [])[0];
            if (parsedInput) {
                skipped = string.substr(0, string.indexOf(parsedInput));
                if (skipped.length > 0) {
                    config._pf.unusedInput.push(skipped);
                }
                string = string.slice(string.indexOf(parsedInput) + parsedInput.length);
                totalParsedInputLength += parsedInput.length;
            }
            // don't parse if it's not a known token
            if (formatTokenFunctions[token]) {
                if (parsedInput) {
                    config._pf.empty = false;
                }
                else {
                    config._pf.unusedTokens.push(token);
                }
                addTimeToArrayFromToken(token, parsedInput, config);
            }
            else if (config._strict && !parsedInput) {
                config._pf.unusedTokens.push(token);
            }
        }

        // add remaining unparsed input length to the string
        config._pf.charsLeftOver = stringLength - totalParsedInputLength;
        if (string.length > 0) {
            config._pf.unusedInput.push(string);
        }

        // handle am pm
        if (config._isPm && config._a[HOUR] < 12) {
            config._a[HOUR] += 12;
        }
        // if is 12 am, change hours to 0
        if (config._isPm === false && config._a[HOUR] === 12) {
            config._a[HOUR] = 0;
        }

        dateFromConfig(config);
        checkOverflow(config);
    }

    function unescapeFormat(s) {
        return s.replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function (matched, p1, p2, p3, p4) {
            return p1 || p2 || p3 || p4;
        });
    }

    // Code from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
    function regexpEscape(s) {
        return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    // date from string and array of format strings
    function makeDateFromStringAndArray(config) {
        var tempConfig,
            bestMoment,

            scoreToBeat,
            i,
            currentScore;

        if (config._f.length === 0) {
            config._pf.invalidFormat = true;
            config._d = new Date(NaN);
            return;
        }

        for (i = 0; i < config._f.length; i++) {
            currentScore = 0;
            tempConfig = extend({}, config);
            tempConfig._pf = defaultParsingFlags();
            tempConfig._f = config._f[i];
            makeDateFromStringAndFormat(tempConfig);

            if (!isValid(tempConfig)) {
                continue;
            }

            // if there is any input that was not parsed add a penalty for that format
            currentScore += tempConfig._pf.charsLeftOver;

            //or tokens
            currentScore += tempConfig._pf.unusedTokens.length * 10;

            tempConfig._pf.score = currentScore;

            if (scoreToBeat == null || currentScore < scoreToBeat) {
                scoreToBeat = currentScore;
                bestMoment = tempConfig;
            }
        }

        extend(config, bestMoment || tempConfig);
    }

    // date from iso format
    function makeDateFromString(config) {
        var i, l,
            string = config._i,
            match = isoRegex.exec(string);

        if (match) {
            config._pf.iso = true;
            for (i = 0, l = isoDates.length; i < l; i++) {
                if (isoDates[i][1].exec(string)) {
                    // match[5] should be "T" or undefined
                    config._f = isoDates[i][0] + (match[6] || " ");
                    break;
                }
            }
            for (i = 0, l = isoTimes.length; i < l; i++) {
                if (isoTimes[i][1].exec(string)) {
                    config._f += isoTimes[i][0];
                    break;
                }
            }
            if (string.match(parseTokenTimezone)) {
                config._f += "Z";
            }
            makeDateFromStringAndFormat(config);
        }
        else {
            moment.createFromInputFallback(config);
        }
    }

    function makeDateFromInput(config) {
        var input = config._i,
            matched = aspNetJsonRegex.exec(input);

        if (input === undefined) {
            config._d = new Date();
        } else if (matched) {
            config._d = new Date(+matched[1]);
        } else if (typeof input === 'string') {
            makeDateFromString(config);
        } else if (isArray(input)) {
            config._a = input.slice(0);
            dateFromConfig(config);
        } else if (isDate(input)) {
            config._d = new Date(+input);
        } else if (typeof(input) === 'object') {
            dateFromObject(config);
        } else if (typeof(input) === 'number') {
            // from milliseconds
            config._d = new Date(input);
        } else {
            moment.createFromInputFallback(config);
        }
    }

    function makeDate(y, m, d, h, M, s, ms) {
        //can't just apply() to create a date:
        //http://stackoverflow.com/questions/181348/instantiating-a-javascript-object-by-calling-prototype-constructor-apply
        var date = new Date(y, m, d, h, M, s, ms);

        //the date constructor doesn't accept years < 1970
        if (y < 1970) {
            date.setFullYear(y);
        }
        return date;
    }

    function makeUTCDate(y) {
        var date = new Date(Date.UTC.apply(null, arguments));
        if (y < 1970) {
            date.setUTCFullYear(y);
        }
        return date;
    }

    function parseWeekday(input, language) {
        if (typeof input === 'string') {
            if (!isNaN(input)) {
                input = parseInt(input, 10);
            }
            else {
                input = language.weekdaysParse(input);
                if (typeof input !== 'number') {
                    return null;
                }
            }
        }
        return input;
    }

    /************************************
        Relative Time
    ************************************/


    // helper function for moment.fn.from, moment.fn.fromNow, and moment.duration.fn.humanize
    function substituteTimeAgo(string, number, withoutSuffix, isFuture, lang) {
        return lang.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
    }

    function relativeTime(milliseconds, withoutSuffix, lang) {
        var seconds = round(Math.abs(milliseconds) / 1000),
            minutes = round(seconds / 60),
            hours = round(minutes / 60),
            days = round(hours / 24),
            years = round(days / 365),
            args = seconds < 45 && ['s', seconds] ||
                minutes === 1 && ['m'] ||
                minutes < 45 && ['mm', minutes] ||
                hours === 1 && ['h'] ||
                hours < 22 && ['hh', hours] ||
                days === 1 && ['d'] ||
                days <= 25 && ['dd', days] ||
                days <= 45 && ['M'] ||
                days < 345 && ['MM', round(days / 30)] ||
                years === 1 && ['y'] || ['yy', years];
        args[2] = withoutSuffix;
        args[3] = milliseconds > 0;
        args[4] = lang;
        return substituteTimeAgo.apply({}, args);
    }


    /************************************
        Week of Year
    ************************************/


    // firstDayOfWeek       0 = sun, 6 = sat
    //                      the day of the week that starts the week
    //                      (usually sunday or monday)
    // firstDayOfWeekOfYear 0 = sun, 6 = sat
    //                      the first week is the week that contains the first
    //                      of this day of the week
    //                      (eg. ISO weeks use thursday (4))
    function weekOfYear(mom, firstDayOfWeek, firstDayOfWeekOfYear) {
        var end = firstDayOfWeekOfYear - firstDayOfWeek,
            daysToDayOfWeek = firstDayOfWeekOfYear - mom.day(),
            adjustedMoment;


        if (daysToDayOfWeek > end) {
            daysToDayOfWeek -= 7;
        }

        if (daysToDayOfWeek < end - 7) {
            daysToDayOfWeek += 7;
        }

        adjustedMoment = moment(mom).add('d', daysToDayOfWeek);
        return {
            week: Math.ceil(adjustedMoment.dayOfYear() / 7),
            year: adjustedMoment.year()
        };
    }

    //http://en.wikipedia.org/wiki/ISO_week_date#Calculating_a_date_given_the_year.2C_week_number_and_weekday
    function dayOfYearFromWeeks(year, week, weekday, firstDayOfWeekOfYear, firstDayOfWeek) {
        var d = makeUTCDate(year, 0, 1).getUTCDay(), daysToAdd, dayOfYear;

        weekday = weekday != null ? weekday : firstDayOfWeek;
        daysToAdd = firstDayOfWeek - d + (d > firstDayOfWeekOfYear ? 7 : 0) - (d < firstDayOfWeek ? 7 : 0);
        dayOfYear = 7 * (week - 1) + (weekday - firstDayOfWeek) + daysToAdd + 1;

        return {
            year: dayOfYear > 0 ? year : year - 1,
            dayOfYear: dayOfYear > 0 ?  dayOfYear : daysInYear(year - 1) + dayOfYear
        };
    }

    /************************************
        Top Level Functions
    ************************************/

    function makeMoment(config) {
        var input = config._i,
            format = config._f;

        if (input === null || (format === undefined && input === '')) {
            return moment.invalid({nullInput: true});
        }

        if (typeof input === 'string') {
            config._i = input = getLangDefinition().preparse(input);
        }

        if (moment.isMoment(input)) {
            config = cloneMoment(input);

            config._d = new Date(+input._d);
        } else if (format) {
            if (isArray(format)) {
                makeDateFromStringAndArray(config);
            } else {
                makeDateFromStringAndFormat(config);
            }
        } else {
            makeDateFromInput(config);
        }

        return new Moment(config);
    }

    moment = function (input, format, lang, strict) {
        var c;

        if (typeof(lang) === "boolean") {
            strict = lang;
            lang = undefined;
        }
        // object construction must be done this way.
        // https://github.com/moment/moment/issues/1423
        c = {};
        c._isAMomentObject = true;
        c._i = input;
        c._f = format;
        c._l = lang;
        c._strict = strict;
        c._isUTC = false;
        c._pf = defaultParsingFlags();

        return makeMoment(c);
    };

    moment.suppressDeprecationWarnings = false;

    moment.createFromInputFallback = deprecate(
            "moment construction falls back to js Date. This is " +
            "discouraged and will be removed in upcoming major " +
            "release. Please refer to " +
            "https://github.com/moment/moment/issues/1407 for more info.",
            function (config) {
        config._d = new Date(config._i);
    });

    // creating with utc
    moment.utc = function (input, format, lang, strict) {
        var c;

        if (typeof(lang) === "boolean") {
            strict = lang;
            lang = undefined;
        }
        // object construction must be done this way.
        // https://github.com/moment/moment/issues/1423
        c = {};
        c._isAMomentObject = true;
        c._useUTC = true;
        c._isUTC = true;
        c._l = lang;
        c._i = input;
        c._f = format;
        c._strict = strict;
        c._pf = defaultParsingFlags();

        return makeMoment(c).utc();
    };

    // creating with unix timestamp (in seconds)
    moment.unix = function (input) {
        return moment(input * 1000);
    };

    // duration
    moment.duration = function (input, key) {
        var duration = input,
            // matching against regexp is expensive, do it on demand
            match = null,
            sign,
            ret,
            parseIso;

        if (moment.isDuration(input)) {
            duration = {
                ms: input._milliseconds,
                d: input._days,
                M: input._months
            };
        } else if (typeof input === 'number') {
            duration = {};
            if (key) {
                duration[key] = input;
            } else {
                duration.milliseconds = input;
            }
        } else if (!!(match = aspNetTimeSpanJsonRegex.exec(input))) {
            sign = (match[1] === "-") ? -1 : 1;
            duration = {
                y: 0,
                d: toInt(match[DATE]) * sign,
                h: toInt(match[HOUR]) * sign,
                m: toInt(match[MINUTE]) * sign,
                s: toInt(match[SECOND]) * sign,
                ms: toInt(match[MILLISECOND]) * sign
            };
        } else if (!!(match = isoDurationRegex.exec(input))) {
            sign = (match[1] === "-") ? -1 : 1;
            parseIso = function (inp) {
                // We'd normally use ~~inp for this, but unfortunately it also
                // converts floats to ints.
                // inp may be undefined, so careful calling replace on it.
                var res = inp && parseFloat(inp.replace(',', '.'));
                // apply sign while we're at it
                return (isNaN(res) ? 0 : res) * sign;
            };
            duration = {
                y: parseIso(match[2]),
                M: parseIso(match[3]),
                d: parseIso(match[4]),
                h: parseIso(match[5]),
                m: parseIso(match[6]),
                s: parseIso(match[7]),
                w: parseIso(match[8])
            };
        }

        ret = new Duration(duration);

        if (moment.isDuration(input) && input.hasOwnProperty('_lang')) {
            ret._lang = input._lang;
        }

        return ret;
    };

    // version number
    moment.version = VERSION;

    // default format
    moment.defaultFormat = isoFormat;

    // Plugins that add properties should also add the key here (null value),
    // so we can properly clone ourselves.
    moment.momentProperties = momentProperties;

    // This function will be called whenever a moment is mutated.
    // It is intended to keep the offset in sync with the timezone.
    moment.updateOffset = function () {};

    // This function will load languages and then set the global language.  If
    // no arguments are passed in, it will simply return the current global
    // language key.
    moment.lang = function (key, values) {
        var r;
        if (!key) {
            return moment.fn._lang._abbr;
        }
        if (values) {
            loadLang(normalizeLanguage(key), values);
        } else if (values === null) {
            unloadLang(key);
            key = 'en';
        } else if (!languages[key]) {
            getLangDefinition(key);
        }
        r = moment.duration.fn._lang = moment.fn._lang = getLangDefinition(key);
        return r._abbr;
    };

    // returns language data
    moment.langData = function (key) {
        if (key && key._lang && key._lang._abbr) {
            key = key._lang._abbr;
        }
        return getLangDefinition(key);
    };

    // compare moment object
    moment.isMoment = function (obj) {
        return obj instanceof Moment ||
            (obj != null &&  obj.hasOwnProperty('_isAMomentObject'));
    };

    // for typechecking Duration objects
    moment.isDuration = function (obj) {
        return obj instanceof Duration;
    };

    for (i = lists.length - 1; i >= 0; --i) {
        makeList(lists[i]);
    }

    moment.normalizeUnits = function (units) {
        return normalizeUnits(units);
    };

    moment.invalid = function (flags) {
        var m = moment.utc(NaN);
        if (flags != null) {
            extend(m._pf, flags);
        }
        else {
            m._pf.userInvalidated = true;
        }

        return m;
    };

    moment.parseZone = function () {
        return moment.apply(null, arguments).parseZone();
    };

    moment.parseTwoDigitYear = function (input) {
        return toInt(input) + (toInt(input) > 68 ? 1900 : 2000);
    };

    /************************************
        Moment Prototype
    ************************************/


    extend(moment.fn = Moment.prototype, {

        clone : function () {
            return moment(this);
        },

        valueOf : function () {
            return +this._d + ((this._offset || 0) * 60000);
        },

        unix : function () {
            return Math.floor(+this / 1000);
        },

        toString : function () {
            return this.clone().lang('en').format("ddd MMM DD YYYY HH:mm:ss [GMT]ZZ");
        },

        toDate : function () {
            return this._offset ? new Date(+this) : this._d;
        },

        toISOString : function () {
            var m = moment(this).utc();
            if (0 < m.year() && m.year() <= 9999) {
                return formatMoment(m, 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
            } else {
                return formatMoment(m, 'YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
            }
        },

        toArray : function () {
            var m = this;
            return [
                m.year(),
                m.month(),
                m.date(),
                m.hours(),
                m.minutes(),
                m.seconds(),
                m.milliseconds()
            ];
        },

        isValid : function () {
            return isValid(this);
        },

        isDSTShifted : function () {

            if (this._a) {
                return this.isValid() && compareArrays(this._a, (this._isUTC ? moment.utc(this._a) : moment(this._a)).toArray()) > 0;
            }

            return false;
        },

        parsingFlags : function () {
            return extend({}, this._pf);
        },

        invalidAt: function () {
            return this._pf.overflow;
        },

        utc : function () {
            return this.zone(0);
        },

        local : function () {
            this.zone(0);
            this._isUTC = false;
            return this;
        },

        format : function (inputString) {
            var output = formatMoment(this, inputString || moment.defaultFormat);
            return this.lang().postformat(output);
        },

        add : function (input, val) {
            var dur;
            // switch args to support add('s', 1) and add(1, 's')
            if (typeof input === 'string') {
                dur = moment.duration(+val, input);
            } else {
                dur = moment.duration(input, val);
            }
            addOrSubtractDurationFromMoment(this, dur, 1);
            return this;
        },

        subtract : function (input, val) {
            var dur;
            // switch args to support subtract('s', 1) and subtract(1, 's')
            if (typeof input === 'string') {
                dur = moment.duration(+val, input);
            } else {
                dur = moment.duration(input, val);
            }
            addOrSubtractDurationFromMoment(this, dur, -1);
            return this;
        },

        diff : function (input, units, asFloat) {
            var that = makeAs(input, this),
                zoneDiff = (this.zone() - that.zone()) * 6e4,
                diff, output;

            units = normalizeUnits(units);

            if (units === 'year' || units === 'month') {
                // average number of days in the months in the given dates
                diff = (this.daysInMonth() + that.daysInMonth()) * 432e5; // 24 * 60 * 60 * 1000 / 2
                // difference in months
                output = ((this.year() - that.year()) * 12) + (this.month() - that.month());
                // adjust by taking difference in days, average number of days
                // and dst in the given months.
                output += ((this - moment(this).startOf('month')) -
                        (that - moment(that).startOf('month'))) / diff;
                // same as above but with zones, to negate all dst
                output -= ((this.zone() - moment(this).startOf('month').zone()) -
                        (that.zone() - moment(that).startOf('month').zone())) * 6e4 / diff;
                if (units === 'year') {
                    output = output / 12;
                }
            } else {
                diff = (this - that);
                output = units === 'second' ? diff / 1e3 : // 1000
                    units === 'minute' ? diff / 6e4 : // 1000 * 60
                    units === 'hour' ? diff / 36e5 : // 1000 * 60 * 60
                    units === 'day' ? (diff - zoneDiff) / 864e5 : // 1000 * 60 * 60 * 24, negate dst
                    units === 'week' ? (diff - zoneDiff) / 6048e5 : // 1000 * 60 * 60 * 24 * 7, negate dst
                    diff;
            }
            return asFloat ? output : absRound(output);
        },

        from : function (time, withoutSuffix) {
            return moment.duration(this.diff(time)).lang(this.lang()._abbr).humanize(!withoutSuffix);
        },

        fromNow : function (withoutSuffix) {
            return this.from(moment(), withoutSuffix);
        },

        calendar : function () {
            // We want to compare the start of today, vs this.
            // Getting start-of-today depends on whether we're zone'd or not.
            var sod = makeAs(moment(), this).startOf('day'),
                diff = this.diff(sod, 'days', true),
                format = diff < -6 ? 'sameElse' :
                    diff < -1 ? 'lastWeek' :
                    diff < 0 ? 'lastDay' :
                    diff < 1 ? 'sameDay' :
                    diff < 2 ? 'nextDay' :
                    diff < 7 ? 'nextWeek' : 'sameElse';
            return this.format(this.lang().calendar(format, this));
        },

        isLeapYear : function () {
            return isLeapYear(this.year());
        },

        isDST : function () {
            return (this.zone() < this.clone().month(0).zone() ||
                this.zone() < this.clone().month(5).zone());
        },

        day : function (input) {
            var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
            if (input != null) {
                input = parseWeekday(input, this.lang());
                return this.add({ d : input - day });
            } else {
                return day;
            }
        },

        month : makeAccessor('Month', true),

        startOf: function (units) {
            units = normalizeUnits(units);
            // the following switch intentionally omits break keywords
            // to utilize falling through the cases.
            switch (units) {
            case 'year':
                this.month(0);
                /* falls through */
            case 'quarter':
            case 'month':
                this.date(1);
                /* falls through */
            case 'week':
            case 'isoWeek':
            case 'day':
                this.hours(0);
                /* falls through */
            case 'hour':
                this.minutes(0);
                /* falls through */
            case 'minute':
                this.seconds(0);
                /* falls through */
            case 'second':
                this.milliseconds(0);
                /* falls through */
            }

            // weeks are a special case
            if (units === 'week') {
                this.weekday(0);
            } else if (units === 'isoWeek') {
                this.isoWeekday(1);
            }

            // quarters are also special
            if (units === 'quarter') {
                this.month(Math.floor(this.month() / 3) * 3);
            }

            return this;
        },

        endOf: function (units) {
            units = normalizeUnits(units);
            return this.startOf(units).add((units === 'isoWeek' ? 'week' : units), 1).subtract('ms', 1);
        },

        isAfter: function (input, units) {
            units = typeof units !== 'undefined' ? units : 'millisecond';
            return +this.clone().startOf(units) > +moment(input).startOf(units);
        },

        isBefore: function (input, units) {
            units = typeof units !== 'undefined' ? units : 'millisecond';
            return +this.clone().startOf(units) < +moment(input).startOf(units);
        },

        isSame: function (input, units) {
            units = units || 'ms';
            return +this.clone().startOf(units) === +makeAs(input, this).startOf(units);
        },

        min: function (other) {
            other = moment.apply(null, arguments);
            return other < this ? this : other;
        },

        max: function (other) {
            other = moment.apply(null, arguments);
            return other > this ? this : other;
        },

        // keepTime = true means only change the timezone, without affecting
        // the local hour. So 5:31:26 +0300 --[zone(2, true)]--> 5:31:26 +0200
        // It is possible that 5:31:26 doesn't exist int zone +0200, so we
        // adjust the time as needed, to be valid.
        //
        // Keeping the time actually adds/subtracts (one hour)
        // from the actual represented time. That is why we call updateOffset
        // a second time. In case it wants us to change the offset again
        // _changeInProgress == true case, then we have to adjust, because
        // there is no such time in the given timezone.
        zone : function (input, keepTime) {
            var offset = this._offset || 0;
            if (input != null) {
                if (typeof input === "string") {
                    input = timezoneMinutesFromString(input);
                }
                if (Math.abs(input) < 16) {
                    input = input * 60;
                }
                this._offset = input;
                this._isUTC = true;
                if (offset !== input) {
                    if (!keepTime || this._changeInProgress) {
                        addOrSubtractDurationFromMoment(this,
                                moment.duration(offset - input, 'm'), 1, false);
                    } else if (!this._changeInProgress) {
                        this._changeInProgress = true;
                        moment.updateOffset(this, true);
                        this._changeInProgress = null;
                    }
                }
            } else {
                return this._isUTC ? offset : this._d.getTimezoneOffset();
            }
            return this;
        },

        zoneAbbr : function () {
            return this._isUTC ? "UTC" : "";
        },

        zoneName : function () {
            return this._isUTC ? "Coordinated Universal Time" : "";
        },

        parseZone : function () {
            if (this._tzm) {
                this.zone(this._tzm);
            } else if (typeof this._i === 'string') {
                this.zone(this._i);
            }
            return this;
        },

        hasAlignedHourOffset : function (input) {
            if (!input) {
                input = 0;
            }
            else {
                input = moment(input).zone();
            }

            return (this.zone() - input) % 60 === 0;
        },

        daysInMonth : function () {
            return daysInMonth(this.year(), this.month());
        },

        dayOfYear : function (input) {
            var dayOfYear = round((moment(this).startOf('day') - moment(this).startOf('year')) / 864e5) + 1;
            return input == null ? dayOfYear : this.add("d", (input - dayOfYear));
        },

        quarter : function (input) {
            return input == null ? Math.ceil((this.month() + 1) / 3) : this.month((input - 1) * 3 + this.month() % 3);
        },

        weekYear : function (input) {
            var year = weekOfYear(this, this.lang()._week.dow, this.lang()._week.doy).year;
            return input == null ? year : this.add("y", (input - year));
        },

        isoWeekYear : function (input) {
            var year = weekOfYear(this, 1, 4).year;
            return input == null ? year : this.add("y", (input - year));
        },

        week : function (input) {
            var week = this.lang().week(this);
            return input == null ? week : this.add("d", (input - week) * 7);
        },

        isoWeek : function (input) {
            var week = weekOfYear(this, 1, 4).week;
            return input == null ? week : this.add("d", (input - week) * 7);
        },

        weekday : function (input) {
            var weekday = (this.day() + 7 - this.lang()._week.dow) % 7;
            return input == null ? weekday : this.add("d", input - weekday);
        },

        isoWeekday : function (input) {
            // behaves the same as moment#day except
            // as a getter, returns 7 instead of 0 (1-7 range instead of 0-6)
            // as a setter, sunday should belong to the previous week.
            return input == null ? this.day() || 7 : this.day(this.day() % 7 ? input : input - 7);
        },

        isoWeeksInYear : function () {
            return weeksInYear(this.year(), 1, 4);
        },

        weeksInYear : function () {
            var weekInfo = this._lang._week;
            return weeksInYear(this.year(), weekInfo.dow, weekInfo.doy);
        },

        get : function (units) {
            units = normalizeUnits(units);
            return this[units]();
        },

        set : function (units, value) {
            units = normalizeUnits(units);
            if (typeof this[units] === 'function') {
                this[units](value);
            }
            return this;
        },

        // If passed a language key, it will set the language for this
        // instance.  Otherwise, it will return the language configuration
        // variables for this instance.
        lang : function (key) {
            if (key === undefined) {
                return this._lang;
            } else {
                this._lang = getLangDefinition(key);
                return this;
            }
        }
    });

    function rawMonthSetter(mom, value) {
        var dayOfMonth;

        // TODO: Move this out of here!
        if (typeof value === 'string') {
            value = mom.lang().monthsParse(value);
            // TODO: Another silent failure?
            if (typeof value !== 'number') {
                return mom;
            }
        }

        dayOfMonth = Math.min(mom.date(),
                daysInMonth(mom.year(), value));
        mom._d['set' + (mom._isUTC ? 'UTC' : '') + 'Month'](value, dayOfMonth);
        return mom;
    }

    function rawGetter(mom, unit) {
        return mom._d['get' + (mom._isUTC ? 'UTC' : '') + unit]();
    }

    function rawSetter(mom, unit, value) {
        if (unit === 'Month') {
            return rawMonthSetter(mom, value);
        } else {
            return mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value);
        }
    }

    function makeAccessor(unit, keepTime) {
        return function (value) {
            if (value != null) {
                rawSetter(this, unit, value);
                moment.updateOffset(this, keepTime);
                return this;
            } else {
                return rawGetter(this, unit);
            }
        };
    }

    moment.fn.millisecond = moment.fn.milliseconds = makeAccessor('Milliseconds', false);
    moment.fn.second = moment.fn.seconds = makeAccessor('Seconds', false);
    moment.fn.minute = moment.fn.minutes = makeAccessor('Minutes', false);
    // Setting the hour should keep the time, because the user explicitly
    // specified which hour he wants. So trying to maintain the same hour (in
    // a new timezone) makes sense. Adding/subtracting hours does not follow
    // this rule.
    moment.fn.hour = moment.fn.hours = makeAccessor('Hours', true);
    // moment.fn.month is defined separately
    moment.fn.date = makeAccessor('Date', true);
    moment.fn.dates = deprecate("dates accessor is deprecated. Use date instead.", makeAccessor('Date', true));
    moment.fn.year = makeAccessor('FullYear', true);
    moment.fn.years = deprecate("years accessor is deprecated. Use year instead.", makeAccessor('FullYear', true));

    // add plural methods
    moment.fn.days = moment.fn.day;
    moment.fn.months = moment.fn.month;
    moment.fn.weeks = moment.fn.week;
    moment.fn.isoWeeks = moment.fn.isoWeek;
    moment.fn.quarters = moment.fn.quarter;

    // add aliased format methods
    moment.fn.toJSON = moment.fn.toISOString;

    /************************************
        Duration Prototype
    ************************************/


    extend(moment.duration.fn = Duration.prototype, {

        _bubble : function () {
            var milliseconds = this._milliseconds,
                days = this._days,
                months = this._months,
                data = this._data,
                seconds, minutes, hours, years;

            // The following code bubbles up values, see the tests for
            // examples of what that means.
            data.milliseconds = milliseconds % 1000;

            seconds = absRound(milliseconds / 1000);
            data.seconds = seconds % 60;

            minutes = absRound(seconds / 60);
            data.minutes = minutes % 60;

            hours = absRound(minutes / 60);
            data.hours = hours % 24;

            days += absRound(hours / 24);
            data.days = days % 30;

            months += absRound(days / 30);
            data.months = months % 12;

            years = absRound(months / 12);
            data.years = years;
        },

        weeks : function () {
            return absRound(this.days() / 7);
        },

        valueOf : function () {
            return this._milliseconds +
              this._days * 864e5 +
              (this._months % 12) * 2592e6 +
              toInt(this._months / 12) * 31536e6;
        },

        humanize : function (withSuffix) {
            var difference = +this,
                output = relativeTime(difference, !withSuffix, this.lang());

            if (withSuffix) {
                output = this.lang().pastFuture(difference, output);
            }

            return this.lang().postformat(output);
        },

        add : function (input, val) {
            // supports only 2.0-style add(1, 's') or add(moment)
            var dur = moment.duration(input, val);

            this._milliseconds += dur._milliseconds;
            this._days += dur._days;
            this._months += dur._months;

            this._bubble();

            return this;
        },

        subtract : function (input, val) {
            var dur = moment.duration(input, val);

            this._milliseconds -= dur._milliseconds;
            this._days -= dur._days;
            this._months -= dur._months;

            this._bubble();

            return this;
        },

        get : function (units) {
            units = normalizeUnits(units);
            return this[units.toLowerCase() + 's']();
        },

        as : function (units) {
            units = normalizeUnits(units);
            return this['as' + units.charAt(0).toUpperCase() + units.slice(1) + 's']();
        },

        lang : moment.fn.lang,

        toIsoString : function () {
            // inspired by https://github.com/dordille/moment-isoduration/blob/master/moment.isoduration.js
            var years = Math.abs(this.years()),
                months = Math.abs(this.months()),
                days = Math.abs(this.days()),
                hours = Math.abs(this.hours()),
                minutes = Math.abs(this.minutes()),
                seconds = Math.abs(this.seconds() + this.milliseconds() / 1000);

            if (!this.asSeconds()) {
                // this is the same as C#'s (Noda) and python (isodate)...
                // but not other JS (goog.date)
                return 'P0D';
            }

            return (this.asSeconds() < 0 ? '-' : '') +
                'P' +
                (years ? years + 'Y' : '') +
                (months ? months + 'M' : '') +
                (days ? days + 'D' : '') +
                ((hours || minutes || seconds) ? 'T' : '') +
                (hours ? hours + 'H' : '') +
                (minutes ? minutes + 'M' : '') +
                (seconds ? seconds + 'S' : '');
        }
    });

    function makeDurationGetter(name) {
        moment.duration.fn[name] = function () {
            return this._data[name];
        };
    }

    function makeDurationAsGetter(name, factor) {
        moment.duration.fn['as' + name] = function () {
            return +this / factor;
        };
    }

    for (i in unitMillisecondFactors) {
        if (unitMillisecondFactors.hasOwnProperty(i)) {
            makeDurationAsGetter(i, unitMillisecondFactors[i]);
            makeDurationGetter(i.toLowerCase());
        }
    }

    makeDurationAsGetter('Weeks', 6048e5);
    moment.duration.fn.asMonths = function () {
        return (+this - this.years() * 31536e6) / 2592e6 + this.years() * 12;
    };


    /************************************
        Default Lang
    ************************************/


    // Set default language, other languages will inherit from English.
    moment.lang('en', {
        ordinal : function (number) {
            var b = number % 10,
                output = (toInt(number % 100 / 10) === 1) ? 'th' :
                (b === 1) ? 'st' :
                (b === 2) ? 'nd' :
                (b === 3) ? 'rd' : 'th';
            return number + output;
        }
    });

    /* EMBED_LANGUAGES */

    /************************************
        Exposing Moment
    ************************************/

    function makeGlobal(shouldDeprecate) {
        /*global ender:false */
        if (typeof ender !== 'undefined') {
            return;
        }
        oldGlobalMoment = globalScope.moment;
        if (shouldDeprecate) {
            globalScope.moment = deprecate(
                    "Accessing Moment through the global scope is " +
                    "deprecated, and will be removed in an upcoming " +
                    "release.",
                    moment);
        } else {
            globalScope.moment = moment;
        }
    }

    // CommonJS module is defined
    if (hasModule) {
        module.exports = moment;
    } else if (typeof define === "function" && define.amd) {
        define("moment", ['require','exports','module'],function (require, exports, module) {
            if (module.config && module.config() && module.config().noGlobal === true) {
                // release the global variable
                globalScope.moment = oldGlobalMoment;
            }

            return moment;
        });
        makeGlobal(true);
    } else {
        makeGlobal();
    }
}).call(this);

(function() {
  if (window.Backbone) {
    define('backbone', [], function () {
      return window.Backbone;
    });
  } else {
    require.config({
      paths:  { backbone: 'components/backbone/backbone' },
      shim:   { backbone: { exports: 'Backbone', deps: ['underscore', 'jquery'] } }
    });
  }
  define('aura-extensions/aura-backbone',['backbone'], {
    name: "The Back of the Bone",

    initialize: function(app) {
      var core = app.core, sandbox = app.sandbox;
      var Backbone = require('backbone');

      core.mvc = Backbone.noConflict();

      sandbox.mvc = {};
      sandbox.mvc.View = function(view) {
        return core.mvc.View.extend(view);
      };
      sandbox.mvc.Model = function(model) {
        return core.mvc.Model.extend(model);
      };
      sandbox.mvc.Collection = function(collection) {
        return core.mvc.Collection.extend(collection);
      };
      sandbox.mvc.Router = function(router) {
        return core.mvc.Router.extend(router);
      };
    }

  });
})();

/*global define:true */
define('aura-extensions/aura-base64',['lib/utils/base64'],function(base64) {
  var extension = {
    name: "base64",
    // require: {
    //   paths: {
    //     base64:   'lib/utils/base64'
    //   }
    // },
    initialize: function(app){
      
      app.core.util.base64 = base64
    }
  }
  return extension;
});

(function() {

  define('lib/utils/q2jquery',['jquery'], function($) {
    return function(qPromise) {
      var $dfd;
      $dfd = $.Deferred();
      qPromise.then($dfd.resolve, $dfd.reject);
      return $dfd.promise();
    };
  });

}).call(this);

/*global define:true */
define('aura-extensions/aura-component-require',['underscore', 'lib/utils/promises', 'lib/utils/q2jquery'], function(_, promises, q2jquery) {
  

  function nameToComponentPath (name, component) {
    return component.ref + '/' + name;
  }

  function componentRequire () {
    var dfd = promises.deferred();
    if (!this.require) { return; }

    var paths = _.map([].concat(this.require), function(path) {
      return nameToComponentPath(path, this);
    }, this);
    var config = require.s.contexts._.config;
    var defined = require.s.contexts._.defined;
    var localRequire = require.config({
      context: '__context__' + this.ref,
      baseUrl: config.pkgs[this.ref].location,
      shim: config.shim,
      paths: config.paths
    });
    var component = this;
    var required = this.require;
    localRequire(['require'], function (require) {
      _.each(_.keys(defined), function (name) {
        define(name, [], function () { return defined[name]; });
      });
      require(required, function(deps) {
        component.require = function (name) {
          return localRequire(name);
        };
        dfd.resolve(deps);
      }, function (err) {
        dfd.reject(err);
      });
    });
    return q2jquery(dfd.promise);
  }

  return {
    initialize: function(app) {
      app.components.before('initialize', componentRequire);
    },
    componentRequire: componentRequire
  };
});

/*global define:true*/
define('aura-extensions/aura-component-validate-options',[],function() {
  

  return function(app) {
    var _ = app.core.util._;

    var module = {
      name: "ValidateOptions",
      initialize: function(app){
        app.components.before('initialize', module.checkOptions);
      },
      checkOptions: function(options) {
        var optionKeys = _.keys(options);
        _.each(this.requiredOptions || [], function (name) {
          if (!_.contains(optionKeys, name) || options[name] === undefined) {
            throw new Error ('Missing option to component ' + this.componentName + ': ' + name);
          }
        }, this);
        return true;
      }
    };
    return module;
  };

});

/*global define:true */
define('aura-extensions/aura-cookies',['lib/utils/cookies'], function(cookies) {

  var extension = {
    initialize: function(app){
      app.core.cookies = cookies;
    }
  };

  return extension;
});

/**
 * Copyright (c) 2010 Maxim Vasiliev
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * @author Maxim Vasiliev
 * Date: 09.09.2010
 * Time: 19:02:33
 */


(function (root, factory)
{
	if (typeof define === 'function' && define.amd)
	{
		// AMD. Register as an anonymous module.
		define('bower_components/form2js/src/form2js',factory);
	}
	else
	{
		// Browser globals
		root.form2js = factory();
	}
}(this, function ()
{
	

	/**
	 * Returns form values represented as Javascript object
	 * "name" attribute defines structure of resulting object
	 *
	 * @param rootNode {Element|String} root form element (or it's id) or array of root elements
	 * @param delimiter {String} structure parts delimiter defaults to '.'
	 * @param skipEmpty {Boolean} should skip empty text values, defaults to true
	 * @param nodeCallback {Function} custom function to get node value
	 * @param useIdIfEmptyName {Boolean} if true value of id attribute of field will be used if name of field is empty
	 */
	function form2js(rootNode, delimiter, skipEmpty, nodeCallback, useIdIfEmptyName, getDisabled)
	{
		getDisabled = getDisabled ? true : false;
		if (typeof skipEmpty == 'undefined' || skipEmpty == null) skipEmpty = true;
		if (typeof delimiter == 'undefined' || delimiter == null) delimiter = '.';
		if (arguments.length < 5) useIdIfEmptyName = false;

		rootNode = typeof rootNode == 'string' ? document.getElementById(rootNode) : rootNode;

		var formValues = [],
			currNode,
			i = 0;

		/* If rootNode is array - combine values */
		if (rootNode.constructor == Array || (typeof NodeList != "undefined" && rootNode.constructor == NodeList))
		{
			while(currNode = rootNode[i++])
			{
				formValues = formValues.concat(getFormValues(currNode, nodeCallback, useIdIfEmptyName, getDisabled));
			}
		}
		else
		{
			formValues = getFormValues(rootNode, nodeCallback, useIdIfEmptyName, getDisabled);
		}

		return processNameValues(formValues, skipEmpty, delimiter);
	}

	/**
	 * Processes collection of { name: 'name', value: 'value' } objects.
	 * @param nameValues
	 * @param skipEmpty if true skips elements with value == '' or value == null
	 * @param delimiter
	 */
	function processNameValues(nameValues, skipEmpty, delimiter)
	{
		var result = {},
			arrays = {},
			i, j, k, l,
			value,
			nameParts,
			currResult,
			arrNameFull,
			arrName,
			arrIdx,
			namePart,
			name,
			_nameParts;

		for (i = 0; i < nameValues.length; i++)
		{
			value = nameValues[i].value;

			if (skipEmpty && (value === '' || value === null)) continue;

			name = nameValues[i].name;
			_nameParts = name.split(delimiter);
			nameParts = [];
			currResult = result;
			arrNameFull = '';

			for(j = 0; j < _nameParts.length; j++)
			{
				namePart = _nameParts[j].split('][');
				if (namePart.length > 1)
				{
					for(k = 0; k < namePart.length; k++)
					{
						if (k == 0)
						{
							namePart[k] = namePart[k] + ']';
						}
						else if (k == namePart.length - 1)
						{
							namePart[k] = '[' + namePart[k];
						}
						else
						{
							namePart[k] = '[' + namePart[k] + ']';
						}

						arrIdx = namePart[k].match(/([a-z_]+)?\[([a-z_][a-z0-9_]+?)\]/i);
						if (arrIdx)
						{
							for(l = 1; l < arrIdx.length; l++)
							{
								if (arrIdx[l]) nameParts.push(arrIdx[l]);
							}
						}
						else{
							nameParts.push(namePart[k]);
						}
					}
				}
				else
					nameParts = nameParts.concat(namePart);
			}

			for (j = 0; j < nameParts.length; j++)
			{
				namePart = nameParts[j];

				if (namePart.indexOf('[]') > -1 && j == nameParts.length - 1)
				{
					arrName = namePart.substr(0, namePart.indexOf('['));
					arrNameFull += arrName;

					if (!currResult[arrName]) currResult[arrName] = [];
					currResult[arrName].push(value);
				}
				else if (namePart.indexOf('[') > -1)
				{
					arrName = namePart.substr(0, namePart.indexOf('['));
					arrIdx = namePart.replace(/(^([a-z_]+)?\[)|(\]$)/gi, '');

					/* Unique array name */
					arrNameFull += '_' + arrName + '_' + arrIdx;

					/*
					 * Because arrIdx in field name can be not zero-based and step can be
					 * other than 1, we can't use them in target array directly.
					 * Instead we're making a hash where key is arrIdx and value is a reference to
					 * added array element
					 */

					if (!arrays[arrNameFull]) arrays[arrNameFull] = {};
					if (arrName != '' && !currResult[arrName]) currResult[arrName] = [];

					if (j == nameParts.length - 1)
					{
						if (arrName == '')
						{
							currResult.push(value);
							arrays[arrNameFull][arrIdx] = currResult[currResult.length - 1];
						}
						else
						{
							currResult[arrName].push(value);
							arrays[arrNameFull][arrIdx] = currResult[arrName][currResult[arrName].length - 1];
						}
					}
					else
					{
						if (!arrays[arrNameFull][arrIdx])
						{
							if ((/^[0-9a-z_]+\[?/i).test(nameParts[j+1])) currResult[arrName].push({});
							else currResult[arrName].push([]);

							arrays[arrNameFull][arrIdx] = currResult[arrName][currResult[arrName].length - 1];
						}
					}

					currResult = arrays[arrNameFull][arrIdx];
				}
				else
				{
					arrNameFull += namePart;

					if (j < nameParts.length - 1) /* Not the last part of name - means object */
					{
						if (!currResult[namePart]) currResult[namePart] = {};
						currResult = currResult[namePart];
					}
					else
					{
						currResult[namePart] = value;
					}
				}
			}
		}

		return result;
	}

    function getFormValues(rootNode, nodeCallback, useIdIfEmptyName, getDisabled)
    {
        var result = extractNodeValues(rootNode, nodeCallback, useIdIfEmptyName, getDisabled);
        return result.length > 0 ? result : getSubFormValues(rootNode, nodeCallback, useIdIfEmptyName, getDisabled);
    }

    function getSubFormValues(rootNode, nodeCallback, useIdIfEmptyName, getDisabled)
	{
		var result = [],
			currentNode = rootNode.firstChild;
		
		while (currentNode)
		{
			result = result.concat(extractNodeValues(currentNode, nodeCallback, useIdIfEmptyName, getDisabled));
			currentNode = currentNode.nextSibling;
		}

		return result;
	}

    function extractNodeValues(node, nodeCallback, useIdIfEmptyName, getDisabled) {
        if (node.disabled && !getDisabled) return [];

        var callbackResult, fieldValue, result, fieldName = getFieldName(node, useIdIfEmptyName);

        callbackResult = nodeCallback && nodeCallback(node);

        if (callbackResult && callbackResult.name) {
            result = [callbackResult];
        }
        else if (fieldName != '' && node.nodeName.match(/INPUT|TEXTAREA/i)) {
            fieldValue = getFieldValue(node, getDisabled);
            if (null === fieldValue) {
                result = [];
            } else {
                result = [ { name: fieldName, value: fieldValue} ];
            }
        }
        else if (fieldName != '' && node.nodeName.match(/SELECT/i)) {
	        fieldValue = getFieldValue(node, getDisabled);
	        result = [ { name: fieldName.replace(/\[\]$/, ''), value: fieldValue } ];
        }
        else {
            result = getSubFormValues(node, nodeCallback, useIdIfEmptyName, getDisabled);
        }

        return result;
    }

	function getFieldName(node, useIdIfEmptyName)
	{
		if (node.name && node.name != '') return node.name;
		else if (useIdIfEmptyName && node.id && node.id != '') return node.id;
		else return '';
	}


	function getFieldValue(fieldNode, getDisabled)
	{
		if (fieldNode.disabled && !getDisabled) return null;
		
		switch (fieldNode.nodeName) {
			case 'INPUT':
			case 'TEXTAREA':
				switch (fieldNode.type.toLowerCase()) {
					case 'radio':
			if (fieldNode.checked && fieldNode.value === "false") return false;
					case 'checkbox':
                        if (fieldNode.checked && fieldNode.value === "true") return true;
                        if (!fieldNode.checked && fieldNode.value === "true") return false;
			if (fieldNode.checked) return fieldNode.value;
						break;

					case 'button':
					case 'reset':
					case 'submit':
					case 'image':
						return '';
						break;

					default:
						return fieldNode.value;
						break;
				}
				break;

			case 'SELECT':
				return getSelectedOptionValue(fieldNode);
				break;

			default:
				break;
		}

		return null;
	}

	function getSelectedOptionValue(selectNode)
	{
		var multiple = selectNode.multiple,
			result = [],
			options,
			i, l;

		if (!multiple) return selectNode.value;

		for (options = selectNode.getElementsByTagName("option"), i = 0, l = options.length; i < l; i++)
		{
			if (options[i].selected) result.push(options[i].value);
		}

		return result;
	}

	return form2js;

}));

/*global define:true */
define('aura-extensions/aura-form-serialize',['bower_components/form2js/src/form2js', 'underscore'], function (form2js, _) {
  
  return {
    initialize: function(app){
      app.core.dom.getFormData = function(form){
        if (form.toArray)  {
          form = form.toArray();
        }
        return _.extend.apply(_, _.map([].concat(form), form2js));
      };
    }
  };
});

/*global define:true */
define('aura-extensions/aura-mobile-detect',['require'],function(cookies) {

  var extension = {
    initialize: function(app){
      app.sandbox.util = app.sandbox.util || {};
      app.sandbox.util.isMobile = function() {
        // http://stackoverflow.com/questions/11381673/javascript-solution-to-detect-mobile-browser
        var n = navigator.userAgent || navigator.vendor || window.opera;
        return !! /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(n)
               || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(n.substr(0,4));
      };
    }
  };

  return extension;
});

/*global define:true */
define('aura-extensions/aura-moment',['moment'], function(moment) {
  return {
    initialize: function(app){
      
      app.sandbox.util.moment = moment;
    }
  };
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
(function() {
  if (typeof twttr === "undefined" || twttr === null) {
    var twttr = {};
  }

  twttr.txt = {};
  twttr.txt.regexen = {};

  var HTML_ENTITIES = {
    '&': '&amp;',
    '>': '&gt;',
    '<': '&lt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  // HTML escaping
  twttr.txt.htmlEscape = function(text) {
    return text && text.replace(/[&"'><]/g, function(character) {
      return HTML_ENTITIES[character];
    });
  };

  // Builds a RegExp
  function regexSupplant(regex, flags) {
    flags = flags || "";
    if (typeof regex !== "string") {
      if (regex.global && flags.indexOf("g") < 0) {
        flags += "g";
      }
      if (regex.ignoreCase && flags.indexOf("i") < 0) {
        flags += "i";
      }
      if (regex.multiline && flags.indexOf("m") < 0) {
        flags += "m";
      }

      regex = regex.source;
    }

    return new RegExp(regex.replace(/#\{(\w+)\}/g, function(match, name) {
      var newRegex = twttr.txt.regexen[name] || "";
      if (typeof newRegex !== "string") {
        newRegex = newRegex.source;
      }
      return newRegex;
    }), flags);
  }

  twttr.txt.regexSupplant = regexSupplant;

  // simple string interpolation
  function stringSupplant(str, values) {
    return str.replace(/#\{(\w+)\}/g, function(match, name) {
      return values[name] || "";
    });
  }

  twttr.txt.stringSupplant = stringSupplant;

  function addCharsToCharClass(charClass, start, end) {
    var s = String.fromCharCode(start);
    if (end !== start) {
      s += "-" + String.fromCharCode(end);
    }
    charClass.push(s);
    return charClass;
  }

  twttr.txt.addCharsToCharClass = addCharsToCharClass;

  // Space is more than %20, U+3000 for example is the full-width space used with Kanji. Provide a short-hand
  // to access both the list of characters and a pattern suitible for use with String#split
  // Taken from: ActiveSupport::Multibyte::Handlers::UTF8Handler::UNICODE_WHITESPACE
  var fromCode = String.fromCharCode;
  var UNICODE_SPACES = [
    fromCode(0x0020), // White_Space # Zs       SPACE
    fromCode(0x0085), // White_Space # Cc       <control-0085>
    fromCode(0x00A0), // White_Space # Zs       NO-BREAK SPACE
    fromCode(0x1680), // White_Space # Zs       OGHAM SPACE MARK
    fromCode(0x180E), // White_Space # Zs       MONGOLIAN VOWEL SEPARATOR
    fromCode(0x2028), // White_Space # Zl       LINE SEPARATOR
    fromCode(0x2029), // White_Space # Zp       PARAGRAPH SEPARATOR
    fromCode(0x202F), // White_Space # Zs       NARROW NO-BREAK SPACE
    fromCode(0x205F), // White_Space # Zs       MEDIUM MATHEMATICAL SPACE
    fromCode(0x3000)  // White_Space # Zs       IDEOGRAPHIC SPACE
  ];
  addCharsToCharClass(UNICODE_SPACES, 0x009, 0x00D); // White_Space # Cc   [5] <control-0009>..<control-000D>
  addCharsToCharClass(UNICODE_SPACES, 0x2000, 0x200A); // White_Space # Zs  [11] EN QUAD..HAIR SPACE

  var INVALID_CHARS = [
    fromCode(0xFFFE),
    fromCode(0xFEFF), // BOM
    fromCode(0xFFFF) // Special
  ];
  addCharsToCharClass(INVALID_CHARS, 0x202A, 0x202E); // Directional change

  twttr.txt.regexen.spaces_group = regexSupplant(UNICODE_SPACES.join(""));
  twttr.txt.regexen.spaces = regexSupplant("[" + UNICODE_SPACES.join("") + "]");
  twttr.txt.regexen.invalid_chars_group = regexSupplant(INVALID_CHARS.join(""));
  twttr.txt.regexen.punct = /\!'#%&'\(\)*\+,\\\-\.\/:;<=>\?@\[\]\^_{|}~\$/;
  twttr.txt.regexen.rtl_chars = /[\u0600-\u06FF]|[\u0750-\u077F]|[\u0590-\u05FF]|[\uFE70-\uFEFF]/mg;
  twttr.txt.regexen.non_bmp_code_pairs = /[\uD800-\uDBFF][\uDC00-\uDFFF]/mg;

  var nonLatinHashtagChars = [];
  // Cyrillic
  addCharsToCharClass(nonLatinHashtagChars, 0x0400, 0x04ff); // Cyrillic
  addCharsToCharClass(nonLatinHashtagChars, 0x0500, 0x0527); // Cyrillic Supplement
  addCharsToCharClass(nonLatinHashtagChars, 0x2de0, 0x2dff); // Cyrillic Extended A
  addCharsToCharClass(nonLatinHashtagChars, 0xa640, 0xa69f); // Cyrillic Extended B
  // Hebrew
  addCharsToCharClass(nonLatinHashtagChars, 0x0591, 0x05bf); // Hebrew
  addCharsToCharClass(nonLatinHashtagChars, 0x05c1, 0x05c2);
  addCharsToCharClass(nonLatinHashtagChars, 0x05c4, 0x05c5);
  addCharsToCharClass(nonLatinHashtagChars, 0x05c7, 0x05c7);
  addCharsToCharClass(nonLatinHashtagChars, 0x05d0, 0x05ea);
  addCharsToCharClass(nonLatinHashtagChars, 0x05f0, 0x05f4);
  addCharsToCharClass(nonLatinHashtagChars, 0xfb12, 0xfb28); // Hebrew Presentation Forms
  addCharsToCharClass(nonLatinHashtagChars, 0xfb2a, 0xfb36);
  addCharsToCharClass(nonLatinHashtagChars, 0xfb38, 0xfb3c);
  addCharsToCharClass(nonLatinHashtagChars, 0xfb3e, 0xfb3e);
  addCharsToCharClass(nonLatinHashtagChars, 0xfb40, 0xfb41);
  addCharsToCharClass(nonLatinHashtagChars, 0xfb43, 0xfb44);
  addCharsToCharClass(nonLatinHashtagChars, 0xfb46, 0xfb4f);
  // Arabic
  addCharsToCharClass(nonLatinHashtagChars, 0x0610, 0x061a); // Arabic
  addCharsToCharClass(nonLatinHashtagChars, 0x0620, 0x065f);
  addCharsToCharClass(nonLatinHashtagChars, 0x066e, 0x06d3);
  addCharsToCharClass(nonLatinHashtagChars, 0x06d5, 0x06dc);
  addCharsToCharClass(nonLatinHashtagChars, 0x06de, 0x06e8);
  addCharsToCharClass(nonLatinHashtagChars, 0x06ea, 0x06ef);
  addCharsToCharClass(nonLatinHashtagChars, 0x06fa, 0x06fc);
  addCharsToCharClass(nonLatinHashtagChars, 0x06ff, 0x06ff);
  addCharsToCharClass(nonLatinHashtagChars, 0x0750, 0x077f); // Arabic Supplement
  addCharsToCharClass(nonLatinHashtagChars, 0x08a0, 0x08a0); // Arabic Extended A
  addCharsToCharClass(nonLatinHashtagChars, 0x08a2, 0x08ac);
  addCharsToCharClass(nonLatinHashtagChars, 0x08e4, 0x08fe);
  addCharsToCharClass(nonLatinHashtagChars, 0xfb50, 0xfbb1); // Arabic Pres. Forms A
  addCharsToCharClass(nonLatinHashtagChars, 0xfbd3, 0xfd3d);
  addCharsToCharClass(nonLatinHashtagChars, 0xfd50, 0xfd8f);
  addCharsToCharClass(nonLatinHashtagChars, 0xfd92, 0xfdc7);
  addCharsToCharClass(nonLatinHashtagChars, 0xfdf0, 0xfdfb);
  addCharsToCharClass(nonLatinHashtagChars, 0xfe70, 0xfe74); // Arabic Pres. Forms B
  addCharsToCharClass(nonLatinHashtagChars, 0xfe76, 0xfefc);
  addCharsToCharClass(nonLatinHashtagChars, 0x200c, 0x200c); // Zero-Width Non-Joiner
  // Thai
  addCharsToCharClass(nonLatinHashtagChars, 0x0e01, 0x0e3a);
  addCharsToCharClass(nonLatinHashtagChars, 0x0e40, 0x0e4e);
  // Hangul (Korean)
  addCharsToCharClass(nonLatinHashtagChars, 0x1100, 0x11ff); // Hangul Jamo
  addCharsToCharClass(nonLatinHashtagChars, 0x3130, 0x3185); // Hangul Compatibility Jamo
  addCharsToCharClass(nonLatinHashtagChars, 0xA960, 0xA97F); // Hangul Jamo Extended-A
  addCharsToCharClass(nonLatinHashtagChars, 0xAC00, 0xD7AF); // Hangul Syllables
  addCharsToCharClass(nonLatinHashtagChars, 0xD7B0, 0xD7FF); // Hangul Jamo Extended-B
  addCharsToCharClass(nonLatinHashtagChars, 0xFFA1, 0xFFDC); // half-width Hangul
  // Japanese and Chinese
  addCharsToCharClass(nonLatinHashtagChars, 0x30A1, 0x30FA); // Katakana (full-width)
  addCharsToCharClass(nonLatinHashtagChars, 0x30FC, 0x30FE); // Katakana Chouon and iteration marks (full-width)
  addCharsToCharClass(nonLatinHashtagChars, 0xFF66, 0xFF9F); // Katakana (half-width)
  addCharsToCharClass(nonLatinHashtagChars, 0xFF70, 0xFF70); // Katakana Chouon (half-width)
  addCharsToCharClass(nonLatinHashtagChars, 0xFF10, 0xFF19); // \
  addCharsToCharClass(nonLatinHashtagChars, 0xFF21, 0xFF3A); //  - Latin (full-width)
  addCharsToCharClass(nonLatinHashtagChars, 0xFF41, 0xFF5A); // /
  addCharsToCharClass(nonLatinHashtagChars, 0x3041, 0x3096); // Hiragana
  addCharsToCharClass(nonLatinHashtagChars, 0x3099, 0x309E); // Hiragana voicing and iteration mark
  addCharsToCharClass(nonLatinHashtagChars, 0x3400, 0x4DBF); // Kanji (CJK Extension A)
  addCharsToCharClass(nonLatinHashtagChars, 0x4E00, 0x9FFF); // Kanji (Unified)
  // -- Disabled as it breaks the Regex.
  //addCharsToCharClass(nonLatinHashtagChars, 0x20000, 0x2A6DF); // Kanji (CJK Extension B)
  addCharsToCharClass(nonLatinHashtagChars, 0x2A700, 0x2B73F); // Kanji (CJK Extension C)
  addCharsToCharClass(nonLatinHashtagChars, 0x2B740, 0x2B81F); // Kanji (CJK Extension D)
  addCharsToCharClass(nonLatinHashtagChars, 0x2F800, 0x2FA1F); // Kanji (CJK supplement)
  addCharsToCharClass(nonLatinHashtagChars, 0x3003, 0x3003); // Kanji iteration mark
  addCharsToCharClass(nonLatinHashtagChars, 0x3005, 0x3005); // Kanji iteration mark
  addCharsToCharClass(nonLatinHashtagChars, 0x303B, 0x303B); // Han iteration mark

  twttr.txt.regexen.nonLatinHashtagChars = regexSupplant(nonLatinHashtagChars.join(""));

  var latinAccentChars = [];
  // Latin accented characters (subtracted 0xD7 from the range, it's a confusable multiplication sign. Looks like "x")
  addCharsToCharClass(latinAccentChars, 0x00c0, 0x00d6);
  addCharsToCharClass(latinAccentChars, 0x00d8, 0x00f6);
  addCharsToCharClass(latinAccentChars, 0x00f8, 0x00ff);
  // Latin Extended A and B
  addCharsToCharClass(latinAccentChars, 0x0100, 0x024f);
  // assorted IPA Extensions
  addCharsToCharClass(latinAccentChars, 0x0253, 0x0254);
  addCharsToCharClass(latinAccentChars, 0x0256, 0x0257);
  addCharsToCharClass(latinAccentChars, 0x0259, 0x0259);
  addCharsToCharClass(latinAccentChars, 0x025b, 0x025b);
  addCharsToCharClass(latinAccentChars, 0x0263, 0x0263);
  addCharsToCharClass(latinAccentChars, 0x0268, 0x0268);
  addCharsToCharClass(latinAccentChars, 0x026f, 0x026f);
  addCharsToCharClass(latinAccentChars, 0x0272, 0x0272);
  addCharsToCharClass(latinAccentChars, 0x0289, 0x0289);
  addCharsToCharClass(latinAccentChars, 0x028b, 0x028b);
  // Okina for Hawaiian (it *is* a letter character)
  addCharsToCharClass(latinAccentChars, 0x02bb, 0x02bb);
  // Combining diacritics
  addCharsToCharClass(latinAccentChars, 0x0300, 0x036f);
  // Latin Extended Additional
  addCharsToCharClass(latinAccentChars, 0x1e00, 0x1eff);
  twttr.txt.regexen.latinAccentChars = regexSupplant(latinAccentChars.join(""));

  // A hashtag must contain characters, numbers and underscores, but not all numbers.
  twttr.txt.regexen.hashSigns = /[#＃]/;
  twttr.txt.regexen.hashtagAlpha = regexSupplant(/[a-z_#{latinAccentChars}#{nonLatinHashtagChars}]/i);
  twttr.txt.regexen.hashtagAlphaNumeric = regexSupplant(/[a-z0-9_#{latinAccentChars}#{nonLatinHashtagChars}]/i);
  twttr.txt.regexen.endHashtagMatch = regexSupplant(/^(?:#{hashSigns}|:\/\/)/);
  twttr.txt.regexen.hashtagBoundary = regexSupplant(/(?:^|$|[^&a-z0-9_#{latinAccentChars}#{nonLatinHashtagChars}])/);
  twttr.txt.regexen.validHashtag = regexSupplant(/(#{hashtagBoundary})(#{hashSigns})(#{hashtagAlphaNumeric}*#{hashtagAlpha}#{hashtagAlphaNumeric}*)/gi);

  // Mention related regex collection
  twttr.txt.regexen.validMentionPrecedingChars = /(?:^|[^a-zA-Z0-9_!#$%&*@＠]|RT:?)/;
  twttr.txt.regexen.atSigns = /[@＠]/;
  twttr.txt.regexen.validMentionOrList = regexSupplant(
    '(#{validMentionPrecedingChars})' +  // $1: Preceding character
    '(#{atSigns})' +                     // $2: At mark
    '([a-zA-Z0-9_]{1,20})' +             // $3: Screen name
    '(\/[a-zA-Z][a-zA-Z0-9_\-]{0,24})?'  // $4: List (optional)
  , 'g');
  twttr.txt.regexen.validReply = regexSupplant(/^(?:#{spaces})*#{atSigns}([a-zA-Z0-9_]{1,20})/);
  twttr.txt.regexen.endMentionMatch = regexSupplant(/^(?:#{atSigns}|[#{latinAccentChars}]|:\/\/)/);

  // URL related regex collection
  twttr.txt.regexen.validUrlPrecedingChars = regexSupplant(/(?:[^A-Za-z0-9@＠$#＃#{invalid_chars_group}]|^)/);
  twttr.txt.regexen.invalidUrlWithoutProtocolPrecedingChars = /[-_.\/]$/;
  twttr.txt.regexen.invalidDomainChars = stringSupplant("#{punct}#{spaces_group}#{invalid_chars_group}", twttr.txt.regexen);
  twttr.txt.regexen.validDomainChars = regexSupplant(/[^#{invalidDomainChars}]/);
  twttr.txt.regexen.validSubdomain = regexSupplant(/(?:(?:#{validDomainChars}(?:[_-]|#{validDomainChars})*)?#{validDomainChars}\.)/);
  twttr.txt.regexen.validDomainName = regexSupplant(/(?:(?:#{validDomainChars}(?:-|#{validDomainChars})*)?#{validDomainChars}\.)/);
  twttr.txt.regexen.validGTLD = regexSupplant(/(?:(?:aero|asia|biz|cat|com|coop|edu|gov|info|int|jobs|mil|mobi|museum|name|net|org|pro|tel|travel|xxx)(?=[^0-9a-zA-Z]|$))/);
  twttr.txt.regexen.validCCTLD = regexSupplant(/(?:(?:ac|ad|ae|af|ag|ai|al|am|an|ao|aq|ar|as|at|au|aw|ax|az|ba|bb|bd|be|bf|bg|bh|bi|bj|bm|bn|bo|br|bs|bt|bv|bw|by|bz|ca|cc|cd|cf|cg|ch|ci|ck|cl|cm|cn|co|cr|cs|cu|cv|cx|cy|cz|dd|de|dj|dk|dm|do|dz|ec|ee|eg|eh|er|es|et|eu|fi|fj|fk|fm|fo|fr|ga|gb|gd|ge|gf|gg|gh|gi|gl|gm|gn|gp|gq|gr|gs|gt|gu|gw|gy|hk|hm|hn|hr|ht|hu|id|ie|il|im|in|io|iq|ir|is|it|je|jm|jo|jp|ke|kg|kh|ki|km|kn|kp|kr|kw|ky|kz|la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|mc|md|me|mg|mh|mk|ml|mm|mn|mo|mp|mq|mr|ms|mt|mu|mv|mw|mx|my|mz|na|nc|ne|nf|ng|ni|nl|no|np|nr|nu|nz|om|pa|pe|pf|pg|ph|pk|pl|pm|pn|pr|ps|pt|pw|py|qa|re|ro|rs|ru|rw|sa|sb|sc|sd|se|sg|sh|si|sj|sk|sl|sm|sn|so|sr|ss|st|su|sv|sy|sz|tc|td|tf|tg|th|tj|tk|tl|tm|tn|to|tp|tr|tt|tv|tw|tz|ua|ug|uk|us|uy|uz|va|vc|ve|vg|vi|vn|vu|wf|ws|ye|yt|za|zm|zw|sx)(?=[^0-9a-zA-Z]|$))/);
  twttr.txt.regexen.validPunycode = regexSupplant(/(?:xn--[0-9a-z]+)/);
  twttr.txt.regexen.validDomain = regexSupplant(/(?:#{validSubdomain}*#{validDomainName}(?:#{validGTLD}|#{validCCTLD}|#{validPunycode}))/);
  twttr.txt.regexen.validAsciiDomain = regexSupplant(/(?:(?:[\-a-z0-9#{latinAccentChars}]+)\.)+(?:#{validGTLD}|#{validCCTLD}|#{validPunycode})/gi);
  twttr.txt.regexen.invalidShortDomain = regexSupplant(/^#{validDomainName}#{validCCTLD}$/);

  twttr.txt.regexen.validPortNumber = regexSupplant(/[0-9]+/);

  twttr.txt.regexen.validGeneralUrlPathChars = regexSupplant(/[a-z0-9!\*';:=\+,\.\$\/%#\[\]\-_~@|&#{latinAccentChars}]/i);
  // Allow URL paths to contain balanced parens
  //  1. Used in Wikipedia URLs like /Primer_(film)
  //  2. Used in IIS sessions like /S(dfd346)/
  twttr.txt.regexen.validUrlBalancedParens = regexSupplant(/\(#{validGeneralUrlPathChars}+\)/i);
  // Valid end-of-path chracters (so /foo. does not gobble the period).
  // 1. Allow =&# for empty URL parameters and other URL-join artifacts
  twttr.txt.regexen.validUrlPathEndingChars = regexSupplant(/[\+\-a-z0-9=_#\/#{latinAccentChars}]|(?:#{validUrlBalancedParens})/i);
  // Allow @ in a url, but only in the middle. Catch things like http://example.com/@user/
  twttr.txt.regexen.validUrlPath = regexSupplant('(?:' +
    '(?:' +
      '#{validGeneralUrlPathChars}*' +
        '(?:#{validUrlBalancedParens}#{validGeneralUrlPathChars}*)*' +
        '#{validUrlPathEndingChars}'+
      ')|(?:@#{validGeneralUrlPathChars}+\/)'+
    ')', 'i');

  twttr.txt.regexen.validUrlQueryChars = /[a-z0-9!?\*'@\(\);:&=\+\$\/%#\[\]\-_\.,~|]/i;
  twttr.txt.regexen.validUrlQueryEndingChars = /[a-z0-9_&=#\/]/i;
  twttr.txt.regexen.extractUrl = regexSupplant(
    '('                                                            + // $1 total match
      '(#{validUrlPrecedingChars})'                                + // $2 Preceeding chracter
      '('                                                          + // $3 URL
        '(https?:\\/\\/)?'                                         + // $4 Protocol (optional)
        '(#{validDomain})'                                         + // $5 Domain(s)
        '(?::(#{validPortNumber}))?'                               + // $6 Port number (optional)
        '(\\/#{validUrlPath}*)?'                                   + // $7 URL Path
        '(\\?#{validUrlQueryChars}*#{validUrlQueryEndingChars})?'  + // $8 Query String
      ')'                                                          +
    ')'
  , 'gi');

  twttr.txt.regexen.validTcoUrl = /^https?:\/\/t\.co\/[a-z0-9]+/i;
  twttr.txt.regexen.urlHasProtocol = /^https?:\/\//i;
  twttr.txt.regexen.urlHasHttps = /^https:\/\//i;

  // cashtag related regex
  twttr.txt.regexen.cashtag = /[a-z]{1,6}(?:[._][a-z]{1,2})?/i;
  twttr.txt.regexen.validCashtag = regexSupplant('(^|#{spaces})(\\$)(#{cashtag})(?=$|\\s|[#{punct}])', 'gi');

  // These URL validation pattern strings are based on the ABNF from RFC 3986
  twttr.txt.regexen.validateUrlUnreserved = /[a-z0-9\-._~]/i;
  twttr.txt.regexen.validateUrlPctEncoded = /(?:%[0-9a-f]{2})/i;
  twttr.txt.regexen.validateUrlSubDelims = /[!$&'()*+,;=]/i;
  twttr.txt.regexen.validateUrlPchar = regexSupplant('(?:' +
    '#{validateUrlUnreserved}|' +
    '#{validateUrlPctEncoded}|' +
    '#{validateUrlSubDelims}|' +
    '[:|@]' +
  ')', 'i');

  twttr.txt.regexen.validateUrlScheme = /(?:[a-z][a-z0-9+\-.]*)/i;
  twttr.txt.regexen.validateUrlUserinfo = regexSupplant('(?:' +
    '#{validateUrlUnreserved}|' +
    '#{validateUrlPctEncoded}|' +
    '#{validateUrlSubDelims}|' +
    ':' +
  ')*', 'i');

  twttr.txt.regexen.validateUrlDecOctet = /(?:[0-9]|(?:[1-9][0-9])|(?:1[0-9]{2})|(?:2[0-4][0-9])|(?:25[0-5]))/i;
  twttr.txt.regexen.validateUrlIpv4 = regexSupplant(/(?:#{validateUrlDecOctet}(?:\.#{validateUrlDecOctet}){3})/i);

  // Punting on real IPv6 validation for now
  twttr.txt.regexen.validateUrlIpv6 = /(?:\[[a-f0-9:\.]+\])/i;

  // Also punting on IPvFuture for now
  twttr.txt.regexen.validateUrlIp = regexSupplant('(?:' +
    '#{validateUrlIpv4}|' +
    '#{validateUrlIpv6}' +
  ')', 'i');

  // This is more strict than the rfc specifies
  twttr.txt.regexen.validateUrlSubDomainSegment = /(?:[a-z0-9](?:[a-z0-9_\-]*[a-z0-9])?)/i;
  twttr.txt.regexen.validateUrlDomainSegment = /(?:[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?)/i;
  twttr.txt.regexen.validateUrlDomainTld = /(?:[a-z](?:[a-z0-9\-]*[a-z0-9])?)/i;
  twttr.txt.regexen.validateUrlDomain = regexSupplant(/(?:(?:#{validateUrlSubDomainSegment]}\.)*(?:#{validateUrlDomainSegment]}\.)#{validateUrlDomainTld})/i);

  twttr.txt.regexen.validateUrlHost = regexSupplant('(?:' +
    '#{validateUrlIp}|' +
    '#{validateUrlDomain}' +
  ')', 'i');

  // Unencoded internationalized domains - this doesn't check for invalid UTF-8 sequences
  twttr.txt.regexen.validateUrlUnicodeSubDomainSegment = /(?:(?:[a-z0-9]|[^\u0000-\u007f])(?:(?:[a-z0-9_\-]|[^\u0000-\u007f])*(?:[a-z0-9]|[^\u0000-\u007f]))?)/i;
  twttr.txt.regexen.validateUrlUnicodeDomainSegment = /(?:(?:[a-z0-9]|[^\u0000-\u007f])(?:(?:[a-z0-9\-]|[^\u0000-\u007f])*(?:[a-z0-9]|[^\u0000-\u007f]))?)/i;
  twttr.txt.regexen.validateUrlUnicodeDomainTld = /(?:(?:[a-z]|[^\u0000-\u007f])(?:(?:[a-z0-9\-]|[^\u0000-\u007f])*(?:[a-z0-9]|[^\u0000-\u007f]))?)/i;
  twttr.txt.regexen.validateUrlUnicodeDomain = regexSupplant(/(?:(?:#{validateUrlUnicodeSubDomainSegment}\.)*(?:#{validateUrlUnicodeDomainSegment}\.)#{validateUrlUnicodeDomainTld})/i);

  twttr.txt.regexen.validateUrlUnicodeHost = regexSupplant('(?:' +
    '#{validateUrlIp}|' +
    '#{validateUrlUnicodeDomain}' +
  ')', 'i');

  twttr.txt.regexen.validateUrlPort = /[0-9]{1,5}/;

  twttr.txt.regexen.validateUrlUnicodeAuthority = regexSupplant(
    '(?:(#{validateUrlUserinfo})@)?'  + // $1 userinfo
    '(#{validateUrlUnicodeHost})'     + // $2 host
    '(?::(#{validateUrlPort}))?'        //$3 port
  , "i");

  twttr.txt.regexen.validateUrlAuthority = regexSupplant(
    '(?:(#{validateUrlUserinfo})@)?' + // $1 userinfo
    '(#{validateUrlHost})'           + // $2 host
    '(?::(#{validateUrlPort}))?'       // $3 port
  , "i");

  twttr.txt.regexen.validateUrlPath = regexSupplant(/(\/#{validateUrlPchar}*)*/i);
  twttr.txt.regexen.validateUrlQuery = regexSupplant(/(#{validateUrlPchar}|\/|\?)*/i);
  twttr.txt.regexen.validateUrlFragment = regexSupplant(/(#{validateUrlPchar}|\/|\?)*/i);

  // Modified version of RFC 3986 Appendix B
  twttr.txt.regexen.validateUrlUnencoded = regexSupplant(
    '^'                               + // Full URL
    '(?:'                             +
      '([^:/?#]+):\\/\\/'             + // $1 Scheme
    ')?'                              +
    '([^/?#]*)'                       + // $2 Authority
    '([^?#]*)'                        + // $3 Path
    '(?:'                             +
      '\\?([^#]*)'                    + // $4 Query
    ')?'                              +
    '(?:'                             +
      '#(.*)'                         + // $5 Fragment
    ')?$'
  , "i");


  // Default CSS class for auto-linked lists (along with the url class)
  var DEFAULT_LIST_CLASS = "tweet-url list-slug";
  // Default CSS class for auto-linked usernames (along with the url class)
  var DEFAULT_USERNAME_CLASS = "tweet-url username";
  // Default CSS class for auto-linked hashtags (along with the url class)
  var DEFAULT_HASHTAG_CLASS = "tweet-url hashtag";
  // Default CSS class for auto-linked cashtags (along with the url class)
  var DEFAULT_CASHTAG_CLASS = "tweet-url cashtag";
  // Options which should not be passed as HTML attributes
  var OPTIONS_NOT_ATTRIBUTES = {'urlClass':true, 'listClass':true, 'usernameClass':true, 'hashtagClass':true, 'cashtagClass':true,
                            'usernameUrlBase':true, 'listUrlBase':true, 'hashtagUrlBase':true, 'cashtagUrlBase':true,
                            'usernameUrlBlock':true, 'listUrlBlock':true, 'hashtagUrlBlock':true, 'linkUrlBlock':true,
                            'usernameIncludeSymbol':true, 'suppressLists':true, 'suppressNoFollow':true, 'targetBlank':true,
                            'suppressDataScreenName':true, 'urlEntities':true, 'symbolTag':true, 'textWithSymbolTag':true, 'urlTarget':true,
                            'invisibleTagAttrs':true, 'linkAttributeBlock':true, 'linkTextBlock': true, 'htmlEscapeNonEntities': true
                            };

  var BOOLEAN_ATTRIBUTES = {'disabled':true, 'readonly':true, 'multiple':true, 'checked':true};

  // Simple object cloning function for simple objects
  function clone(o) {
    var r = {};
    for (var k in o) {
      if (o.hasOwnProperty(k)) {
        r[k] = o[k];
      }
    }

    return r;
  }

  twttr.txt.tagAttrs = function(attributes) {
    var htmlAttrs = "";
    for (var k in attributes) {
      var v = attributes[k];
      if (BOOLEAN_ATTRIBUTES[k]) {
        v = v ? k : null;
      }
      if (v == null) continue;
      htmlAttrs += " " + twttr.txt.htmlEscape(k) + "=\"" + twttr.txt.htmlEscape(v.toString()) + "\"";
    }
    return htmlAttrs;
  };

  twttr.txt.linkToText = function(entity, text, attributes, options) {
    if (!options.suppressNoFollow) {
      attributes.rel = "nofollow";
    }
    // if linkAttributeBlock is specified, call it to modify the attributes
    if (options.linkAttributeBlock) {
      options.linkAttributeBlock(entity, attributes);
    }
    // if linkTextBlock is specified, call it to get a new/modified link text
    if (options.linkTextBlock) {
      text = options.linkTextBlock(entity, text);
    }
    var d = {
      text: text,
      attr: twttr.txt.tagAttrs(attributes)
    };
    return stringSupplant("<a#{attr}>#{text}</a>", d);
  };

  twttr.txt.linkToTextWithSymbol = function(entity, symbol, text, attributes, options) {
    var taggedSymbol = options.symbolTag ? "<" + options.symbolTag + ">" + symbol + "</"+ options.symbolTag + ">" : symbol;
    text = twttr.txt.htmlEscape(text);
    var taggedText = options.textWithSymbolTag ? "<" + options.textWithSymbolTag + ">" + text + "</"+ options.textWithSymbolTag + ">" : text;

    if (options.usernameIncludeSymbol || !symbol.match(twttr.txt.regexen.atSigns)) {
      return twttr.txt.linkToText(entity, taggedSymbol + taggedText, attributes, options);
    } else {
      return taggedSymbol + twttr.txt.linkToText(entity, taggedText, attributes, options);
    }
  };

  twttr.txt.linkToHashtag = function(entity, text, options) {
    var hash = text.substring(entity.indices[0], entity.indices[0] + 1);
    var hashtag = twttr.txt.htmlEscape(entity.hashtag);
    var attrs = clone(options.htmlAttrs || {});
    attrs.href = options.hashtagUrlBase + hashtag;
    attrs.title = "#" + hashtag;
    attrs["class"] = options.hashtagClass;
    if (hashtag[0].match(twttr.txt.regexen.rtl_chars)){
      attrs["class"] += " rtl";
    }
    if (options.targetBlank) {
      attrs.target = '_blank';
    }

    return twttr.txt.linkToTextWithSymbol(entity, hash, hashtag, attrs, options);
  };

  twttr.txt.linkToCashtag = function(entity, text, options) {
    var cashtag = twttr.txt.htmlEscape(entity.cashtag);
    var attrs = clone(options.htmlAttrs || {});
    attrs.href = options.cashtagUrlBase + cashtag;
    attrs.title = "$" + cashtag;
    attrs["class"] =  options.cashtagClass;
    if (options.targetBlank) {
      attrs.target = '_blank';
    }

    return twttr.txt.linkToTextWithSymbol(entity, "$", cashtag, attrs, options);
  };

  twttr.txt.linkToMentionAndList = function(entity, text, options) {
    var at = text.substring(entity.indices[0], entity.indices[0] + 1);
    var user = twttr.txt.htmlEscape(entity.screenName);
    var slashListname = twttr.txt.htmlEscape(entity.listSlug);
    var isList = entity.listSlug && !options.suppressLists;
    var attrs = clone(options.htmlAttrs || {});
    attrs["class"] = (isList ? options.listClass : options.usernameClass);
    attrs.href = isList ? options.listUrlBase + user + slashListname : options.usernameUrlBase + user;
    if (!isList && !options.suppressDataScreenName) {
      attrs['data-screen-name'] = user;
    }
    if (options.targetBlank) {
      attrs.target = '_blank';
    }

    return twttr.txt.linkToTextWithSymbol(entity, at, isList ? user + slashListname : user, attrs, options);
  };

  twttr.txt.linkToUrl = function(entity, text, options) {
    var url = entity.url;
    var displayUrl = url;
    var linkText = twttr.txt.htmlEscape(displayUrl);

    // If the caller passed a urlEntities object (provided by a Twitter API
    // response with include_entities=true), we use that to render the display_url
    // for each URL instead of it's underlying t.co URL.
    var urlEntity = (options.urlEntities && options.urlEntities[url]) || entity;
    if (urlEntity.display_url) {
      linkText = twttr.txt.linkTextWithEntity(urlEntity, options);
    }

    var attrs = clone(options.htmlAttrs || {});

    if (!url.match(twttr.txt.regexen.urlHasProtocol)) {
      url = "http://" + url;
    }
    attrs.href = url;

    if (options.targetBlank) {
      attrs.target = '_blank';
    }

    // set class only if urlClass is specified.
    if (options.urlClass) {
      attrs["class"] = options.urlClass;
    }

    // set target only if urlTarget is specified.
    if (options.urlTarget) {
      attrs.target = options.urlTarget;
    }

    if (!options.title && urlEntity.display_url) {
      attrs.title = urlEntity.expanded_url;
    }

    return twttr.txt.linkToText(entity, linkText, attrs, options);
  };

  twttr.txt.linkTextWithEntity = function (entity, options) {
    var displayUrl = entity.display_url;
    var expandedUrl = entity.expanded_url;

    // Goal: If a user copies and pastes a tweet containing t.co'ed link, the resulting paste
    // should contain the full original URL (expanded_url), not the display URL.
    //
    // Method: Whenever possible, we actually emit HTML that contains expanded_url, and use
    // font-size:0 to hide those parts that should not be displayed (because they are not part of display_url).
    // Elements with font-size:0 get copied even though they are not visible.
    // Note that display:none doesn't work here. Elements with display:none don't get copied.
    //
    // Additionally, we want to *display* ellipses, but we don't want them copied.  To make this happen we
    // wrap the ellipses in a tco-ellipsis class and provide an onCopy handler that sets display:none on
    // everything with the tco-ellipsis class.
    //
    // Exception: pic.twitter.com images, for which expandedUrl = "https://twitter.com/#!/username/status/1234/photo/1
    // For those URLs, display_url is not a substring of expanded_url, so we don't do anything special to render the elided parts.
    // For a pic.twitter.com URL, the only elided part will be the "https://", so this is fine.

    var displayUrlSansEllipses = displayUrl.replace(/…/g, ""); // We have to disregard ellipses for matching
    // Note: we currently only support eliding parts of the URL at the beginning or the end.
    // Eventually we may want to elide parts of the URL in the *middle*.  If so, this code will
    // become more complicated.  We will probably want to create a regexp out of display URL,
    // replacing every ellipsis with a ".*".
    if (expandedUrl.indexOf(displayUrlSansEllipses) != -1) {
      var displayUrlIndex = expandedUrl.indexOf(displayUrlSansEllipses);
      var v = {
        displayUrlSansEllipses: displayUrlSansEllipses,
        // Portion of expandedUrl that precedes the displayUrl substring
        beforeDisplayUrl: expandedUrl.substr(0, displayUrlIndex),
        // Portion of expandedUrl that comes after displayUrl
        afterDisplayUrl: expandedUrl.substr(displayUrlIndex + displayUrlSansEllipses.length),
        precedingEllipsis: displayUrl.match(/^…/) ? "…" : "",
        followingEllipsis: displayUrl.match(/…$/) ? "…" : ""
      };
      for (var k in v) {
        if (v.hasOwnProperty(k)) {
          v[k] = twttr.txt.htmlEscape(v[k]);
        }
      }
      // As an example: The user tweets "hi http://longdomainname.com/foo"
      // This gets shortened to "hi http://t.co/xyzabc", with display_url = "…nname.com/foo"
      // This will get rendered as:
      // <span class='tco-ellipsis'> <!-- This stuff should get displayed but not copied -->
      //   …
      //   <!-- There's a chance the onCopy event handler might not fire. In case that happens,
      //        we include an &nbsp; here so that the … doesn't bump up against the URL and ruin it.
      //        The &nbsp; is inside the tco-ellipsis span so that when the onCopy handler *does*
      //        fire, it doesn't get copied.  Otherwise the copied text would have two spaces in a row,
      //        e.g. "hi  http://longdomainname.com/foo".
      //   <span style='font-size:0'>&nbsp;</span>
      // </span>
      // <span style='font-size:0'>  <!-- This stuff should get copied but not displayed -->
      //   http://longdomai
      // </span>
      // <span class='js-display-url'> <!-- This stuff should get displayed *and* copied -->
      //   nname.com/foo
      // </span>
      // <span class='tco-ellipsis'> <!-- This stuff should get displayed but not copied -->
      //   <span style='font-size:0'>&nbsp;</span>
      //   …
      // </span>
      v['invisible'] = options.invisibleTagAttrs;
      return stringSupplant("<span class='tco-ellipsis'>#{precedingEllipsis}<span #{invisible}>&nbsp;</span></span><span #{invisible}>#{beforeDisplayUrl}</span><span class='js-display-url'>#{displayUrlSansEllipses}</span><span #{invisible}>#{afterDisplayUrl}</span><span class='tco-ellipsis'><span #{invisible}>&nbsp;</span>#{followingEllipsis}</span>", v);
    }
    return displayUrl;
  };

  twttr.txt.autoLinkEntities = function(text, entities, options) {
    options = clone(options || {});

    options.hashtagClass = options.hashtagClass || DEFAULT_HASHTAG_CLASS;
    options.hashtagUrlBase = options.hashtagUrlBase || "https://twitter.com/#!/search?q=%23";
    options.cashtagClass = options.cashtagClass || DEFAULT_CASHTAG_CLASS;
    options.cashtagUrlBase = options.cashtagUrlBase || "https://twitter.com/#!/search?q=%24";
    options.listClass = options.listClass || DEFAULT_LIST_CLASS;
    options.usernameClass = options.usernameClass || DEFAULT_USERNAME_CLASS;
    options.usernameUrlBase = options.usernameUrlBase || "https://twitter.com/";
    options.listUrlBase = options.listUrlBase || "https://twitter.com/";
    options.htmlAttrs = twttr.txt.extractHtmlAttrsFromOptions(options);
    options.invisibleTagAttrs = options.invisibleTagAttrs || "style='position:absolute;left:-9999px;'";

    // remap url entities to hash
    var urlEntities, i, len;
    if(options.urlEntities) {
      urlEntities = {};
      for(i = 0, len = options.urlEntities.length; i < len; i++) {
        urlEntities[options.urlEntities[i].url] = options.urlEntities[i];
      }
      options.urlEntities = urlEntities;
    }

    var result = "";
    var beginIndex = 0;

    // sort entities by start index
    entities.sort(function(a,b){ return a.indices[0] - b.indices[0]; });

    var nonEntity = options.htmlEscapeNonEntities ? twttr.txt.htmlEscape : function(text) {
      return text;
    };

    for (var i = 0; i < entities.length; i++) {
      var entity = entities[i];
      result += nonEntity(text.substring(beginIndex, entity.indices[0]));

      if (entity.url) {
        result += twttr.txt.linkToUrl(entity, text, options);
      } else if (entity.hashtag) {
        result += twttr.txt.linkToHashtag(entity, text, options);
      } else if (entity.screenName) {
        result += twttr.txt.linkToMentionAndList(entity, text, options);
      } else if (entity.cashtag) {
        result += twttr.txt.linkToCashtag(entity, text, options);
      }
      beginIndex = entity.indices[1];
    }
    result += nonEntity(text.substring(beginIndex, text.length));
    return result;
  };

  twttr.txt.autoLinkWithJSON = function(text, json, options) {
    // concatenate all entities
    var entities = [];
    for (var key in json) {
      entities = entities.concat(json[key]);
    }
    // map JSON entity to twitter-text entity
    for (var i = 0; i < entities.length; i++) {
      entity = entities[i];
      if (entity.screen_name) {
        // this is @mention
        entity.screenName = entity.screen_name;
      } else if (entity.text) {
        // this is #hashtag
        entity.hashtag = entity.text;
      }
    }
    // modify indices to UTF-16
    twttr.txt.modifyIndicesFromUnicodeToUTF16(text, entities);

    return twttr.txt.autoLinkEntities(text, entities, options);
  };

  twttr.txt.extractHtmlAttrsFromOptions = function(options) {
    var htmlAttrs = {};
    for (var k in options) {
      var v = options[k];
      if (OPTIONS_NOT_ATTRIBUTES[k]) continue;
      if (BOOLEAN_ATTRIBUTES[k]) {
        v = v ? k : null;
      }
      if (v == null) continue;
      htmlAttrs[k] = v;
    }
    return htmlAttrs;
  };

  twttr.txt.autoLink = function(text, options) {
    var entities = twttr.txt.extractEntitiesWithIndices(text, {extractUrlsWithoutProtocol: false});
    return twttr.txt.autoLinkEntities(text, entities, options);
  };

  twttr.txt.autoLinkUsernamesOrLists = function(text, options) {
    var entities = twttr.txt.extractMentionsOrListsWithIndices(text);
    return twttr.txt.autoLinkEntities(text, entities, options);
  };

  twttr.txt.autoLinkHashtags = function(text, options) {
    var entities = twttr.txt.extractHashtagsWithIndices(text);
    return twttr.txt.autoLinkEntities(text, entities, options);
  };

  twttr.txt.autoLinkCashtags = function(text, options) {
    var entities = twttr.txt.extractCashtagsWithIndices(text);
    return twttr.txt.autoLinkEntities(text, entities, options);
  };

  twttr.txt.autoLinkUrlsCustom = function(text, options) {
    var entities = twttr.txt.extractUrlsWithIndices(text, {extractUrlsWithoutProtocol: false});
    return twttr.txt.autoLinkEntities(text, entities, options);
  };

  twttr.txt.removeOverlappingEntities = function(entities) {
    entities.sort(function(a,b){ return a.indices[0] - b.indices[0]; });

    var prev = entities[0];
    for (var i = 1; i < entities.length; i++) {
      if (prev.indices[1] > entities[i].indices[0]) {
        entities.splice(i, 1);
        i--;
      } else {
        prev = entities[i];
      }
    }
  };

  twttr.txt.extractEntitiesWithIndices = function(text, options) {
    var entities = twttr.txt.extractUrlsWithIndices(text, options)
                    .concat(twttr.txt.extractMentionsOrListsWithIndices(text))
                    .concat(twttr.txt.extractHashtagsWithIndices(text, {checkUrlOverlap: false}))
                    .concat(twttr.txt.extractCashtagsWithIndices(text));

    if (entities.length == 0) {
      return [];
    }

    twttr.txt.removeOverlappingEntities(entities);
    return entities;
  };

  twttr.txt.extractMentions = function(text) {
    var screenNamesOnly = [],
        screenNamesWithIndices = twttr.txt.extractMentionsWithIndices(text);

    for (var i = 0; i < screenNamesWithIndices.length; i++) {
      var screenName = screenNamesWithIndices[i].screenName;
      screenNamesOnly.push(screenName);
    }

    return screenNamesOnly;
  };

  twttr.txt.extractMentionsWithIndices = function(text) {
    var mentions = [],
        mentionOrList,
        mentionsOrLists = twttr.txt.extractMentionsOrListsWithIndices(text);

    for (var i = 0 ; i < mentionsOrLists.length; i++) {
      mentionOrList = mentionsOrLists[i];
      if (mentionOrList.listSlug == '') {
        mentions.push({
          screenName: mentionOrList.screenName,
          indices: mentionOrList.indices
        });
      }
    }

    return mentions;
  };

  /**
   * Extract list or user mentions.
   * (Presence of listSlug indicates a list)
   */
  twttr.txt.extractMentionsOrListsWithIndices = function(text) {
    if (!text || !text.match(twttr.txt.regexen.atSigns)) {
      return [];
    }

    var possibleNames = [],
        slashListname;

    text.replace(twttr.txt.regexen.validMentionOrList, function(match, before, atSign, screenName, slashListname, offset, chunk) {
      var after = chunk.slice(offset + match.length);
      if (!after.match(twttr.txt.regexen.endMentionMatch)) {
        slashListname = slashListname || '';
        var startPosition = offset + before.length;
        var endPosition = startPosition + screenName.length + slashListname.length + 1;
        possibleNames.push({
          screenName: screenName,
          listSlug: slashListname,
          indices: [startPosition, endPosition]
        });
      }
    });

    return possibleNames;
  };


  twttr.txt.extractReplies = function(text) {
    if (!text) {
      return null;
    }

    var possibleScreenName = text.match(twttr.txt.regexen.validReply);
    if (!possibleScreenName ||
        RegExp.rightContext.match(twttr.txt.regexen.endMentionMatch)) {
      return null;
    }

    return possibleScreenName[1];
  };

  twttr.txt.extractUrls = function(text, options) {
    var urlsOnly = [],
        urlsWithIndices = twttr.txt.extractUrlsWithIndices(text, options);

    for (var i = 0; i < urlsWithIndices.length; i++) {
      urlsOnly.push(urlsWithIndices[i].url);
    }

    return urlsOnly;
  };

  twttr.txt.extractUrlsWithIndices = function(text, options) {
    if (!options) {
      options = {extractUrlsWithoutProtocol: true};
    }

    if (!text || (options.extractUrlsWithoutProtocol ? !text.match(/\./) : !text.match(/:/))) {
      return [];
    }

    var urls = [];

    while (twttr.txt.regexen.extractUrl.exec(text)) {
      var before = RegExp.$2, url = RegExp.$3, protocol = RegExp.$4, domain = RegExp.$5, path = RegExp.$7;
      var endPosition = twttr.txt.regexen.extractUrl.lastIndex,
          startPosition = endPosition - url.length;

      // if protocol is missing and domain contains non-ASCII characters,
      // extract ASCII-only domains.
      if (!protocol) {
        if (!options.extractUrlsWithoutProtocol
            || before.match(twttr.txt.regexen.invalidUrlWithoutProtocolPrecedingChars)) {
          continue;
        }
        var lastUrl = null,
            lastUrlInvalidMatch = false,
            asciiEndPosition = 0;
        domain.replace(twttr.txt.regexen.validAsciiDomain, function(asciiDomain) {
          var asciiStartPosition = domain.indexOf(asciiDomain, asciiEndPosition);
          asciiEndPosition = asciiStartPosition + asciiDomain.length;
          lastUrl = {
            url: asciiDomain,
            indices: [startPosition + asciiStartPosition, startPosition + asciiEndPosition]
          };
          lastUrlInvalidMatch = asciiDomain.match(twttr.txt.regexen.invalidShortDomain);
          if (!lastUrlInvalidMatch) {
            urls.push(lastUrl);
          }
        });

        // no ASCII-only domain found. Skip the entire URL.
        if (lastUrl == null) {
          continue;
        }

        // lastUrl only contains domain. Need to add path and query if they exist.
        if (path) {
          if (lastUrlInvalidMatch) {
            urls.push(lastUrl);
          }
          lastUrl.url = url.replace(domain, lastUrl.url);
          lastUrl.indices[1] = endPosition;
        }
      } else {
        // In the case of t.co URLs, don't allow additional path characters.
        if (url.match(twttr.txt.regexen.validTcoUrl)) {
          url = RegExp.lastMatch;
          endPosition = startPosition + url.length;
        }
        urls.push({
          url: url,
          indices: [startPosition, endPosition]
        });
      }
    }

    return urls;
  };

  twttr.txt.extractHashtags = function(text) {
    var hashtagsOnly = [],
        hashtagsWithIndices = twttr.txt.extractHashtagsWithIndices(text);

    for (var i = 0; i < hashtagsWithIndices.length; i++) {
      hashtagsOnly.push(hashtagsWithIndices[i].hashtag);
    }

    return hashtagsOnly;
  };

  twttr.txt.extractHashtagsWithIndices = function(text, options) {
    if (!options) {
      options = {checkUrlOverlap: true};
    }

    if (!text || !text.match(twttr.txt.regexen.hashSigns)) {
      return [];
    }

    var tags = [];

    text.replace(twttr.txt.regexen.validHashtag, function(match, before, hash, hashText, offset, chunk) {
      var after = chunk.slice(offset + match.length);
      if (after.match(twttr.txt.regexen.endHashtagMatch))
        return;
      var startPosition = offset + before.length;
      var endPosition = startPosition + hashText.length + 1;
      tags.push({
        hashtag: hashText,
        indices: [startPosition, endPosition]
      });
    });

    if (options.checkUrlOverlap) {
      // also extract URL entities
      var urls = twttr.txt.extractUrlsWithIndices(text);
      if (urls.length > 0) {
        var entities = tags.concat(urls);
        // remove overlap
        twttr.txt.removeOverlappingEntities(entities);
        // only push back hashtags
        tags = [];
        for (var i = 0; i < entities.length; i++) {
          if (entities[i].hashtag) {
            tags.push(entities[i]);
          }
        }
      }
    }

    return tags;
  };

  twttr.txt.extractCashtags = function(text) {
    var cashtagsOnly = [],
        cashtagsWithIndices = twttr.txt.extractCashtagsWithIndices(text);

    for (var i = 0; i < cashtagsWithIndices.length; i++) {
      cashtagsOnly.push(cashtagsWithIndices[i].cashtag);
    }

    return cashtagsOnly;
  };

  twttr.txt.extractCashtagsWithIndices = function(text) {
    if (!text || text.indexOf("$") == -1) {
      return [];
    }

    var tags = [];

    text.replace(twttr.txt.regexen.validCashtag, function(match, before, dollar, cashtag, offset, chunk) {
      var startPosition = offset + before.length;
      var endPosition = startPosition + cashtag.length + 1;
      tags.push({
        cashtag: cashtag,
        indices: [startPosition, endPosition]
      });
    });

    return tags;
  };

  twttr.txt.modifyIndicesFromUnicodeToUTF16 = function(text, entities) {
    twttr.txt.convertUnicodeIndices(text, entities, false);
  };

  twttr.txt.modifyIndicesFromUTF16ToUnicode = function(text, entities) {
    twttr.txt.convertUnicodeIndices(text, entities, true);
  };

  twttr.txt.getUnicodeTextLength = function(text) {
    return text.replace(twttr.txt.regexen.non_bmp_code_pairs, ' ').length;
  };

  twttr.txt.convertUnicodeIndices = function(text, entities, indicesInUTF16) {
    if (entities.length == 0) {
      return;
    }

    var charIndex = 0;
    var codePointIndex = 0;

    // sort entities by start index
    entities.sort(function(a,b){ return a.indices[0] - b.indices[0]; });
    var entityIndex = 0;
    var entity = entities[0];

    while (charIndex < text.length) {
      if (entity.indices[0] == (indicesInUTF16 ? charIndex : codePointIndex)) {
        var len = entity.indices[1] - entity.indices[0];
        entity.indices[0] = indicesInUTF16 ? codePointIndex : charIndex;
        entity.indices[1] = entity.indices[0] + len;

        entityIndex++;
        if (entityIndex == entities.length) {
          // no more entity
          break;
        }
        entity = entities[entityIndex];
      }

      var c = text.charCodeAt(charIndex);
      if (0xD800 <= c && c <= 0xDBFF && charIndex < text.length - 1) {
        // Found high surrogate char
        c = text.charCodeAt(charIndex + 1);
        if (0xDC00 <= c && c <= 0xDFFF) {
          // Found surrogate pair
          charIndex++;
        }
      }
      codePointIndex++;
      charIndex++;
    }
  };

  // this essentially does text.split(/<|>/)
  // except that won't work in IE, where empty strings are ommitted
  // so "<>".split(/<|>/) => [] in IE, but is ["", "", ""] in all others
  // but "<<".split("<") => ["", "", ""]
  twttr.txt.splitTags = function(text) {
    var firstSplits = text.split("<"),
        secondSplits,
        allSplits = [],
        split;

    for (var i = 0; i < firstSplits.length; i += 1) {
      split = firstSplits[i];
      if (!split) {
        allSplits.push("");
      } else {
        secondSplits = split.split(">");
        for (var j = 0; j < secondSplits.length; j += 1) {
          allSplits.push(secondSplits[j]);
        }
      }
    }

    return allSplits;
  };

  twttr.txt.hitHighlight = function(text, hits, options) {
    var defaultHighlightTag = "em";

    hits = hits || [];
    options = options || {};

    if (hits.length === 0) {
      return text;
    }

    var tagName = options.tag || defaultHighlightTag,
        tags = ["<" + tagName + ">", "</" + tagName + ">"],
        chunks = twttr.txt.splitTags(text),
        i,
        j,
        result = "",
        chunkIndex = 0,
        chunk = chunks[0],
        prevChunksLen = 0,
        chunkCursor = 0,
        startInChunk = false,
        chunkChars = chunk,
        flatHits = [],
        index,
        hit,
        tag,
        placed,
        hitSpot;

    for (i = 0; i < hits.length; i += 1) {
      for (j = 0; j < hits[i].length; j += 1) {
        flatHits.push(hits[i][j]);
      }
    }

    for (index = 0; index < flatHits.length; index += 1) {
      hit = flatHits[index];
      tag = tags[index % 2];
      placed = false;

      while (chunk != null && hit >= prevChunksLen + chunk.length) {
        result += chunkChars.slice(chunkCursor);
        if (startInChunk && hit === prevChunksLen + chunkChars.length) {
          result += tag;
          placed = true;
        }

        if (chunks[chunkIndex + 1]) {
          result += "<" + chunks[chunkIndex + 1] + ">";
        }

        prevChunksLen += chunkChars.length;
        chunkCursor = 0;
        chunkIndex += 2;
        chunk = chunks[chunkIndex];
        chunkChars = chunk;
        startInChunk = false;
      }

      if (!placed && chunk != null) {
        hitSpot = hit - prevChunksLen;
        result += chunkChars.slice(chunkCursor, hitSpot) + tag;
        chunkCursor = hitSpot;
        if (index % 2 === 0) {
          startInChunk = true;
        } else {
          startInChunk = false;
        }
      } else if(!placed) {
        placed = true;
        result += tag;
      }
    }

    if (chunk != null) {
      if (chunkCursor < chunkChars.length) {
        result += chunkChars.slice(chunkCursor);
      }
      for (index = chunkIndex + 1; index < chunks.length; index += 1) {
        result += (index % 2 === 0 ? chunks[index] : "<" + chunks[index] + ">");
      }
    }

    return result;
  };

  var MAX_LENGTH = 140;

  // Characters not allowed in Tweets
  var INVALID_CHARACTERS = [
    // BOM
    fromCode(0xFFFE),
    fromCode(0xFEFF),

    // Special
    fromCode(0xFFFF),

    // Directional Change
    fromCode(0x202A),
    fromCode(0x202B),
    fromCode(0x202C),
    fromCode(0x202D),
    fromCode(0x202E)
  ];

  // Returns the length of Tweet text with consideration to t.co URL replacement
  // and chars outside the basic multilingual plane that use 2 UTF16 code points
  twttr.txt.getTweetLength = function(text, options) {
    if (!options) {
      options = {
          // These come from https://api.twitter.com/1/help/configuration.json
          // described by https://dev.twitter.com/docs/api/1/get/help/configuration
          short_url_length: 22,
          short_url_length_https: 23
      };
    }
    var textLength = twttr.txt.getUnicodeTextLength(text),
        urlsWithIndices = twttr.txt.extractUrlsWithIndices(text);
    twttr.txt.modifyIndicesFromUTF16ToUnicode(text, urlsWithIndices);

    for (var i = 0; i < urlsWithIndices.length; i++) {
    	// Subtract the length of the original URL
      textLength += urlsWithIndices[i].indices[0] - urlsWithIndices[i].indices[1];

      // Add 23 characters for URL starting with https://
      // Otherwise add 22 characters
      if (urlsWithIndices[i].url.toLowerCase().match(twttr.txt.regexen.urlHasHttps)) {
         textLength += options.short_url_length_https;
      } else {
        textLength += options.short_url_length;
      }
    }

    return textLength;
  };

  // Check the text for any reason that it may not be valid as a Tweet. This is meant as a pre-validation
  // before posting to api.twitter.com. There are several server-side reasons for Tweets to fail but this pre-validation
  // will allow quicker feedback.
  //
  // Returns false if this text is valid. Otherwise one of the following strings will be returned:
  //
  //   "too_long": if the text is too long
  //   "empty": if the text is nil or empty
  //   "invalid_characters": if the text contains non-Unicode or any of the disallowed Unicode characters
  twttr.txt.isInvalidTweet = function(text) {
    if (!text) {
      return "empty";
    }

    // Determine max length independent of URL length
    if (twttr.txt.getTweetLength(text) > MAX_LENGTH) {
      return "too_long";
    }

    for (var i = 0; i < INVALID_CHARACTERS.length; i++) {
      if (text.indexOf(INVALID_CHARACTERS[i]) >= 0) {
        return "invalid_characters";
      }
    }

    return false;
  };

  twttr.txt.isValidTweetText = function(text) {
    return !twttr.txt.isInvalidTweet(text);
  };

  twttr.txt.isValidUsername = function(username) {
    if (!username) {
      return false;
    }

    var extracted = twttr.txt.extractMentions(username);

    // Should extract the username minus the @ sign, hence the .slice(1)
    return extracted.length === 1 && extracted[0] === username.slice(1);
  };

  var VALID_LIST_RE = regexSupplant(/^#{validMentionOrList}$/);

  twttr.txt.isValidList = function(usernameList) {
    var match = usernameList.match(VALID_LIST_RE);

    // Must have matched and had nothing before or after
    return !!(match && match[1] == "" && match[4]);
  };

  twttr.txt.isValidHashtag = function(hashtag) {
    if (!hashtag) {
      return false;
    }

    var extracted = twttr.txt.extractHashtags(hashtag);

    // Should extract the hashtag minus the # sign, hence the .slice(1)
    return extracted.length === 1 && extracted[0] === hashtag.slice(1);
  };

  twttr.txt.isValidUrl = function(url, unicodeDomains, requireProtocol) {
    if (unicodeDomains == null) {
      unicodeDomains = true;
    }

    if (requireProtocol == null) {
      requireProtocol = true;
    }

    if (!url) {
      return false;
    }

    var urlParts = url.match(twttr.txt.regexen.validateUrlUnencoded);

    if (!urlParts || urlParts[0] !== url) {
      return false;
    }

    var scheme = urlParts[1],
        authority = urlParts[2],
        path = urlParts[3],
        query = urlParts[4],
        fragment = urlParts[5];

    if (!(
      (!requireProtocol || (isValidMatch(scheme, twttr.txt.regexen.validateUrlScheme) && scheme.match(/^https?$/i))) &&
      isValidMatch(path, twttr.txt.regexen.validateUrlPath) &&
      isValidMatch(query, twttr.txt.regexen.validateUrlQuery, true) &&
      isValidMatch(fragment, twttr.txt.regexen.validateUrlFragment, true)
    )) {
      return false;
    }

    return (unicodeDomains && isValidMatch(authority, twttr.txt.regexen.validateUrlUnicodeAuthority)) ||
           (!unicodeDomains && isValidMatch(authority, twttr.txt.regexen.validateUrlAuthority));
  };

  function isValidMatch(string, regex, optional) {
    if (!optional) {
      // RegExp["$&"] is the text of the last match
      // blank strings are ok, but are falsy, so we check stringiness instead of truthiness
      return ((typeof string === "string") && string.match(regex) && RegExp["$&"] === string);
    }

    // RegExp["$&"] is the text of the last match
    return (!string || (string.match(regex) && RegExp["$&"] === string));
  }

  if (typeof module != 'undefined' && module.exports) {
    module.exports = twttr.txt;
  }

  if (typeof window != 'undefined') {
    if (window.twttr) {
      for (var prop in twttr) {
        window.twttr[prop] = twttr[prop];
      }
    } else {
      window.twttr = twttr;
    }
  }
})();

define("bower_components/twitter-text/twitter-text", function(){});

/*global define:true, require:true */
define('aura-extensions/aura-twitter-text',['bower_components/twitter-text/twitter-text'], function (){
  return {
    initialize: function(app){
      
      app.sandbox.util.twttr = window.twttr.txt;
    }
  };
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
/* global define:true */
define('aura-extensions/hull-component-normalize-id',[],function () {
  
  var extension = {
    initialize: function (app) {
      var _ = app.core.util._;
      app.components.before('initialize', function (options) {
        var normalizedOptions = extension.normalizeId.call(this, options);
        this.options = _.extend(this.options, normalizedOptions);
      });
    },
    normalizeId: function (options) {
      var sandbox = this.sandbox;
      var prefix = 'entity:';
      if (options.id) {
        if (options.id.match('^'+prefix)!==null){
          options.id = sandbox.util.entity.encode(options.id.slice(prefix.length));
        }
        return options;
      }
      if (options.uid) {
        options.id = sandbox.util.entity.encode(options.uid);
        return options;
      }
      options.id = sandbox.config.entity_id;
      return options;
    }
  };

  return extension;
});

define('aura-extensions/hull-component-reporting',['underscore', 'lib/api/reporting'], function(_, reporting) {
  var module = {
    setup: function() {
      this.track = function(name, data) {
        var defaultData;
        if (data == null) {
          data = {};
        }
        defaultData = _.result(this, 'trackingData');
        defaultData = _.isObject(defaultData) ? defaultData : {};
        data = _.extend({
          id: this.id,
          component: this.options.name
        }, defaultData, data);
        return this.sandbox.track(name, data);
      };
    },
    initialize: function(app) {
      var _reporting = reporting.init(app.core.data.hullApi);
      var sandbox = app.sandbox;
      sandbox.track = function(eventName, params) {
        return _reporting.track(eventName, params);
      };
      sandbox.flag = function(id) {
        return _reporting.flag(id);
      };
      return app.components.before('initialize', module.setup);
    }
  };
  return module;
});

/* global define:true */
define('aura-extensions/hull-entities',['lib/utils/entity'], function (entity) {
  

  parseQueryString = function(str) {
    var objURL;
    str || (str = window.location.search);
    objURL = {};
    str.replace(new RegExp("([^?=&]+)(=([^&]*))?", "g"), function($0, $1, $2, $3) {
      return objURL[$1] = decodeURIComponent($3);
    });
    return objURL;
  };

  var extension = {
    initialize: function (app) {
      app.core.util.entity = entity
      var _ = app.core.util._;
      if (app.config.withEntity === true) {
        og = core.dom.find('meta[property="og:url"]');
        if (og && og.length && og.attr('content')) {
          uid = og.attr('content');
        } else {
          loc = document.location;
          search = parseQueryString(loc.search);
          qs = _.map(_.keys(search).sort(), function(k) {
            return [k, search[k]].join("=");
          }).join('&');
          if (qs.length > 0) {
            qs = "?" + qs;
          }
          uid = [loc.origin, loc.pathname, qs].join('');
        }
        app.config.uid = entity.encode(uid);
      }
    }
  };

  return extension;
});

/* global define:true */
define('aura-extensions/hull-helpers',[],function () {
  

  var extension = {
    initialize: function (app) {
      var _ = app.core.util._;
      imageUrl = function(id, size, fallback) {
        if (size == null) {
          size = "small";
        }
        if (fallback == null) {
          fallback = "";
        }
        if (_.isFunction(id)) {
          id = id();
        }
        if (!id) {
          return fallback;
        }
        id = id.replace(/\/(large|small|medium|thumb)$/, '');

        if (!_.isString(size)) {
          size = 'small';
        }
        return "//" + app.config.assetsUrl + "/img/" + id + "/" + size;
      };

      app.sandbox.helpers = app.sandbox.helpers || {}
      app.sandbox.helpers.imageUrl =imageUrl;

    }
  };

  return extension;
});


define('aura-extensions/hull-reporting',['lib/api/reporting'], function(api) {
  return {
    initialize: function(app) {
      app.core.reporting = api;
    }
  };
});

/*global define:true */
define('aura-extensions/hull-utils',[],function() {

  return {
    require: {
      paths: {
        string: 'bower_components/underscore.string/lib/underscore.string'
      },
      shim: {
        string: { deps: ['underscore'] }
      }
    },
    initialize: function(app) {
      
      var _ = app.core.util._;
      app.sandbox.utils = app.sandbox.utils || {}
    }
  }
});

(function() {

  define('lib/client/component/actions',['underscore'], function(_) {
    var camelize, module;
    camelize = function(str) {
      return str.replace(/(?:^|[-_])(\w)/g, function(m, c) {
        return (c && c.toUpperCase()) || '';
      });
    };
    module = {
      initialize: function(app) {
        return app.components.before('initialize', module.registerActions);
      },
      defaultActions: ['login', 'logout', 'linkIdentity', 'unlinkIdentity'],
      selectAction: function(action, scope) {
        var fn;
        fn = scope.actions[action] || scope["" + action + "Action"];
        if (_.isString(fn)) {
          fn = scope[fn];
        }
        if (!_.isFunction(fn)) {
          throw new Error("Can't find action " + action + " on this component");
        }
        return fn;
      },
      formatActionData: function(data) {
        var formattedData, k, v, _fn;
        formattedData = {};
        _fn = function() {
          var key;
          key = k.replace(/^hull(-)?/, "");
          key = camelize(key);
          key = key.charAt(0).toLowerCase() + key.slice(1);
          return formattedData[key] = v;
        };
        for (k in data) {
          v = data[k];
          _fn();
        }
        return formattedData;
      },
      actionHandler: function(e) {
        var action, data, fn, source;
        source = this.sandbox.dom.find(e.currentTarget);
        action = source.data("hull-action");
        data = module.formatActionData(source.data());
        try {
          fn = module.selectAction(action, this);
          return fn.call(this, e, {
            el: source,
            data: data
          });
        } catch (err) {
          return console.error("Error in action handler: ", action, err.message, err);
        } finally {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }
      },
      registerActions: function() {
        var e, _ref;
        e = _.isFunction(this.events) ? this.events() : this.events;
        this.events = _.defaults({
          "click [data-hull-action]": _.bind(module.actionHandler, this)
        }, e);
        this.actions = _.isFunction(this.actions) ? this.actions() : this.actions;
        if ((_ref = this.actions) == null) {
          this.actions = {};
        }
        return _.each(module.defaultActions, function(action) {
          var _base, _ref1,
            _this = this;
          return (_ref1 = (_base = this.actions)[action]) != null ? _ref1 : _base[action] = function(e, params) {
            return _this.sandbox[action](params.data.provider, params.data);
          };
        }, this);
      }
    };
    return module;
  });

}).call(this);

(function() {
  var __slice = [].slice;

  define('lib/client/component/api',['underscore', 'lib/utils/promises'], function(_, promises) {
    var clearModelsCache, models, module, rawFetch, slice;
    slice = Array.prototype.slice;
    models = {};
    clearModelsCache = function() {
      return models = _.pick(models, 'me', 'app', 'org');
    };
    rawFetch = null;
    module = {
      initialize: function(app) {
        var BaseHullModel, Collection, Model, RawModel, attrs, authScope, core, data, generateModel, hullApi, m, methodMap, remoteConfig, sandbox, setupCollection, setupModel, sync, _i, _len, _ref, _ref1, _ref2, _results, _track;
        core = app.core;
        sandbox = app.sandbox;
        hullApi = core.data.hullApi;
        _track = function(res, headers) {
          var authScope, eventName, hullTrack, trackParams, _ref;
          if (headers == null) {
            headers = {};
          }
          if (headers != null) {
            hullTrack = headers['Hull-Track'];
            if (hullTrack) {
              try {
                _ref = JSON.parse(atob(hullTrack)), eventName = _ref[0], trackParams = _ref[1];
                core.mediator.emit(eventName, trackParams);
              } catch (error) {
                console.warn('Error', error);
              }
            }
            if (headers['Hull-Auth-Scope']) {
              return authScope = headers['Hull-Auth-Scope'].split(':')[0];
            }
          }
        };
        core.data.api = function() {
          var args, dfd;
          args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
          dfd = hullApi.api.apply(hullApi, args);
          dfd.then(_track);
          return dfd;
        };
        _.each(['get', 'put', 'post', 'delete'], function(method) {
          return core.data.api[method] = function() {
            var args, dfd, _ref;
            args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
            dfd = (_ref = hullApi.api)[method].apply(_ref, args);
            dfd.then(_track);
            return dfd;
          };
        });
        methodMap = {
          'create': 'post',
          'update': 'put',
          'delete': 'delete',
          'read': 'get'
        };
        sync = function(method, model, options) {
          var data, dfd, url, verb;
          if (options == null) {
            options = {};
          }
          url = _.isFunction(model.url) ? model.url() : model.url;
          verb = methodMap[method];
          data = options.data;
          if (!(data != null) && model && (method === 'create' || method === 'update' || method === 'patch')) {
            data = options.attrs || model.toJSON(options);
          }
          dfd = core.data.api(url, verb, data);
          dfd.then(options.success);
          dfd.then(function(resolved) {
            return model.trigger('sync', model, resolved, options);
          });
          dfd.fail(options.error);
          dfd.fail(function(rejected) {
            return model.trigger('error', model, rejected, options);
          });
          return dfd;
        };
        BaseHullModel = core.mvc.Model.extend({
          sync: sync
        });
        RawModel = BaseHullModel.extend({
          url: function() {
            return this._id || this.id;
          }
        });
        Model = BaseHullModel.extend({
          url: function() {
            var url, _ref;
            if (this.id || this._id) {
              url = this._id || this.id;
            } else {
              url = (_ref = this.collection) != null ? _ref.url : void 0;
            }
            return url;
          }
        });
        Collection = core.mvc.Collection.extend({
          model: Model,
          sync: sync
        });
        setupModel = function(attrs, raw) {
          var model;
          model = generateModel(attrs, raw);
          model.on('change', function() {
            var args, eventName, _ref;
            args = slice.call(arguments);
            eventName = "model.hull." + model._id + '.' + 'change';
            return core.mediator.emit(eventName, {
              eventName: eventName,
              model: model,
              changes: (_ref = args[1]) != null ? _ref.changes : void 0
            });
          });
          model.on('sync', function() {
            if (model._id === 'me') {
              return core.mediator.emit('hull.auth.update', model.attributes);
            }
          });
          model._id = attrs._id;
          models[attrs._id] = model;
          return model;
        };
        core.data.api.model = function(attrs) {
          return rawFetch(attrs, false);
        };
        rawFetch = function(attrs, raw) {
          if (raw == null) {
            raw = false;
          }
          if (_.isString(attrs)) {
            attrs = {
              _id: attrs
            };
          }
          if (!attrs._id) {
            attrs._id = attrs.path;
          }
          if ((attrs != null ? attrs._id : void 0) == null) {
            throw new Error('A model must have an identifier...');
          }
          return models[attrs._id] || setupModel(attrs, raw);
        };
        generateModel = function(attrs, raw) {
          var model, _Model;
          _Model = raw ? RawModel : Model;
          if (attrs.id || attrs._id) {
            return model = new _Model(attrs);
          } else {
            return model = new _Model();
          }
        };
        setupCollection = function(path) {
          var collection, dfd, route;
          route = (core.data.api.parseRoute([path]))[0];
          collection = new Collection;
          collection.url = path;
          collection.on('all', function() {
            var args, eventName, _ref;
            args = slice.call(arguments);
            eventName = "collection." + route.path.replace(/\//g, ".") + '.' + args[0];
            return core.mediator.emit(eventName, {
              eventName: eventName,
              collection: collection,
              changes: (_ref = args[1]) != null ? _ref.changes : void 0
            });
          });
          dfd = collection.deferred = promises.deferred();
          if (collection.models.length > 0) {
            collection._fetched = true;
            dfd.resolve(collection);
          } else {
            collection._fetched = false;
            collection.fetch({
              success: function() {
                collection._fetched = true;
                return dfd.resolve(collection);
              },
              error: function() {
                return dfd.fail(collection);
              }
            });
          }
          return collection;
        };
        core.data.api.collection = function(path) {
          if (path == null) {
            throw new Error('A model must have an path...');
          }
          return setupCollection.call(core.data.api, path);
        };
        sandbox = app.sandbox;
        authScope = hullApi.authScope;
        remoteConfig = hullApi.remoteConfig;
        data = remoteConfig.data;
        app.config.assetsUrl = remoteConfig.assetsUrl;
        app.config.services = remoteConfig.settings;
        app.components.addSource('hull', remoteConfig.baseUrl + '/aura_components');
        if ((_ref = sandbox.config) == null) {
          sandbox.config = {};
        }
        sandbox.config.debug = app.config.debug;
        sandbox.config.assetsUrl = remoteConfig.assetsUrl;
        sandbox.config.appId = app.config.appId;
        sandbox.config.orgUrl = app.config.orgUrl;
        sandbox.config.services = remoteConfig.settings;
        sandbox.config.entity_id = (_ref1 = data.entity) != null ? _ref1.id : void 0;
        sandbox.isAdmin = function() {
          return authScope === 'Account' || sandbox.data.api.model('me').get('is_admin');
        };
        sandbox.login = hullApi.login;
        sandbox.logout = hullApi.logout;
        sandbox.linkIdentity = function(provider, opts, callback) {
          if (opts == null) {
            opts = {};
          }
          if (callback == null) {
            callback = function() {};
          }
          opts.mode = 'connect';
          return sandbox.login(provider, opts, callback);
        };
        sandbox.unlinkIdentity = function(provider, callback) {
          if (callback == null) {
            callback = function() {};
          }
          return core.data.api("me/identities/" + provider, 'delete').then(function() {
            var promise;
            promise = app.sandbox.data.api.model('me').fetch();
            promise.then(function(me) {
              return core.mediator.emit('hull.auth.login', me);
            });
            return promise.then(callback);
          });
        };
        _ref2 = ['me', 'app', 'org', 'entity'];
        _results = [];
        for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
          m = _ref2[_i];
          attrs = data[m];
          if (attrs) {
            attrs._id = m;
            _results.push(rawFetch(attrs, true));
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      },
      afterAppStart: function(app) {
        var core;
        core = app.core;
        return core.mediator.on('hull.auth.*', clearModelsCache);
      }
    };
    return module;
  });

}).call(this);

(function() {

  define('lib/client/component/context',['underscore', 'lib/utils/promises'], function(_, promises) {
    var Context, onDataError, _dfd;
    onDataError = function(datasourceName, err) {
      return console.log("An error occurred with datasource " + datasourceName, err);
    };
    _dfd = promises.deferred;
    return Context = (function() {

      function Context() {
        this._context = {};
        this._errors = {};
      }

      Context.prototype.add = function(name, value) {
        return this._context[name] = value;
      };

      Context.prototype.addDatasource = function(name, dsPromise, fallback) {
        var dfd,
          _this = this;
        if (!_.isFunction(fallback)) {
          fallback = _.bind(onDataError, void 0, name);
        }
        dfd = _dfd();
        dsPromise.then(function(res) {
          if (_.isFunction(res != null ? res.toJSON : void 0)) {
            _this.add(name, res.toJSON());
          } else if (_.isArray(res) && res[1] === 'success' && res[2].status === 200) {
            _this.add(name, res[0]);
          } else {
            _this.add(name, res);
          }
          return dfd.resolve(res);
        }, function(err) {
          var resolved;
          _this._errors[name] = err;
          resolved = fallback(err);
          _this.add(name, resolved);
          return dfd.resolve(resolved);
        });
        return dfd.promise;
      };

      Context.prototype.errors = function() {
        var countKeys;
        countKeys = _.keys(this._errors).length;
        if (!countKeys) {
          return null;
        }
        return this._errors;
      };

      Context.prototype.build = function() {
        return this._context;
      };

      return Context;

    })();
  });

}).call(this);

(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('lib/client/component/component',['underscore', 'lib/client/component/context'], function(_, Context) {
    return function(app) {
      var HullComponent, debug, module, _invokeBeforeRender;
      _invokeBeforeRender = function(data, ctx) {
        var dfd,
          _this = this;
        dfd = app.core.data.deferred();
        this.invokeWithCallbacks('beforeRender', ctx.build(), ctx.errors()).then(function(_data) {
          data = _.extend({}, _this.data, _data || ctx.build(), data);
          return dfd.resolve(data);
        }, function(err) {
          console.error(err);
          return dfd.reject(err);
        });
        return dfd.promise();
      };
      debug = false;
      HullComponent = (function(_super) {

        __extends(HullComponent, _super);

        HullComponent.prototype.initialize = function() {};

        HullComponent.prototype.isInitialized = false;

        HullComponent.prototype.options = {};

        function HullComponent(options) {
          this.render = __bind(this.render, this);

          this.afterRender = __bind(this.afterRender, this);

          this.doRender = __bind(this.doRender, this);

          this.getTemplate = __bind(this.getTemplate, this);

          this.loggedIn = __bind(this.loggedIn, this);

          this.buildContext = __bind(this.buildContext, this);

          this.log = __bind(this.log, this);

          this.renderTemplate = __bind(this.renderTemplate, this);

          var k, v, _ref, _ref1, _ref2;
          this.ref = options.ref;
          this.api = this.sandbox.data.api;
          if ((_ref = this.refresh) == null) {
            this.refresh = _.throttle((function() {
              return this.invokeWithCallbacks('render');
            }), 200);
          }
          this.componentName = options.name;
          _ref1 = this.options;
          for (k in _ref1) {
            v = _ref1[k];
            if ((_ref2 = options[k]) == null) {
              options[k] = v;
            }
          }
          if (this.className == null) {
            this.className = "hull-component";
            if (this.namespace != null) {
              this.className += " hull-" + this.namespace;
            }
          }
          this.cid = _.uniqueId('view');
          this._configure(options || {});
          this._ensureElement();
          this.invokeWithCallbacks('initialize', options).then(_.bind(function() {
            var refreshOn, _i, _len, _ref3, _results,
              _this = this;
            this.delegateEvents();
            this.invokeWithCallbacks('render');
            this.sandbox.on('hull.settings.update', function(conf) {
              return _this.sandbox.config.services = conf;
            });
            _ref3 = this.refreshEvents || [];
            _results = [];
            for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
              refreshOn = _ref3[_i];
              _results.push(this.sandbox.on(refreshOn, (function() {
                return _this.refresh();
              }), this));
            }
            return _results;
          }, this), function(err) {
            return console.warn('WARNING', err);
          });
        }

        HullComponent.prototype.renderTemplate = function(tpl, data) {
          var _ref, _tpl;
          _tpl = (_ref = this._templates) != null ? _ref[tpl] : void 0;
          if (_tpl) {
            return _tpl(data || this, {
              helpers: _.extend({}, this.helpers)
            });
          } else {
            return "Cannot find template '" + tpl + "'";
          }
        };

        HullComponent.prototype.authServices = function() {
          return this.sandbox.util._.reject(this.sandbox.util._.keys(this.sandbox.config.services.auth || {}), function(service) {
            return service === 'hull';
          });
        };

        HullComponent.prototype.beforeRender = function(data) {
          return data;
        };

        HullComponent.prototype.renderError = function() {};

        HullComponent.prototype.log = function(msg) {
          if (this.options.debug) {
            return console.warn(this.options.name, ":", this.options.id, msg);
          } else {
            return console.warn("[DEBUG] " + this.options.name, msg, this);
          }
        };

        HullComponent.prototype.buildContext = function(ctx) {
          var _ref;
          if ((_ref = this._renderCount) == null) {
            this._renderCount = 0;
          }
          ctx.add('options', this.options);
          ctx.add('loggedIn', this.loggedIn());
          ctx.add('isAdmin', this.sandbox.isAdmin());
          ctx.add('debug', this.sandbox.config.debug);
          ctx.add('renderCount', ++this._renderCount);
          return ctx;
        };

        HullComponent.prototype.loggedIn = function() {
          var identities, me, _ref;
          if (this.sandbox.data.api.model('me').get('id') == null) {
            return false;
          }
          identities = {};
          me = this.sandbox.data.api.model('me');
          _.map(me.get("identities"), function(i) {
            return identities[i.provider] = i;
          });
          if (me.get('main_identity') === 'email') {
            if ((_ref = identities.email) == null) {
              identities.email = {};
            }
          }
          return identities;
        };

        HullComponent.prototype.getTemplate = function(tpl, data) {
          var _ref;
          return tpl || this.template || ((_ref = this.templates) != null ? _ref[0] : void 0);
        };

        HullComponent.prototype.doRender = function(tpl, data) {
          var ret, tplName;
          tplName = this.getTemplate(tpl, data);
          ret = this.renderTemplate(tplName, data);
          this.$el.addClass(this.className);
          if (debug) {
            ret = "<!-- START " + tplName + " RenderCount: " + this._renderCount + " -->" + ret + "<!-- END " + tplName + "-->";
          }
          this.$el.html(ret);
          return this;
        };

        HullComponent.prototype.afterRender = function(data) {
          return data;
        };

        HullComponent.prototype.render = function(tpl, data) {
          var __ctx,
            _this = this;
          __ctx = new Context();
          return this.invokeWithCallbacks('buildContext', __ctx).then(function() {
            return _invokeBeforeRender.call(_this, data, __ctx).then(function(data) {
              _this.invokeWithCallbacks('doRender', tpl, data);
              _.defer(function() {
                return _this.afterRender.call(_this, data);
              });
              _.defer(function() {
                return _this.sandbox.start(_this.$el, {
                  reset: true
                });
              });
              _this.isInitialized = true;
              return _this.emitLifecycleEvent('render');
            }, function(err) {
              console.error(err.message);
              return _this.renderError(err);
            });
          });
        };

        HullComponent.prototype.emitLifecycleEvent = function(name) {
          return this.sandbox.emit("hull." + (this.componentName.replace('/', '.')) + "." + name, {
            cid: this.cid
          });
        };

        return HullComponent;

      })(app.core.mvc.View);
      module = {
        initialize: function(app) {
          debug = app.config.debug;
          return app.components.addType("Hull", HullComponent.prototype);
        }
      };
      return module;
    };
  });

}).call(this);

(function() {

  define('lib/client/datasource',['lib/utils/promises', 'underscore', 'backbone'], function(promises, _, Backbone) {
    var Datasource, parseLinkHeader, parseQueryString, parseURI;
    parseLinkHeader = function(header) {
      var links;
      links = {};
      if (header != null) {
        header.replace(/<([^>]*)>;\s*rel="([\w]*)\"/g, function(match, url, rel) {
          return links[rel] = url;
        });
      }
      return links;
    };
    parseQueryString = function(path) {
      var params;
      path = path.split('?')[1] || path;
      params = {};
      path.replace(/([^?&=]+)(=([^&]*))?/g, function(match, key, $, value) {
        if (value != null) {
          return params[key] = value;
        }
      });
      return params;
    };
    parseURI = function(uri, bindings) {
      var p, placeHolders, _i, _key, _len;
      placeHolders = uri.match(/(\:[a-zA-Z0-9-_]+)/g);
      if (!placeHolders) {
        return uri;
      }
      for (_i = 0, _len = placeHolders.length; _i < _len; _i++) {
        p = placeHolders[_i];
        _key = p.slice(1);
        if (!_.has(bindings, _key)) {
          throw new Error("Cannot resolve datasource binding " + p);
        }
        uri = uri.replace(p, bindings[_key]);
      }
      return uri;
    };
    Datasource = (function() {

      function Datasource(ds, transport) {
        var params, _errDefinition, _errTransport;
        if (ds instanceof Backbone.Model || ds instanceof Backbone.Collection) {
          this.def = ds;
          return;
        }
        this.transport = transport;
        _errDefinition = new TypeError('Datasource is missing its definition. Cannot continue.');
        _errTransport = new TypeError('Datasource is missing a transport. Cannot continue.');
        if (!ds) {
          throw _errDefinition;
        }
        if (!this.transport) {
          throw _errTransport;
        }
        if (_.isString(ds)) {
          ds = {
            path: ds,
            provider: 'hull'
          };
        } else if (_.isObject(ds) && !_.isFunction(ds)) {
          if (!ds.path) {
            throw _errDefinition;
          }
          ds.provider = ds.provider || 'hull';
        }
        if (!_.isFunction(ds)) {
          params = ds.params || {};
          ds.params = _.extend(parseQueryString(ds.path), params);
          ds.path = ds.path.split('?')[0];
        }
        this.def = ds;
      }

      Datasource.prototype.parse = function(bindings) {
        if (!(this.def instanceof Backbone.Model || this.def instanceof Backbone.Collection)) {
          if (!_.isFunction(this.def)) {
            this.def.path = parseURI(this.def.path, bindings);
          }
          if (!_.isFunction(this.def)) {
            return this.def.provider = parseURI(this.def.provider, bindings);
          }
        }
      };

      Datasource.prototype.fetch = function() {
        var dfd, ret, transportDfd,
          _this = this;
        dfd = promises.deferred();
        if (this.def instanceof Backbone.Model || this.def instanceof Backbone.Collection) {
          dfd.resolve(this.def);
        } else if (_.isFunction(this.def)) {
          ret = this.def.call();
          if (ret != null ? ret.promise : void 0) {
            return promises.when(ret);
          } else {
            dfd.resolve(ret);
          }
        } else {
          if (/undefined/.test(this.def.path)) {
            dfd.resolve(false);
            return dfd.promise;
          }
          transportDfd = this.transport(this.def);
          transportDfd.then(function(obj, headers) {
            if (_.isArray(obj)) {
              if (headers != null ? headers.Link : void 0) {
                _this.paginationLinks = parseLinkHeader(headers['Link']);
              }
              return dfd.resolve(new Backbone.Collection(obj));
            } else {
              return dfd.resolve(new Backbone.Model(obj));
            }
          }, function(err) {
            return dfd.reject(err);
          });
        }
        return dfd.promise;
      };

      Datasource.prototype.isPaginable = function() {
        return this.paginationLinks != null;
      };

      Datasource.prototype.isFirst = function() {
        var _ref;
        return !((_ref = this.paginationLinks) != null ? _ref.first : void 0);
      };

      Datasource.prototype.isLast = function() {
        var _ref;
        return !((_ref = this.paginationLinks) != null ? _ref.last : void 0);
      };

      Datasource.prototype.previous = function() {
        if (!this.isFirst()) {
          return _.extend(this.def.params, parseQueryString(this.paginationLinks.prev));
        }
      };

      Datasource.prototype.next = function() {
        if (!this.isLast()) {
          return _.extend(this.def.params, parseQueryString(this.paginationLinks.next));
        }
      };

      Datasource.prototype.sort = function(field, direction) {
        if (direction == null) {
          direction = 'ASC';
        }
        return this.def.params.order_by = field + ' ' + direction;
      };

      Datasource.prototype.where = function(query, extend) {
        if (extend == null) {
          extend = false;
        }
        if (extend) {
          query = _.extend(this.def.params.where, query);
        }
        this.def.params.where = query;
        return this.def.params.page = 1;
      };

      return Datasource;

    })();
    return Datasource;
  });

}).call(this);

(function() {

  define('lib/utils/q2jQuery',['jquery'], function($) {
    return function(qPromise) {
      var $dfd;
      $dfd = $.Deferred();
      qPromise.then($dfd.resolve, $dfd.reject);
      return $dfd.promise();
    };
  });

}).call(this);

(function() {

  define('lib/client/component/datasource',['lib/client/datasource', 'underscore', 'lib/utils/promises', 'lib/utils/q2jQuery', 'string'], function(Datasource, _, promises, q2jQuery) {
    var module;
    module = {
      datasourceModel: Datasource,
      getDatasourceErrorHandler: function(name, scope) {
        var handler;
        handler = scope["on" + (_.string.capitalize(_.string.camelize(name))) + "Error"];
        if (!_.isFunction(handler)) {
          handler = module.defaultErrorHandler;
        }
        return _.bind(handler, scope, name);
      },
      defaultErrorHandler: function(datasourceName, err) {
        return console.warn("An error occurred with datasource " + datasourceName, err.status, err.statusText);
      },
      addDatasources: function(datasources) {
        var _builtDs,
          _this = this;
        if (datasources == null) {
          datasources = {};
        }
        _builtDs = _.map(datasources, function(ds, i) {
          if (_.isFunction(ds)) {
            ds = _.bind(ds, _this);
          }
          if (!(ds instanceof module.datasourceModel)) {
            ds = new module.datasourceModel(ds, _this.api);
          }
          return ds;
        });
        return this.datasources = _.object(_.keys(datasources), _builtDs);
      },
      fetchDatasources: function() {
        var context, promiseArray, _ref,
          _this = this;
        context = [].pop.apply(arguments);
        if ((_ref = this.data) == null) {
          this.data = {};
        }
        promiseArray = _.map(this.datasources, function(ds, k) {
          var fetcher, handler;
          ds.parse(_.extend({}, _this, _this.options || {}));
          handler = module.getDatasourceErrorHandler(k, _this);
          fetcher = ds.fetch();
          promises.when(fetcher, function(res) {
            return _this.data[k] = res;
          });
          return context.addDatasource(k, fetcher, handler);
        });
        return q2jQuery(promises.all(promiseArray));
      },
      initialize: function(app) {
        var default_datasources;
        default_datasources = {
          me: new module.datasourceModel(app.core.data.api.model('me')),
          app: new module.datasourceModel(app.core.data.api.model('app')),
          org: new module.datasourceModel(app.core.data.api.model('org'))
        };
        app.components.before('initialize', function(options) {
          var datasources;
          datasources = _.extend({}, default_datasources, this.datasources, options.datasources);
          return module.addDatasources.call(this, datasources);
        });
        return app.components.after('buildContext', module.fetchDatasources);
      }
    };
    return module;
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty;

  define('lib/utils/handlebars-helpers',['underscore', 'moment'], function(_, moment) {
    var __seq;
    __seq = new Date().getTime();
    return function(app) {
      var HandlebarsHelpers;
      HandlebarsHelpers = {};
      /**
       * # Template Helpers
       * The helpers below are bundled in, so you can start to use them immediately in your handlebars templates.
       * Feel free to add your own or override those to fit your needs.
       *
       * # Inflections
       * The inflections helpers proxy the [inflection.js](http://code.google.com/p/inflection-js/) library.
      */

      /**
       * Fallback Helper for falsy values.
       *
       *      user.picture = undefined
       *
       *     <img src="{{or user.picture 'http://placehold.it/200x200'}}"/>
       *     => <img src="http://placehold.it/200x200"/>
       *
       * @param  {String} value         Anything
       * @param  {String} fallback
       * @return {String}              value if value is truthy, otherwise fallback
      */

      HandlebarsHelpers.or = function(first, second) {
        return first || second;
      };
      /**
       * Generates an image representation for a social object.
       *
       *     <img src="{{imageUrl "4bb5c26bacb93e0000000007" 'small' 'http://placehold.it/200x200'}}"/>
       *     => <img src="//hull.io/img/4bb5c26bacb93e0000000007/small"/>
       *
       * @param  {String} id           The Object's ID
       * @param  {String} size="small" An optional size preset. See docs for available presets
       * @param  {String} fallback=""  If the ID is null, this url will be returned
       * @return {String}              An image URL
      */

      HandlebarsHelpers.imageUrl = function(id, size, fallback) {
        if (size == null) {
          size = "small";
        }
        if (fallback == null) {
          fallback = "";
        }
        if (_.isFunction(id)) {
          id = id();
        }
        if (!id) {
          return fallback;
        }
        id = id.replace(/\/(large|small|medium|thumb)$/, '');
        if (!_.isString(size)) {
          size = 'small';
        }
        return "//" + app.config.assetsUrl + "/img/" + id + "/" + size;
      };
      /**
       * Return a relative date.
       * Uses [moment.js](http://momentjs.com/) behind the scenes.
       *
       *     <span class='date'>{{fromNow date}}</span>
       *     => <span class='date'>2 days ago</span>
       *
       * @param  {String} date The date string to format, can be any format moment.js understands
       * @return {String}      A pretty date
      */

      HandlebarsHelpers.fromNow = function(date) {
        if (date == null) {
          return;
        }
        return moment(date).fromNow();
      };
      /**
       * Auto-links URLs in text.
       * Uses [twitter-text.js](https://github.com/twitter/twitter-text-js) behind the scenes.
       *
       *     snippet="You have to try http://hull.io/try"
       *
       *
       *     <p class='content'>{{autoLink snippet}}</p>
       *     => <p class='content'>You have to try <a href="http://hull.io/try">http://hull.io/try</a></p>
       *
       * @param  {String} date The content
       * @return {String}      The content with clickable URLs
      */

      HandlebarsHelpers.autoLink = function(content) {
        if (content == null) {
          return;
        }
        return twttr.txt.autoLink(content);
      };
      /**
       * Return a formatted date
       * Uses [moment.js](http://momentjs.com/) behind the scenes.
       *
       *     <span class='date'>{{formatTime date "h:mm A"}}</span>
       *     => <span class='date'>5:30 PM</span>
       *
       * @param  {String} date The date string to format, can be any format moment.js understands
       * @param  {String} format A format string
       * @return {String}  A formatted date
      */

      HandlebarsHelpers.formatTime = function(date, format) {
        return moment(date).format(format);
      };
      /**
       * Return the Stringified version of an object.
       *
       *     {{json object}}
       *     => string dump of object
       *
       * Mainly for debug purposes
       *
       * @param  {Object} obj Any javascript object
       * @return {String}     A String dump of the object
      */

      HandlebarsHelpers.json = function(obj, pretty) {
        if (pretty) {
          return JSON.stringify(obj, null, 2);
        } else {
          return JSON.stringify(obj);
        }
      };
      /**
       * Create a loop where `key` is the key of the hash, and `value` is it's value.
       *
       * In your code :
       *
       *     h = {
       *       propertyName  : propertyValue,
       *       propertyName2 : propertyValue2,
       *       …
       *      }
       *
       * propertyValue can be anything, including another hash.
       * In your templates :
       *
       *     <div class='list'>
       *       {{#key_value h}}
       *         <span>{{key}} is <b>{{value}}</b></span> !
       *       {{/key_value}}
       *     </div>
       *
       *     =>
       *
       *     <div class='list'>
       *       <span>propertyName is <b>propertyValue</b></span> !
       *       <span>propertyName2 is <b>propertyValue2</b></span> !
       *     </div>
       *
       *
       * @param  {Object} hash    The hash to iterate on
      */

      HandlebarsHelpers.key_value = function(hash, options) {
        var key, value;
        return ((function() {
          var _results;
          _results = [];
          for (key in hash) {
            if (!__hasProp.call(hash, key)) continue;
            value = hash[key];
            _results.push(options.fn({
              key: key,
              value: value
            }));
          }
          return _results;
        })()).join('');
      };
      /**
       * Output a page-unique sequential number.
       * Mainly useful to assign a unique id to each entry in a list
       *
       *     <div class="{{seq "cool"}}"></div>
       *     <div class="{{seq "cool"}}"></div>
       *
       *     =>
       *
       *       <div class="cool-1352299623728"></div>
       *       <div class="cool-1352299623729"></div>
       *
       * @param  {String} prefix='seq' The sequence's prefix
       * @return {String}              An Unique identifier, incremented everytime `seq` is called
      */

      HandlebarsHelpers.seq = function(prefix) {
        if (prefix == null) {
          prefix = 'seq';
        }
        return "" + prefix + "-" + (__seq++);
      };
      /**
       * Renders a lower case underscored word into camel case.
       * Also translates "/" into "::" (underscore does the opposite)
       *
       *     {{camelize "resource/image_gallery"}}
       *     => 'Resource::ImageGallery'
       *
       * @param  {String} string A text string
       * @return {String}        A processed string
      */

      HandlebarsHelpers.camelize = function(string) {
        return _.str.camelize(string);
      };
      /**
       * Renders a camel cased word into words seperated by underscores
       * also translates "::" back into "/" (camelize does the opposite)
       *
       *     {{underscore "Resource::ImageGallery"}}
       *     => 'resource/image_gallery'
       *
       * @param  {String} string A text string
       * @return {String}        A processed string
      */

      HandlebarsHelpers.underscore = function(string) {
        return _.str.underscored(string);
      };
      /**
       * Renders a lower case and underscored word into human readable form defaults to making the first letter capitalized unless you pass true
       *
       *     {{humanize "image_gallery"}}
       *     => 'Image Gallery'
       *
       * @param  {String} string A text string
       * @return {String}        A processed string
      */

      HandlebarsHelpers.humanize = function(string) {
        return _.str.humanize(string);
      };
      /**
       *
       *      {{pluralize collection.length 'quiz' 'quizzes'}}
       *
       * @param  {number} number
       * @param  {string} single
       * @param  {string} plural
       * @return {string}
      */

      HandlebarsHelpers.pluralize = function(number, single, plural) {
        if (number <= 1) {
          return single;
        } else {
          return plural;
        }
      };
      /**
       * Renders all characters to lower case and then makes the first upper
       *
       *     {{capitalize "image gallery"}}
       *     => 'Image gallery'
       *
       * @param  {String} string A text string
       * @return {String}        A processed string
      */

      HandlebarsHelpers.capitalize = function(string) {
        return _.str.capitalize(string);
      };
      /**
       * Renders all underbars and spaces as dashes
       *
       *     {{dasherize "image_gallery one"}}
       *     => 'image-gallery-one'
       *
       * @param  {String} string A text string
       * @return {String}        A processed string
      */

      HandlebarsHelpers.dasherize = function(string) {
        return _.str.dasherize(string);
      };
      /**
       * Renders words into title casing (as for book titles)
       *
       *     {{titleize "image_gallery one"}}
       *     => 'Image Gallery One'
       *
       * @param  {String} string A text string
       * @return {String}        A processed string
      */

      HandlebarsHelpers.titlelize = function(string) {
        return _.str.titlelize(string);
      };
      /**
       * Renders an underscored word into its camel cased form
       *
       *     {{classify "image_gallery"}}
       *     => 'ImageGallery'
       *
       * @param  {String} string A text string
       * @return {String}        A processed string
      */

      HandlebarsHelpers.classify = function(string) {
        return _.str.classify(string);
      };
      /**
       * Remove surrounding whitespace
       *
       *     {{trim "  images   "}}
       *     => 'images'
       *
       * @param  {String} string A text string
       * @return {String}        A processed string
      */

      HandlebarsHelpers.trim = function(string) {
        return _.str.trim(string);
      };
      /**
       * Compare two values and enters the scope if true
       *
       *     var color = 'blue'
       *
       *     {{#ifEqual color "red"}}
       *     {{else}}
       *       The Color is not red !
       *     {{/ifEqual}}
       *     {{#ifEqual color "blue"}}
       *       The Color is blue !
       *     {{/ifEqual}}
       *
       *     =>
       *       'The Color is not red'
       *       'The Color is blue !'
       *
       * @param  {Anything} v1    Left side of comparison
       * @param  {Anything} v2    Right side of comparison
      */

      HandlebarsHelpers.ifEqual = function(v1, v2, options) {
        if (v1 === v2) {
          return options.fn(this);
        } else {
          if (_.isFunction(options.inverse)) {
            return options.inverse(this);
          }
        }
      };
      /**
       * loops over an array and provides a .index property on the object so you can use it as a counter.
       *
       *     var counter = [{name:10},{name:11},{name:12}]
       *
       *     {{#eachWithIndex count}}
       *       Name : {{name}}, Index : {{index}} |
       *     {{/eachWithIndex}}
       *     => Name : 10, Index : 0 | Name : 11, Index : 1 | Name : 12, Index : 2 |
       *
       * @param  {Array}   array  The Array of objects to iterate on
      */

      HandlebarsHelpers.eachWithIndex = function(array, fn) {
        var buffer, i, index, item, _i, _len;
        buffer = [];
        for (index = _i = 0, _len = array.length; _i < _len; index = ++_i) {
          i = array[index];
          item = i;
          item.index = index;
          buffer.push(fn(item));
        }
        return buffer.join('');
      };
      /**
       * joins the elements of an array
       *
       *     var list = ['a', 'b', 'c']
       *
       *     {{join list ","}}
       *     => a,b,c
       *
       * @param  {Array}   array  The Array of objects
      */

      HandlebarsHelpers.join = function(items, options) {
        var last, ret, sep;
        if (options && _.isFunction(options.fn)) {
          items = _.map(items, function(i) {
            return options.fn(i);
          });
        }
        sep = options.hash['sep'] || ', ';
        if (options.hash['lastSep'] && items.length > 1) {
          last = items.splice(-1);
        }
        ret = items.join(sep);
        if (last) {
          ret += options.hash['lastSep'] + last;
        }
        return ret;
      };
      /**
      * THE DEBUG HELPER
      *
      *      usage: {{debug}} or {{debug someValue}}
      *
      * @param  {Anything}  optional value to debug
      */

      HandlebarsHelpers.debug = function(optionalValue) {
        console.log("Current Context");
        console.log("====================");
        console.log(this);
        if (optionalValue) {
          console.log("Value");
          console.log("====================");
          return console.log(optionalValue);
        }
      };
      /**
       * write text if value equals another value
       *
       *      foo='bar'
       *
       *      1. {{outputIf foo 'bar'}}
       *      2. {{outputIf foo 'baz' 'checked'}}
       *
       *      =>
       *      1.
       *      2. 'checked'
      */

      HandlebarsHelpers.outputIf = function(obj, compare, output, fallback) {
        if (output == null) {
          output = '';
        }
        if (fallback == null) {
          fallback = '';
        }
        if (obj === compare) {
          return output;
        } else {
          return fallback;
        }
      };
      /**
       * write a value or a fallback if the value is falsy
       *
       *      foo='bar'
       *      baz=0
       *
       *      1. {{fallback foo 'default_value'}}
       *      2. {{fallback baz 'default_value'}}
       *
       *      =>
       *      1. 'bar'
       *      2. 'default_value'
      */

      HandlebarsHelpers.fallback = function(obj, fb) {
        if (obj) {
          return obj;
        } else {
          return fb;
        }
      };
      /**
       * Maps an activity stream to english actions, with fallbacks from a hash
       *
       *      {{activity map activity_entry}}
       *
       *      =>
       *      'reviewed'
      */

      HandlebarsHelpers.activity = function(map, entry) {
        var fallback, sentence, type, verb, _ref, _ref1, _ref2;
        if (!((entry != null) && (map != null))) {
          return '';
        }
        verb = entry.verb;
        type = (_ref = entry.object) != null ? _ref.type : void 0;
        if (!((type != null) && (verb != null))) {
          return '';
        }
        sentence = (_ref1 = map[verb]) != null ? _ref1[type] : void 0;
        if (sentence != null) {
          return sentence;
        }
        fallback = map.fallback;
        if (fallback == null) {
          return '';
        }
        type = (type === 'entity' ? (_ref2 = entry.object) != null ? _ref2.uid : void 0 : void 0) || fallback.object[type] || entry.object.name || entry.object.description;
        return (fallback.verb[verb] || verb) + ' ' + type;
      };
      /**
       * Finds a string to show in an object, with fallbacks
       *
       *      obj = {
       *          name:''
       *          uid:'Pothole on the street'
       *          description:''
       *      }
       *
       *      {{named obj}}
       *
       *      =>
       *      'Pothole on the street'
       *
      */

      HandlebarsHelpers.to_s = function(object) {
        if (object == null) {
          return '';
        }
        return object.name || object.title || object.uid || object.description || object;
      };
      /**
       * prune {{ prune string 140 "more..." }}
       * Elegant version of truncate. Makes sure the pruned string
       * does not exceed the original length.
       * Avoid half-chopped words when truncating.
      */

      HandlebarsHelpers.prune = function(string, length, pruneString) {
        return _.str.prune(string, length, pruneString);
      };
      /**
       * truncate {{ truncate string 140 "more..." }}
       * truncate string to a max number of character
       * optional truncateString argument
      */

      HandlebarsHelpers.truncate = function(string, length, truncateString) {
        return _.str.truncate(string, length, truncateString);
      };
      return HandlebarsHelpers;
    };
  });

}).call(this);

(function() {
  var __slice = [].slice;

  define('lib/client/component/templates',['underscore', 'lib/utils/handlebars', 'lib/utils/handlebars-helpers', 'lib/utils/promises', 'lib/utils/q2jQuery', 'require'], function(_, Handlebars, hbsHelpers, promises, q2jQuery, require) {
    var applyAppStrategies, applyDomStrategies, applyServerStrategies, lookupTemplate, module, setupTemplate, strategies, strategyHandlers, _domTemplate, _execute;
    strategies = {
      app: ['hullGlobal', 'meteor', 'sprockets', 'hullDefault'],
      dom: ['inner', 'global'],
      server: ['require']
    };
    setupTemplate = function(tplSrc, tplName, wrapped, options) {
      var compiled;
      if (!_.isFunction(tplSrc)) {
        compiled = Handlebars.compile(tplSrc);
      } else if (!wrapped) {
        compiled = Handlebars.template(tplSrc, options);
      } else {
        compiled = tplSrc;
      }
      Handlebars.registerPartial(tplName, compiled);
      return compiled;
    };
    _domTemplate = function($el) {
      var $first, first;
      if (!$el.length) {
        return;
      }
      first = $el.get(0);
      $first = module.domFind(first);
      return $first.text() || $first.html() || first.innerHTML;
    };
    strategyHandlers = {
      dom: {
        inner: function(selector, tplName, el) {
          var $el;
          $el = module.domFind(selector, el);
          return _domTemplate($el);
        },
        global: function(selector, tplName) {
          var $el;
          $el = module.domFind(selector, document);
          return _domTemplate($el);
        }
      },
      app: {
        hullGlobal: function(tplName) {
          var _ref;
          if ((_ref = module.global.Hull.templates) != null ? _ref[tplName] : void 0) {
            return [module.global.Hull.templates["" + tplName], tplName, false];
          }
        },
        meteor: function(tplName) {
          var _ref;
          if ((module.global.Meteor != null) && (((_ref = module.global.Template) != null ? _ref[tplName] : void 0) != null)) {
            return [module.global.Template[tplName], tplName, false];
          }
        },
        sprockets: function(tplName) {
          var _ref;
          if ((module.global.HandlebarsTemplates != null) && (((_ref = module.global.HandlebarsTemplates) != null ? _ref[tplName] : void 0) != null)) {
            return [module.global.HandlebarsTemplates[tplName], tplName, true];
          }
        },
        hullDefault: function(tplName) {
          var _ref, _ref1;
          if ((_ref = module.global.Hull.templates) != null ? (_ref1 = _ref._default) != null ? _ref1[tplName] : void 0 : void 0) {
            return [module.global.Hull.templates._default[tplName], tplName, false];
          }
        }
      },
      server: {
        require: function(tplName, path, format) {
          var dfd;
          path = "text!" + path + "." + format;
          dfd = promises.deferred();
          module.require([path], function(tpl) {
            return dfd.resolve([tpl, tplName, false]);
          }, function(err) {
            console.error("Error loading template", tplName, err.message);
            return dfd.reject(err);
          });
          return dfd.promise;
        }
      }
    };
    _execute = function() {
      var args, stratName, strategyResult, type, _i, _len, _ref, _ref1;
      type = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      _ref = strategies[type];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        stratName = _ref[_i];
        strategyResult = (_ref1 = strategyHandlers[type])[stratName].apply(_ref1, args);
        if (strategyResult) {
          return strategyResult;
        }
      }
    };
    applyDomStrategies = function(tplName, el) {
      var selector, tpl;
      selector = "script[data-hull-template='" + tplName + "']";
      tpl = _execute('dom', selector, tplName, el);
      if (tpl) {
        return [tpl, tplName, false];
      }
    };
    applyAppStrategies = function(tplName) {
      return _execute('app', tplName);
    };
    applyServerStrategies = function(tplName, path, format) {
      return _execute('server', tplName, path, format);
    };
    lookupTemplate = function(options, name) {
      var params, path, tpl, tplName;
      path = "" + options.ref + "/" + name;
      tplName = [options.componentName, name.replace(/^_/, '')].join("/");
      if (module.domFind) {
        params = applyDomStrategies(tplName, options.rootEl);
      }
      if (!params) {
        params = applyAppStrategies(tplName);
      }
      if (params) {
        tpl = setupTemplate.apply(null, params);
        module.define(path, tpl);
      } else {
        tpl = applyServerStrategies(tplName, path, options.templateFormat).then(function(params) {
          return setupTemplate.apply(null, params);
        });
      }
      return tpl;
    };
    module = {
      global: window,
      define: define,
      require: require,
      domFind: void 0,
      load: function(names, ref, el, format) {
        var componentProps, dfd, tpls;
        if (names == null) {
          names = [];
        }
        if (format == null) {
          format = "hbs";
        }
        dfd = promises.deferred();
        if (_.isString(names)) {
          names = [names];
        }
        componentProps = {
          componentName: ref.replace('__component__$', '').split('@')[0],
          templateFormat: format,
          rootEl: el,
          ref: ref
        };
        tpls = _.map(names, _.bind(lookupTemplate, void 0, componentProps));
        promises.all(tpls).then(function(ary) {
          return dfd.resolve(_.object(names, ary));
        }, function(err) {
          console.warn('WARNING', err);
          return dfd.reject(err);
        });
        return dfd.promise;
      },
      initialize: function(app) {
        var k, v, _ref;
        _ref = hbsHelpers(app);
        for (k in _ref) {
          v = _ref[k];
          Handlebars.registerHelper(k, v);
        }
        module.domFind = app.core.dom.find;
        app.components.before('initialize', function() {
          var promise,
            _this = this;
          promise = module.load(this.templates, this.ref, this.el).then(function(tpls) {
            return _this._templates = tpls;
          }, function(err) {
            console.error('Error while loading templates:', err);
            throw err;
          });
          return q2jQuery(promise);
        });
        return null;
      }
    };
    return module;
  });

}).call(this);

;}).call(root);})();