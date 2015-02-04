this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["ratings/stars/stars"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, options, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, functionType="function", self=this;

function program1(depth0,data,depth1) {
  
  var buffer = "", stack1;
  buffer += "\n    ";
  stack1 = helpers['if'].call(depth0, (depth1 && depth1.loggedIn), {hash:{},inverse:self.program(4, program4, data),fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n  ";
  return buffer;
  }
function program2(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n      <a href=\"#\" class=\"rating "
    + escapeExpression((helper = helpers.outputIf || (depth0 && depth0.outputIf),options={hash:{},data:data},helper ? helper.call(depth0, (depth0 && depth0.active), false, "muted", "", options) : helperMissing.call(depth0, "outputIf", (depth0 && depth0.active), false, "muted", "", options)))
    + " rating-";
  if (helper = helpers.value) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.value); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" data-hull-action=\"rate\" data-hull-rating=\"";
  if (helper = helpers.value) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.value); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">&#9733;</a>\n    ";
  return buffer;
  }

function program4(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n      <span class=\"rating "
    + escapeExpression((helper = helpers.outputIf || (depth0 && depth0.outputIf),options={hash:{},data:data},helper ? helper.call(depth0, (depth0 && depth0.active), false, "muted", options) : helperMissing.call(depth0, "outputIf", (depth0 && depth0.active), false, "muted", options)))
    + " rating-";
  if (helper = helpers.value) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.value); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">&#9733;</span>\n    ";
  return buffer;
  }

  buffer += "<span class=\"ratings ratings-";
  if (helper = helpers.average) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.average); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">\n  ";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.ratings), {hash:{},inverse:self.noop,fn:self.programWithDepth(1, program1, data, depth0),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n  •\n  "
    + escapeExpression((helper = helpers.fallback || (depth0 && depth0.fallback),options={hash:{},data:data},helper ? helper.call(depth0, ((stack1 = ((stack1 = ((stack1 = (depth0 && depth0.target)),stack1 == null || stack1 === false ? stack1 : stack1.stats)),stack1 == null || stack1 === false ? stack1 : stack1.reviews)),stack1 == null || stack1 === false ? stack1 : stack1.count), 0, options) : helperMissing.call(depth0, "fallback", ((stack1 = ((stack1 = ((stack1 = (depth0 && depth0.target)),stack1 == null || stack1 === false ? stack1 : stack1.stats)),stack1 == null || stack1 === false ? stack1 : stack1.reviews)),stack1 == null || stack1 === false ? stack1 : stack1.count), 0, options)))
    + " reviews\n</span>\n";
  return buffer;
  } ; 

Hull.component('ratings/stars@hull', {
    type: 'Hull',
    templates: ['stars'],
    refreshEvents: ['model.hull.me.change'],
    requiredOptions: ['id'],
    datasources: { target: ':id' },
    options: {
        max: 5,
        actionable: 'true'
    },
    actions: {
        rate: function (e, options) {
            this.rate(options.data.rating);
            e.preventDefault();
        }
    },
    initialize: function () {
        this.sandbox.on('hull.reviews.' + this.options.id + '.**', function () {
            this.render();
        }, this);
    },
    beforeRender: function (data) {
        if (!data.target) {
            data.average = 0;
        } else {
            data.average = data.target.stats.reviews ? data.target.stats.reviews.avg : 0;
        }
        data.average = this.normalizeRating(data.average);
        var ratings = [];
        for (var i = 0; i < this.options.max; i) {
            ratings[i] = {
                value: ++i,
                active: i <= data.average
            };
        }
        data.ratings = ratings;
    },
    rate: function (rating) {
        var self = this, rating = this.normalizeRating(rating);
        this.api(this.options.id + '/reviews', 'post', { rating: rating }).done(function (res) {
            self.sandbox.emit('hull.reviews.' + self.options.id + '.updated', res);
            self.sandbox.emit('hull.ratings.rate.complete', res);
            self.render();
        });
    },
    normalizeRating: function (rating) {
        var rating = parseInt(rating, 10);
        if (isNaN(rating) || rating < 0) {
            return 0;
        } else if (rating > this.options.max) {
            return this.options.max;
        } else {
            return rating;
        }
    }
});