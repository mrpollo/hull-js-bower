this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["login/button/button"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, helperMissing=helpers.helperMissing, self=this, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  
  return "\n  <button data-hull-action=\"logout\" class=\"btn btn-small btn-link\">\n    Sign Out\n  </button>\n";
  }

function program3(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n  ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.loggedOut), {hash:{},inverse:self.noop,fn:self.program(4, program4, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n  ";
  options={hash:{},inverse:self.program(7, program7, data),fn:self.noop,data:data}
  if (helper = helpers.authServices) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.authServices); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.authServices) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.program(7, program7, data),fn:self.noop,data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  }
function program4(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n    ";
  options={hash:{},inverse:self.noop,fn:self.program(5, program5, data),data:data}
  if (helper = helpers.loggedOut) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.loggedOut); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.loggedOut) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(5, program5, data),data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n  ";
  return buffer;
  }
function program5(depth0,data) {
  
  var buffer = "", helper, options;
  buffer += "\n      <button data-hull-action=\"login\" data-hull-provider=\""
    + escapeExpression((typeof depth0 === functionType ? depth0.apply(depth0) : depth0))
    + "\" class=\"btn btn-"
    + escapeExpression((typeof depth0 === functionType ? depth0.apply(depth0) : depth0))
    + "\">\n        <i class=\"icon-"
    + escapeExpression((typeof depth0 === functionType ? depth0.apply(depth0) : depth0))
    + "\"></i> Sign In with "
    + escapeExpression((helper = helpers.classify || (depth0 && depth0.classify),options={hash:{},data:data},helper ? helper.call(depth0, depth0, options) : helperMissing.call(depth0, "classify", depth0, options)))
    + "\n      </button>\n    ";
  return buffer;
  }

function program7(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n    ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.debug), {hash:{},inverse:self.noop,fn:self.program(8, program8, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n  ";
  return buffer;
  }
function program8(depth0,data) {
  
  
  return "\n      <div class=\"alert\">\n        <h4>Warning!</h4>\n        No Auth Services configured, please add at least one in the admin.\n      </div>\n    ";
  }

  stack1 = helpers['if'].call(depth0, (depth0 && depth0.matchingProviders), {hash:{},inverse:self.program(3, program3, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  } ; 

Hull.component('login/button@hull', {
    type: 'Hull',
    templates: ['button'],
    options: { provider: '' },
    refreshEvents: ['model.hull.me.change'],
    beforeRender: function (data) {
        if (this.sandbox.util._.isEmpty(this.authServices())) {
            console.error('No Auth services configured. please add one to be able to authenticate users.');
        }
        if (this.options.provider) {
            data.providers = this.options.provider.replace(' ', '').split(',');
        } else {
            data.providers = this.authServices() || [];
        }
        if (this.loggedIn()) {
            data.loggedInProviders = this.sandbox.util._.keys(this.loggedIn());
        } else {
            data.loggedInProviders = [];
        }
        data.loggedOut = this.sandbox.util._.difference(data.providers, data.loggedInProviders);
        data.matchingProviders = this.sandbox.util._.intersection(data.providers, data.loggedInProviders);
        data.authServices = this.authServices();
        return data;
    }
});