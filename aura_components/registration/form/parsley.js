!function(t){"use strict";var e=function(t){this.messages={defaultMessage:"This value seems to be invalid.",type:{email:"This value should be a valid email.",url:"This value should be a valid url.",urlstrict:"This value should be a valid url.",number:"This value should be a valid number.",digits:"This value should be digits.",dateIso:"This value should be a valid date (YYYY-MM-DD).",alphanum:"This value should be alphanumeric.",phone:"This value should be a valid phone number."},notnull:"This value should not be null.",notblank:"This value should not be blank.",required:"This value is required.",regexp:"This value seems to be invalid.",min:"This value should be greater than or equal to %s.",max:"This value should be lower than or equal to %s.",range:"This value should be between %s and %s.",minlength:"This value is too short. It should have %s characters or more.",maxlength:"This value is too long. It should have %s characters or less.",rangelength:"This value length is invalid. It should be between %s and %s characters long.",mincheck:"You must select at least %s choices.",maxcheck:"You must select %s choices or less.",rangecheck:"You must select between %s and %s choices.",equalto:"This value should be the same."},this.init(t)};e.prototype={constructor:e,validators:{notnull:function(){return{validate:function(t){return t.length>0},priority:2}},notblank:function(){return{validate:function(t){return"string"==typeof t&&""!==t.replace(/^\s+/g,"").replace(/\s+$/g,"")},priority:2}},required:function(){var t=this;return{validate:function(e){if("object"==typeof e){for(var i in e)if(t.required().validate(e[i]))return!0;return!1}return t.notnull().validate(e)&&t.notblank().validate(e)},priority:512}},type:function(){return{validate:function(t,e){var i;switch(e){case"number":i=/^-?(?:\d+|\d{1,3}(?:,\d{3})+)?(?:\.\d+)?$/;break;case"digits":i=/^\d+$/;break;case"alphanum":i=/^\w+$/;break;case"email":i=/^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))){2,6}$/i;break;case"url":t=new RegExp("(https?|s?ftp|git)","i").test(t)?t:"http://"+t;case"urlstrict":i=/^(https?|s?ftp|git):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i;break;case"dateIso":i=/^(\d{4})\D?(0[1-9]|1[0-2])\D?([12]\d|0[1-9]|3[01])$/;break;case"phone":i=/^((\+\d{1,3}(-| )?\(?\d\)?(-| )?\d{1,5})|(\(?\d{2,6}\)?))(-| )?(\d{3,4})(-| )?(\d{4})(( x| ext)\d{1,5}){0,1}$/;break;default:return!1}return""!==t?i.test(t):!1},priority:256}},regexp:function(){return{validate:function(t,e,i){return new RegExp(e,i.options.regexpFlag||"").test(t)},priority:64}},minlength:function(){return{validate:function(t,e){return t.length>=e},priority:32}},maxlength:function(){return{validate:function(t,e){return t.length<=e},priority:32}},rangelength:function(){var t=this;return{validate:function(e,i){return t.minlength().validate(e,i[0])&&t.maxlength().validate(e,i[1])},priority:32}},min:function(){return{validate:function(t,e){return Number(t)>=e},priority:32}},max:function(){return{validate:function(t,e){return Number(t)<=e},priority:32}},range:function(){var t=this;return{validate:function(e,i){return t.min().validate(e,i[0])&&t.max().validate(e,i[1])},priority:32}},equalto:function(){return{validate:function(e,i,s){return s.options.validateIfUnchanged=!0,e===t(i).val()},priority:64}},remote:function(){return{validate:function(e,i,s){var n=null,r={},a={};r[s.$element.attr("name")]=e,"undefined"!=typeof s.options.remoteDatatype&&(a={dataType:s.options.remoteDatatype});var o=function(e,i){"undefined"!=typeof i&&"undefined"!=typeof s.Validator.messages.remote&&i!==s.Validator.messages.remote&&t(s.UI.ulError+" .remote").remove(),!1===e?s.options.listeners.onFieldError(s.element,s.constraints,s):!0===e&&!1===s.options.listeners.onFieldSuccess(s.element,s.constraints,s)&&(e=!1),s.updtConstraint({name:"remote",valid:e},i),s.manageValidationResult()},u=function(e){if("object"==typeof e)return e;try{e=t.parseJSON(e)}catch(i){}return e},l=function(t){return"object"==typeof t&&null!==t?"undefined"!=typeof t.error?t.error:"undefined"!=typeof t.message?t.message:null:null};return t.ajax(t.extend({},{url:i,data:r,type:s.options.remoteMethod||"GET",success:function(t){t=u(t),o(1===t||!0===t||"object"==typeof t&&null!==t&&"undefined"!=typeof t.success,l(t))},error:function(t){t=u(t),o(!1,l(t))}},a)),n},priority:64}},mincheck:function(){var t=this;return{validate:function(e,i){return t.minlength().validate(e,i)},priority:32}},maxcheck:function(){var t=this;return{validate:function(e,i){return t.maxlength().validate(e,i)},priority:32}},rangecheck:function(){var t=this;return{validate:function(e,i){return t.rangelength().validate(e,i)},priority:32}}},init:function(t){var e,i=t.validators,s=t.messages;for(e in i)this.addValidator(e,i[e]);for(e in s)this.addMessage(e,s[e])},formatMesssage:function(t,e){if("object"==typeof e){for(var i in e)t=this.formatMesssage(t,e[i]);return t}return"string"==typeof t?t.replace(new RegExp("%s","i"),e):""},addValidator:function(t,e){this.validators[t]=e},addMessage:function(t,e,i){if("undefined"!=typeof i&&!0===i)return void(this.messages.type[t]=e);if("type"!==t)this.messages[t]=e;else for(var s in e)this.messages.type[s]=e[s]}};var i=function(t){this.init(t)};i.prototype={constructor:i,init:function(t){this.ParsleyInstance=t,this.hash=t.hash,this.options=this.ParsleyInstance.options,this.errorClassHandler=this.options.errors.classHandler(this.ParsleyInstance.element,this.ParsleyInstance.isRadioOrCheckbox)||this.ParsleyInstance.$element,this.ulErrorManagement()},ulErrorManagement:function(){this.ulError="#"+this.hash,this.ulTemplate=t(this.options.errors.errorsWrapper).attr("id",this.hash).addClass("parsley-error-list")},removeError:function(e){var i=this.ulError+" ."+e,s=this;this.options.animate?t(i).fadeOut(this.options.animateDuration,function(){t(this).remove(),s.ulError&&0===t(s.ulError).children().length&&s.removeErrors()}):t(i).remove()},addError:function(e){for(var i in e){var s=t(this.options.errors.errorElem).addClass(i);t(this.ulError).append(this.options.animate?t(s).html(e[i]).hide().fadeIn(this.options.animateDuration):t(s).html(e[i]))}},removeErrors:function(){this.options.animate?t(this.ulError).fadeOut(this.options.animateDuration,function(){t(this).remove()}):t(this.ulError).remove()},reset:function(){this.ParsleyInstance.valid=null,this.removeErrors(),this.ParsleyInstance.validatedOnce=!1,this.errorClassHandler.removeClass(this.options.successClass).removeClass(this.options.errorClass);for(var t in this.constraints)this.constraints[t].valid=null;return this},manageError:function(e){if(t(this.ulError).length||this.manageErrorContainer(),!("required"===e.name&&null!==this.ParsleyInstance.getVal()&&this.ParsleyInstance.getVal().length>0)){if(this.ParsleyInstance.isRequired&&"required"!==e.name&&(null===this.ParsleyInstance.getVal()||0===this.ParsleyInstance.getVal().length))return void this.removeError(e.name);var i=e.name,s=!1!==this.options.errorMessage?"custom-error-message":i,n={},r=!1!==this.options.errorMessage?this.options.errorMessage:"type"===e.name?this.ParsleyInstance.Validator.messages[i][e.requirements]:"undefined"==typeof this.ParsleyInstance.Validator.messages[i]?this.ParsleyInstance.Validator.messages.defaultMessage:this.ParsleyInstance.Validator.formatMesssage(this.ParsleyInstance.Validator.messages[i],e.requirements);t(this.ulError+" ."+s).length||(n[s]=r,this.addError(n))}},manageErrorContainer:function(){var e=this.options.errorContainer||this.options.errors.container(this.ParsleyInstance.element,this.ParsleyInstance.isRadioOrCheckbox),i=this.options.animate?this.ulTemplate.css("display",""):this.ulTemplate;return"undefined"!=typeof e?void t(e).append(i):void(this.ParsleyInstance.isRadioOrCheckbox?this.ParsleyInstance.$element.parent().after(i):this.ParsleyInstance.$element.after(i))}};var s=function(t,e,i){return this.options=e,"ParsleyFieldMultiple"===i?this:void this.init(t,i||"ParsleyField")};s.prototype={constructor:s,init:function(s,n){this.type=n,this.valid=!0,this.element=s,this.validatedOnce=!1,this.$element=t(s),this.val=this.$element.val(),this.Validator=new e(this.options),this.isRequired=!1,this.constraints={},"undefined"==typeof this.isRadioOrCheckbox&&(this.isRadioOrCheckbox=!1,this.hash=this.generateHash()),this.UI=new i(this),this.bindHtml5Constraints(),this.addConstraints(),this.hasConstraints()&&this.bindValidationEvents()},setParent:function(e){this.$parent=t(e)},getParent:function(){return this.$parent},bindHtml5Constraints:function(){(this.$element.hasClass("required")||this.$element.prop("required"))&&(this.options.required=!0);var t=this.$element.attr("type");"undefined"!=typeof t&&new RegExp(t,"i").test("email url number range tel")&&(this.options.type="tel"===t?"phone":t,new RegExp(this.options.type,"i").test("number range")&&(this.options.type="number","undefined"!=typeof this.$element.attr("min")&&this.$element.attr("min").length&&(this.options.min=this.$element.attr("min")),"undefined"!=typeof this.$element.attr("max")&&this.$element.attr("max").length&&(this.options.max=this.$element.attr("max")))),"string"==typeof this.$element.attr("pattern")&&this.$element.attr("pattern").length&&(this.options.regexp=this.$element.attr("pattern"))},addConstraints:function(){for(var t in this.options){var e={};e[t]=this.options[t],this.addConstraint(e,!0,!1)}},addConstraint:function(t,e){for(var i in t)i=i.toLowerCase(),"function"==typeof this.Validator.validators[i]&&(this.constraints[i]={name:i,requirements:t[i],valid:null},"required"===i&&(this.isRequired=!0),this.addCustomConstraintMessage(i));"undefined"==typeof e&&this.bindValidationEvents()},updateConstraint:function(t,e){for(var i in t)this.updtConstraint({name:i,requirements:t[i],valid:null},e)},updtConstraint:function(e,i){this.constraints[e.name]=t.extend(!0,this.constraints[e.name],e),"string"==typeof i&&(this.Validator.messages[e.name]=i),this.bindValidationEvents()},removeConstraint:function(t){var t=t.toLowerCase();return delete this.constraints[t],"required"===t&&(this.isRequired=!1),this.hasConstraints()?void this.bindValidationEvents():"ParsleyForm"==typeof this.getParent()?void this.getParent().removeItem(this.$element):void this.destroy()},addCustomConstraintMessage:function(t){var e=t+("type"===t&&"undefined"!=typeof this.options[t]?this.options[t].charAt(0).toUpperCase()+this.options[t].substr(1):"")+"Message";"undefined"!=typeof this.options[e]&&this.Validator.addMessage("type"===t?this.options[t]:t,this.options[e],"type"===t)},bindValidationEvents:function(){this.valid=null,this.$element.addClass("parsley-validated"),this.$element.off("."+this.type),this.options.remote&&!new RegExp("change","i").test(this.options.trigger)&&(this.options.trigger=this.options.trigger?" change":"change");var e=(this.options.trigger?this.options.trigger:"")+(new RegExp("key","i").test(this.options.trigger)?"":" keyup");this.$element.is("select")&&(e+=new RegExp("change","i").test(e)?"":" change"),e=e.replace(/^\s+/g,"").replace(/\s+$/g,""),this.$element.on((e+" ").split(" ").join("."+this.type+" "),!1,t.proxy(this.eventValidation,this))},generateHash:function(){return"parsley-"+(Math.random()+"").substring(2)},getHash:function(){return this.hash},getVal:function(){return"undefined"!=typeof this.$element.domApi(this.options.namespace).value?this.$element.domApi(this.options.namespace).value:this.$element.val()},eventValidation:function(t){var e=this.getVal();return("keyup"!==t.type||/keyup/i.test(this.options.trigger)||this.validatedOnce)&&("change"!==t.type||/change/i.test(this.options.trigger)||this.validatedOnce)?!this.isRadioOrCheckbox&&this.getLength(e)<this.options.validationMinlength&&!this.validatedOnce?!0:void this.validate():!0},getLength:function(t){return t&&t.hasOwnProperty("length")?t.length:0},isValid:function(){return this.validate(!1)},hasConstraints:function(){for(var t in this.constraints)return!0;return!1},validate:function(t){var e=this.getVal(),i=null;return this.hasConstraints()?this.$element.is(this.options.excluded)?null:this.options.listeners.onFieldValidate(this.element,this)||""===e&&!this.isRequired?(this.UI.reset(),null):this.needsValidation(e)?(i=this.applyValidators(),("undefined"!=typeof t?t:this.options.showErrors)&&this.manageValidationResult(),i):this.valid:null},needsValidation:function(t){return!this.options.validateIfUnchanged&&null!==this.valid&&this.val===t&&this.validatedOnce?!1:(this.val=t,this.validatedOnce=!0)},applyValidators:function(){var t=null;for(var e in this.constraints){var i=this.Validator.validators[this.constraints[e].name]().validate(this.val,this.constraints[e].requirements,this);!1===i?(t=!1,this.constraints[e].valid=t):!0===i&&(this.constraints[e].valid=!0,t=!1!==t)}return!1===t?this.options.listeners.onFieldError(this.element,this.constraints,this):!0===t&&!1===this.options.listeners.onFieldSuccess(this.element,this.constraints,this)&&(t=!1),t},manageValidationResult:function(){var e=null,i=[];for(var s in this.constraints)!1===this.constraints[s].valid?(i.push(this.constraints[s]),e=!1):!0===this.constraints[s].valid&&(this.UI.removeError(this.constraints[s].name),e=!1!==e);if(this.valid=e,!0===this.valid)return this.UI.removeErrors(),this.UI.errorClassHandler.removeClass(this.options.errorClass).addClass(this.options.successClass),!0;if(!1===this.valid){if(!0===this.options.priorityEnabled){for(var s,n,r=0,a=0;a<i.length;a++)n=this.Validator.validators[i[a].name]().priority,n>r&&(s=i[a],r=n);this.UI.manageError(s)}else for(var a=0;a<i.length;a++)this.UI.manageError(i[a]);return this.UI.errorClassHandler.removeClass(this.options.successClass).addClass(this.options.errorClass),!1}return this.UI.ulError&&0===t(this.ulError).children().length&&this.UI.removeErrors(),e},addListener:function(t){for(var e in t)this.options.listeners[e]=t[e]},destroy:function(){this.$element.removeClass("parsley-validated"),this.UI.reset(),this.$element.off("."+this.type).removeData(this.type)}};var n=function(t,i,s){this.initMultiple(t,i),this.inherit(t,i),this.Validator=new e(i),this.init(t,s||"ParsleyFieldMultiple")};n.prototype={constructor:n,initMultiple:function(e,i){this.element=e,this.$element=t(e),this.group=i.group||!1,this.hash=this.getName(),this.siblings=this.group?'[parsley-group="'+this.group+'"]':'input[name="'+this.$element.attr("name")+'"]',this.isRadioOrCheckbox=!0,this.isRadio=this.$element.is("input[type=radio]"),this.isCheckbox=this.$element.is("input[type=checkbox]"),this.errorClassHandler=i.errors.classHandler(e,this.isRadioOrCheckbox)||this.$element.parent()},inherit:function(t,e){var i=new s(t,e,"ParsleyFieldMultiple");for(var n in i)"undefined"==typeof this[n]&&(this[n]=i[n])},getName:function(){if(this.group)return"parsley-"+this.group;if("undefined"==typeof this.$element.attr("name"))throw"A radio / checkbox input must have a parsley-group attribute or a name to be Parsley validated !";return"parsley-"+this.$element.attr("name").replace(/(:|\.|\[|\])/g,"")},getVal:function(){if(this.isRadio)return t(this.siblings+":checked").val()||"";if(this.isCheckbox){var e=[];return t(this.siblings+":checked").each(function(){e.push(t(this).val())}),e}},bindValidationEvents:function(){this.valid=null,this.$element.addClass("parsley-validated"),this.$element.off("."+this.type);var e=this,i=(this.options.trigger?this.options.trigger:"")+(new RegExp("change","i").test(this.options.trigger)?"":" change");i=i.replace(/^\s+/g,"").replace(/\s+$/g,""),t(this.siblings).each(function(){t(this).on(i.split(" ").join("."+e.type+" "),!1,t.proxy(e.eventValidation,e))})}};var r=function(t,e,i){this.init(t,e,i||"parsleyForm")};r.prototype={constructor:r,init:function(e,i,s){this.type=s,this.items=[],this.$element=t(e),this.options=i;var n=this;this.$element.find(i.inputs).each(function(){n.addItem(this)}),this.$element.on("submit."+this.type,!1,t.proxy(this.validate,this))},addListener:function(t){for(var e in t)if(new RegExp("Field").test(e))for(var i=0;i<this.items.length;i++)this.items[i].addListener(t);else this.options.listeners[e]=t[e]},addItem:function(e){if(t(e).is(this.options.excluded))return!1;var i=t(e).parsley(this.options);i.setParent(this),this.items.push(i)},removeItem:function(e){for(var i=t(e).parsley(),s=0;s<this.items.length;s++)if(this.items[s].hash===i.hash)return this.items[s].destroy(),this.items.splice(s,1),!0;return!1},validate:function(e){var i=!0;this.focusedField=!1;for(var s=0;s<this.items.length;s++)"undefined"!=typeof this.items[s]&&!1===this.items[s].validate()&&(i=!1,(!this.focusedField&&"first"===this.options.focus||"last"===this.options.focus)&&(this.focusedField=this.items[s].$element));if(this.focusedField&&!i)if(this.options.scrollDuration>0){var n=this,r=this.focusedField.offset().top-t(window).height()/2;t("html, body").animate({scrollTop:r},this.options.scrollDuration,function(){n.focusedField.focus()})}else this.focusedField.focus();var a=this.options.listeners.onFormValidate(i,e,this);return"undefined"!=typeof a?a:i},isValid:function(){for(var t=0;t<this.items.length;t++)if(!1===this.items[t].isValid())return!1;return!0},removeErrors:function(){for(var t=0;t<this.items.length;t++)this.items[t].parsley("reset")},destroy:function(){for(var t=0;t<this.items.length;t++)this.items[t].destroy();this.$element.off("."+this.type).removeData(this.type)},reset:function(){for(var t=0;t<this.items.length;t++)this.items[t].UI.reset()}},t.fn.parsley=function(e,i){function a(a,o){var l=t(a).data(o);if(!l){switch(o){case"parsleyForm":l=new r(a,u,"parsleyForm");break;case"parsleyField":l=new s(a,u,"parsleyField");break;case"parsleyFieldMultiple":l=new n(a,u,"parsleyFieldMultiple");break;default:return}t(a).data(o,l)}if("string"==typeof e&&"function"==typeof l[e]){var h=l[e](i);return"undefined"!=typeof h?h:t(a)}return l}var o={namespace:t(this).data("parsleyNamespace")?t(this).data("parsleyNamespace"):"undefined"!=typeof e&&"undefined"!=typeof e.namespace?e.namespace:t.fn.parsley.defaults.namespace},u=t.extend(!0,{},t.fn.parsley.defaults,"undefined"!=typeof window.ParsleyConfig?window.ParsleyConfig:{},e,this.domApi(o.namespace)),l=null;return t(this).is("form")||"undefined"!=typeof t(this).domApi(o.namespace).bind?l=a(t(this),"parsleyForm"):t(this).is(u.inputs)&&(l=a(t(this),t(this).is("input[type=radio], input[type=checkbox]")?"parsleyFieldMultiple":"parsleyField")),"function"==typeof i?i():l},t(window).on("load",function(){t("[parsley-validate]").each(function(){t(this).parsley()})}),t.fn.domApi=function(e){var i={},s=new RegExp("^"+e,"i");return"undefined"==typeof this[0]?{}:(t.each(this[0].attributes,function(){this.specified&&s.test(this.name)&&(i[o(this.name.replace(e,""))]=a(this.value))}),i)};var a=function(e){var i;try{return e?"true"==e||("false"==e?!1:"null"==e?null:isNaN(i=Number(e))?/^[\[\{]/.test(e)?t.parseJSON(e):e:i):e}catch(s){return e}},o=function(t){return t.replace(/-+(.)?/g,function(t,e){return e?e.toUpperCase():""})};t.fn.parsley.defaults={namespace:"parsley-",inputs:"input, textarea, select",excluded:"input[type=hidden], input[type=file], :disabled",priorityEnabled:!0,trigger:!1,animate:!0,animateDuration:300,scrollDuration:500,focus:"first",validationMinlength:3,successClass:"parsley-success",errorClass:"parsley-error",errorMessage:!1,validators:{},showErrors:!0,messages:{},validateIfUnchanged:!1,errors:{classHandler:function(){},container:function(){},errorsWrapper:"<ul></ul>",errorElem:"<li></li>"},listeners:{onFieldValidate:function(){return!1},onFormValidate:function(){},onFieldError:function(){},onFieldSuccess:function(){}}}}(window.jQuery||window.Zepto);