this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["admin/registration/registration"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, options, functionType="function", escapeExpression=this.escapeExpression, self=this, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n  <div class=\"well\">\n    <h2>Registration form for <strong>"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.app)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</strong></h2>  \n    <form class=\"form-inline\">\n      <fieldset>\n        <textarea data-hull-field=\"fields\" class=\"input-block-level\" rows=\"15\" placeholder=\"Enter your JSON here\"></textarea>\n        <div class=\"form-actions\">\n          <button data-hull-action=\"update\" class=\"btn btn-primary\">Submit</button>\n        </div>\n      </fieldset>\n    </form>\n  </div>\n";
  return buffer;
  }

function program3(depth0,data) {
  
  
  return "\n  You need to be an administrator of the current app to view this component\n";
  }

  options={hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data}
  if (helper = helpers.isAdmin) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.isAdmin); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.isAdmin) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  options={hash:{},inverse:self.program(3, program3, data),fn:self.noop,data:data}
  if (helper = helpers.isAdmin) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.isAdmin); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.isAdmin) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.program(3, program3, data),fn:self.noop,data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n\n";
  return buffer;
  } ; 

Hull.component('admin/registration@hull', {
    type: 'Hull',
    templates: ['registration'],
    datasources: {
        fields: function () {
            var extra = this.api.model('app').get('extra');
            return extra.profile_fields || {};
        }
    },
    afterRender: function (data) {
        this.$fieldsJSON = this.$('[data-hull-field="fields"]');
        this.$fieldsJSON.val(JSON.stringify(data.fields, null, 2));
    },
    actions: {
        update: function (e) {
            e.preventDefault();
            var data = { extra: { profile_fields: this.parseJSON(this.$fieldsJSON.val()) } };
            this.update(data);
        }
    },
    update: function (data) {
        this.api('app', 'put', data).done(function () {
            alert('Your fields have been saved');
        }).fail(function () {
            alert('Something went wrong, check that you\'re logged in correctly');
        });
    },
    parseJSON: function (json) {
        try {
            return $.parseJSON(json);
        } catch (err) {
            alert('JSON is not valid');
        }
    }
});