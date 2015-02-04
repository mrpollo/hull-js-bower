this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["registration/form/complete"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, self=this;

function program1(depth0,data) {
  
  
  return "\n    <button class=\"btn\" data-hull-action=\"edit\">Edit my Profile</button>\n  ";
  }

  buffer += "<div class=\"hull-registration hull-registration--complete\">\n  <p>Registration complete... thanks </p>\n  ";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.options)),stack1 == null || stack1 === false ? stack1 : stack1.editable), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n</div>\n";
  return buffer;
  };
Hull.templates._default["registration/form/form"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, functionType="function", escapeExpression=this.escapeExpression, self=this, helperMissing=helpers.helperMissing, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n        <div class=\"hull-form-field hull-form-field--";
  if (helper = helpers.type) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.type); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + " ";
  options={hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data}
  if (helper = helpers.required) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.required); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.required) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\">\n          ";
  stack1 = (helper = helpers.ifEqual || (depth0 && depth0.ifEqual),options={hash:{},inverse:self.noop,fn:self.program(4, program4, data),data:data},helper ? helper.call(depth0, (depth0 && depth0.type), "text", options) : helperMissing.call(depth0, "ifEqual", (depth0 && depth0.type), "text", options));
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n          ";
  stack1 = (helper = helpers.ifEqual || (depth0 && depth0.ifEqual),options={hash:{},inverse:self.noop,fn:self.program(11, program11, data),data:data},helper ? helper.call(depth0, (depth0 && depth0.type), "email", options) : helperMissing.call(depth0, "ifEqual", (depth0 && depth0.type), "email", options));
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n          ";
  stack1 = (helper = helpers.ifEqual || (depth0 && depth0.ifEqual),options={hash:{},inverse:self.noop,fn:self.program(11, program11, data),data:data},helper ? helper.call(depth0, (depth0 && depth0.type), "url", options) : helperMissing.call(depth0, "ifEqual", (depth0 && depth0.type), "url", options));
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n          ";
  stack1 = (helper = helpers.ifEqual || (depth0 && depth0.ifEqual),options={hash:{},inverse:self.noop,fn:self.program(11, program11, data),data:data},helper ? helper.call(depth0, (depth0 && depth0.type), "tel", options) : helperMissing.call(depth0, "ifEqual", (depth0 && depth0.type), "tel", options));
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n          ";
  stack1 = (helper = helpers.ifEqual || (depth0 && depth0.ifEqual),options={hash:{},inverse:self.noop,fn:self.program(13, program13, data),data:data},helper ? helper.call(depth0, (depth0 && depth0.type), "select", options) : helperMissing.call(depth0, "ifEqual", (depth0 && depth0.type), "select", options));
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n          ";
  stack1 = (helper = helpers.ifEqual || (depth0 && depth0.ifEqual),options={hash:{},inverse:self.noop,fn:self.program(17, program17, data),data:data},helper ? helper.call(depth0, (depth0 && depth0.type), "checkbox", options) : helperMissing.call(depth0, "ifEqual", (depth0 && depth0.type), "checkbox", options));
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n          <p data-hull-error=\"";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" class=\"hull-form-field-error\"></p>\n        </div>\n\n      ";
  return buffer;
  }
function program2(depth0,data) {
  
  
  return "required";
  }

function program4(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n            <label for=\"hull-form-";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">";
  if (helper = helpers.label) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.label); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</label>\n            <input\n              type=\"";
  if (helper = helpers.type) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.type); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"\n              id=\"hull-form-";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"\n              name=\"";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"\n              value=\"";
  if (helper = helpers.value) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.value); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"\n              placeholder=\"";
  if (helper = helpers.placeholder) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.placeholder); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"\n              ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.autocomplete), {hash:{},inverse:self.noop,fn:self.program(5, program5, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n              ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.pattern), {hash:{},inverse:self.noop,fn:self.program(7, program7, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n              ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.required), {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n              ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.error), {hash:{},inverse:self.noop,fn:self.program(9, program9, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n            />\n          ";
  return buffer;
  }
function program5(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "autocomplete=\"";
  if (helper = helpers.autocomplete) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.autocomplete); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"";
  return buffer;
  }

function program7(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "pattern=\"";
  if (helper = helpers.pattern) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.pattern); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"";
  return buffer;
  }

function program9(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "data-error-message=\"";
  if (helper = helpers.error) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.error); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"";
  return buffer;
  }

function program11(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n            <label for=\"hull-form-";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">";
  if (helper = helpers.label) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.label); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</label>\n            <input\n              type=\"";
  if (helper = helpers.type) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.type); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"\n              id=\"hull-form-";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"\n              data-hull-input=\"";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"\n              name=\"";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"\n              value=\"";
  if (helper = helpers.value) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.value); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"\n              placeholder=\"";
  if (helper = helpers.placeholder) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.placeholder); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"\n              ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.autocomplete), {hash:{},inverse:self.noop,fn:self.program(5, program5, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n              ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.pattern), {hash:{},inverse:self.noop,fn:self.program(7, program7, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n              ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.required), {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n              ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.error), {hash:{},inverse:self.noop,fn:self.program(9, program9, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n            />\n          ";
  return buffer;
  }

function program13(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n            <label for=\"hull-form-";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">";
  if (helper = helpers.label) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.label); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</label>\n            <select\n            type=\"";
  if (helper = helpers.type) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.type); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"\n            id=\"hull-form-";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"\n            data-hull-input=\"";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"\n            name=\"";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"\n            ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.autocomplete), {hash:{},inverse:self.noop,fn:self.program(5, program5, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n            ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.pattern), {hash:{},inverse:self.noop,fn:self.program(7, program7, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n            ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.required), {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n            ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.error), {hash:{},inverse:self.noop,fn:self.program(9, program9, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += ">\n              ";
  options={hash:{},inverse:self.noop,fn:self.programWithDepth(14, program14, data, depth0),data:data}
  if (helper = helpers.options) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.options); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.options) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.programWithDepth(14, program14, data, depth0),data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n            </select>\n          ";
  return buffer;
  }
function program14(depth0,data,depth1) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n                <option\n                  label=\"";
  if (helper = helpers.label) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.label); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"\n                  value=\"";
  if (helper = helpers.value) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.value); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"\n                  ";
  stack1 = (helper = helpers.ifEqual || (depth1 && depth1.ifEqual),options={hash:{},inverse:self.noop,fn:self.program(15, program15, data),data:data},helper ? helper.call(depth0, (depth1 && depth1.value), (depth0 && depth0.value), options) : helperMissing.call(depth0, "ifEqual", (depth1 && depth1.value), (depth0 && depth0.value), options));
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n                >";
  if (helper = helpers.value) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.value); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</option>\n              ";
  return buffer;
  }
function program15(depth0,data) {
  
  
  return "selected";
  }

function program17(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n            <input\n              type=\"";
  if (helper = helpers.type) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.type); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"\n              id=\"hull-form-";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"\n              data-hull-input=\"";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"\n              name=\"";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"\n              ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.value), {hash:{},inverse:self.noop,fn:self.program(18, program18, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n              placeholder=\"";
  if (helper = helpers.placeholder) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.placeholder); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"\n              ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.autocomplete), {hash:{},inverse:self.noop,fn:self.program(5, program5, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n              ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.pattern), {hash:{},inverse:self.noop,fn:self.program(7, program7, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n              ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.required), {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n              ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.error), {hash:{},inverse:self.noop,fn:self.program(9, program9, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n            />\n          <label for=\"hull-form-";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">";
  if (helper = helpers.label) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.label); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + " </label>\n          ";
  return buffer;
  }
function program18(depth0,data) {
  
  
  return "checked";
  }

  buffer += "<div class=\"hull-registration\">\n  <form id=\"";
  if (helper = helpers.formId) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.formId); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">\n    <fieldset>\n      ";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.fields), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n      <input type=\"submit\" data-hull-action=\"submit\" class=\"btn btn-primary\" value=\"Register\" />\n    </fieldset>\n  </form>\n</div>\n";
  return buffer;
  } ; 

Hull.component('registration/form@hull', {
    type: 'Hull',
    templates: [
        'form',
        'complete'
    ],
    refreshEvents: ['model.hull.me.change'],
    require: ['h5f'],
    complete: false,
    options: { editable: false },
    defaultFields: [
        {
            type: 'text',
            name: 'name',
            label: 'Name',
            value: '',
            required: true,
            error: 'Please enter your name',
            placeholder: 'bob'
        },
        {
            type: 'email',
            name: 'email',
            label: 'Email',
            value: '',
            required: true,
            error: 'Invalid Email',
            placeholder: 'you@awesome.com'
        }
    ],
    datasources: {
        fields: function () {
            var extra = this.sandbox.data.api.model('app').get('extra');
            return extra.profile_fields || this.defaultFields;
        }
    },
    initialize: function (options, callback) {
        this.formId = 'form_' + new Date().getTime();
        var _ = this.sandbox.util._;
        _.bindAll.apply(undefined, [this].concat(_.functions(this)));
    },
    validate: function () {
        this._ensureFormEl();
        var isValid = this.formEl.checkValidity();
        if (isValid)
            return isValid;
        this.$el.find('[data-hull-input]').each(function (key, el) {
            var $el = $(el), id = $el.attr('id');
            var errorMsg = $el.siblings('[data-hull-error]');
            errorMsg.text(el.checkValidity() ? '' : $el.data('errorMessage'));
        });
        return false;
    },
    register: function (profile) {
        var self = this;
        me = this.sandbox.data.api.model('me');
        if (this.loggedIn()) {
            this.api('me/profile', 'put', profile, function (newProfile) {
                me.set('profile', newProfile);
                self.render();
            });
        }
    },
    beforeRender: function (data) {
        data.formId = this.formId;
        var fields = this.sandbox.util._.map(data.fields, function (f) {
                f.value = this._findFieldValue(f.name);
                return f;
            }, this);
        var profile = data.me.profile || {};
        var isComplete = this.sandbox.util._.every(fields, function (f) {
                var profileField = profile[f.name];
                if (f.type === 'checkbox') {
                    return profileField == f.value;
                } else {
                    return !!profileField && profileField === f.value;
                }
            });
        this.template = isComplete ? 'complete' : 'form';
        this.fields = fields;
    },
    afterRender: function () {
        if (this.template === 'form') {
            this._ensureFormEl();
            H5F.setup(this.formEl, {
                validClass: 'hull-form__input--valid',
                invalidClass: 'hull-form__input--invalid',
                requiredClass: 'hull-form__input--required',
                placeholderClass: 'hull-form__input--placeholder'
            });
        }
    },
    actions: {
        edit: function (e) {
            e.preventDefault();
            e.stopPropagation();
            this.render('form');
            return false;
        },
        submit: function (e, opts) {
            e && e.preventDefault();
            if (!this.validate()) {
                e && e.stopPropagation();
                e && e.stopImmediatePropagation();
                return false;
            }
            var fields = this.sandbox.util._.clone(this.fields), extra = {}, el = this.$el;
            this.sandbox.util._.each(fields, function (field) {
                if (field.type == 'checkbox') {
                    extra[field.name] = el.find('#hull-form-' + field.name).is(':checked');
                } else {
                    extra[field.name] = el.find('#hull-form-' + field.name).val();
                }
            });
            this.register(extra);
        }
    },
    _findFieldValue: function (name) {
        var me = this.data.me.toJSON() || {};
        var identities = this.sandbox.util._.reduce(me.identities, this.sandbox.util._.bind(function (memo, i) {
                return this.sandbox.util._.extend(memo, i);
            }, this), {});
        me.profile = me.profile || {};
        identities = identities || {};
        return me.profile[name] || me[name] || identities[name];
    },
    _ensureFormEl: function () {
        this.formEl = this.formEl || document.getElementById(this.formId);
    }
});