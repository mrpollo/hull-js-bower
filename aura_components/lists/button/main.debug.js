this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["lists/button/button"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n  ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.isListed), {hash:{},inverse:self.program(4, program4, data),fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  }
function program2(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n    <button class=\"btn\" data-hull-action=\"remove\">Remove "
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.target)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " from "
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.list)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</button>\n  ";
  return buffer;
  }

function program4(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n    <button class=\"btn\" data-hull-action=\"add\">Add "
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.target)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " to "
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.list)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</button>\n  ";
  return buffer;
  }

function program6(depth0,data) {
  
  
  return "\n  <div data-hull-component=\"login/button@hull\"></div>\n";
  }

  stack1 = helpers['if'].call(depth0, (depth0 && depth0.loggedIn), {hash:{},inverse:self.program(6, program6, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  } ; 

Hull.component('lists/button@hull', {
    type: 'Hull',
    refreshEvents: ['model.hull.me.change'],
    templates: ['button'],
    options: { list: 'likes' },
    requiredOptions: ['list'],
    datasources: {
        list: function () {
            return this.api.model('me/lists/' + this.options.list).fetch();
        },
        target: ':id'
    },
    beforeRender: function (data) {
        this.id = data.target.id;
        var self = this;
        var _ = this.sandbox.util._;
        if (data.list && data.list.items) {
            var itemIds = _.pluck(data.list.items, 'id');
            data.isListed = _.include(itemIds, this.id);
            self.itemPath = data.list.id + '/items/' + data.target.id;
        }
    },
    toggle: function (verb) {
        var list = this.data.list;
        var method = verb === 'remove' ? 'delete' : 'post';
        var self = this;
        var _ = this.sandbox.util._;
        this.api(this.itemPath, method).then(function () {
            this.render();
        }.bind(this));
    },
    actions: {
        add: function () {
            this.toggle('add');
        },
        remove: function () {
            this.toggle('remove');
        }
    }
});