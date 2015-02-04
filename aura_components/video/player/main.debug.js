this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["video/player/main"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n    <video id=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.video)),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" class=\"video-js vjs-default-skin\" controls preload=\"auto\" poster=";
  if (helper = helpers.poster) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.poster); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + ">\n      ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.hls), {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      <source type=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.file)),stack1 == null || stack1 === false ? stack1 : stack1.content_type)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" src=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.file)),stack1 == null || stack1 === false ? stack1 : stack1.url)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">\n    </video>\n  ";
  return buffer;
  }
function program2(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n        <source type=\"application/x-mpegurl\" src=\"";
  if (helper = helpers.hls) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.hls); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">\n      ";
  return buffer;
  }

function program4(depth0,data) {
  
  
  return "\n    <p>Your video is processing.</p>\n  ";
  }

function program6(depth0,data) {
  
  
  return "\n    </p>Video encoding has failed, please retry later.</p>\n  ";
  }

  buffer += "<div class=\"video-container\">\n  ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.isFinished), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n  ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.isProcessing), {hash:{},inverse:self.noop,fn:self.program(4, program4, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n  ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.hasFailed), {hash:{},inverse:self.noop,fn:self.program(6, program6, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n</div>\n";
  return buffer;
  } ; 

Hull.component('video/player@hull', {
    datasources: { video: ':id' },
    templates: ['main'],
    require: ['//vjs.zencdn.net/4.2.1/video.js'],
    initialize: function () {
        this.trackPlayer = this.sandbox.util._.throttle(function (player) {
            var progress = Math.round(player.currentTime() / player.duration() * 100);
            var event;
            if (progress > 10 && progress < 80 && !this.playTracked) {
                this.playTracked = true;
                event = 'video.play';
            } else if (progress >= 80 && !this.completeTracked) {
                this.completeTracked = true;
                event = 'video.complete';
            }
            if (event) {
                this.track(event, { id: this.options.id });
            }
        }, 500);
    },
    beforeRender: function (data) {
        this.currentState = this.currentState || data.video.state;
        data.isProcessing = this.isProcessing(data.video.state);
        data.hasFailed = this.hasFailed(data.video.state);
        data.isFinished = data.video.state === 'finished';
        if (data.isFinished) {
            data.poster = data.video.picture || data.video.thumbnails[0];
            if (data.video.files.hls) {
                data.hls = data.video.base_url + '/' + data.video.files.hls.name;
            }
            var file = data.video.files[this.options.quality] || data.video.files.standard;
            file.url = data.video.base_url + '/' + file.name;
            data.file = file;
            data.width = file.width;
            data.height = file.height;
        }
    },
    afterRender: function (data) {
        if (this.isProcessing(data.video.state)) {
            this.poll(data.video.id);
        } else {
            var options = {
                    width: this.options.width || data.width,
                    height: this.options.height || data.height
                };
            var self = this;
            videojs(data.video.id, options).on('timeupdate', function () {
                self.trackPlayer(this);
            });
        }
    },
    poll: function (id) {
        var _ = this.sandbox.util._;
        this.api(id).then(_.bind(function (video) {
            if (this.currentState !== video.state) {
                this.currentState = video.state;
                this.render();
            }
            if (this.isProcessing(video.state)) {
                var interval = this.options.interval || 10000;
                setTimeout(_.bind(this.poll, this), interval, id);
            }
        }, this));
    },
    isProcessing: function (state) {
        return this.sandbox.util._.include([
            'pending',
            'scheduled',
            'submitted',
            'waiting',
            'processing'
        ], state);
    },
    hasFailed: function (state) {
        return this.sandbox.util._.include([
            'submition_failed',
            'submition_error',
            'failed',
            'canceled'
        ], state);
    }
});