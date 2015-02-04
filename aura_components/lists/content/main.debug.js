this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["lists/content/content"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); partials = this.merge(partials, Handlebars.partials); data = data || {};
  var buffer = "", stack1, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n  <ul class=\"nav nav-tabs nav-stacked\">\n    ";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.items), {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n  </ul>\n";
  return buffer;
  }
function program2(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n      <li>";
  stack1 = self.invokePartial(partials['lists/contents/item'], 'lists/contents/item', depth0, helpers, partials, data);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</li>\n    ";
  return buffer;
  }

function program4(depth0,data) {
  
  
  return "\n  <div data-hull-component=\"login/button@hull\"></div>\n";
  }

  stack1 = helpers['if'].call(depth0, (depth0 && depth0.loggedIn), {hash:{},inverse:self.program(4, program4, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  };
Hull.templates._default["lists/content/item"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n    <dt>Name</dt>\n    <dd>";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</dd>\n  ";
  return buffer;
  }

function program3(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n    <dt>Description</dt>\n    <dd>";
  if (helper = helpers.description) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.description); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</dd>\n  ";
  return buffer;
  }

  buffer += "<a>\n  <dl>\n  ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.name), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n  ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.description), {hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    <dt>ID</dt>\n    <dd>";
  if (helper = helpers.id) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.id); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</dd>\n  </dl>\n</a>\n";
  return buffer;
  } ; 

Hull.component('lists/content@hull', {
    type: 'Hull',
    templates: [
        'content',
        'item'
    ],
    datasources: { content: 'me/lists/:list' },
    requiredOptions: ['list'],
    refreshEvents: ['model.hull.me.change'],
    beforeRender: function (data) {
        'use strict';
        var content = data.content || {};
        data.items = content.items;
    }
});