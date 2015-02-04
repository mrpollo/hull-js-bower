this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["likes/button/button"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, self=this, functionType="function", escapeExpression=this.escapeExpression;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n  <button data-hull-action=\"unlike\" ";
  stack1 = helpers.unless.call(depth0, (depth0 && depth0.loggedIn), {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " class=\"btn btn-danger\">\n    <i class=\"icon-heart\"></i> ";
  if (helper = helpers.likesCount) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.likesCount); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\n  </button>\n";
  return buffer;
  }
function program2(depth0,data) {
  
  
  return "disabled";
  }

function program4(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n  <button data-hull-action=\"like\" class=\"btn\" ";
  stack1 = helpers.unless.call(depth0, (depth0 && depth0.loggedIn), {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += ">\n    <i class=\"icon-heart\"></i> ";
  if (helper = helpers.likesCount) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.likesCount); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\n  </button>\n";
  return buffer;
  }

  stack1 = helpers['if'].call(depth0, (depth0 && depth0.liked), {hash:{},inverse:self.program(4, program4, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  } ; 

Hull.component('likes/button@hull', {
    templates: ['button'],
    refreshEvents: ['model.hull.me.change'],
    requiredOptions: ['id'],
    working: false,
    datasources: {
        target: ':id',
        liked: function () {
            return this.liked || this.api('me/liked/' + this.options.id);
        }
    },
    onTargetError: function () {
        return { stats: {} };
    },
    beforeRender: function (data) {
        this.target = data.target;
        data.likesCount = data.target.stats.likes || 0;
        return data;
    },
    act: function (action) {
        var self = this, method = action == 'like' ? 'post' : 'delete';
        this.api(this.options.id + '/likes', method).then(function () {
            self.liked = action == 'like' ? true : false;
            self.render();
        });
    },
    actions: {
        like: function (e, action) {
            e.preventDefault();
            this.act('like');
        },
        unlike: function (e, action) {
            e.preventDefault();
            this.act('unlike');
        }
    }
});