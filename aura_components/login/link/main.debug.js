this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["login/link/linking"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this, helperMissing=helpers.helperMissing, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  
  return "\n  <div class=\"alert alert-error\">\n    Another user is already registered with this identity.\n    Please <a data-hull-action=\"logout\" class=\"btn-link btn-inline\">sign out</a> first if you want to use it.\n  </div>\n";
  }

function program3(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n\n\n<ul class=\"unstyled\">\n  <li>\n    <p>\n      <div class='media'>\n        ";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.me)),stack1 == null || stack1 === false ? stack1 : stack1.picture), {hash:{},inverse:self.noop,fn:self.program(4, program4, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        <div class=\"media-body\">\n          <h4 class=\"media-heading\">"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.me)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</h4>\n          via "
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.me)),stack1 == null || stack1 === false ? stack1 : stack1.main_identity)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + ",\n          <a data-hull-action=\"logout\" class=\"btn-link btn-inline\">\n            Sign Out\n          </a>\n        </div>\n      </div>\n    </p>\n  </li>\n  ";
  options={hash:{},inverse:self.noop,fn:self.program(6, program6, data),data:data}
  if (helper = helpers.authServices) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.authServices); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.authServices) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(6, program6, data),data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n</ul>\n\n\n";
  return buffer;
  }
function program4(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n        <div class=\"pull-left\">\n          <img class=\"media-object img-rounded\" src=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.me)),stack1 == null || stack1 === false ? stack1 : stack1.picture)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" alt=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.me)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" width=\"50px\" height=\"50px\">\n        </div>\n        ";
  return buffer;
  }

function program6(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n  ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.availableAction), {hash:{},inverse:self.noop,fn:self.program(7, program7, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n  ";
  return buffer;
  }
function program7(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n  <li>\n    <button data-hull-action=\"";
  if (helper = helpers.availableAction) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.availableAction); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" data-hull-provider=\"";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" class=\"btn btn-small ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.identity), {hash:{},inverse:self.noop,fn:self.program(8, program8, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\">\n      <i class=\"icon-";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"></i>\n      "
    + escapeExpression((helper = helpers.classify || (depth0 && depth0.classify),options={hash:{},data:data},helper ? helper.call(depth0, (depth0 && depth0.actionName), options) : helperMissing.call(depth0, "classify", (depth0 && depth0.actionName), options)))
    + "\n      your\n      "
    + escapeExpression((helper = helpers.classify || (depth0 && depth0.classify),options={hash:{},data:data},helper ? helper.call(depth0, (depth0 && depth0.name), options) : helperMissing.call(depth0, "classify", (depth0 && depth0.name), options)))
    + "\n      account\n    </button>\n  </li>\n  ";
  return buffer;
  }
function program8(depth0,data) {
  
  
  return "btn-success";
  }

function program10(depth0,data) {
  
  
  return "\n<div data-hull-component=\"login/button@hull\"></div>\n";
  }

  stack1 = helpers['if'].call(depth0, (depth0 && depth0.authHasFailed), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.loggedIn), {hash:{},inverse:self.program(10, program10, data),fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  } ; 

Hull.component('login/link@hull', {
    type: 'Hull',
    templates: ['linking'],
    refreshEvents: ['model.hull.me.change'],
    initialize: function () {
        this.sandbox.on('hull.auth.login', function () {
            this.authHasFailed = false;
            this.render();
        }, this);
        this.sandbox.on('hull.auth.failure', function () {
            this.authHasFailed = true;
            this.render();
        }, this);
    },
    beforeRender: function (data) {
        var _ = this.sandbox.util._, authServices = [], connected = this.loggedIn() || {}, mainIdentity = data.me && data.me.main_identity;
        _.map(this.authServices(), function (s) {
            var availableAction, actionName, name = s, isConnected = !!connected[name], canDisconnect = name !== mainIdentity;
            if (!isConnected) {
                availableAction = 'linkIdentity';
                actionName = 'link';
            } else if (canDisconnect) {
                availableAction = 'unlinkIdentity';
                actionName = 'unlink';
            }
            authServices.push({
                isConnected: isConnected,
                name: name,
                canDisconnect: canDisconnect,
                availableAction: availableAction,
                actionName: actionName,
                identity: connected[name]
            });
        });
        data.authServices = authServices;
        data.authHasFailed = this.authHasFailed;
        this.authHasFailed = false;
    }
});