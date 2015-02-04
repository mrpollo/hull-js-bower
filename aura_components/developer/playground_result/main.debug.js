this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["developer/playground_result/result"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, functionType="function";


  buffer += "<div class=\"hull-playground-result\">\n  ";
  if (helper = helpers.code) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.code); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n</div>\n";
  return buffer;
  } ; 

Hull.component('developer/playground_result@hull', {
    type: 'Hull',
    templates: ['result'],
    initialize: function () {
        this.code = this.options.code || '';
        this.sandbox.on('hull.playground.run', this.sandbox.util._.bind(this.updateCode, this));
        this.sandbox.on('hull.playground.load', this.sandbox.util._.bind(this.updateCode, this));
    },
    beforeRender: function (data) {
        data.code = this.code;
    },
    updateCode: function (code) {
        this.code = code;
        this.render();
    }
});