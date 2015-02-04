this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["conversations/list/list"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this, helperMissing=helpers.helperMissing;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n  <div class=\"media item\" data-hull-action=\"select\" data-hull-id=\"";
  if (helper = helpers.id) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.id); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">\n    <a class=\"pull-left\" href=\"#\">\n      <img class=\"media-object img-rounded\" src=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.actor)),stack1 == null || stack1 === false ? stack1 : stack1.picture)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" width=\"50\" height=\"50\">\n    </a>\n    <div class=\"media-body\">\n      <h5 class=\"media-heading\">\n        <span class=\"\">\n        ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.messages_count_unread), {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        </span>\n        ";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\n      </h5>\n      <small>updated "
    + escapeExpression((helper = helpers.fromNow || (depth0 && depth0.fromNow),options={hash:{},data:data},helper ? helper.call(depth0, (depth0 && depth0.updated_at), options) : helperMissing.call(depth0, "fromNow", (depth0 && depth0.updated_at), options)))
    + "</small>\n    </div>\n  </div>\n";
  return buffer;
  }
function program2(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n          <span class=\"badge badge-important pull-right\">\n            <i class=\"icon-envelope icon-white\"></i> ";
  if (helper = helpers.messages_count_unread) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.messages_count_unread); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\n          </span>\n        ";
  return buffer;
  }

function program4(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n  ";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.errors)),stack1 == null || stack1 === false ? stack1 : stack1.conversations), {hash:{},inverse:self.noop,fn:self.program(5, program5, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  }
function program5(depth0,data) {
  
  
  return "\n    <div class=\"alert alert-error\">\n      Unable to retrieve the conversations.\n    </div>\n  ";
  }

  stack1 = helpers.each.call(depth0, (depth0 && depth0.conversations), {hash:{},inverse:self.program(4, program4, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  } ; 

Hull.component('conversations/list@hull', {
    type: 'Hull',
    templates: ['list'],
    refreshEvents: ['model.hull.me.change'],
    actions: { select: 'select' },
    options: { focus: false },
    datasources: {
        conversations: function () {
            var url = this.options.id ? this.options.id : '';
            url += '/conversations';
            return this.api(url, { visibility: this.options.visibility || undefined });
        }
    },
    initialize: function () {
        this.sandbox.on('hull.conversations.*', function (id) {
            this.options.id = id;
            this.render();
            this.highlight(id);
        }, this);
        this.sandbox.on('hull.conversation.thread.delete', function () {
            this.render();
            this.sandbox.emit('hull.conversation.select', null);
        }, this);
    },
    beforeRender: function (data, errors) {
        data.errors = errors;
        return data;
    },
    highlight: function (id) {
        var selected = this.$el.find('[data-hull-id="' + id + '"]');
        this.$el.find('[data-hull-action="select"]').not(selected).removeClass('selected');
        selected.addClass('selected');
    },
    select: function (e, action) {
        this.highlight(action.data.id);
        this.sandbox.emit('hull.conversation.select', action.data.id);
    }
});