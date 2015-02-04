this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["games/quiz/answer"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<strong>";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</strong>\n<span>";
  if (helper = helpers.description) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.description); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</span>\n";
  return buffer;
  };
Hull.templates._default["games/quiz/finished"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div class=\"hull-quiz hull-quiz--finished\">\n  <div class=\"page-header\">\n    <h1>Congratulations. <small>You have finished the  quiz!</small></h1>\n  </div>\n\n    <ul class=\"pager\">\n    <li>\n      <a href=\"#\" data-hull-action=\"submit\">Submit</a>\n    </li>\n  </ul>\n</div>\n";
  };
Hull.templates._default["games/quiz/intro"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  
  return "\n    <button data-hull-action=\"start\" class=\"btn btn-large btn-primary\">Start</button>\n  ";
  }

function program3(depth0,data) {
  
  
  return "\n      <div data-hull-component=\"login/profile@hull\"></div>\n  ";
  }

  buffer += "<div class=\"hull-quiz hull-quiz--intro\">\n  <div class=\"page-header\">\n    <h1>"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.quiz)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</h1>\n    <p class=\"lead\">"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.quiz)),stack1 == null || stack1 === false ? stack1 : stack1.description)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</p>\n  </div>\n\n  ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.loggedIn), {hash:{},inverse:self.program(3, program3, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n</div>\n";
  return buffer;
  };
Hull.templates._default["games/quiz/question"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); partials = this.merge(partials, Handlebars.partials); data = data || {};
  var buffer = "", stack1, helper, options, functionType="function", escapeExpression=this.escapeExpression, self=this, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n        ";
  options={hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data}
  if (helper = helpers.question) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.question); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.question) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n      <ul class=\"pager\">\n        ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.previous), {hash:{},inverse:self.noop,fn:self.program(5, program5, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n        ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.next), {hash:{},inverse:self.program(9, program9, data),fn:self.program(7, program7, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      </ul>\n\n    ";
  return buffer;
  }
function program2(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n          <h3>";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</h3>\n          <p>";
  if (helper = helpers.description) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.description); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</p>\n          <ol>\n              ";
  options={hash:{},inverse:self.noop,fn:self.programWithDepth(3, program3, data, depth0),data:data}
  if (helper = helpers.answers) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.answers); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.answers) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.programWithDepth(3, program3, data, depth0),data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n          </ol>\n        ";
  return buffer;
  }
function program3(depth0,data,depth1) {
  
  var buffer = "", stack1, helper;
  buffer += "\n              <li>\n                <div data-hull-action=\"answerAndNext\"\n                    data-hull-answer-ref=\"";
  if (helper = helpers.ref) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.ref); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"\n                    data-hull-question-ref=\""
    + escapeExpression(((stack1 = (depth1 && depth1.ref)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" class=\"btn\">\n                ";
  stack1 = self.invokePartial(partials['games/quiz/answer'], 'games/quiz/answer', depth0, helpers, partials, data);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n                </div>\n              </li>\n              ";
  return buffer;
  }

function program5(depth0,data) {
  
  
  return "\n          <li>\n            <a href=\"#\" data-hull-action=\"previous\">Previous</a>\n          </li>\n        ";
  }

function program7(depth0,data) {
  
  
  return "\n          <li>\n            <a href=\"#\" data-hull-action=\"next\">Next</a>\n          </li>\n        ";
  }

function program9(depth0,data) {
  
  
  return "\n          <li>\n            <a href=\"#\" data-hull-action=\"submit\">Submit</a>\n          </li>\n        ";
  }

  buffer += "<div class=\"hull-quiz hull-quiz__question\">\n  <div class=\"page-header\">\n    <h1>"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.quiz)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</h1>\n    <p class=\"lead\">"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.quiz)),stack1 == null || stack1 === false ? stack1 : stack1.description)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</p>\n  </div>\n\n  <div class=\"hull-quiz__question--"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.current)),stack1 == null || stack1 === false ? stack1 : stack1.index)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">\n    <h5>\n      Question "
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.current)),stack1 == null || stack1 === false ? stack1 : stack1.indexDisplayable)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " <span class=\"muted\">of "
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = (depth0 && depth0.quiz)),stack1 == null || stack1 === false ? stack1 : stack1.questions)),stack1 == null || stack1 === false ? stack1 : stack1.length)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</span>\n    </h5>\n\n    ";
  options={hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data}
  if (helper = helpers.current) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.current); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.current) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n  </div>\n</div>\n";
  return buffer;
  };
Hull.templates._default["games/quiz/result"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n    <h4>You Have <strong>";
  if (helper = helpers.score) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.score); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</strong> points !</h4>\n    <p>It took <strong>";
  if (helper = helpers.timing) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.timing); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</strong> seconds to answer !</p>\n  ";
  return buffer;
  }

  buffer += "<div class=\"hull-quiz hull-quiz--result\">\n  <div class=\"page-header\">\n    <h1>Congratulations</h1>\n  </div>\n\n  ";
  stack1 = ((stack1 = ((stack1 = ((stack1 = (depth0 && depth0.badge)),stack1 == null || stack1 === false ? stack1 : stack1.data)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1)),blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data}));
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n  <button class=\"btn\" data-hull-action=\"share\" data-hull-provider=\"twitter\" data-hull-text=\"I just scored "
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = (depth0 && depth0.result)),stack1 == null || stack1 === false ? stack1 : stack1.data)),stack1 == null || stack1 === false ? stack1 : stack1.score)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " in "
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = (depth0 && depth0.result)),stack1 == null || stack1 === false ? stack1 : stack1.data)),stack1 == null || stack1 === false ? stack1 : stack1.timing)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " sec on Quiz: "
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.result)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + ". Can you beat me?\">Share your score on Twitter</button>\n  &nbsp;&nbsp;&nbsp;<small>or</small>\n  <button class=\"btn btn-link\" data-hull-action=\"start\">Try again</button>\n\n</div>\n";
  return buffer;
  } ; 

Hull.component('games/quiz@hull', {
    requiredOptions: ['id'],
    templates: [
        'intro',
        'question',
        'answer',
        'finished',
        'result'
    ],
    answers: {},
    datasources: {
        quiz: function () {
            return this.quiz || this.sandbox.data.api(this.id);
        },
        badge: function () {
            return this.badge || this.api('me/badges/' + this.id);
        }
    },
    trackingData: function () {
        var data = { type: 'quiz' };
        var quiz = this.data.quiz;
        if (quiz && quiz.get) {
            data.name = quiz.get('name');
        }
        return data;
    },
    initialize: function () {
        this.sandbox.on('hull.model.' + this.id + '.change', function () {
            this.render();
        }.bind(this));
        this.sandbox.on('model.hull.me.change', function () {
            if (this.loggedIn()) {
                this.actions.start.apply(this);
            }
        }.bind(this));
        this.currentQuestionIndex = 0;
        this.answers = {};
    },
    beforeRender: function (data) {
        this.quiz = data.quiz;
        this.badge = data.badge || {};
        if (!this.isInitialized) {
            this.track('hull.quiz.init');
        }
        if (!data.me || data.me.id != this.currentUserId) {
            this.template = 'intro';
            this.reset();
            return data;
        }
        data.result = this.getResult(data);
        if (this.started) {
            data.questions = this.getQuestions(data);
            data.current = this.getCurrent(data);
        }
        return data;
    },
    afterRender: function (data) {
        this.sandbox.emit('hull.quiz.' + this.id, data);
    },
    startQuiz: function () {
        this.reset();
        this.startedAt = new Date();
        this.started = true;
        this.render('question');
    },
    reset: function () {
        this.quiz = null;
        this.badge = null;
        this.started = false;
        this.submitted = false;
        this.answers = {};
        this.currentQuestionIndex = 0;
        this.currentUserId = this.api.model('me').id;
    },
    getTemplate: function (tpl, data) {
        if (tpl) {
            return tpl;
        }
        if (!this.loggedIn()) {
            return 'intro';
        } else if (this.submitted && data.badge && data.badge.id) {
            return 'result';
        } else if (data.current) {
            if (data.current.question) {
                return 'question';
            } else {
                return 'finished';
            }
        } else if (data.badge) {
            return 'result';
        }
        return 'intro';
    },
    getCurrent: function (data) {
        this.currentQuestion = data.questions[this.currentQuestionIndex];
        return {
            index: this.currentQuestionIndex,
            indexDisplayable: this.currentQuestionIndex + 1,
            question: this.currentQuestion,
            next: data.questions[this.currentQuestionIndex + 1],
            previous: data.questions[this.currentQuestionIndex - 1]
        };
    },
    getQuestions: function (data) {
        return data.quiz.questions;
    },
    getResult: function (data) {
        return data.badge;
    },
    actions: {
        login: function (e, params) {
            this.sandbox.login(params.data.provider, params.data).then(this.startQuiz.bind(this));
        },
        answer: function (e, params) {
            var opts = params.data;
            this.answers[opts.questionRef] = opts.answerRef;
            this.data.quiz.answers = this.answers;
            this.track('hull.quiz.progress', {
                quizId: this.id,
                questionRef: opts.questionRef,
                answerRef: opts.answerRef,
                questionIndex: this.currentQuestionIndex,
                questionsCount: this.data.quiz.questions.length
            });
        },
        answerAndNext: function () {
            this.actions.answer.apply(this, arguments);
            this.actions.next.apply(this);
        },
        start: function () {
            this.track('hull.quiz.start', { quizId: this.id });
            this.startQuiz();
        },
        next: function () {
            this.currentQuestionIndex += 1;
            this.render();
            return false;
        },
        previous: function () {
            if (this.currentQuestionIndex > 0) {
                this.currentQuestionIndex -= 1;
                this.render('question');
            }
            return false;
        },
        submit: function () {
            this.track('hull.quiz.submit', { quizId: this.id });
            var timing = 0;
            if (this.startedAt) {
                timing = (new Date() - this.startedAt) / 1000;
            }
            var res = this.api(this.id + '/achieve', 'post', {
                    answers: this.answers,
                    timing: timing
                });
            var self = this;
            res.done(function (badge) {
                if (badge) {
                    self.submitted = true;
                    self.badge = badge;
                    self.render('result');
                    self.track('hull.quiz.finish', {
                        quizId: this.id,
                        score: badge.data.score,
                        timing: badge.data.timing
                    });
                }
            });
            return false;
        },
        share: function (e, params) {
            var data = params.data;
            var currentUrl = document.URL, text = data.text;
            switch (data.provider) {
            case 'facebook':
                break;
            case 'twitter':
                window.open('https://twitter.com/share?url=' + currentUrl + '&text=' + text);
                break;
            }
        }
    }
});