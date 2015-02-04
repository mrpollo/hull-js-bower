this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["votes/button/main"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, functionType="function", escapeExpression=this.escapeExpression, helperMissing=helpers.helperMissing, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n  ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.canVote), {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n  ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.noRemainingObject), {hash:{},inverse:self.noop,fn:self.program(4, program4, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n  ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.noRemainingPeriod), {hash:{},inverse:self.noop,fn:self.program(6, program6, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  }
function program2(depth0,data) {
  
  
  return "\n    <button class=\"btn\" data-hull-action=\"vote\">Vote</button>\n  ";
  }

function program4(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n    <p>No remaining vote for \"";
  if (helper = helpers.targetName) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.targetName); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\". Come back "
    + escapeExpression((helper = helpers.fromNow || (depth0 && depth0.fromNow),options={hash:{},data:data},helper ? helper.call(depth0, ((stack1 = ((stack1 = ((stack1 = (depth0 && depth0.credits)),stack1 == null || stack1 === false ? stack1 : stack1.votes)),stack1 == null || stack1 === false ? stack1 : stack1.period)),stack1 == null || stack1 === false ? stack1 : stack1.end), options) : helperMissing.call(depth0, "fromNow", ((stack1 = ((stack1 = ((stack1 = (depth0 && depth0.credits)),stack1 == null || stack1 === false ? stack1 : stack1.votes)),stack1 == null || stack1 === false ? stack1 : stack1.period)),stack1 == null || stack1 === false ? stack1 : stack1.end), options)))
    + ".</p>\n  ";
  return buffer;
  }

function program6(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n    <p>No remaining vote for the current period. Come back "
    + escapeExpression((helper = helpers.fromNow || (depth0 && depth0.fromNow),options={hash:{},data:data},helper ? helper.call(depth0, ((stack1 = ((stack1 = ((stack1 = (depth0 && depth0.credits)),stack1 == null || stack1 === false ? stack1 : stack1.votes)),stack1 == null || stack1 === false ? stack1 : stack1.period)),stack1 == null || stack1 === false ? stack1 : stack1.end), options) : helperMissing.call(depth0, "fromNow", ((stack1 = ((stack1 = ((stack1 = (depth0 && depth0.credits)),stack1 == null || stack1 === false ? stack1 : stack1.votes)),stack1 == null || stack1 === false ? stack1 : stack1.period)),stack1 == null || stack1 === false ? stack1 : stack1.end), options)))
    + ".</p>\n  ";
  return buffer;
  }

  buffer += "<p><strong>";
  if (helper = helpers.votesSum) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.votesSum); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</strong> votes</p>\n\n";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.loggedIn), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  } ; 

Hull.component('votes/button@hull', {
    templates: ['main'],
    refreshEvents: ['model.hull.me.change'],
    requiredOptions: ['id'],
    datasources: {
        target: ':id',
        credits: function () {
            return this.loggedIn() ? this.api('me/credits') : false;
        }
    },
    beforeRender: function (data) {
        data.targetName = data.target.name || data.target.uid || data.target.id;
        var votes = data.target.stats.votes || {};
        data.votesSum = votes.sum || 0;
        if (data.credits === false) {
            return;
        }
        if (data.credits.votes == null) {
            data.canVote = true;
            return;
        }
        if (data.credits.votes.remaining === 0) {
            data.noRemainingPeriod = true;
        } else if (data.credits.votes.max_per_object && data.credits.votes.max_per_object === data.credits.votes.credited[data.target.id]) {
            data.noRemainingObject = true;
        } else {
            data.canVote = true;
        }
    },
    actions: {
        vote: function () {
            if (this.working)
                return;
            this.working = true;
            this.api(this.options.id + '/votes', 'post').then(this.sandbox.util._.bind(function () {
                this.working = false;
                this.render();
            }, this), function (x) {
                alert(x.responseJSON.message);
            });
        }
    }
});