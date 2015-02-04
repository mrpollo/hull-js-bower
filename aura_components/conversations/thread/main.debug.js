this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["conversations/thread/form"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n    <form data-hull-item=\"form\">\n      <div class='media'>\n        <div class=\"pull-left\">\n          <img class=\"media-object img-rounded\" src=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.me)),stack1 == null || stack1 === false ? stack1 : stack1.picture)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" alt=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.me)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" width=\"70\" height=\"70\">\n        </div>\n        <div class=\"media-body\">\n          <textarea name='body' class=\"input-block-level\" rows=\"3\" placeholder=\"Send a message... \"></textarea>\n          <button data-hull-action=\"message\" data-hull-id=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.conversation)),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" class=\"btn btn-primary\">\n            ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.isNew), {hash:{},inverse:self.program(4, program4, data),fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n            ";
  options={hash:{},inverse:self.noop,fn:self.program(6, program6, data),data:data}
  if (helper = helpers.me) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.me); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.me) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(6, program6, data),data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n          </button>\n\n          ";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.conversation)),stack1 == null || stack1 === false ? stack1 : stack1.notification_enabled), {hash:{},inverse:self.noop,fn:self.program(8, program8, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        </div>\n      </div>\n    </form>\n  ";
  return buffer;
  }
function program2(depth0,data) {
  
  
  return "Send";
  }

function program4(depth0,data) {
  
  
  return "Reply";
  }

function program6(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "as ";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1);
  return buffer;
  }

function program8(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n          ";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.conversation)),stack1 == null || stack1 === false ? stack1 : stack1.notification_enabled_user), {hash:{},inverse:self.program(11, program11, data),fn:self.program(9, program9, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n          ";
  return buffer;
  }
function program9(depth0,data) {
  
  
  return "\n          <div class=\"pull-right\">\n            <a class=\"btn-link\" data-hull-action=\"disableNotifications\">\n              <span class=\"text-success\">\n                Notifications enabled\n              </span>\n            </a>\n          </div>\n          ";
  }

function program11(depth0,data) {
  
  
  return "\n          <div class=\"pull-right\">\n            <a class=\"btn-link muted\" data-hull-action=\"enableNotifications\">\n              <span class=\"muted\">\n                Notifications muted\n              </span>\n            </a>\n          </div>\n          ";
  }

function program13(depth0,data) {
  
  
  return "\n    <div data-hull-component=\"login/button@hull\"></div>\n  ";
  }

  buffer += "<div class=\"well\">\n  ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.loggedIn), {hash:{},inverse:self.program(13, program13, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n</div>\n";
  return buffer;
  };
Hull.templates._default["conversations/thread/participants"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n  <img data-toggle=\"tooltip\" title=\"";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" class=\"img-rounded\" src=\"";
  if (helper = helpers.picture) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.picture); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" alt=\"";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" width=\"36\" height=\"36\">\n";
  return buffer;
  }

  stack1 = ((stack1 = ((stack1 = ((stack1 = (depth0 && depth0.conversation)),stack1 == null || stack1 === false ? stack1 : stack1.participants)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1)),blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data}));
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  };
Hull.templates._default["conversations/thread/thread"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); partials = this.merge(partials, Handlebars.partials); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this, helperMissing=helpers.helperMissing, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  
  return "\n  <div class=\"alert alert-error\">Unable to retrieve the conversation</div>\n";
  }

function program3(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n  ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.conversation), {hash:{},inverse:self.program(17, program17, data),fn:self.program(4, program4, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  }
function program4(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n    <div class=\"hull-conversation\">\n      <div class=\"hull-conversation__header\">\n        <h3>\n          <span class=\"pull-right muted\"><small>started "
    + escapeExpression((helper = helpers.fromNow || (depth0 && depth0.fromNow),options={hash:{},data:data},helper ? helper.call(depth0, ((stack1 = (depth0 && depth0.conversation)),stack1 == null || stack1 === false ? stack1 : stack1.created_at), options) : helperMissing.call(depth0, "fromNow", ((stack1 = (depth0 && depth0.conversation)),stack1 == null || stack1 === false ? stack1 : stack1.created_at), options)))
    + "</small></span>\n          "
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.conversation)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\n        </h3>\n        ";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.conversation)),stack1 == null || stack1 === false ? stack1 : stack1.isDeleteable), {hash:{},inverse:self.noop,fn:self.program(5, program5, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        <div class=\"hull-conversation__participants text-right\">\n          ";
  stack1 = self.invokePartial(partials['conversations/thread/participants'], 'conversations/thread/participants', depth0, helpers, partials, data);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        </div>\n      </div>\n      <hr />\n      <div class=\"row-fluid\">\n          ";
  options={hash:{},inverse:self.program(7, program7, data),fn:self.noop,data:data}
  if (helper = helpers.isAscending) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.isAscending); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.isAscending) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.program(7, program7, data),fn:self.noop,data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n          ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.messages), {hash:{},inverse:self.noop,fn:self.program(9, program9, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n          ";
  options={hash:{},inverse:self.program(15, program15, data),fn:self.noop,data:data}
  if (helper = helpers.messages) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.messages); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.messages) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.program(15, program15, data),fn:self.noop,data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n          ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.isAscending), {hash:{},inverse:self.noop,fn:self.program(7, program7, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      </div>\n    </div>\n  ";
  return buffer;
  }
function program5(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n          <button data-hull-action=\"deleteConvo\" data-hull-id=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.conversation)),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" class=\"btn btn-link text-error pull-right\">\n            Delete conversation\n          </button>\n        ";
  return buffer;
  }

function program7(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n            ";
  stack1 = self.invokePartial(partials['conversations/thread/form'], 'conversations/thread/form', depth0, helpers, partials, data);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n          ";
  return buffer;
  }

function program9(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n            <ul class=\"media-list hull-messages__list\">\n              ";
  options={hash:{},inverse:self.noop,fn:self.program(10, program10, data),data:data}
  if (helper = helpers.messages) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.messages); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.messages) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(10, program10, data),data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n            </ul>\n          ";
  return buffer;
  }
function program10(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n              <li class=\"media\" data-hull-message-id=\"";
  if (helper = helpers.id) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.id); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">\n                <div class=\"pull-left\">\n                  <img class=\"media-object img-rounded\" src=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.actor)),stack1 == null || stack1 === false ? stack1 : stack1.picture)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" alt=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.actor)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" width=\"50\" height=\"50\">\n                </div>\n                <div class=\"media-body\">\n                  <div class=\"pull-right text-right\">\n                    <small class=\"muted\">"
    + escapeExpression((helper = helpers.fromNow || (depth0 && depth0.fromNow),options={hash:{},data:data},helper ? helper.call(depth0, (depth0 && depth0.updated_at), options) : helperMissing.call(depth0, "fromNow", (depth0 && depth0.updated_at), options)))
    + "</small>\n                    ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.isNew), {hash:{},inverse:self.noop,fn:self.program(11, program11, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n                  </div>\n                  <h5 class=\"media-heading\">"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.actor)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</h5>\n                  <div class=\"hull-messages__body\">\n                    ";
  stack1 = (helper = helpers.autoLink || (depth0 && depth0.autoLink),options={hash:{},data:data},helper ? helper.call(depth0, (depth0 && depth0.body), options) : helperMissing.call(depth0, "autoLink", (depth0 && depth0.body), options));
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n                  </div>\n                  <div class=\"hull-messages__actions\">\n                      ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.isDeletable), {hash:{},inverse:self.noop,fn:self.program(13, program13, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n                  </div>\n                </div>\n              </li>\n              ";
  return buffer;
  }
function program11(depth0,data) {
  
  
  return "\n                    <br>\n                    <small class=\"text-success\">NEW</small>\n                    ";
  }

function program13(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n                        <small>\n                          <a href=\"#\" class='link' data-hull-action=\"deleteMsg\" data-hull-id=\"";
  if (helper = helpers.id) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.id); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">Delete</a>\n                        </small>\n                      ";
  return buffer;
  }

function program15(depth0,data) {
  
  
  return "\n            <div class=\"alert alert-info\">\n              No messages started yet\n            </div>\n          ";
  }

function program17(depth0,data) {
  
  
  return "\n    <div class=\"alert alert-info\">No conversation selected</div>\n  ";
  }

  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.errors)),stack1 == null || stack1 === false ? stack1 : stack1.conversation), {hash:{},inverse:self.program(3, program3, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  } ; 

Hull.component('conversations/thread@hull', {
    templates: [
        'thread',
        'form',
        'participants'
    ],
    refreshEvents: ['model.hull.me.change'],
    actions: {
        message: 'message',
        deleteMsg: 'deleteMsg',
        enableNotifications: 'enableNotifications',
        disableNotifications: 'disableNotifications',
        'delete': 'delete'
    },
    options: {
        focus: true,
        order: 'desc'
    },
    datasources: {
        conversation: function () {
            if (this.options.id) {
                return this.api(this.options.id);
            }
        },
        messages: function () {
            if (this.options.id) {
                return this.api(this.options.id + '/messages', this.getMessagesParams());
            }
        }
    },
    getMessagesParams: function () {
        var params = {};
        if (this.options.limit) {
            params.per_page = this.options.limit;
        }
        return params;
    },
    initialize: function () {
        this.sandbox.on('hull.conversation.select', function (id) {
            this.options.id = id;
            this.render();
        }, this);
    },
    beforeRender: function (data, errors) {
        var _ = this.sandbox.util._;
        data.isAscending = this.options.order != 'desc';
        if (data.conversation) {
            data.participants = data.conversation.participants;
            if (this.loggedIn()) {
                data.conversation.isDeletable = data.conversation.actor && data.conversation.actor.id == data.me.id;
                _.each(data.messages, function (m) {
                    m.isDeletable = m.actor && m.actor.id === this.data.me.id;
                    var last_read = data.conversation.last_read;
                    if (last_read instanceof Object) {
                        last_read = last_read[this.data.me.id];
                    }
                    m.isNew = !m.isMe && (last_read ? m.id > last_read : true);
                    m.isMe = m.actor && m.actor.id === data.me.id;
                    return m;
                }, this);
                data.isFollowing = _.find(data.participants, function (p) {
                    return p.id == data.me.id;
                }, this);
                data.isNew = !(data.messages && data.messages.length > 0);
            }
        } else {
            data.newConvo = true;
            data.errors = errors;
        }
        if ('desc' !== this.options.order) {
            data.messages = data.messages.reverse();
        }
        return data;
    },
    afterRender: function (data) {
        var self = this;
        if (this.options.focus || this.focusAfterRender) {
            this.$el.find('input,textarea').focus();
            this.focusAfterRender = false;
        }
        var tips = this.$el.find('[data-toggle="tooltip"]');
        if (tips && tips.tooltip) {
            tips.tooltip();
        }
        setTimeout(function () {
            if (self.options.id && data.messages) {
                self.api(self.options.id + '/messages', 'put');
            }
        }, 2000);
    },
    toggleLoading: function ($el) {
        var $form = $el.toggleClass('is-loading');
        var $btn = $form.find('.btn');
        $btn.attr('disabled', !$btn.attr('disabled'));
        var $textarea = $form.find('textarea');
        $textarea.attr('disabled', !$textarea.attr('disabled'));
    },
    message: function (e, data) {
        e.preventDefault();
        var self = this;
        var $form = this.$el.find('[data-hull-item=\'form\']');
        var formData = this.sandbox.dom.getFormData($form);
        var body = formData.body;
        this.toggleLoading($form);
        if (body && body.length > 0) {
            var cid = data.data.id;
            var attributes = { body: body };
            this.api(cid + '/messages', 'post', attributes).then(function () {
                self.toggleLoading($form);
                self.render();
            });
        } else {
            this.toggleLoading($form);
        }
    },
    deleteMsg: function (e, data) {
        e.preventDefault();
        var id = data.data.id;
        var $parent = data.el.addClass('is-removing').parents('[data-hull-message-id="' + id + '"]');
        this.api(id, 'delete').then(function () {
            $parent.remove();
        });
    },
    'delete': function (e, data) {
        event.preventDefault();
        var id = data.data.id;
        var self = this;
        this.api(id, 'delete').then(function () {
            self.sandbox.emit('hull.conversation.thread.delete', {
                id: id,
                cid: self.cid
            });
        });
    },
    disableNotifications: function (e, data) {
        var self = this;
        this.api(this.options.id + '/notifications', 'delete').then(function () {
            self.render();
        });
    },
    enableNotifications: function (e, data) {
        var self = this;
        this.api(this.options.id + '/notifications', 'put').then(function () {
            self.render();
        });
    }
});