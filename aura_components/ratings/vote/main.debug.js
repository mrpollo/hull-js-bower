this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["ratings/vote/vote"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, self=this, functionType="function";

function program1(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n<div class='btn-group'>\n  <button class=\"btn btn-small "
    + escapeExpression((helper = helpers.outputIf || (depth0 && depth0.outputIf),options={hash:{},data:data},helper ? helper.call(depth0, (depth0 && depth0.myVote), 1, "btn-success", options) : helperMissing.call(depth0, "outputIf", (depth0 && depth0.myVote), 1, "btn-success", options)))
    + " dropup\" ";
  stack1 = helpers.unless.call(depth0, (depth0 && depth0.loggedIn), {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " data-hull-action='"
    + escapeExpression((helper = helpers.outputIf || (depth0 && depth0.outputIf),options={hash:{},data:data},helper ? helper.call(depth0, (depth0 && depth0.myVote), 1, "unvote", "upvote", options) : helperMissing.call(depth0, "outputIf", (depth0 && depth0.myVote), 1, "unvote", "upvote", options)))
    + "'><span class='caret'></span>&nbsp;"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.votes)),stack1 == null || stack1 === false ? stack1 : stack1.up)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</button>\n  <button class=\"btn btn-small "
    + escapeExpression((helper = helpers.outputIf || (depth0 && depth0.outputIf),options={hash:{},data:data},helper ? helper.call(depth0, (depth0 && depth0.myVote), -1, "btn-success", options) : helperMissing.call(depth0, "outputIf", (depth0 && depth0.myVote), -1, "btn-success", options)))
    + " dropdown\" ";
  stack1 = helpers.unless.call(depth0, (depth0 && depth0.loggedIn), {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " data-hull-action='"
    + escapeExpression((helper = helpers.outputIf || (depth0 && depth0.outputIf),options={hash:{},data:data},helper ? helper.call(depth0, (depth0 && depth0.myVote), -1, "unvote", "downvote", options) : helperMissing.call(depth0, "outputIf", (depth0 && depth0.myVote), -1, "unvote", "downvote", options)))
    + "'><span class='caret'></span>&nbsp;"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.votes)),stack1 == null || stack1 === false ? stack1 : stack1.down)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</button>\n</div>\n";
  return buffer;
  }
function program2(depth0,data) {
  
  
  return "disabled";
  }

function program4(depth0,data) {
  
  
  return "\n  <p>Can not find the object to rate</p>\n";
  }

function program6(depth0,data) {
  
  
  return "\n  <div data-hull-component=\"login/button@hull\"></div>\n";
  }

  stack1 = helpers['if'].call(depth0, (depth0 && depth0.target), {hash:{},inverse:self.program(4, program4, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  stack1 = helpers.unless.call(depth0, (depth0 && depth0.loggedIn), {hash:{},inverse:self.noop,fn:self.program(6, program6, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  } ; 

Hull.component('ratings/vote@hull', {
    type: 'Hull',
    refreshEvents: ['model.hull.me.change'],
    templates: ['vote'],
    datasources: {
        myReview: function () {
            if (this.loggedIn() && this.options.id) {
                return this.api(this.options.id + '/reviews/me');
            } else {
                return false;
            }
        },
        target: ':id'
    },
    initialize: function () {
        this.sandbox.on('hull.reviews.' + this.options.id + '.**', function () {
            this.render();
        }, this);
    },
    beforeRender: function (data) {
        var votes = {
                up: 0,
                down: 0
            };
        if (data.target && data.target.stats && data.target.stats.reviews) {
            var reviews = data.target.stats.reviews;
            if (reviews.distribution) {
                votes = {
                    down: reviews.distribution['-1'] || 0,
                    up: reviews.distribution['1'] || 0
                };
            }
        }
        if (data.myReview) {
            data.myVote = data.myReview.rating;
        }
        data.votes = votes;
        return data;
    },
    update_vote: function (evt, rating) {
        evt.stopPropagation();
        var description = this.$el.find('textarea').val();
        var self = this;
        if (rating != undefined) {
            var d = {
                    rating: rating,
                    description: description
                };
            this.api(this.options.id + '/reviews', 'post', d).then(function (res) {
                self.sandbox.emit('hull.reviews.' + self.options.id + '.updated', res);
            });
        }
    },
    actions: {
        downvote: function (evt, data) {
            this.update_vote(evt, -1);
        },
        unvote: function (evt, data) {
            this.update_vote(evt, 0);
        },
        upvote: function (evt, data) {
            this.update_vote(evt, 1);
        }
    }
});