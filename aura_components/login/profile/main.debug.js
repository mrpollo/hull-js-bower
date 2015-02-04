this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["login/profile/profile"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, helperMissing=helpers.helperMissing, self=this, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  
  return "\n  <div class=\"alert alert-error\">\n    There was an error signing in your account. Maybe you did not approve the app?\n  </div>\n";
  }

function program3(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n  <div class='media'>\n    ";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.me)),stack1 == null || stack1 === false ? stack1 : stack1.picture), {hash:{},inverse:self.noop,fn:self.program(4, program4, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    <div class=\"pull-right\">\n      <a data-hull-action=\"logout\" class=\"btn\"> Sign Out </a>\n    </div>\n    <div class=\"media-body\">\n      <h4 class=\"media-heading\">"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.me)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</h4>\n      Logged in with ";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.loggedInProviders), {hash:{},inverse:self.noop,fn:self.program(6, program6, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    </div>\n  </div>\n\n";
  return buffer;
  }
function program4(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n    <div class=\"pull-left\">\n      <img class=\"media-object img-rounded\" src=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.me)),stack1 == null || stack1 === false ? stack1 : stack1.picture)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" alt=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.me)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" width=\"70px\" height=\"70px\">\n    </div>\n    ";
  return buffer;
  }

function program6(depth0,data) {
  
  var buffer = "", helper, options;
  buffer += "\n        <span class='provider'><i class=\"icon-"
    + escapeExpression((typeof depth0 === functionType ? depth0.apply(depth0) : depth0))
    + "\">\n          </i> "
    + escapeExpression((helper = helpers.capitalize || (depth0 && depth0.capitalize),options={hash:{},data:data},helper ? helper.call(depth0, depth0, options) : helperMissing.call(depth0, "capitalize", depth0, options)))
    + "\n        </span>\n      ";
  return buffer;
  }

function program8(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n  ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.loggedOut), {hash:{},inverse:self.noop,fn:self.program(9, program9, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  }
function program9(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n    <div class=\"hull-identity__signin\">\n      ";
  options={hash:{},inverse:self.noop,fn:self.program(10, program10, data),data:data}
  if (helper = helpers.loggedOut) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.loggedOut); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.loggedOut) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(10, program10, data),data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    </div>\n  ";
  return buffer;
  }
function program10(depth0,data) {
  
  var buffer = "", helper, options;
  buffer += "\n        <button data-hull-action=\"login\" data-hull-provider=\""
    + escapeExpression((typeof depth0 === functionType ? depth0.apply(depth0) : depth0))
    + "\" class=\"btn btn-small btn-"
    + escapeExpression((typeof depth0 === functionType ? depth0.apply(depth0) : depth0))
    + "\">\n          <i class=\"icon-"
    + escapeExpression((typeof depth0 === functionType ? depth0.apply(depth0) : depth0))
    + "\"></i>\n          Sign In with "
    + escapeExpression((helper = helpers.classify || (depth0 && depth0.classify),options={hash:{},data:data},helper ? helper.call(depth0, depth0, options) : helperMissing.call(depth0, "classify", depth0, options)))
    + "\n        </button>\n      ";
  return buffer;
  }

  stack1 = helpers['if'].call(depth0, (depth0 && depth0.authHasFailed), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.matchingProviders), {hash:{},inverse:self.program(8, program8, data),fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  } ; 

Hull.component('login/profile@hull', {
    type: 'Hull',
    templates: ['profile'],
    options: { provider: '' },
    refreshEvents: ['model.hull.me.change'],
    initialize: function () {
        'use strict';
        this.authHasFailed = false;
        this.sandbox.on('hull.auth.failure', this.sandbox.util._.bind(function () {
            this.authHasFailed = true;
            this.render();
        }, this));
    },
    beforeRender: function (data) {
        'use strict';
        data.authHasFailed = this.authHasFailed;
        var authServices = this.authServices() || [];
        if (this.options.provider) {
            data.providers = this.options.provider.replace(' ', '').split(',');
        } else {
            data.providers = authServices;
        }
        if (this.loggedIn()) {
            data.loggedInProviders = this.sandbox.util._.keys(this.loggedIn());
        } else {
            data.loggedInProviders = [];
        }
        data.loggedOut = this.sandbox.util._.difference(data.providers, data.loggedInProviders);
        data.matchingProviders = this.sandbox.util._.intersection(data.providers.concat('email'), data.loggedInProviders);
        data.authServices = authServices;
        return data;
    },
    afterRender: function () {
        this.authHasFailed = false;
    }
});