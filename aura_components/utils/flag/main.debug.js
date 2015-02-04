this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["utils/flag/main"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n  <span class=\"label btn btn-danger ";
  if (helper = helpers.flagState) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.flagState); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" data-hull-action=\"flag\">Flag</span>\n";
  return buffer;
  }

  stack1 = helpers['if'].call(depth0, (depth0 && depth0.loggedIn), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  } ; 

Hull.component('utils/flag@hull', {
    type: 'Hull',
    templates: ['main'],
    refreshEvents: ['model.hull.me.change'],
    datasources: {
        'flaggedByMe': function () {
            'use strict';
            if (!this.loggedIn()) {
                return false;
            }
            return this.hasFlagsByMe();
        }
    },
    options: { 'text': 'Do you want to report this content as inappropriate?' },
    initialize: function () {
        'use strict';
        if (!this.options.id) {
            throw new Error('Missing id of the object to flag');
        }
    },
    beforeRender: function (data) {
        'use strict';
        data.flagState = data.flaggedByMe ? 'disabled' : '';
    },
    actions: {
        flag: function () {
            'use strict';
            var self = this;
            if (!this.data.flaggedByMe && confirm(this.options.text)) {
                this.api.post(this.options.id + '/flag').then(function () {
                    self.render();
                });
            }
        }
    },
    hasFlagsByMe: function () {
        'use strict';
        var filter = this.sandbox.util._.filter;
        var dfd = this.sandbox.data.deferred();
        var path = this.options.id + '/flags';
        var myId = this.api.model('me').get('id');
        this.api(path).then(function (flags) {
            var myFlags = filter(flags, function (flag) {
                    return flag.reporter_id === myId;
                });
            dfd.resolve(myFlags.length > 0);
        });
        return dfd;
    }
});