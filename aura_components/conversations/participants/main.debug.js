this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["conversations/participants/participants"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, self=this, functionType="function", escapeExpression=this.escapeExpression, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  
  return "\n  <div class=\"alert alert-error\">\n    Unable to retrieve the participants for this conversation\n  </div>\n";
  }

function program3(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n  \n  <div class=\"page-header\">\n    ";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.conversation)),stack1 == null || stack1 === false ? stack1 : stack1['public']), {hash:{},inverse:self.noop,fn:self.program(4, program4, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    <h2>"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.conversation)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</h2>\n  </div>\n\n  ";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.conversation)),stack1 == null || stack1 === false ? stack1 : stack1.participants), {hash:{},inverse:self.noop,fn:self.program(9, program9, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n";
  return buffer;
  }
function program4(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n      ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.isFollowing), {hash:{},inverse:self.program(7, program7, data),fn:self.program(5, program5, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    ";
  return buffer;
  }
function program5(depth0,data) {
  
  
  return "\n        <a href=\"#\" class=\"link pull-right\" data-hull-action=\"unfollow\">Following</a>\n      ";
  }

function program7(depth0,data) {
  
  
  return "\n        <a href=\"#\" class=\"link pull-right\" data-hull-action=\"follow\">Follow</a>\n      ";
  }

function program9(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n    <ul class=\"media-list\">\n      ";
  stack1 = ((stack1 = ((stack1 = ((stack1 = (depth0 && depth0.conversation)),stack1 == null || stack1 === false ? stack1 : stack1.participants)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1)),blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(10, program10, data),data:data}));
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    </ul>\n  ";
  return buffer;
  }
function program10(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n        <li class=\"media\">\n          <div class=\"pull-left\">\n            <img class=\"media-object img-rounded\" src=\"";
  if (helper = helpers.picture) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.picture); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" alt=\"";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">\n          </div>\n          <div class=\"media-body\">\n            <h4 class=\"media-heading\">";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</h4>\n          </div>\n        </li>\n      ";
  return buffer;
  }

  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.errors)),stack1 == null || stack1 === false ? stack1 : stack1.conversation), {hash:{},inverse:self.program(3, program3, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  } ; 

Hull.component('conversations/participants@hull', {
    type: 'Hull',
    templates: ['participants'],
    refreshEvents: ['model.hull.me.change'],
    actions: { follow: 'follow' },
    options: { focus: false },
    datasources: { conversation: ':id' },
    beforeRender: function (data, errors) {
        'use strict';
        data.errors = errors;
        return data;
    },
    afterRender: function () {
        'use strict';
    },
    follow: function (e) {
        'use strict';
        e.preventDefault();
        this.update('put');
    },
    unfollow: function (e) {
        'use strict';
        e.preventDefault();
        this.update('delete');
    },
    update: function (method) {
        this.api(this.options.id + '/participants', method).then(this.sandbox.util._.bind(function () {
            this.focusAfterRender = true;
            this.render();
        }, this));
    }
});