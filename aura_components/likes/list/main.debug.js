this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["likes/list/list"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, options, functionType="function", escapeExpression=this.escapeExpression, self=this, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n    <li class=\"media\">\n      <div class=\"pull-left\">\n        <img class=\"media-object img-rounded\" src=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.user)),stack1 == null || stack1 === false ? stack1 : stack1.picture)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" width=\"50\" height=\"50\"></img>\n      </div>\n      <div class=\"media-body\">\n        <h4 class=\"media-heading\">"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.user)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</h4>\n      </div>\n    </li>\n  ";
  return buffer;
  }

  buffer += "<h5 class='title'>Likes for "
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.target)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</h5>\n<ul class=\"likes unstyled\">\n  ";
  options={hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data}
  if (helper = helpers.likes) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.likes); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.likes) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n</ul>\n";
  return buffer;
  } ; 

Hull.component('likes/list@hull', {
    type: 'Hull',
    templates: ['list'],
    refreshEvents: ['hull.likes.change.**'],
    datasources: {
        target: ':id',
        likes: ':id/likes'
    }
});