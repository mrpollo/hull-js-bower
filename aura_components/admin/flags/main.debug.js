this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["admin/flags/main"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, options, functionType="function", escapeExpression=this.escapeExpression, self=this, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n  <div class=\"well\">\n    <h2>Flagged content for <strong>"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.app)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</strong></h2>\n    <table class=\"table\">\n      <thead>\n        <tr>\n          <td>Type</td>\n          <td>Creator</td>\n          <td>Actions</td>\n        </tr>\n      </thead>\n      <tbody>\n        ";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.flags), {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      </tbody>\n    </table>\n  </div>\n";
  return buffer;
  }
function program2(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n          <tr>\n            <td><h6>";
  if (helper = helpers.type) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.type); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</h6></td>\n            <td>\n              <h6>"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.user)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " ("
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.user)),stack1 == null || stack1 === false ? stack1 : stack1.email)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + ")</h6>\n              <blockquote>\n                ";
  if (helper = helpers.description) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.description); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\n              </blockquote>\n            </td>\n            <td>\n              <a class=\"btn btn-mini\" data-hull-id=\"";
  if (helper = helpers.id) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.id); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" data-hull-action=\"unflag\">Unflag</a>\n              <a class=\"btn btn-mini btn-danger\"  data-hull-id=\"";
  if (helper = helpers.id) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.id); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" data-hull-action=\"delete\">Delete</a>\n            </td>\n          </tr>\n        ";
  return buffer;
  }

function program4(depth0,data) {
  
  
  return "\n  You need to be an administrator of the current app to view this component\n";
  }

  options={hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data}
  if (helper = helpers.isAdmin) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.isAdmin); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.isAdmin) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  options={hash:{},inverse:self.program(4, program4, data),fn:self.noop,data:data}
  if (helper = helpers.isAdmin) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.isAdmin); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.isAdmin) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.program(4, program4, data),fn:self.noop,data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  } ; 

Hull.component('admin/flags@hull', {
    type: 'Hull',
    templates: ['main'],
    refreshEvents: ['model.hull.me.change'],
    datasources: { 'flags': ':id/flagged' },
    options: { id: 'app' },
    onFlagsError: function (err) {
        return [];
    },
    markReviewed: function () {
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
    },
    actions: {
        'delete': function (evt, ctx) {
            var self = this;
            this.api(ctx.data.id, 'delete').then(function () {
                self.render();
            });
        },
        unflag: function (evt, ctx) {
            var self = this;
            this.api(ctx.data.id + '/flag?all=1', 'delete').then(function () {
                self.render();
            });
        }
    }
});