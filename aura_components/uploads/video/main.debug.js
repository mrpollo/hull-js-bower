this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["uploads/video/upload"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<form action=\"\" method=\"post\" enctype=\"multipart/form-data\">\n  <input type=\"file\" name=\"file\" accept=\"video/*\">\n\n  <input type=\"hidden\" name=\"AWSAccessKeyId\" value=\"\">\n  <input type=\"hidden\" name=\"Content-Type\" value=\"\">\n  <input type=\"hidden\" name=\"acl\" value=\"\">\n  <input type=\"hidden\" name=\"key\" value=\"\">\n  <input type=\"hidden\" name=\"policy\" value=\"\">\n  <input type=\"hidden\" name=\"signature\" value=\"\">\n  <input type=\"hidden\" name=\"success_action_status\" value=\"\">\n</form>\n";
  } ; 

Hull.component('uploads/video@hull', {
    type: 'Hull',
    templates: ['upload'],
    require: ['fileupload'],
    afterRender: function () {
        var self = this;
        var _ = this.sandbox.util._;
        this.$upload = this.$('form');
        this.$upload.fileupload({
            acceptFileTypes: /(\.|\/)(mov|mkv|mpg|wmv|mp4|m4v)$/i,
            dataType: 'xml',
            add: function (event, data) {
                var f = _.pick(data.files[0], 'name', 'type', 'size');
                var root = self.options.id || 'me';
                self.api(root + '/videos/authorize', { file: f }, 'post').then(function (r) {
                    self.postProcessPath = r.postprocess_path;
                    self.postProcessParams = r.postprocess_params;
                    self.$upload[0].setAttribute('action', r.credentials.url);
                    _.each(r.credentials.params, function (v, k) {
                        self.$upload.find('[name="' + k + '"]').val(v);
                    });
                    data.submit();
                });
            },
            done: function (event, data) {
                self.api(self.postProcessPath, self.postProcessParams, 'post').then(function (video) {
                    self.sandbox.emit('hull.uploads.video.finished', video);
                });
            }
        }).on([
            'fileuploadadd',
            'fileuploadsubmit',
            'fileuploadsend',
            'fileuploadfail',
            'fileuploadalways',
            'fileuploadprogress',
            'fileuploadprogressall',
            'fileuploadstart',
            'fileuploadstop',
            'fileuploadchange',
            'fileuploadpaste',
            'fileuploaddrop',
            'fileuploaddragover',
            'fileuploadchunksend',
            'fileuploadchunkdone',
            'fileuploadchunkfail',
            'fileuploadchunkalways',
            'fileuploadprocessstart',
            'fileuploadprocess',
            'fileuploadprocessdone',
            'fileuploadprocessfail',
            'fileuploadprocessalways',
            'fileuploadprocessstop'
        ].join(' '), function (e, data) {
            var name = e.type.replace('fileupload', '');
            self.sandbox.emit('hull.uploads.video.' + name, {
                event: e,
                data: data
            });
        });
    }
});