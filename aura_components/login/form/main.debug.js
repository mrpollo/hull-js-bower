this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["login/form/form"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n  ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.validationErrors), {hash:{},inverse:self.program(10, program10, data),fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  }
function program2(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n    <h4>Validation Errors</h4>\n    <form class=\"form-validations\">\n\n    ";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.validationErrors)),stack1 == null || stack1 === false ? stack1 : stack1.email), {hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    ";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.validationErrors)),stack1 == null || stack1 === false ? stack1 : stack1.username), {hash:{},inverse:self.noop,fn:self.program(8, program8, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        <button class=\"btn btn-lg btn-primary btn-block\" type=\"submit\">Complete my profile</button>\n    </form>\n  ";
  return buffer;
  }
function program3(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n      ";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.currentUser)),stack1 == null || stack1 === false ? stack1 : stack1.email), {hash:{},inverse:self.program(6, program6, data),fn:self.program(4, program4, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    ";
  return buffer;
  }
function program4(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n      A confirmation email has been sent to "
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.currentUser)),stack1 == null || stack1 === false ? stack1 : stack1.email)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "...\n      <a class=\"btn btn-link\" data-hull-action='resetPassword'>Oops... Looks like i did not get it, please send me another one...</a>\n      <a class=\"btn btn-link\" data-hull-action='resendConfirmation'>Can you please send me my confirmation email again ?</a>\n      ";
  return buffer;
  }

function program6(depth0,data) {
  
  
  return "\n        <h2 class=\"form-signin-heading\">Please set your email to complete your registration</h2>\n        <input name=\"email\" type=\"email\" class=\"form-control\" placeholder=\"Email\" required autofocus>\n      ";
  }

function program8(depth0,data) {
  
  
  return "\n        <h2 class=\"form-signin-heading\">Please set your username to complete your registration</h2>\n        <input name=\"username\" type=\"text\" class=\"form-control\" placeholder=\"Username\" required autofocus>\n    ";
  }

function program10(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n  Hey "
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.currentUser)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + ", you can <a class='btn-link' data-hull-action='logout'>Logout</a> now...\n  ";
  return buffer;
  }

function program12(depth0,data) {
  
  
  return "\n<form class=\"form-signin\" role=\"form\">\n  <h2 class=\"form-signin-heading\">Please sign in</h2>\n  <input data-hull-input-login name=\"login\" type=\"text\" class=\"form-control\" placeholder=\"Username or Email\" required autofocus>\n  <input name=\"password\" type=\"password\" class=\"form-control\" placeholder=\"Password\" required>\n  <button class=\"btn btn-lg btn-primary btn-block\" type=\"submit\">Sign in</button>\n  <div>\n    <a class=\"btn btn-link\"  data-hull-action='resetPassword'>Oops... I think i forgot my password</a>\n    <a class=\"btn btn-link\" data-hull-action='resendConfirmation'>Can you please send me my confirmation email again ?</a>\n  </div>\n</form>\n<div data-hull-component=\"login/button@hull\"></div>\n";
  }

  buffer += "<div class=\"alert\" data-hull-alert-message style=\"display:none\"></div>\n";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.loggedIn), {hash:{},inverse:self.program(12, program12, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  } ; 

Hull.component('login/form@hull', {
    templates: ['form'],
    refreshEvents: ['model.hull.me.change'],
    events: {
        'keyup input': function () {
            this.alertMessage(false);
        },
        'submit .form-signin': function (e) {
            e.preventDefault();
            this.alertMessage(false);
            var signinData = this.sandbox.dom.getFormData(e.target);
            this.sandbox.login(signinData.login, signinData.password);
        },
        'submit .form-validations': function (e) {
            e.preventDefault();
            var self = this;
            var signinData = this.sandbox.dom.getFormData(e.target);
            this.api('me', signinData, 'put').then(function () {
                self.render();
            }, function (err) {
                self.alertMessage(err.message);
            });
        }
    },
    actions: {
        resetPassword: function () {
            var $inputLogin = this.$('[data-hull-input-login]');
            var email = $inputLogin.val();
            this.requestEmail(email, 'request_password_reset');
        },
        resendConfirmation: function () {
            var $inputLogin = this.$('[data-hull-input-login]');
            var email;
            if (Hull.currentUser()) {
                email = Hull.currentUser().email;
            } else {
                email = $inputLogin.val();
            }
            this.requestEmail(email, 'request_confirmation_email');
        }
    },
    datasources: {
        validationStatus: function () {
            return this.loggedIn() && this.api('me/validation_status');
        },
        currentUser: 'me'
    },
    initialize: function () {
        this.sandbox.on('hull.auth.fail', function (err) {
            this.alertMessage(err.message || err.reason);
        }, this);
    },
    requestEmail: function (email, type) {
        var self = this;
        if (/^\S+@\S+\.\S+$/i.test(email)) {
            this.api('users/' + type, 'post', { email: email }).then(function (res) {
                self.alertMessage('Email sent to ' + email + '. Check your inbox !');
            }, function (err) {
                if (err.status == 429 && err.retry_after) {
                    var minutes = Math.round(err.retry_after / 60);
                    self.alertMessage('An email has already been sent to ' + email + '. Please check your inbox. You will be able to retry in ' + minutes + ' minutes (' + err.retry_after + ' seconds)');
                }
            });
        } else {
            this.alertMessage('You must provide a valid email: ' + email);
        }
    },
    beforeRender: function (data) {
        if (data.validationStatus && !data.validationStatus.valid && data.validationStatus.validations) {
            data.validationErrors = {};
            for (var key in data.validationStatus.validations) {
                if (!data.validationStatus.validations[key]) {
                    data.validationErrors[key] = true;
                }
            }
        }
    },
    alertMessage: function (message) {
        var $alertMsg = this.$('[data-hull-alert-message]');
        if (message) {
            $alertMsg.html(message);
            $alertMsg.show();
        } else {
            $alertMsg.hide();
        }
    }
});