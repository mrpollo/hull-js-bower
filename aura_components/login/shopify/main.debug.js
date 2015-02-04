this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["login/shopify/default"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  
  return "\n    <button class=\"hull-loader\">\n      Loading...\n    </button>\n  ";
  }

function program3(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n      ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.showSignOut), {hash:{},inverse:self.noop,fn:self.program(4, program4, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n      ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.showLinkIdentity), {hash:{},inverse:self.noop,fn:self.program(6, program6, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    ";
  return buffer;
  }
function program4(depth0,data) {
  
  
  return "\n        <a href=\"#\" data-hull-action=\"_logout\">Sign Out</a>\n      ";
  }

function program6(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n        ";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.providers), {hash:{},inverse:self.noop,fn:self.program(7, program7, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      ";
  return buffer;
  }
function program7(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n          ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.linked), {hash:{},inverse:self.program(11, program11, data),fn:self.program(8, program8, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        ";
  return buffer;
  }
function program8(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n            ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.isUnlinkable), {hash:{},inverse:self.noop,fn:self.program(9, program9, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n          ";
  return buffer;
  }
function program9(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n              <button class=\"hull-btn hull-btn-"
    + escapeExpression(((stack1 = (data == null || data === false ? data : data.key)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" data-hull-action=\"_unlinkIdentity\" data-hull-provider=\""
    + escapeExpression(((stack1 = (data == null || data === false ? data : data.key)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">\n                <i class=\"hull-icon hull-icon-"
    + escapeExpression(((stack1 = (data == null || data === false ? data : data.key)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\"></i> "
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.messages)),stack1 == null || stack1 === false ? stack1 : stack1.unlinkMessage)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\n              </button>\n            ";
  return buffer;
  }

function program11(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n            <button class=\"hull-btn hull-btn-"
    + escapeExpression(((stack1 = (data == null || data === false ? data : data.key)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" data-hull-action=\"_linkIdentity\" data-hull-provider=\""
    + escapeExpression(((stack1 = (data == null || data === false ? data : data.key)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">\n              <i class=\"hull-icon hull-icon-"
    + escapeExpression(((stack1 = (data == null || data === false ? data : data.key)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\"></i> "
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.messages)),stack1 == null || stack1 === false ? stack1 : stack1.linkMessage)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\n            </button>\n          ";
  return buffer;
  }

function program13(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n      ";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.providers), {hash:{},inverse:self.noop,fn:self.program(14, program14, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    ";
  return buffer;
  }
function program14(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n        <button class=\"hull-btn hull-btn-"
    + escapeExpression(((stack1 = (data == null || data === false ? data : data.key)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" data-hull-action=\"_login\" data-hull-provider=\""
    + escapeExpression(((stack1 = (data == null || data === false ? data : data.key)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">\n          <i class=\"hull-icon hull-icon-"
    + escapeExpression(((stack1 = (data == null || data === false ? data : data.key)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\"></i> "
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.messages)),stack1 == null || stack1 === false ? stack1 : stack1.signInMessage)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\n        </button>\n      ";
  return buffer;
  }

  buffer += "<div class=\"hull-social ";
  if (helper = helpers.classes) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.classes); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">\n  <div class=\"hull-error-container\"></div>\n\n  ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.showLoader), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n  <div class=\"hull-social-container\">\n    ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.loggedIn), {hash:{},inverse:self.program(13, program13, data),fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n  </div>\n</div>\n";
  return buffer;
  } ; 

Hull.component('login/shopify@hull', {
    templates: ['default'],
    refreshEvents: ['model.hull.me.change'],
    linkTagInjected: false,
    defaultMessages: {
        signInMessage: 'Sign In with {{provider}}',
        linkMessage: 'Link your {{provider}} account',
        unlinkMessage: 'Unlink your {{provider}} account',
        identityTakenMessage: 'This "{{provider}}" account is already linked to another User.',
        emailTakenMessage: '"{{email}}" is already taken.',
        authFailedMessage: 'You did not fully authorize or "{{provider}}" app is not well configured.',
        windowClosedMessage: 'Authorization window has been closed.',
        customerExistsMessage: '"{{email}}" is already associated with an account... Please <a href="/account/login">log in with your password</a>. If you have forgotten your password, you can <a href="/account/login#recover">reset your password here</a>.',
        disabledCustomerMessage: 'An email has been sent to {{email}}, please click the link included to verify your email address.',
        fallbackMessage: 'Bummer, something went wrong during authentication.'
    },
    actionMessages: [
        'signInMessage',
        'linkMessage',
        'unlinkMessage'
    ],
    initialize: function () {
        this.isLoading = false;
        this.sandbox.on('hull.shopify.loading.start', this.startLoading, this);
        this.sandbox.on('hull.shopify.loading.stop', this.stopLoading, this);
        this.injectLinkTag();
    },
    beforeRender: function (data) {
        var _ = this.sandbox.util._;
        data.classes = this.getClasses();
        var l = this.loggedIn();
        data.providers = _.reduce(this.authServices(), function (m, p) {
            m[p] = {
                linked: !!l[p],
                messages: this.getProviderMessages(p),
                isUnlinkable: l && data.me.main_identity !== p
            };
            return m;
        }, {}, this);
        data.showLinkIdentity = this.options.showLinkIdentity !== false;
        data.showSignOut = this.options.showSignOut !== false;
        data.showLoader = this.options.showLoader !== false;
    },
    afterRender: function () {
        this.$errorContainer = this.$('.hull-error-container');
    },
    actions: {
        _login: function (event, action) {
            var p = this.callAndStartLoading('login', action.data.provider);
            if (this.options.redirectOnLogin !== false) {
                var location = this.options.redirectTo || '/account';
                p.done(function () {
                    document.location = location;
                });
            }
        },
        _logout: function (event, action) {
            this.callAndStartLoading('logout', action.data.provider);
        },
        _linkIdentity: function (event, action) {
            this.callAndStartLoading('linkIdentity', action.data.provider, true);
        },
        _unlinkIdentity: function (event, action) {
            this.callAndStartLoading('unlinkIdentity', action.data.provider, true);
        }
    },
    callAndStartLoading: function (methodName, provider, handleSuccess) {
        this.$errorContainer.html('');
        this.startLoading();
        this.$el.addClass('hull-' + methodName);
        var self = this;
        var e = {
                provider: provider,
                redirect_url: document.location.origin + '/a/hull-callback'
            };
        if (this.options.redirectTo) {
            e.redirect_url += '?redirect_url=' + this.options.redirectTo;
        }
        if (this.options.strategy) {
            e.strategy = this.options.strategy;
        } else {
            if (this.sandbox.util.isMobile()) {
                e.strategy = 'redirect';
            }
        }
        var p = this.sandbox[methodName](e);
        p.then(function () {
            if (handleSuccess) {
                self.stopLoading();
            }
        }, function (error) {
            var _ = self.sandbox.util._;
            var t = _.string.camelize(error.reason + '_message');
            t = self.defaultMessages[t] ? t : 'fallbackMessage';
            var message = self.compileMessage(t, _.extend({ provider: provider }, error));
            self.showErrorMessage(message);
            self.stopLoading();
        });
        return p;
    },
    startLoading: function () {
        if (this.isLoading) {
            return;
        }
        this.$el.addClass('hull-loading');
        this.isLoading = true;
    },
    stopLoading: function () {
        if (!this.isLoading) {
            return;
        }
        this.$el.removeClass('hull-loading');
        this.isLoading = false;
    },
    showErrorMessage: function (message) {
        if (this.options.showErrors === false) {
            return;
        }
        var $error = $(document.createElement('p')).addClass('hull-error').html(message);
        this.$errorContainer.html($error);
    },
    getClasses: function () {
        var classes = [];
        classes.push('hull-' + (this.options.inline ? 'inline' : 'block'));
        if (this.isLoading) {
            classes.push('hull-loading');
        }
        return classes.join(' ');
    },
    getProviderMessages: function (provider) {
        this._providerMessages = this._providerMessages || {};
        if (!this._providerMessages[provider]) {
            var _ = this.sandbox.util._;
            var locals = { provider: _.string.titleize(provider) };
            this._providerMessages[provider] = _.reduce(this.actionMessages, function (memo, a) {
                memo[a] = this.compileMessage(a, locals);
                return memo;
            }, {}, this);
        }
        return this._providerMessages[provider];
    },
    compileMessage: function (key, locals) {
        this._templates = this._templates || {};
        if (!this._templates[key]) {
            this._templates[key] = this.sandbox.util.Handlebars.compile(this.options[key] || this.defaultMessages[key]);
        }
        return this._templates[key](locals);
    },
    injectLinkTag: function () {
        if (this.linkTagInjected || this.options.injectLinkTag === false) {
            return;
        }
        var e = document.createElement('link');
        e.href = this.options.baseUrl + '/style.css';
        e.rel = 'stylesheet';
        document.getElementsByTagName('head')[0].appendChild(e);
        this.linkTagInjected = true;
    }
});