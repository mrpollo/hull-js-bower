this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["images/list/list"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n    <small>You need to sign in.</small>\n    <div data-hull-component=\"login/button@hull\" data-hull-provider=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.authorized)),stack1 == null || stack1 === false ? stack1 : stack1.provider_name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\"></div>\n";
  return buffer;
  }

function program3(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n  ";
  stack1 = helpers.unless.call(depth0, ((stack1 = (depth0 && depth0.authorized)),stack1 == null || stack1 === false ? stack1 : stack1.permissions), {hash:{},inverse:self.program(6, program6, data),fn:self.program(4, program4, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  }
function program4(depth0,data) {
  
  
  return "\n    You need to give permissions to show these images.\n    <a class='btn' data-hull-action=\"authorize\">Authorize</a>\n  ";
  }

function program6(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n    <div class=\"hull-images\">\n      ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.images), {hash:{},inverse:self.program(10, program10, data),fn:self.program(7, program7, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    </div>\n  ";
  return buffer;
  }
function program7(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n        <ul class=\"media-list\">\n          ";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.images), {hash:{},inverse:self.noop,fn:self.program(8, program8, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        </ul>\n      ";
  return buffer;
  }
function program8(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n            <li class=\"media\">\n              <a class=\"pull-left\" href=\"#\">\n                <img src=\"";
  if (helper = helpers.picture) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.picture); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" alt=\"";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" class='media-object'>\n              </a>\n              <div class=\"media-body\">\n                <h4 class=\"media-heading\">";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</h4>\n              </div>\n            </li>\n          ";
  return buffer;
  }

function program10(depth0,data) {
  
  
  return "\n        <div class=\"alert\">\n          <p>No images for the moment.</p>\n        </div>\n      ";
  }

  stack1 = helpers.unless.call(depth0, ((stack1 = (depth0 && depth0.authorized)),stack1 == null || stack1 === false ? stack1 : stack1.provider), {hash:{},inverse:self.program(3, program3, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n";
  return buffer;
  } ; 

Hull.component('images/list@hull', {
    type: 'Hull',
    templates: ['list'],
    options: {
        id: 'me',
        provider: 'hull',
        limit: 10,
        format: 'small',
        scope: 'user_photos'
    },
    refreshEvents: ['model.hull.me.change'],
    initialize: function () {
        this.me = this.sandbox.data.api.model('me');
        this.provider = this.options.provider;
        this.id = this.options.id || 'me';
    },
    actions: {
        authorize: function () {
            if (this.provider === 'facebook') {
                this.sandbox.login('facebook', { scope: this.options.scope }).then(this.sandbox.util._.bind(function () {
                    this.render();
                }, this));
            } else {
                this.sandbox.login(this.provider, {}).then(this.sandbox.util._.bind(function () {
                }, this));
            }
        }
    },
    datasources: {
        authorized: function () {
            return this.isAuthorized(this.provider);
        },
        images: function () {
            var deferred = this.sandbox.data.deferred();
            var self = this;
            var identities = this.sandbox.util._.reduce(this.me.get('identities'), function (m, i) {
                    m[i.provider] = i;
                    return m;
                }, {});
            if (this.loggedIn()[this.provider] || this.provider === 'hull' && (this.loggedIn() || this.id !== 'me')) {
                this.request(this.provider, identities, this.options).then(this.sandbox.util._.bind(function (res) {
                    var serialized = this.sandbox.util._.bind(this.serializers[self.provider], this, res, this.options);
                    var images = serialized().slice(0, this.options.limit);
                    deferred.resolve(images);
                }, this));
            } else {
                deferred.resolve([]);
            }
            return deferred.promise();
        }
    },
    isAuthorized: function (provider) {
        var deferred = this.sandbox.data.deferred();
        var self = this;
        var auth = {
                provider_name: provider,
                provider: false,
                permissions: false
            };
        if (provider === 'hull') {
            auth.permissions = true;
            var valid = this.loggedIn() || this.id !== 'me';
            auth.provider = valid;
            var authProviders = this.authServices();
            if (!authProviders || !authProviders.length) {
                deferred.reject(new Error('No auth provider for this app'));
            } else {
                auth.provider_name = authProviders[0];
                deferred.resolve(auth);
            }
        } else {
            if (this.loggedIn()[provider]) {
                auth.provider = true;
                if (provider === 'facebook') {
                    this.hasFacebookPermissions(self.options.scope, auth, deferred);
                } else {
                    auth.permissions = true;
                    deferred.resolve(auth);
                }
            } else {
                auth.provider = false;
                deferred.resolve(auth);
            }
        }
        return deferred.promise();
    },
    hasFacebookPermissions: function (scope, authorization, deferred) {
        'use strict';
        var _ = this.sandbox.util._;
        this.api({
            provider: 'facebook',
            path: 'me/permissions'
        }).then(function (res) {
            if (_.isString(scope)) {
                scope = scope.replace(' ', '').split(',');
            }
            if (_.isArray(scope) && _.intersection(_.keys(res.data[0]), scope).length == scope.length) {
                authorization.permissions = true;
            }
            deferred.resolve(authorization);
        });
    },
    request: function (provider, identities, options) {
        'use strict';
        var path, params;
        switch (provider) {
        case 'hull':
            path = this.id + '/images';
            params = { per_page: this.options.limit };
            break;
        case 'facebook':
            path = {
                provider: 'facebook',
                path: this.id + '/photos/uploaded'
            };
            params = {};
            break;
        case 'instagram':
            path = {
                provider: 'instagram',
                path: 'users/' + (this.id === 'me' ? 'self' : this.id) + '/media/recent'
            };
            params = { per_page: this.options.limit };
            break;
        }
        return this.api(path, params);
    },
    serializers: {
        hull: function (res, options) {
            'use strict';
            var sandbox = this.sandbox;
            return this.sandbox.util._.map(res, function (f) {
                return {
                    provider: 'hull',
                    name: f.name,
                    picture: sandbox.helpers.imageUrl(f.id, options.format)
                };
            });
        },
        facebook: function (res, options) {
            'use strict';
            var format = 'source';
            switch (options.format) {
            case 'small':
            case 'thumb':
            case 'square':
                format = 'picture';
                break;
            case 'medium':
            case 'large':
            case 'original':
                format = 'source';
                break;
            }
            return this.sandbox.util._.map(res.data, function (f) {
                return {
                    provider: 'facebook',
                    name: f.from.name,
                    picture: f[format],
                    uid: f.id
                };
            });
        },
        instagram: function (res, options) {
            var format = 'low_resolution';
            switch (options.format) {
            case 'small':
            case 'thumb':
            case 'square':
                format = 'thumbnail';
                break;
            case 'medium':
                format = 'standard_resolution';
                break;
            case 'large':
            case 'original':
                format = 'standard_resolution';
                break;
            }
            return this.sandbox.util._.map(res, function (f) {
                var t = '';
                if (f && f.caption) {
                    t = f.caption.text;
                }
                return {
                    provider: 'instagram',
                    name: t,
                    picture: f.images[format].url,
                    uid: f.id
                };
            });
        }
    }
});