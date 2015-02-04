this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["comments/list/form"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n    <form>\n      <div class='media'>\n        <div class=\"pull-left\">\n          <img class=\"media-object img-rounded\" src=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.me)),stack1 == null || stack1 === false ? stack1 : stack1.picture)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" alt=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.me)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" width=\"50\" height=\"50\">\n        </div>\n        <div class=\"media-body\">\n          <textarea name='description' class=\"input-block-level\" rows=\"3\" placeholder=\"Leave a comment...\"></textarea>\n          <div>\n            <button data-hull-action=\"comment\" disabled class=\"btn btn-small btn-primary\">Post as "
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.me)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</button>\n            <div class='pull-right'>\n              <small>\n                <a href=\"#\" data-hull-action=\"logout\" class=\"link\">Logout</a>\n              </small>\n            </div>\n          </div>\n        </div>\n      </div>\n    </form>\n  ";
  return buffer;
  }

function program3(depth0,data) {
  
  
  return "\n    <div data-hull-component=\"login/button@hull\"></div>\n  ";
  }

  buffer += "<div class=\"well\">\n  ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.loggedIn), {hash:{},inverse:self.program(3, program3, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n</div>\n";
  return buffer;
  };
Hull.templates._default["comments/list/list"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); partials = this.merge(partials, Handlebars.partials); data = data || {};
  var buffer = "", stack1, helper, options, functionType="function", escapeExpression=this.escapeExpression, helperMissing=helpers.helperMissing, self=this, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n  <ul class=\"media-list hull-comments__list\">\n    ";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.comments), {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n  </ul>\n";
  return buffer;
  }
function program2(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n      <li class=\"media\" data-hull-comment-id=\"";
  if (helper = helpers.id) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.id); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">\n        <div class=\"pull-left\">\n          <img class=\"media-object img-rounded\" src=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.user)),stack1 == null || stack1 === false ? stack1 : stack1.picture)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" alt=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.user)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" width=\"50\" height=\"50\">\n        </div>\n        <div class=\"media-body\">\n          <h4 class=\"media-heading\">"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.user)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " <small class=\"muted\"> • "
    + escapeExpression((helper = helpers.fromNow || (depth0 && depth0.fromNow),options={hash:{},data:data},helper ? helper.call(depth0, (depth0 && depth0.updated_at), options) : helperMissing.call(depth0, "fromNow", (depth0 && depth0.updated_at), options)))
    + "</small></h4>\n          <div class=\"hull-comments__description\">\n            ";
  if (helper = helpers.description) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.description); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\n          </div>\n          <div class=\"hull-comments__actions\">\n              ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.isDeletable), {hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n              <small>\n                <a href=\"#\" class='link text-error' data-hull-action=\"flag\" data-hull-id=\"";
  if (helper = helpers.id) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.id); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">Inappropriate?</a>\n              </small>\n          </div>\n        </div>\n      </li>\n    ";
  return buffer;
  }
function program3(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n                <small>\n                  <a href=\"#\" class='link' data-hull-action=\"delete\" data-hull-id=\"";
  if (helper = helpers.id) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.id); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">Delete</a>\n                </small>\n              ";
  return buffer;
  }

function program5(depth0,data) {
  
  
  return "\n  <div class=\"alert alert-info\">\n    No comments for the moment\n  </div>\n";
  }

  stack1 = self.invokePartial(partials['comments/list/form'], 'comments/list/form', depth0, helpers, partials, data);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.comments)),stack1 == null || stack1 === false ? stack1 : stack1.length)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " comments\n";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.comments), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n";
  options={hash:{},inverse:self.program(5, program5, data),fn:self.noop,data:data}
  if (helper = helpers.comments) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.comments); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.comments) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.program(5, program5, data),fn:self.noop,data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  } ; 

Hull.component('comments/list@hull', {
    templates: [
        'list',
        'form'
    ],
    refreshEvents: ['model.hull.me.change'],
    requiredOptions: ['id'],
    events: { 'keyup [name="description"]': 'checkButtonStatus' },
    actions: {
        comment: 'postComment',
        'delete': 'deleteComment',
        flag: 'flagItem'
    },
    options: {
        focus: false,
        perPage: 10,
        page: 1
    },
    datasources: { comments: ':id/comments' },
    initialize: function () {
        var query = {};
        if (this.options.startPage) {
            query.page = this.options.startPage;
        } else {
            query.skip = this.options.skip || 0;
        }
        this.sandbox.on('hull.comments.' + this.options.id + '.**', function () {
            this.render();
        }, this);
        query.limit = this.options.limit || this.options.perPage;
        this.query = query;
    },
    checkButtonStatus: function () {
        var disabled = !this.$find('[name="description"]').val();
        this.$find('[data-hull-action="comment"]').attr('disabled', disabled);
    },
    beforeRender: function (data) {
        this.sandbox.util._.each(data.comments, function (c) {
            c.isDeletable = c.user && c.user.id === data.me.id;
            return c;
        }, this);
        return data;
    },
    afterRender: function () {
        if (this.options.focus || this.focusAfterRender) {
            this.$el.find('input,textarea').focus();
            this.focusAfterRender = false;
        }
        this.checkButtonStatus();
    },
    deleteComment: function (event, action) {
        event.preventDefault();
        var id = action.data.id;
        var $parent = action.el.addClass('is-removing').parents('[data-hull-comment-id="' + id + '"]');
        this.api(id, 'delete').then(function () {
            $parent.remove();
        });
    },
    toggleLoading: function () {
        this.$el.toggleClass('is-loading');
        this.$find('input,textarea,button').attr('disabled', this.$el.hasClass('is-loading'));
    },
    postComment: function (e) {
        e.preventDefault();
        var self = this, $form = this.$find('form'), formData = this.sandbox.dom.getFormData($form);
        if (formData.description && formData.description.length > 0) {
            this.toggleLoading();
            this.api(this.options.id + '/comments', 'post', formData).then(function (comment) {
                self.sandbox.emit('hull.comments.' + self.options.id + '.added', comment);
                self.toggleLoading();
                self.focusAfterRender = true;
                self.render();
            }, function () {
                self.$el.find('input,textarea').focus();
                self.toggleLoading();
            });
        }
    },
    flagItem: function (event, action) {
        event.preventDefault();
        var id = action.data.id;
        var isCertain = confirm('Do you want to report this content as inappropriate ?');
        if (isCertain) {
            this.sandbox.flag(id);
        }
    }
});