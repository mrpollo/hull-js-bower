this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["ratings/review/form"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n    <form>\n      <div class='media'>\n        <div class=\"pull-left\">\n          <img class=\"media-object img-rounded\" src=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.me)),stack1 == null || stack1 === false ? stack1 : stack1.picture)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" alt=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.me)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" width=\"50\" height=\"50\">\n        </div>\n        <div class=\"media-body\">\n          <div>\n            <select name=\"rating\">\n              <option></option>\n              ";
  options={hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data}
  if (helper = helpers.range) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.range); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.range) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n            </select>\n          </div>\n          <div>\n            <textarea name='description' class=\"input-block-level\" rows=\"3\" placeholder=\"Write a review...\">"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.review)),stack1 == null || stack1 === false ? stack1 : stack1.description)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</textarea>\n          </div>\n          <div>\n            <button data-hull-action=\"review\" disabled class=\"btn btn-small btn-primary\">Review as "
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.me)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</button>\n            <div class='pull-right'>\n              <small>\n                <a href=\"#\" data-hull-action=\"logout\" class=\"link\">Logout</a>\n              </small>\n            </div>\n          </div>\n        </div>\n      </div>\n    </form>\n  ";
  return buffer;
  }
function program2(depth0,data) {
  
  var buffer = "";
  buffer += "\n              <option value=\""
    + escapeExpression((typeof depth0 === functionType ? depth0.apply(depth0) : depth0))
    + "\">"
    + escapeExpression((typeof depth0 === functionType ? depth0.apply(depth0) : depth0))
    + "</option>\n              ";
  return buffer;
  }

function program4(depth0,data) {
  
  
  return "\n    <div data-hull-component=\"login/button@hull\"></div>\n  ";
  }

  buffer += "<div class=\"well\">\n  ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.loggedIn), {hash:{},inverse:self.program(4, program4, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n</div>\n";
  return buffer;
  };
Hull.templates._default["ratings/review/list"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); partials = this.merge(partials, Handlebars.partials); data = data || {};
  var buffer = "", stack1, helper, options, functionType="function", escapeExpression=this.escapeExpression, helperMissing=helpers.helperMissing, self=this, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n  <ul class=\"media-list hull-reviews__list\">\n    ";
  options={hash:{},inverse:self.noop,fn:self.programWithDepth(2, program2, data, depth0),data:data}
  if (helper = helpers.reviews) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.reviews); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.reviews) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.programWithDepth(2, program2, data, depth0),data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n  </ul>\n";
  return buffer;
  }
function program2(depth0,data,depth1) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n      <li class=\"media\" data-hull-review-id=\"";
  if (helper = helpers.id) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.id); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">\n        <div class=\"pull-left\">\n          <img class=\"media-object img-rounded\" src=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.user)),stack1 == null || stack1 === false ? stack1 : stack1.picture)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" alt=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.user)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" width=\"50\" height=\"50\">\n        </div>\n        <div class=\"media-body\">\n          <div class=\"pull-right\">\n\n          </div>\n          <h4 class=\"media-heading\">\n            <span class=\"pull-right badge\">";
  if (helper = helpers.rating) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.rating); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</span>\n            "
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.user)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\n            •\n            <small class=\"muted\">"
    + escapeExpression((helper = helpers.fromNow || (depth0 && depth0.fromNow),options={hash:{},data:data},helper ? helper.call(depth0, (depth0 && depth0.updated_at), options) : helperMissing.call(depth0, "fromNow", (depth0 && depth0.updated_at), options)))
    + "</small>\n          </h4>\n          <div class=\"hull-reviews__description\">\n            ";
  if (helper = helpers.description) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.description); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\n          </div>\n          <div class=\"hull-reviews__actions\">\n              ";
  stack1 = (helper = helpers.ifEqual || (depth1 && depth1.ifEqual),options={hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data},helper ? helper.call(depth0, ((stack1 = (depth1 && depth1.me)),stack1 == null || stack1 === false ? stack1 : stack1.id), ((stack1 = (depth0 && depth0.user)),stack1 == null || stack1 === false ? stack1 : stack1.id), options) : helperMissing.call(depth0, "ifEqual", ((stack1 = (depth1 && depth1.me)),stack1 == null || stack1 === false ? stack1 : stack1.id), ((stack1 = (depth0 && depth0.user)),stack1 == null || stack1 === false ? stack1 : stack1.id), options));
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n          </div>\n        </div>\n      </li>\n    ";
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
  
  
  return "\n  <div class=\"alert alert-info\">\n    No reviews for the moment\n  </div>\n";
  }

  stack1 = self.invokePartial(partials['ratings/review/form'], 'ratings/review/form', depth0, helpers, partials, data);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.reviews), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n";
  options={hash:{},inverse:self.program(5, program5, data),fn:self.noop,data:data}
  if (helper = helpers.reviews) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.reviews); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.reviews) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.program(5, program5, data),fn:self.noop,data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  } ; 

Hull.component('ratings/review@hull', {
    type: 'Hull',
    refreshEvents: ['model.hull.me.change'],
    templates: [
        'list',
        'form'
    ],
    requiredOptions: ['id'],
    datasources: {
        review: ':id/reviews/me',
        reviews: ':id/reviews'
    },
    events: { 'change [name="rating"]': 'checkButtonStatus' },
    options: {
        focus: false,
        perPage: 10,
        page: 1,
        max: 5
    },
    actions: {
        review: 'postReview',
        'delete': 'deleteReview'
    },
    initialize: function () {
        this.sandbox.on('hull.reviews.' + this.options.id + '.**', function () {
            this.render();
        }, this);
    },
    checkButtonStatus: function () {
        var disabled = !this.$find('select[name="rating"]').val();
        this.$find('[data-hull-action="review"]').attr('disabled', disabled);
    },
    toggleLoading: function () {
        this.$el.toggleClass('is-loading');
        this.$find('input,textarea,button').attr('disabled', this.$el.hasClass('is-loading'));
    },
    beforeRender: function (data) {
        data.range = this.sandbox.util._.range(this.options.max + 1);
        data.range.shift();
    },
    afterRender: function (data) {
        if (this.options.focus || this.focusAfterRender) {
            this.$el.find('input,textarea').focus();
            this.focusAfterRender = false;
        }
        if (data.review && data.review.rating) {
            this.$find('select[name=\'rating\']').val(data.review.rating);
        }
        this.checkButtonStatus();
    },
    postReview: function (e) {
        e.preventDefault();
        var self = this, $form = this.$find('form'), formData = this.sandbox.dom.getFormData($form), rating = formData.rating;
        this.toggleLoading();
        if (rating) {
            this.api(this.options.id + '/reviews', 'post', formData).then(function (review) {
                self.sandbox.emit('hull.reviews.' + self.options.id + '.added', review);
                self.toggleLoading();
                self.focusAfterRender = true;
                self.render();
            });
        }
    },
    deleteReview: function (event, action) {
        event.preventDefault();
        var self = this, id = action.data.id;
        var $parent = action.el.addClass('is-removing').parents('[data-hull-review-id="' + id + '"]');
        this.api(id, 'delete').then(function (review) {
            self.sandbox.emit('hull.reviews.' + self.options.id + '.removed', review);
            $parent.remove();
        });
    }
});