this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["games/sweepstake/buttons"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, helperMissing=helpers.helperMissing, self=this;

function program1(depth0,data) {
  
  
  return "\n  <button class=\"btn btn-primary\" data-hull-action=\"play\">Play</button>\n";
  }

function program3(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n  ";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.authProviders), {hash:{},inverse:self.noop,fn:self.program(4, program4, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  }
function program4(depth0,data) {
  
  var buffer = "", helper, options;
  buffer += "\n    <button class=\"btn\" data-hull-action=\"play\" data-hull-provider="
    + escapeExpression((typeof depth0 === functionType ? depth0.apply(depth0) : depth0))
    + ">Play with "
    + escapeExpression((helper = helpers.capitalize || (depth0 && depth0.capitalize),options={hash:{},data:data},helper ? helper.call(depth0, depth0, options) : helperMissing.call(depth0, "capitalize", depth0, options)))
    + "</button>\n  ";
  return buffer;
  }

  stack1 = helpers['if'].call(depth0, (depth0 && depth0.loggedIn), {hash:{},inverse:self.program(3, program3, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  };
Hull.templates._default["games/sweepstake/ended"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div class=\"hull-instant hull-instant--ended\">\n  <h1>The Game is over.</h1>\n  <p class=\"lead\">Come back next time!</p>\n</div>\n";
  };
Hull.templates._default["games/sweepstake/intro"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); partials = this.merge(partials, Handlebars.partials); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;


  buffer += "<div class=\"hull-instant hull-instant--intro\">\n  <h1>"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.achievement)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</h1>\n  <p class=\"lead\">"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.achievement)),stack1 == null || stack1 === false ? stack1 : stack1.description)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</p>\n  ";
  stack1 = self.invokePartial(partials['games/sweepstake/buttons'], 'games/sweepstake/buttons', depth0, helpers, partials, data);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n</div>\n";
  return buffer;
  };
Hull.templates._default["games/sweepstake/lost"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div class=\"hull-instant hull-instant--lost\">\n  <div class=\"hull-instant-result\">\n    <h1>You Lose...</h1>\n    <p class=\"lead\">Come back tomorrow!</p>\n  </div>\n</div>\n";
  };
Hull.templates._default["games/sweepstake/played"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div class=\"hull-instant hull-instant--played\">\n  <div class=\"hull-instant-result\">\n    <h1>You've already played today!</h1>\n    <p class=\"lead\">Come back tomorrow!</p>\n  </div>\n</div>\n";
  };
Hull.templates._default["games/sweepstake/unstarted"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div class=\"hull-instant hull-instant--unstarted\">\n  <h1>The Game hasn't started yet.</h1>\n  <p class=\"lead\">Come back later!</p>\n</div>\n";
  };
Hull.templates._default["games/sweepstake/won"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n    <div class=\"hull-instant-result\">\n      <h1>You won a "
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.prize)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " !</h1>\n      ";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.prize)),stack1 == null || stack1 === false ? stack1 : stack1.description), {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    </div>\n  ";
  return buffer;
  }
function program2(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n        <p class=\"lead\">"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.prize)),stack1 == null || stack1 === false ? stack1 : stack1.description)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</p>\n      ";
  return buffer;
  }

  buffer += "<div class=\"hull-instant hull-instant--won\">\n  ";
  stack1 = helpers['with'].call(depth0, ((stack1 = (depth0 && depth0.badge)),stack1 == null || stack1 === false ? stack1 : stack1.data), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n</div>\n";
  return buffer;
  };
Hull.templates._default["games/sweepstake/working"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div class=\"hull-instant hull-instant--wokrking\">\n  <h1>Loading, please wait...</h1>\n</div>\n";
  } ; 

Hull.component('games/sweepstake@hull', {
    type: 'Hull',
    templates: [
        'intro',
        'buttons',
        'working',
        'won',
        'lost',
        'played',
        'unstarted',
        'ended'
    ],
    trackingData: function () {
        var data = { type: 'instant_win' };
        var achievement = this.data.achievement;
        if (achievement && achievement.get) {
            data.name = achievement.get('name');
        }
        return data;
    },
    refreshEvents: ['model.hull.me.change'],
    datasources: {
        achievement: ':id',
        badge: function () {
            return this.loggedIn() ? this.api('me/badges/' + this.options.id) : null;
        }
    },
    actions: {
        play: function (event, params) {
            var userLoggedIn = !!this.loggedIn();
            if (userLoggedIn) {
                this.play();
            } else {
                var provider = params.data.provider || this.options.provider;
                this.sandbox.login(provider);
                this.autoPlay = true;
            }
            this.track('start', { userLoggedIn: userLoggedIn });
        }
    },
    beforeRender: function (data) {
        this.authProviders = this.authServices();
        this.template = this.getInitialTemplate();
        data.authProviders = this.authProviders;
        if (!this.isInitialized) {
            this.track('init', { initialTemplate: this.template });
        }
    },
    afterRender: function (data) {
        if (this.autoPlay) {
            this.autoPlay = false;
            if (!this.userHasWon()) {
                this.play();
            }
        }
        if (this.template === 'won' || this.template === 'lost') {
            this.track('finish', { result: this.template });
        }
        this.sandbox.emit('hull.sweepstake.' + this.options.id + '.template.render', this.template);
    },
    getInitialTemplate: function () {
        if (this.userHasWon()) {
            return 'won';
        } else if (this.hasEnded()) {
            return 'ended';
        } else if (this.hasStarted()) {
            return this.userCanPlay() ? 'intro' : 'played';
        } else {
            return 'unstarted';
        }
    },
    hasStarted: function () {
        return true;
    },
    hasEnded: function () {
        return false;
    },
    userCanPlay: function () {
        if (!this.data.badge || !this.data.badge.attempts) {
            return true;
        }
        var d = new Date().toISOString().slice(0, 10);
        return !this.data.badge.data.attempts[d];
    },
    userHasWon: function () {
        if (!this.data.badge || !this.data.badge.data) {
            return false;
        }
        return this.data.badge.data.winner;
    },
    play: function () {
        'use strict';
        this.render('working');
        this.api(this.id + '/achieve', 'post', this.sandbox.util._.bind(function (res) {
            var template = 'played';
            if (this.userCanPlay()) {
                template = res.data.winner ? 'won' : 'lost';
            }
            this.sandbox.util._.delay(this.sandbox.util._.bind(function () {
                this.render(template);
            }, this), parseInt(this.options.delay, 10) || 0);
        }, this));
    }
});