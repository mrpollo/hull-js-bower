this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["utils/property/property"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, functionType="function", escapeExpression=this.escapeExpression;


  if (helper = helpers.property) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.property); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\n";
  return buffer;
  } ; 

Hull.component('utils/property@hull', {
    type: 'Hull',
    templates: ['property'],
    datasources: { object: ':id' },
    refreshEvents: ['model.hull.me.change'],
    beforeRender: function (data) {
        'use strict';
        var defaultText = this.options.defaultText || 'No value';
        var value = this.findProp(data.object, this.options.property);
        return { property: value !== undefined ? value : defaultText };
    },
    findProp: function (obj, prop) {
        'use strict';
        var parts = prop.split('.');
        this.sandbox.util._.each(parts, function (p) {
            obj = !obj ? undefined : obj[p];
        });
        return obj;
    }
});