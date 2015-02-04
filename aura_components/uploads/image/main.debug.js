this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["uploads/image/file"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<span class=\"btn btn-success fileinput-button\">\n  <h4>Add files...</h4>\n  <input type=\"file\" name=\"file\" accept=\"image/*\" capture=\"camera\">\n</span>\n";
  };
Hull.templates._default["uploads/image/upload"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); partials = this.merge(partials, Handlebars.partials); data = data || {};
  var buffer = "", stack1, helper, options, functionType="function", escapeExpression=this.escapeExpression, self=this, helperMissing=helpers.helperMissing, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n  <form action=\"";
  if (helper = helpers.url) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.url); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" method=\"post\" enctype=\"multipart/form-data\" class=\"hull-upload\">\n\n    ";
  stack1 = (helper = helpers.key_value || (depth0 && depth0.key_value),options={hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data},helper ? helper.call(depth0, (depth0 && depth0.params), options) : helperMissing.call(depth0, "key_value", (depth0 && depth0.params), options));
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n    <div class=\"hull-upload__dropzone dropzone well hidden-phone hidden-phone-tablet\">\n      <b>Drop an image here</b>\n    </div>\n\n    <input type=\"hidden\" name=\"Filename\" value=\"\"/>\n    <input type=\"hidden\" name=\"Content-Type\" value=\"\"/>\n    <input type=\"hidden\" name=\"name\" value=\"\"/>\n\n    <div class=\"hull-upload__filebutton fileupload-buttonbar\">\n        ";
  stack1 = self.invokePartial(partials['uploads/image/file'], 'uploads/image/file', depth0, helpers, partials, data);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    </div>\n\n    <div class=\"fileupload-progress fade\">\n      <div data-hull-progress class=\"progress-success progress-striped active\" role=\"progressbar\" aria-valuemin=\"0\" aria-valuemax=\"100\">\n        <div data-hull-progress-bar class=\"bar\" style=\"width:0%;\"></div>\n      </div>\n      <div class=\"progress-extended\">&nbsp;</div>\n    </div>\n\n\n    <div class='error'></div>\n    <div class='filescontainer'></div>\n  </form>\n";
  return buffer;
  }
function program2(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n      <input type=\"hidden\" name=\"";
  if (helper = helpers.key) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.key); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" value=\"";
  if (helper = helpers.value) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.value); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"/>\n    ";
  return buffer;
  }

function program4(depth0,data) {
  
  
  return "\n  No storage backend configured. As an admin, please configure one.\n";
  }

  options={hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data}
  if (helper = helpers.upload_policy) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.upload_policy); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.upload_policy) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  options={hash:{},inverse:self.program(4, program4, data),fn:self.noop,data:data}
  if (helper = helpers.upload_policy) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.upload_policy); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.upload_policy) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.program(4, program4, data),fn:self.noop,data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  } ; 

Hull.component('uploads/image@hull', {
    type: 'Hull',
    templates: [
        'upload',
        'file'
    ],
    require: ['fileupload'],
    requiredOptions: ['storage'],
    options: { storage: 'hull' },
    fileTypes: {
        images: /(\.|\/)(gif|jpe?g|png)$/i,
        videos: /(\.|\/)(mov|mkv|mpg|wmv|mp4|m4v)$/i
    },
    fileProcessors: {
        images: [
            {
                action: 'load',
                fileTypes: /^image\/(gif|jpeg|png)$/,
                maxFileSize: 20000000
            },
            {
                action: 'resize',
                maxWidth: 1440,
                maxHeight: 900
            },
            { action: 'save' }
        ]
    },
    uploader_events: {
        'fileuploadadd': 'onAdd',
        'fileuploadadded': 'onAdded',
        'fileuploadalways': 'onAlways',
        'fileuploadchange': 'onChange',
        'fileuploadcompleted': 'onCompleted',
        'fileuploaddestroy': 'onDestroy',
        'fileuploaddestroyed': 'onDestroyed',
        'fileuploaddone': 'onDone',
        'fileuploaddragover': 'onDragover',
        'fileuploaddrop': 'onDrop',
        'fileuploadfail': 'onFail',
        'fileuploadfailed': 'onFailed',
        'fileuploadfinished': 'onFinished',
        'fileuploadpaste': 'onPaste',
        'fileuploadprogress': 'onProgress',
        'fileuploadprogressall': 'onProgressAll',
        'fileuploadsend': 'onSend',
        'fileuploadsent': 'onSent',
        'fileuploadstart': 'onStart',
        'fileuploadstarted': 'onStarted',
        'fileuploadstop': 'onStop',
        'fileuploadstopped': 'onStopped',
        'fileuploadsubmit': 'onSubmit'
    },
    uploader_options: {
        autoUpload: true,
        maxNumberOfFiles: 1,
        maxFileSize: 5000000,
        minFileSize: 0,
        dropZone: '.dropzone',
        type: 'POST'
    },
    selectStoragePolicy: function () {
        var storagePolicies = [], selectedPolicy, optionValue = this.options.storage;
        if (this.sandbox.config.services.storage) {
            storagePolicies = this.sandbox.util._.keys(this.sandbox.config.services.storage);
        }
        var countPolicies = storagePolicies.length;
        if (countPolicies === 1) {
            selectedPolicy = storagePolicies[0];
        } else if (countPolicies > 1) {
            if (!optionValue) {
                throw new TypeError('You must specify a storage policy.');
            }
            if (storagePolicies.hasOwnProperty(optionValue)) {
                selectedPolicy = storagePolicies[optionValue];
            } else {
                throw new TypeError('Unknown storage policy: ', optionValue);
            }
        } else {
        }
        return this.sandbox.config.services.storage[selectedPolicy];
    },
    beforeRender: function (data) {
        data.upload_policy = this.selectStoragePolicy();
        return data;
    },
    afterRender: function () {
        var _ = this.sandbox.util._;
        this.form = this.$el.find('form');
        var opts = _.defaults(this.uploader_options, {
                dataType: 'xml',
                url: this.form.attr('action'),
                dropZone: this.$el.find(this.uploader_options.dropZone),
                acceptFileTypes: this.fileTypes.images
            });
        this.form.fileupload(opts);
        this.uploader = this.form.data('fileupload');
        this.dropzone = this.$el.find(this.uploader_options.dropZone);
        var emit = this.sandbox.emit, form = this.form;
        _.each(this.uploader_events, function (cb, evt) {
            var n = evt.replace(/^fileupload/, '');
            form.on(evt, function (e, d) {
                var eventName = 'hull.uploads.image.' + n;
                emit('hull.upload.image.' + n, {
                    event: e,
                    data: d
                });
            });
        });
        _.each(this.uploader_events, function (value, key) {
            if (this[value]) {
                this.form.on(key, _.bind(this[value], this));
            }
        }, this);
    },
    start: function () {
        this.form.fileupload('send', this.upload_data);
    },
    cancel: function () {
    },
    'delete': function () {
    },
    onSuccess: function () {
        this.dropzone.find('b').text('Thanks !');
        this.dropzone.removeClass('dropzone');
    },
    onDrop: function () {
        this.dropzone.find('b').text('Thanks !');
        this.dropzone.removeClass('dropzone');
    },
    onDragOver: function () {
        this.dropzone.addClass('dragover');
        clearTimeout(this.dragOverEffect);
        var self = this;
        this.dragOverEffect = setTimeout(function () {
            self.dropzone.removeClass('dragover');
        }, 100);
    },
    onAdd: function (e, data) {
        var key = this.$el.find('[name="key"]');
        var s = key.val();
        key.val(s.replace('${filename}', '/' + data.files[0].name));
        this.$el.find('[name="Filename"]').val(data.files[0].name);
        this.$el.find('[name="name"]').val(data.files[0].name);
        this.$el.find('[name="Content-Type"]').val(data.files[0].type);
        return this.upload_data = data;
    },
    onSend: function (e, data) {
        this.$el.find('.progress').fadeIn();
    },
    onSubmit: function (e, data) {
        this.toggleDescription();
    },
    toggleDescription: function () {
        var descriptionElt = this.$el.find('[name=description]');
        if (descriptionElt.is(':disabled')) {
            descriptionElt.removeAttr('disabled');
            descriptionElt.val('');
        } else {
            this.description = descriptionElt.val() || undefined;
            this.$el.find('[name=description]').attr('disabled', 'disabled');
        }
    },
    onProgress: function (e, data) {
        this.$el.find('.bar').css('width', data.percent + '%');
    },
    onFail: function (e, data) {
        this.$el.find('.error').text('Error :#{data.errorThrown}');
    },
    onDone: function (e, data) {
        this.$el.find('[data-hull-progress]').fadeOut(300, function () {
        });
        this.$el.find('[data-hull-progress-bar]').css('width', 0);
        this.onUploadDone(data);
    },
    onUploadDone: function (data) {
        var _ = this.sandbox.util._;
        _.map(data.files, _.bind(function (file) {
            file.url = this.fileUrl(file.name);
            file.description = this.description;
            var root = this.options.id || 'me';
            this.api(root + '/images', 'post', {
                description: file.description,
                source_url: file.url,
                name: file.name
            }).then(function (image) {
                this.sandbox.emit('hull.uploads.image.finished', image);
            }.bind(this));
        }, this));
        this.toggleDescription();
        this.uploader.options.maxNumberOfFiles++;
    },
    multipleUpload: function () {
        return false;
    },
    fileUrl: function (filename) {
        var policy = this.selectStoragePolicy();
        return encodeURI(policy.url + policy.params.key.replace('${filename}', '/' + filename));
    },
    initialize: function () {
    }
});