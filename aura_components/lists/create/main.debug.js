this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["lists/create/form"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, self=this, functionType="function", escapeExpression=this.escapeExpression;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n  <h1>Create a new List</h1>\n  <form>\n    ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.errorNoName), {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    <ul class='unstyled'>\n      <li>\n        <label for=\"name\">Name:</label>\n        <input type=\"text\" name=\"name\" value=\"";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">\n      </li>\n      <li>\n        <label class=\"\" for=\"description\">Description:</label>\n        <input type=\"text\" name=\"description\" value=\"";
  if (helper = helpers.description) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.description); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">\n      </li>\n      <li>\n        <input type=\"submit\" class=\"btn\" data-hull-action=\"create\">\n      </li>\n    </ul>\n  </form>\n";
  return buffer;
  }
function program2(depth0,data) {
  
  
  return "\n    <div class=\"alert alert-error\">You must provide a name to the list</div>\n    ";
  }

function program4(depth0,data) {
  
  
  return "\n  <div data-hull-component=\"login/profile@hull\"></div>\n";
  }

  buffer += "<div>\n";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.loggedIn), {hash:{},inverse:self.program(4, program4, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n</div>\n\n";
  return buffer;
  } ; 

Hull.component('lists/create@hull', {
    type: 'Hull',
    templates: ['form'],
    refreshEvents: ['model.hull.me.change'],
    actions: {
        create: function (e) {
            'use strict';
            e.preventDefault();
            var self = this, inputs = {};
            this.$find('input', this.$el).each(function (c, input) {
                if (input.getAttribute('type') === 'text') {
                    inputs[input.getAttribute('name')] = input.value;
                }
            });
            if (inputs.name) {
                this.api('me/lists', 'post', inputs).then(function () {
                    self.render();
                });
            } else {
                inputs.errorNoName = true;
                this.render('form', inputs);
            }
        }
    }
});