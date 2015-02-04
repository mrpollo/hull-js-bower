this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["friends/list/list"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n  <small>You need to sign in.</small>\n  <div data-hull-component=\"login/button@hull\" data-hull-provider=\""
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
  
  
  return "\n    You need to give permissions to show these friends.\n    <a class='btn' data-hull-action=\"authorize\">Authorize</a>\n  ";
  }

function program6(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n    <div class=\"hull-friends\">\n      ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.friends), {hash:{},inverse:self.program(10, program10, data),fn:self.program(7, program7, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    </div>\n  ";
  return buffer;
  }
function program7(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n        <ul class=\"media-list\">\n          ";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.friends), {hash:{},inverse:self.noop,fn:self.program(8, program8, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        </ul>\n      ";
  return buffer;
  }
function program8(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n            <li class=\"media\">\n              <div class=\"pull-left\">\n                <img src=\"";
  if (helper = helpers.avatar) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.avatar); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" alt=\"";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" class=\"media-object img-round\">\n              </div>\n              <div class=\"media-body\">\n                <h4 class=\"media-heading\">";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</h4>\n              </div>\n            </li>\n          ";
  return buffer;
  }

function program10(depth0,data) {
  
  
  return "\n        <div class=\"alert\">\n          <p>Oops… No friends for the moment</p>\n        </div>\n      ";
  }

  stack1 = helpers.unless.call(depth0, ((stack1 = (depth0 && depth0.authorized)),stack1 == null || stack1 === false ? stack1 : stack1.provider), {hash:{},inverse:self.program(3, program3, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  } ; 

Hull.component('friends/list@hull', {
    type: 'Hull',
    templates: ['list'],
    options: {
        id: 'me',
        provider: 'hull',
        limit: 10,
        scope: ''
    },
    refreshEvents: ['model.hull.me.change'],
    initialize: function () {
        this.me = this.api.model('me');
        this.provider = this.options.provider;
    },
    getUserId: function () {
        return this.options.id || 'me';
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
        friends: function () {
            var deferred = this.sandbox.data.deferred();
            var self = this;
            var identities = this.sandbox.util._.reduce(this.me.get('identities'), function (m, i) {
                    m[i.provider] = i;
                    return m;
                }, {});
            if (this.loggedIn()[this.provider] || this.provider === 'hull' && (this.loggedIn() || this.getUserId() !== 'me')) {
                this.request(this.provider, identities, this.options).then(this.sandbox.util._.bind(function (res) {
                    var serialized = this.sandbox.util._.bind(this.serializers[self.provider], this, res, this.options);
                    var friends = serialized().slice(0, this.options.limit);
                    deferred.resolve(friends);
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
            var valid = this.loggedIn() || this.getUserId() !== 'me';
            auth.provider = valid;
            var authProviders = this.authServices();
            if (!authProviders || !authProviders.length) {
                deferred.reject(new Error('No auth provider for this app'));
            } else {
                auth.provider_name = authProviders[0];
                deferred.resolve(auth);
            }
            deferred.resolve(auth);
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
        var sandbox = this.sandbox;
        if (!scope) {
            authorization.permissions = true;
            deferred.resolve(authorization);
        } else {
            this.api({
                provider: 'facebook',
                path: 'me/permissions'
            }).then(function (res) {
                if (this.sandbox.util._.isString(scope)) {
                    scope = scope.replace(' ', '').split(',');
                }
                if (this.sandbox.util._.isArray(scope) && this.sandbox.util._.intersection(this.sandbox.util._.keys(res.data[0]), scope).length == scope.length) {
                    authorization.permissions = true;
                }
                deferred.resolve(authorization);
            });
        }
    },
    request: function (provider, identities, options) {
        var path, params;
        switch (provider) {
        case 'hull':
            path = this.getUserId() + '/friends';
            params = { per_page: this.options.limit };
            break;
        case 'facebook':
            path = {
                provider: 'facebook',
                path: this.getUserId() + '/friends'
            };
            params = { limit: this.options.limit };
            break;
        case 'twitter':
            path = {
                provider: 'twitter',
                path: 'friends/list'
            };
            params = { user_id: this.getUserId() === 'me' ? identities.twitter.uid : this.getUserId() };
            break;
        case 'instagram':
            path = {
                provider: 'instagram',
                path: 'users/' + (this.getUserId() === 'me' ? 'self' : this.getUserId()) + '/follows'
            };
            params = { per_page: this.options.limit };
            break;
        case 'github':
            path = {
                provider: 'github',
                path: 'users/' + (this.getUserId() === 'me' ? identities.github.login : this.getUserId()) + '/following'
            };
            params = { per_page: this.options.limit };
            break;
        }
        return this.api(path, params);
    },
    serializers: {
        hull: function (res) {
            return this.sandbox.util._.map(res, function (f) {
                return {
                    provider: 'hull',
                    name: f.name,
                    avatar: f.picture,
                    uid: f.id
                };
            });
        },
        facebook: function (res) {
            return this.sandbox.util._.map(res.data, function (f) {
                return {
                    provider: 'facebook',
                    name: f.name,
                    avatar: 'http://graph.facebook.com/' + f.id + '/picture',
                    uid: f.id
                };
            });
        },
        twitter: function (res) {
            return this.sandbox.util._.map(res.users, function (f) {
                return {
                    provider: 'twitter',
                    name: f.name,
                    avatar: f.profile_image_url,
                    uid: f.id
                };
            });
        },
        instagram: function (res) {
            return this.sandbox.util._.map(res, function (f) {
                return {
                    provider: 'instagram',
                    name: f.full_name,
                    avatar: f.profile_picture,
                    uid: f.id
                };
            });
        },
        github: function (res) {
            return this.sandbox.util._.map(res, function (f) {
                return {
                    provider: 'github',
                    name: f.login,
                    avatar: f.avatar_url,
                    id: f.id
                };
            });
        }
    }
});