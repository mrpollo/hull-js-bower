this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["conversations/box/box"]=function (Handlebars,depth0,helpers,partials,data) {
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
    + "\" class=\"btn btn-primary btn-small\">\n            ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.isNew), {hash:{},inverse:self.program(4, program4, data),fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " ";
  options={hash:{},inverse:self.noop,fn:self.program(6, program6, data),data:data}
  if (helper = helpers.me) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.me); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.me) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(6, program6, data),data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n          </button> \n\n          ";
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
  buffer += "\n            ";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.conversation)),stack1 == null || stack1 === false ? stack1 : stack1.notification_enabled_user), {hash:{},inverse:self.program(11, program11, data),fn:self.program(9, program9, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n          ";
  return buffer;
  }
function program9(depth0,data) {
  
  
  return "\n            <div class=\"pull-right\">\n              <a class=\"btn-link\" data-hull-action=\"disableNotifications\">\n                <span class=\"text-success\">\n                  Notifications enabled\n                </span>\n              </a>\n            </div>\n            ";
  }

function program11(depth0,data) {
  
  
  return "\n            <div class=\"pull-right\">\n              <a class=\"btn-link muted\" data-hull-action=\"enableNotifications\">\n                <span class=\"muted\">\n                  Notifications muted\n                </span>\n              </a>\n            </div>\n            ";
  }

function program13(depth0,data) {
  
  
  return "\n    <div data-hull-component=\"login/button@hull\"></div>\n  ";
  }

  buffer += "<div class=\"well\">\n  ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.loggedIn), {hash:{},inverse:self.program(13, program13, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n</div>\n";
  return buffer;
  } ; 

Hull.component('conversations/box@hull', {
    type: 'Hull',
    templates: ['box'],
    refreshEvents: ['model.hull.me.change'],
    actions: {
        message: 'message',
        enableNotifications: 'enableNotifications',
        disableNotifications: 'disableNotifications'
    },
    options: { focus: true },
    getMessagesParams: function () {
        var params = {};
        if (this.options.limit) {
            params.per_page = this.options.limit;
        }
        return params;
    },
    afterRender: function (data) {
        var self = this;
        if (this.options.focus || this.focusAfterRender) {
            this.$el.find('input,textarea').focus();
            this.focusAfterRender = false;
        }
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