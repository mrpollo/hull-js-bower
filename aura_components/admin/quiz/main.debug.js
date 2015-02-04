this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["admin/quiz/admin"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); partials = this.merge(partials, Handlebars.partials); data = data || {};
  var buffer = "", stack1, helper, options, functionType="function", escapeExpression=this.escapeExpression, self=this, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n        <li data-hull-action=\"selectQuiz\" data-hull-quiz-id=\"";
  if (helper = helpers.id) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.id); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"><a href=\"#\">";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</a></li>\n      ";
  return buffer;
  }

function program3(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n      ";
  stack1 = self.invokePartial(partials['admin/quiz/form'], 'admin/quiz/form', depth0, helpers, partials, data);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    ";
  return buffer;
  }

function program5(depth0,data) {
  
  
  return "\n      <h2 class=\"well\">Select a quiz to start playing...</h2>\n    ";
  }

  buffer += "<div class=\"row\">\n  <div class=\"span4\">\n    <h4>Available Quizzes</h4>\n    <ul class=\"nav nav-pills nav-stacked\">\n      ";
  options={hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data}
  if (helper = helpers.achievements) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.achievements); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.achievements) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    </ul>\n\n    <button data-hull-action=\"selectQuiz\" class=\"btn\">Create a new Quiz</button>\n  </div>\n\n  <div class=\"span8\">\n    ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.quiz), {hash:{},inverse:self.program(5, program5, data),fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n  </div>\n</div>\n";
  return buffer;
  };
Hull.templates._default["admin/quiz/form"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, options, functionType="function", escapeExpression=this.escapeExpression, self=this, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n<h6>Embed code</h6>\n<pre class=\"code\">";
  if (helper = helpers.embedCode) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.embedCode); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</pre>\n";
  return buffer;
  }

function program3(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n<form class=\"form js-hull-quiz-form\">\n  <fieldset>\n    <input type=\"text\" class=\"input-block-level\" name=\"name\" value=\"";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" placeholder=\"Name\" required=\"true\">\n    <textarea class=\"input-block-level\" name=\"description\" placeholder=\"Description\">";
  if (helper = helpers.description) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.description); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</textarea>\n  </fieldset>\n\n  <ul class=\"unstyled\">\n  ";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.questions), {hash:{},inverse:self.noop,fn:self.program(4, program4, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n</ul>\n\n<hr />\n\n<a data-hull-action=\"addQuestion\" class=\"btn\">\n  <i class=\"icon-plus\"></i>\n  Add a Question\n</a>\n\n<hr />\n\n<input type=\"submit\" value=\"";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.isNew), {hash:{},inverse:self.program(9, program9, data),fn:self.program(7, program7, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\" class=\"btn btn-primary btn-block\" />\n\n</form>\n";
  return buffer;
  }
function program4(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n  <li>\n    <hr />\n\n    <h3>\n      <span class=\"pull-right\">\n        <a class=\"btn btn-danger\" data-hull-action=\"deleteQuestion\" data-hull-question-index=\""
    + escapeExpression(((stack1 = (data == null || data === false ? data : data.index)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">\n          <i class=\"icon-trash\"></i>\n          Delete\n        </a>\n      </span>\n\n      Question "
    + escapeExpression(((stack1 = (data == null || data === false ? data : data.index)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\n    </h3>\n\n    <input type=\"text\" class=\"input-block-level\" name=\"questions["
    + escapeExpression(((stack1 = (data == null || data === false ? data : data.index)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "][ref]\" value=\"";
  if (helper = helpers.ref) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.ref); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" placeholder=\"Ref\" required=\"true\">\n    <input type=\"text\" class=\"input-block-level\" name=\"questions["
    + escapeExpression(((stack1 = (data == null || data === false ? data : data.index)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "][name]\" value=\"";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" placeholder=\"Type a Question...\" required=\"true\">\n\n    <textarea type=\"text\" class=\"input-block-level\" name=\"questions["
    + escapeExpression(((stack1 = (data == null || data === false ? data : data.index)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "][description]\">";
  if (helper = helpers.description) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.description); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</textarea>\n    <h5>Answers</h5>\n\n    <ul class=\"unstyled\">\n    ";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.answers), {hash:{},inverse:self.noop,fn:self.program(5, program5, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      <li>\n        <a data-hull-action=\"addAnswer\" data-hull-question-index=\""
    + escapeExpression(((stack1 = (data == null || data === false ? data : data.index)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" class=\"btn\">\n          <i class=\"icon-plus\"></i>\n          Add a Answer\n        </a>\n      </li>\n    </ul>\n  </li>\n  ";
  return buffer;
  }
function program5(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n      <li>\n        <input type=\"hidden\" name=\"questions[";
  if (helper = helpers.questionIndex) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.questionIndex); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "][answers]["
    + escapeExpression(((stack1 = (data == null || data === false ? data : data.index)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "][questionIndex]\" value=\"";
  if (helper = helpers.questionIndex) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.questionIndex); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">\n\n        <input type=\"text\" class=\"input-small\" name=\"questions[";
  if (helper = helpers.questionIndex) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.questionIndex); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "][answers]["
    + escapeExpression(((stack1 = (data == null || data === false ? data : data.index)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "][ref]\" value=\"";
  if (helper = helpers.ref) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.ref); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" placeholder=\"Ref\" required=\"true\">\n        <input type=\"text\" class=\"input-large\" name=\"questions[";
  if (helper = helpers.questionIndex) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.questionIndex); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "][answers]["
    + escapeExpression(((stack1 = (data == null || data === false ? data : data.index)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "][name]\" value=\"";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" placeholder=\"Type an Answer...\" required=\"true\">\n        <input type=\"text\" class=\"input-small\" name=\"questions[";
  if (helper = helpers.questionIndex) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.questionIndex); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "][answers]["
    + escapeExpression(((stack1 = (data == null || data === false ? data : data.index)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "][weight]\" value=\"";
  if (helper = helpers.weight) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.weight); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" placeholder=\"Weight\" required=\"true\" pattern=\"\\d*\">\n      </li>\n    ";
  return buffer;
  }

function program7(depth0,data) {
  
  
  return "Create";
  }

function program9(depth0,data) {
  
  
  return "Update";
  }

  buffer += "<h2>"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.quiz)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</h2>\n\n";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.embedCode), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n";
  options={hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data}
  if (helper = helpers.quiz) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.quiz); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.quiz) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  } ; 

Hull.component('admin/quiz@hull', {
    templates: [
        'admin',
        'form'
    ],
    datasources: {
        achievements: {
            path: 'app/achievements',
            params: { where: { _type: 'Quiz' } }
        }
    },
    require: ['backbone'],
    events: { 'submit form': 'submitQuiz' },
    actions: {
        selectQuiz: function (event, action) {
            var Model = this.require('backbone').Model;
            var quiz;
            if (action.data.quizId != null) {
                quiz = this.data.achievements.get(action.data.quizId);
            } else {
                quiz = new Model();
            }
            if (this.currentQuiz) {
                this.stopListening(this.currentQuiz);
            }
            if (quiz) {
                this.currentQuiz = quiz;
                var self = this;
                this.listenTo(this.currentQuiz, 'change', function () {
                    self.render();
                });
                this.render();
            }
        },
        addQuestion: function () {
            this.changeForm();
            var questions = this.currentQuiz.get('questions') || [];
            questions.push(this.generateQuestion());
            this.currentQuiz.set('questions', questions);
            this.currentQuiz.trigger('change');
        },
        addAnswer: function (event, action) {
            this.changeForm();
            var question = this.currentQuiz.get('questions')[action.data.questionIndex];
            question.answers = question.answers || [];
            question.answers.push(this.generateAnswer(action.data.questionIndex));
            this.currentQuiz.trigger('change');
        },
        deleteQuestion: function (event, action) {
            var questions = this.sandbox.util._.reject(this.currentQuiz.get('questions'), function (q, i) {
                    return i == action.data.questionIndex;
                });
            this.currentQuiz.set('questions', questions);
        }
    },
    changeForm: function () {
        var params = this.sandbox.dom.getFormData(this.$form);
        this.currentQuiz.set(params);
        return params;
    },
    submitQuiz: function (e) {
        e.preventDefault();
        var self = this, params = this.changeForm();
        var request;
        if (this.currentQuiz.isNew()) {
            params.type = 'quiz';
            request = this.api('app/achievements', params, 'post');
        } else {
            request = this.api(this.currentQuiz.id, params, 'put');
        }
        request.then(function () {
            self.render();
            alert('Your quiz has been updated.');
        });
    },
    beforeRender: function (data) {
        var _ = this.sandbox.util._;
        if (this.currentQuiz) {
            data.quiz = this.currentQuiz.toJSON();
            _.each(data.quiz.questions, function (q, i) {
                _.each(q.answers, function (a) {
                    a.questionIndex = i;
                });
            });
            data.quiz.isNew = this.currentQuiz.isNew();
            if (!data.quiz.isNew) {
                data.embedCode = '<div data-hull-component="games/quiz@hull" data-hull-id="' + data.quiz.id + '"></div>';
            }
        }
    },
    afterRender: function (data) {
        if (data.quiz && data.quiz.id) {
            this.$find('[data-hull-quiz-id="' + data.quiz.id + '"]').addClass('active');
        }
        this.$form = this.$('.js-hull-quiz-form');
    },
    generateQuestion: function () {
        return { answers: [] };
    },
    generateAnswer: function (index) {
        return { questionIndex: index };
    }
});