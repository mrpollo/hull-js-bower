this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["achievements/button/button"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n    <button class=\"btn btn-success\">\n      [DONE] Checked ("
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.achievement)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + ")\n    </button>\n  ";
  return buffer;
  }

function program3(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n    <button class=\"btn ";
  stack1 = helpers.unless.call(depth0, (depth0 && depth0.canAchieve), {hash:{},inverse:self.noop,fn:self.program(4, program4, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\" data-hull-action=\"achieve\">\n      CheckIn ("
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.achievement)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + ")\n    </button>\n  ";
  return buffer;
  }
function program4(depth0,data) {
  
  
  return "disabled";
  }

  buffer += "<div class=\"hull-achieve\">\n  ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.isAchieved), {hash:{},inverse:self.program(3, program3, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n</div>\n";
  return buffer;
  };
Hull.templates._default["achievements/button/error"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<span class=\"alert warning\">\nAn error occurred: \"";
  if (helper = helpers.message) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.message); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"\n</span>\n";
  return buffer;
  } ; 

Hull.component('achievements/button@hull', {
    type: 'Hull',
    requiredOptions: [
        'id',
        'secret'
    ],
    templates: [
        'button',
        'error'
    ],
    actions: {
        achieve: function () {
            var self = this;
            this.api(this.id + '/achieve', 'post', { secret: this.options.secret }).then(function () {
                self.refresh();
            }, function (err) {
                self.renderError(err.responseJSON.message);
            });
        }
    },
    onAchievementError: function (error) {
        this.actions.achieve = function () {
        };
    },
    renderError: function (errorMessage) {
        this.$el.html(this.renderTemplate('error', { message: errorMessage }));
    },
    datasources: {
        achievement: function () {
            return this.api(this.id);
        }
    },
    beforeRender: function (data) {
        console.log(data);
        if (data.achievement && data.achievement.badge) {
            data.isAchieved = true;
        } else {
            data.isAchieved = false;
            if (data.loggedIn && this.options.secret) {
                data.canAchieve = true;
            } else {
                data.canAchieve = false;
            }
        }
        return data;
    }
});