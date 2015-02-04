this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["admin/reset/reset"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, options, functionType="function", escapeExpression=this.escapeExpression, helperMissing=helpers.helperMissing, self=this, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n  <div class=\"well\">\n    <h2>Reset Entities</h2>\n    <ul class=\"nav nav-tabs nav-stacked list list-user\">\n      ";
  options={hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data}
  if (helper = helpers.entities) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.entities); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.entities) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    </ul>\n  </div>\n\n  <div class=\"well\">\n    <h2>Activities</h2>\n    <ul class=\"nav nav-tabs nav-stacked list list-user\">\n      ";
  options={hash:{},inverse:self.noop,fn:self.program(10, program10, data),data:data}
  if (helper = helpers.activities) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.activities); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.activities) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(10, program10, data),data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    </ul>\n  </div>\n";
  return buffer;
  }
function program2(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n        <li data-hull-id=\"";
  if (helper = helpers.id) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.id); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">\n          <a>\n            <div class=\"media-body\">\n              <div class=\"pull-right\">\n                <button class=\"btn btn-mini\" data-hull-action=\"delete\" data-hull-id=\"";
  if (helper = helpers.id) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.id); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"><i class='icon-trash'></i> Entity</button>\n                ";
  options={hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data}
  if (helper = helpers.relations) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.relations); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.relations) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n              </div>\n              ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.name), {hash:{},inverse:self.noop,fn:self.program(6, program6, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n              ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.description), {hash:{},inverse:self.noop,fn:self.program(8, program8, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n              <p><strong>UID: </strong>";
  if (helper = helpers.uid) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.uid); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</p>\n            </div>\n          </a>\n        </li>\n      ";
  return buffer;
  }
function program3(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n                  ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.count), {hash:{},inverse:self.noop,fn:self.programWithDepth(4, program4, data, depth0),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n                ";
  return buffer;
  }
function program4(depth0,data,depth1) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n                  <button class=\"btn btn-mini\" data-hull-action=\"delete\" data-hull-id=\""
    + escapeExpression(((stack1 = (depth1 && depth1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" data-hull-target=\"";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"><i class='icon-trash'></i> ";
  if (helper = helpers.count) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.count); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + " "
    + escapeExpression((helper = helpers.humanize || (depth0 && depth0.humanize),options={hash:{},data:data},helper ? helper.call(depth0, (depth0 && depth0.name), options) : helperMissing.call(depth0, "humanize", (depth0 && depth0.name), options)))
    + "</button>\n                  ";
  return buffer;
  }

function program6(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n                <h5 class='media-heading'>\n                  ";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\n                </h5>\n              ";
  return buffer;
  }

function program8(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "<small> ";
  if (helper = helpers.description) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.description); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</small>";
  return buffer;
  }

function program10(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n        <li data-hull-id=\"";
  if (helper = helpers.id) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.id); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">\n          <a>\n            <div class=\"media\">\n               ";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.actor)),stack1 == null || stack1 === false ? stack1 : stack1.picture), {hash:{},inverse:self.noop,fn:self.program(11, program11, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n              <div class=\"pull-right\">\n                <button class=\"btn btn-mini\" data-hull-action=\"delete\" data-hull-id=\"";
  if (helper = helpers.id) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.id); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"><i class='icon-trash'></i> Activity</button>\n              </div>\n              <div class=\"media-body\">\n                <h5 class=\"media-heading\">\n                  ";
  if (helper = helpers.content) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.content); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\n                  <small> by "
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.actor)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</small>\n                </h5>\n              </div>\n            </div>\n          </a>\n        </li>\n      ";
  return buffer;
  }
function program11(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n                <div class=\"pull-left\">\n                  <img src=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.actor)),stack1 == null || stack1 === false ? stack1 : stack1.picture)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" width=\"50\" height=\"50\"/>\n                </div>\n              ";
  return buffer;
  }

function program13(depth0,data) {
  
  
  return "\n  You need to be an administrator of the current app to view this component\n";
  }

  options={hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data}
  if (helper = helpers.isAdmin) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.isAdmin); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.isAdmin) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  options={hash:{},inverse:self.program(13, program13, data),fn:self.noop,data:data}
  if (helper = helpers.isAdmin) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.isAdmin); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.isAdmin) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.program(13, program13, data),fn:self.noop,data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  } ; 

Hull.component('admin/reset@hull', {
    type: 'Hull',
    datasources: {
        entities: 'app/entities',
        activities: 'app/activity'
    },
    options: { relations: 'comments,likes,reviews' },
    templates: ['reset'],
    beforeRender: function (data) {
        data.relations = this.options.relations.split(',');
        var self = this;
        this.sandbox.util._.map(data.entities, function (entity) {
            entity.relations = self.sandbox.util._.map(data.relations, function (relation) {
                var rel = entity.stats[relation] || 0;
                if (rel.count)
                    rel = rel.count;
                return {
                    name: relation,
                    count: rel
                };
            });
        });
        data.isAdmin = this.sandbox.isAdmin;
        return data;
    },
    actions: {
        'delete': function (e, args) {
            event.preventDefault();
            var target = args.data.target;
            var id = args.data.id;
            if (id) {
                var route = id;
                var $parent = args.el.addClass('is-removing').parents('[data-hull-id="' + id + '"]');
                if (target) {
                    route = route + '/' + target;
                }
                this.api(route, 'delete').then(function (res) {
                    if (target) {
                        args.el.remove();
                    } else {
                        $parent.remove();
                    }
                });
            }
        }
    }
});