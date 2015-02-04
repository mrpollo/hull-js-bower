this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["comments/box/box"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n    <form>\n      <div class='media'>\n        <div class=\"pull-left\">\n          <img class=\"media-object img-rounded\" src=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.me)),stack1 == null || stack1 === false ? stack1 : stack1.picture)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" alt=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.me)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" width=\"50\" height=\"50\">\n        </div>\n        <div class=\"media-body\">\n          <textarea name='description' class=\"input-block-level\" rows=\"3\" placeholder=\"Leave a comment...\"></textarea>\n          <div>\n            <button data-hull-action=\"comment\" class=\"btn btn-small btn-primary\">Post as "
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
  } ; 

Hull.component('comments/box@hull', {
    type: 'Hull',
    templates: ['box'],
    refreshEvents: ['model.hull.me.change'],
    events: { 'keyup [name="description"]': 'checkButtonStatus' },
    requiredOptions: ['id'],
    actions: { comment: 'postComment' },
    options: { focus: false },
    afterRender: function () {
        if (this.options.focus || this.focusAfterRender) {
            this.$el.find('input,textarea').focus();
            this.focusAfterRender = false;
        }
        this.checkButtonStatus();
    },
    checkButtonStatus: function () {
        var disabled = !this.$find('[name="description"]').val();
        this.$find('[data-hull-action="comment"]').attr('disabled', disabled);
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
                $form[0].reset && $form[0].reset();
                self.focusAfterRender = true;
                self.$el.find('input,textarea').focus();
                self.checkButtonStatus();
            });
        }
    }
});