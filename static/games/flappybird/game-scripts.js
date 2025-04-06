!(function (t, e) {
  "object" == typeof exports && "undefined" != typeof module
    ? e(exports)
    : "function" == typeof define && define.amd
    ? define(["exports"], e)
    : e(
        ((t = "undefined" != typeof globalThis ? globalThis : t || self).TWEEN =
          {})
      );
})(this, function (t) {
  "use strict";
  var e,
    n = {
      Linear: {
        None: function (t) {
          return t;
        },
      },
      Quadratic: {
        In: function (t) {
          return t * t;
        },
        Out: function (t) {
          return t * (2 - t);
        },
        InOut: function (t) {
          return (t *= 2) < 1 ? 0.5 * t * t : -0.5 * (--t * (t - 2) - 1);
        },
      },
      Cubic: {
        In: function (t) {
          return t * t * t;
        },
        Out: function (t) {
          return --t * t * t + 1;
        },
        InOut: function (t) {
          return (t *= 2) < 1 ? 0.5 * t * t * t : 0.5 * ((t -= 2) * t * t + 2);
        },
      },
      Quartic: {
        In: function (t) {
          return t * t * t * t;
        },
        Out: function (t) {
          return 1 - --t * t * t * t;
        },
        InOut: function (t) {
          return (t *= 2) < 1
            ? 0.5 * t * t * t * t
            : -0.5 * ((t -= 2) * t * t * t - 2);
        },
      },
      Quintic: {
        In: function (t) {
          return t * t * t * t * t;
        },
        Out: function (t) {
          return --t * t * t * t * t + 1;
        },
        InOut: function (t) {
          return (t *= 2) < 1
            ? 0.5 * t * t * t * t * t
            : 0.5 * ((t -= 2) * t * t * t * t + 2);
        },
      },
      Sinusoidal: {
        In: function (t) {
          return 1 - Math.cos((t * Math.PI) / 2);
        },
        Out: function (t) {
          return Math.sin((t * Math.PI) / 2);
        },
        InOut: function (t) {
          return 0.5 * (1 - Math.cos(Math.PI * t));
        },
      },
      Exponential: {
        In: function (t) {
          return 0 === t ? 0 : Math.pow(1024, t - 1);
        },
        Out: function (t) {
          return 1 === t ? 1 : 1 - Math.pow(2, -10 * t);
        },
        InOut: function (t) {
          return 0 === t
            ? 0
            : 1 === t
            ? 1
            : (t *= 2) < 1
            ? 0.5 * Math.pow(1024, t - 1)
            : 0.5 * (2 - Math.pow(2, -10 * (t - 1)));
        },
      },
      Circular: {
        In: function (t) {
          return 1 - Math.sqrt(1 - t * t);
        },
        Out: function (t) {
          return Math.sqrt(1 - --t * t);
        },
        InOut: function (t) {
          return (t *= 2) < 1
            ? -0.5 * (Math.sqrt(1 - t * t) - 1)
            : 0.5 * (Math.sqrt(1 - (t -= 2) * t) + 1);
        },
      },
      Elastic: {
        In: function (t) {
          return 0 === t
            ? 0
            : 1 === t
            ? 1
            : -Math.pow(2, 10 * (t - 1)) * Math.sin(5 * (t - 1.1) * Math.PI);
        },
        Out: function (t) {
          return 0 === t
            ? 0
            : 1 === t
            ? 1
            : Math.pow(2, -10 * t) * Math.sin(5 * (t - 0.1) * Math.PI) + 1;
        },
        InOut: function (t) {
          return 0 === t
            ? 0
            : 1 === t
            ? 1
            : (t *= 2) < 1
            ? -0.5 *
              Math.pow(2, 10 * (t - 1)) *
              Math.sin(5 * (t - 1.1) * Math.PI)
            : 0.5 *
                Math.pow(2, -10 * (t - 1)) *
                Math.sin(5 * (t - 1.1) * Math.PI) +
              1;
        },
      },
      Back: {
        In: function (t) {
          var e = 1.70158;
          return t * t * ((e + 1) * t - e);
        },
        Out: function (t) {
          var e = 1.70158;
          return --t * t * ((e + 1) * t + e) + 1;
        },
        InOut: function (t) {
          var e = 2.5949095;
          return (t *= 2) < 1
            ? t * t * ((e + 1) * t - e) * 0.5
            : 0.5 * ((t -= 2) * t * ((e + 1) * t + e) + 2);
        },
      },
      Bounce: {
        In: function (t) {
          return 1 - n.Bounce.Out(1 - t);
        },
        Out: function (t) {
          return t < 1 / 2.75
            ? 7.5625 * t * t
            : t < 2 / 2.75
            ? 7.5625 * (t -= 1.5 / 2.75) * t + 0.75
            : t < 2.5 / 2.75
            ? 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375
            : 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
        },
        InOut: function (t) {
          return t < 0.5
            ? 0.5 * n.Bounce.In(2 * t)
            : 0.5 * n.Bounce.Out(2 * t - 1) + 0.5;
        },
      },
    },
    i =
      "undefined" == typeof self &&
      "undefined" != typeof process &&
      process.hrtime
        ? function () {
            var t = process.hrtime();
            return 1e3 * t[0] + t[1] / 1e6;
          }
        : "undefined" != typeof self &&
          void 0 !== self.performance &&
          void 0 !== self.performance.now
        ? self.performance.now.bind(self.performance)
        : void 0 !== Date.now
        ? Date.now
        : function () {
            return new Date().getTime();
          },
    r = (function () {
      function Group() {
        (this._tweens = {}), (this._tweensAddedDuringUpdate = {});
      }
      return (
        (Group.prototype.getAll = function () {
          var t = this;
          return Object.keys(this._tweens).map(function (e) {
            return t._tweens[e];
          });
        }),
        (Group.prototype.removeAll = function () {
          this._tweens = {};
        }),
        (Group.prototype.add = function (t) {
          (this._tweens[t.getId()] = t),
            (this._tweensAddedDuringUpdate[t.getId()] = t);
        }),
        (Group.prototype.remove = function (t) {
          delete this._tweens[t.getId()],
            delete this._tweensAddedDuringUpdate[t.getId()];
        }),
        (Group.prototype.update = function (t, e) {
          void 0 === t && (t = i()), void 0 === e && (e = !1);
          var n = Object.keys(this._tweens);
          if (0 === n.length) return !1;
          for (; n.length > 0; ) {
            this._tweensAddedDuringUpdate = {};
            for (var r = 0; r < n.length; r++) {
              var s = this._tweens[n[r]],
                o = !e;
              s && !1 === s.update(t, o) && !e && delete this._tweens[n[r]];
            }
            n = Object.keys(this._tweensAddedDuringUpdate);
          }
          return !0;
        }),
        Group
      );
    })(),
    s = {
      Linear: function (t, e) {
        var n = t.length - 1,
          i = n * e,
          r = Math.floor(i),
          o = s.Utils.Linear;
        return e < 0
          ? o(t[0], t[1], i)
          : e > 1
          ? o(t[n], t[n - 1], n - i)
          : o(t[r], t[r + 1 > n ? n : r + 1], i - r);
      },
      Bezier: function (t, e) {
        for (
          var n = 0,
            i = t.length - 1,
            r = Math.pow,
            o = s.Utils.Bernstein,
            a = 0;
          a <= i;
          a++
        )
          n += r(1 - e, i - a) * r(e, a) * t[a] * o(i, a);
        return n;
      },
      CatmullRom: function (t, e) {
        var n = t.length - 1,
          i = n * e,
          r = Math.floor(i),
          o = s.Utils.CatmullRom;
        return t[0] === t[n]
          ? (e < 0 && (r = Math.floor((i = n * (1 + e)))),
            o(t[(r - 1 + n) % n], t[r], t[(r + 1) % n], t[(r + 2) % n], i - r))
          : e < 0
          ? t[0] - (o(t[0], t[0], t[1], t[1], -i) - t[0])
          : e > 1
          ? t[n] - (o(t[n], t[n], t[n - 1], t[n - 1], i - n) - t[n])
          : o(
              t[r ? r - 1 : 0],
              t[r],
              t[n < r + 1 ? n : r + 1],
              t[n < r + 2 ? n : r + 2],
              i - r
            );
      },
      Utils: {
        Linear: function (t, e, n) {
          return (e - t) * n + t;
        },
        Bernstein: function (t, e) {
          var n = s.Utils.Factorial;
          return n(t) / n(e) / n(t - e);
        },
        Factorial:
          ((e = [1]),
          function (t) {
            var n = 1;
            if (e[t]) return e[t];
            for (var i = t; i > 1; i--) n *= i;
            return (e[t] = n), n;
          }),
        CatmullRom: function (t, e, n, i, r) {
          var s = 0.5 * (n - t),
            o = 0.5 * (i - e),
            a = r * r;
          return (
            (2 * e - 2 * n + s + o) * (r * a) +
            (-3 * e + 3 * n - 2 * s - o) * a +
            s * r +
            e
          );
        },
      },
    },
    o = (function () {
      function Sequence() {}
      return (
        (Sequence.nextId = function () {
          return Sequence._nextId++;
        }),
        (Sequence._nextId = 0),
        Sequence
      );
    })(),
    a = new r(),
    u = (function () {
      function Tween(t, e) {
        void 0 === e && (e = a),
          (this._object = t),
          (this._group = e),
          (this._isPaused = !1),
          (this._pauseStart = 0),
          (this._valuesStart = {}),
          (this._valuesEnd = {}),
          (this._valuesStartRepeat = {}),
          (this._duration = 1e3),
          (this._initialRepeat = 0),
          (this._repeat = 0),
          (this._yoyo = !1),
          (this._isPlaying = !1),
          (this._reversed = !1),
          (this._delayTime = 0),
          (this._startTime = 0),
          (this._easingFunction = n.Linear.None),
          (this._interpolationFunction = s.Linear),
          (this._chainedTweens = []),
          (this._onStartCallbackFired = !1),
          (this._id = o.nextId()),
          (this._isChainStopped = !1),
          (this._goToEnd = !1);
      }
      return (
        (Tween.prototype.getId = function () {
          return this._id;
        }),
        (Tween.prototype.isPlaying = function () {
          return this._isPlaying;
        }),
        (Tween.prototype.isPaused = function () {
          return this._isPaused;
        }),
        (Tween.prototype.to = function (t, e) {
          return (
            (this._valuesEnd = Object.create(t)),
            void 0 !== e && (this._duration = e),
            this
          );
        }),
        (Tween.prototype.duration = function (t) {
          return (this._duration = t), this;
        }),
        (Tween.prototype.start = function (t) {
          if (this._isPlaying) return this;
          if (
            (this._group && this._group.add(this),
            (this._repeat = this._initialRepeat),
            this._reversed)
          )
            for (var e in ((this._reversed = !1), this._valuesStartRepeat))
              this._swapEndStartRepeatValues(e),
                (this._valuesStart[e] = this._valuesStartRepeat[e]);
          return (
            (this._isPlaying = !0),
            (this._isPaused = !1),
            (this._onStartCallbackFired = !1),
            (this._isChainStopped = !1),
            (this._startTime =
              void 0 !== t
                ? "string" == typeof t
                  ? i() + parseFloat(t)
                  : t
                : i()),
            (this._startTime += this._delayTime),
            this._setupProperties(
              this._object,
              this._valuesStart,
              this._valuesEnd,
              this._valuesStartRepeat
            ),
            this
          );
        }),
        (Tween.prototype._setupProperties = function (t, e, n, i) {
          for (var r in n) {
            var s = t[r],
              o = Array.isArray(s),
              a = o ? "array" : typeof s,
              u = !o && Array.isArray(n[r]);
            if ("undefined" !== a && "function" !== a) {
              if (u) {
                var h = n[r];
                if (0 === h.length) continue;
                (h = h.map(this._handleRelativeValue.bind(this, s))),
                  (n[r] = [s].concat(h));
              }
              if (("object" !== a && !o) || !s || u)
                void 0 === e[r] && (e[r] = s),
                  o || (e[r] *= 1),
                  (i[r] = u ? n[r].slice().reverse() : e[r] || 0);
              else {
                for (var p in ((e[r] = o ? [] : {}), s)) e[r][p] = s[p];
                (i[r] = o ? [] : {}),
                  this._setupProperties(s, e[r], n[r], i[r]);
              }
            }
          }
        }),
        (Tween.prototype.stop = function () {
          return (
            this._isChainStopped ||
              ((this._isChainStopped = !0), this.stopChainedTweens()),
            this._isPlaying
              ? (this._group && this._group.remove(this),
                (this._isPlaying = !1),
                (this._isPaused = !1),
                this._onStopCallback && this._onStopCallback(this._object),
                this)
              : this
          );
        }),
        (Tween.prototype.end = function () {
          return (this._goToEnd = !0), this.update(1 / 0), this;
        }),
        (Tween.prototype.pause = function (t) {
          return (
            void 0 === t && (t = i()),
            this._isPaused ||
              !this._isPlaying ||
              ((this._isPaused = !0),
              (this._pauseStart = t),
              this._group && this._group.remove(this)),
            this
          );
        }),
        (Tween.prototype.resume = function (t) {
          return (
            void 0 === t && (t = i()),
            this._isPaused && this._isPlaying
              ? ((this._isPaused = !1),
                (this._startTime += t - this._pauseStart),
                (this._pauseStart = 0),
                this._group && this._group.add(this),
                this)
              : this
          );
        }),
        (Tween.prototype.stopChainedTweens = function () {
          for (var t = 0, e = this._chainedTweens.length; t < e; t++)
            this._chainedTweens[t].stop();
          return this;
        }),
        (Tween.prototype.group = function (t) {
          return (this._group = t), this;
        }),
        (Tween.prototype.delay = function (t) {
          return (this._delayTime = t), this;
        }),
        (Tween.prototype.repeat = function (t) {
          return (this._initialRepeat = t), (this._repeat = t), this;
        }),
        (Tween.prototype.repeatDelay = function (t) {
          return (this._repeatDelayTime = t), this;
        }),
        (Tween.prototype.yoyo = function (t) {
          return (this._yoyo = t), this;
        }),
        (Tween.prototype.easing = function (t) {
          return (this._easingFunction = t), this;
        }),
        (Tween.prototype.interpolation = function (t) {
          return (this._interpolationFunction = t), this;
        }),
        (Tween.prototype.chain = function () {
          for (var t = [], e = 0; e < arguments.length; e++)
            t[e] = arguments[e];
          return (this._chainedTweens = t), this;
        }),
        (Tween.prototype.onStart = function (t) {
          return (this._onStartCallback = t), this;
        }),
        (Tween.prototype.onUpdate = function (t) {
          return (this._onUpdateCallback = t), this;
        }),
        (Tween.prototype.onRepeat = function (t) {
          return (this._onRepeatCallback = t), this;
        }),
        (Tween.prototype.onComplete = function (t) {
          return (this._onCompleteCallback = t), this;
        }),
        (Tween.prototype.onStop = function (t) {
          return (this._onStopCallback = t), this;
        }),
        (Tween.prototype.update = function (t, e) {
          if (
            (void 0 === t && (t = i()),
            void 0 === e && (e = !0),
            this._isPaused)
          )
            return !0;
          var n,
            r,
            s = this._startTime + this._duration;
          if (!this._goToEnd && !this._isPlaying) {
            if (t > s) return !1;
            e && this.start(t);
          }
          if (((this._goToEnd = !1), t < this._startTime)) return !0;
          !1 === this._onStartCallbackFired &&
            (this._onStartCallback && this._onStartCallback(this._object),
            (this._onStartCallbackFired = !0)),
            (r = (t - this._startTime) / this._duration),
            (r = 0 === this._duration || r > 1 ? 1 : r);
          var o = this._easingFunction(r);
          if (
            (this._updateProperties(
              this._object,
              this._valuesStart,
              this._valuesEnd,
              o
            ),
            this._onUpdateCallback && this._onUpdateCallback(this._object, r),
            1 === r)
          ) {
            if (this._repeat > 0) {
              for (n in (isFinite(this._repeat) && this._repeat--,
              this._valuesStartRepeat))
                this._yoyo ||
                  "string" != typeof this._valuesEnd[n] ||
                  (this._valuesStartRepeat[n] =
                    this._valuesStartRepeat[n] +
                    parseFloat(this._valuesEnd[n])),
                  this._yoyo && this._swapEndStartRepeatValues(n),
                  (this._valuesStart[n] = this._valuesStartRepeat[n]);
              return (
                this._yoyo && (this._reversed = !this._reversed),
                void 0 !== this._repeatDelayTime
                  ? (this._startTime = t + this._repeatDelayTime)
                  : (this._startTime = t + this._delayTime),
                this._onRepeatCallback && this._onRepeatCallback(this._object),
                !0
              );
            }
            this._onCompleteCallback && this._onCompleteCallback(this._object);
            for (var a = 0, u = this._chainedTweens.length; a < u; a++)
              this._chainedTweens[a].start(this._startTime + this._duration);
            return (this._isPlaying = !1), !1;
          }
          return !0;
        }),
        (Tween.prototype._updateProperties = function (t, e, n, i) {
          for (var r in n)
            if (void 0 !== e[r]) {
              var s = e[r] || 0,
                o = n[r],
                a = Array.isArray(t[r]),
                u = Array.isArray(o);
              !a && u
                ? (t[r] = this._interpolationFunction(o, i))
                : "object" == typeof o && o
                ? this._updateProperties(t[r], s, o, i)
                : "number" == typeof (o = this._handleRelativeValue(s, o)) &&
                  (t[r] = s + (o - s) * i);
            }
        }),
        (Tween.prototype._handleRelativeValue = function (t, e) {
          return "string" != typeof e
            ? e
            : "+" === e.charAt(0) || "-" === e.charAt(0)
            ? t + parseFloat(e)
            : parseFloat(e);
        }),
        (Tween.prototype._swapEndStartRepeatValues = function (t) {
          var e = this._valuesStartRepeat[t],
            n = this._valuesEnd[t];
          (this._valuesStartRepeat[t] =
            "string" == typeof n
              ? this._valuesStartRepeat[t] + parseFloat(n)
              : this._valuesEnd[t]),
            (this._valuesEnd[t] = e);
        }),
        Tween
      );
    })(),
    h = "18.6.4",
    p = o.nextId,
    _ = a,
    l = _.getAll.bind(_),
    c = _.removeAll.bind(_),
    d = _.add.bind(_),
    f = _.remove.bind(_),
    y = _.update.bind(_),
    v = {
      Easing: n,
      Group: r,
      Interpolation: s,
      now: i,
      Sequence: o,
      nextId: p,
      Tween: u,
      VERSION: h,
      getAll: l,
      removeAll: c,
      add: d,
      remove: f,
      update: y,
    };
  (t.Easing = n),
    (t.Group = r),
    (t.Interpolation = s),
    (t.Sequence = o),
    (t.Tween = u),
    (t.VERSION = h),
    (t.add = d),
    (t.default = v),
    (t.getAll = l),
    (t.nextId = p),
    (t.now = i),
    (t.remove = f),
    (t.removeAll = c),
    (t.update = y),
    Object.defineProperty(t, "__esModule", { value: !0 });
});
document.addEventListener("contextmenu", function (e) {
  e.preventDefault();
});
var AddToScore = pc.createScript("addToScore");
AddToScore.attributes.add("bird", { type: "entity" }),
  (AddToScore.prototype.initialize = function () {
    this.lastX = this.entity.getPosition().x;
  }),
  (AddToScore.prototype.update = function (t) {
    var i = this.app,
      o = this.bird.getPosition().x,
      e = this.entity.getPosition().x;
    e <= o && this.lastX > o && i.fire("game:addscore"), (this.lastX = e);
  });
function storageAvailable(e) {
  try {
    var t = window[e],
      o = "__storage_test__";
    return t.setItem(o, o), t.removeItem(o), !0;
  } catch (e) {
    return !1;
  }
}
var Game = pc.createScript("game");
Game.prototype.initialize = function () {
  var e = this.app;
  (this.score = 0),
    (this.bestScore = 0),
    storageAvailable("localStorage") &&
      ((this.bestScore = localStorage.getItem("Flappy Bird Best Score")),
      null === this.bestScore && (this.bestScore = 0)),
    e.on(
      "game:menu",
      function () {
        e.fire("flash:black"),
          setTimeout(function () {
            (e.root.findByName("Game Over Screen").enabled = !1),
              (e.root.findByName("Menu Screen").enabled = !0),
              (e.root.findByName("Game").findByName("Bird").enabled = !1),
              e.fire("pipes:reset"),
              e.fire("ground:start");
          }, 250);
      },
      this
    ),
    e.on(
      "game:getready",
      function () {
        e.fire("flash:black"),
          setTimeout(
            function () {
              (e.root.findByName("Menu Screen").enabled = !1),
                (e.root.findByName("Game Screen").enabled = !0),
                (this.score = 0),
                e.fire("ui:score", this.score),
                (e.root.findByName("Get Ready").sprite.enabled = !0),
                (e.root.findByName("Tap").sprite.enabled = !0),
                (e.root.findByName("Game").findByName("Bird").enabled = !0);
            }.bind(this),
            250
          );
      },
      this
    ),
    e.on(
      "game:play",
      function () {
        e.fire("pipes:start"), e.fire("ui:fadegetready");
      },
      this
    ),
    e.on(
      "game:pause",
      function () {
        (e.root.findByName("Pause Button").enabled = !1),
          (e.root.findByName("Play Button").enabled = !0);
      },
      this
    ),
    e.on(
      "game:unpause",
      function () {
        (e.root.findByName("Play Button").enabled = !1),
          (e.root.findByName("Pause Button").enabled = !0);
      },
      this
    ),
    e.on(
      "game:gameover",
      function () {
        (e.root.findByName("Game Screen").enabled = !1),
          (e.root.findByName("Game Over Screen").enabled = !0),
          e.fire("pipes:stop"),
          e.fire("ground:stop"),
          e.fire("ui:fadeingameover"),
          e.fire("ui:showscoreboard", this.score, this.bestScore),
          this.score > this.bestScore &&
            ((this.bestScore = this.score),
            storageAvailable("localStorage") &&
              localStorage.setItem(
                "Flappy Bird Best Score",
                this.score.toString()
              )),
          setTimeout(function () {
            e.fire("game:audio", "Swoosh");
          }, 500);
      },
      this
    ),
    e.on(
      "game:addscore",
      function () {
        this.score++,
          e.fire("ui:score", this.score),
          e.fire("game:audio", "Point");
      },
      this
    ),
    e.on(
      "game:share",
      function () {
        if (navigator.share && pc.platform.mobile) {
          const e = {
            title: "Flappy Bird",
            text: `I scored ${this.score} in Flappy Bird! Beat that!`,
            url: "https://flappy-bird.co/",
          };
          navigator.share(e);
        } else {
          var e = screen.width / 2 - 320,
            t = screen.height / 2 - 190,
            o =
              "https://twitter.com/intent/tweet?text=" +
              encodeURIComponent(
                "I scored " +
                  this.score +
                  " in Flappy Bird! Beat that! https://flappy-bird.co/ #flappybird #webgl #html5"
              ),
            a = window.open(
              o,
              "name",
              "toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=640, height=380, top=" +
                t +
                ", left=" +
                e
            );
          window.focus && a && a.focus();
        }
      },
      this
    ),
    e.on(
      "game:audio",
      function (e) {
        this.entity.sound.play(e);
      },
      this
    );
};
var Button = pc.createScript("button");
Button.attributes.add("diplacement", { type: "number", default: 0.00390625 }),
  Button.attributes.add("event", { type: "string" }),
  (Button.prototype.initialize = function () {
    var t = this.app;
    (this.pressed = !1),
      (this.min = new pc.Vec3()),
      (this.max = new pc.Vec3()),
      t.on(
        "ui:press",
        function (t, e, s) {
          s.processed || this.press(t, e, s);
        },
        this
      ),
      t.on(
        "ui:release",
        function (t, e) {
          this.release();
        },
        this
      ),
      this.on("enable", function () {
        t.on(
          "ui:press",
          function (t, e, s) {
            s.processed || this.press(t, e, s);
          },
          this
        ),
          t.on(
            "ui:release",
            function (t, e) {
              this.release();
            },
            this
          );
      }),
      this.on("disable", function () {
        t.off("ui:press"), t.off("ui:release"), (this.pressed = !1);
      });
  }),
  (Button.prototype.checkForClick = function (t, e) {
    var s = this.app.root.findByName("Camera"),
      i = this.entity.sprite._meshInstance.aabb;
    return (
      s.camera.worldToScreen(i.getMin(), this.min),
      s.camera.worldToScreen(i.getMax(), this.max),
      t >= this.min.x && t <= this.max.x && e >= this.max.y && e <= this.min.y
    );
  }),
  (Button.prototype.press = function (t, e, s) {
    this.checkForClick(t, e) &&
      ((this.pressed = !0),
      this.entity.translate(0, -this.diplacement, 0),
      (s.processed = !0));
  }),
  (Button.prototype.release = function () {
    var t = this.app;
    this.pressed &&
      ((this.pressed = !1),
      this.entity.translate(0, this.diplacement, 0),
      t.fire(this.event),
      t.fire("game:audio", "Swoosh"));
  });
var Sparkle = pc.createScript("sparkle");
Sparkle.attributes.add("radius", { type: "number", default: 1 }),
  (Sparkle.prototype.initialize = function () {
    (this.initialPos = this.entity.getLocalPosition().clone()),
      this.entity.sprite.on(
        "loop",
        function () {
          var t = Math.random() * Math.PI * 2,
            i = Math.random() * this.radius,
            a = Math.cos(t) * i,
            s = Math.sin(t) * i;
          this.entity.setLocalPosition(
            this.initialPos.x + a,
            this.initialPos.y + s,
            this.initialPos.z
          );
        },
        this
      );
  });
var Bird = pc.createScript("bird");
Bird.attributes.add("flapVelocity", { type: "number", default: 1 }),
  Bird.attributes.add("gravity", { type: "number", default: 5 }),
  Bird.attributes.add("lowestHeight", { type: "number", default: -0.25 }),
  Bird.attributes.add("radius", { type: "number", default: 0.068 }),
  (Bird.prototype.initialize = function () {
    var t = this.app;
    (this.velocity = 0),
      (this.state = "getready"),
      (this.paused = !1),
      (this.circle = { x: 0, y: 0, r: 0 }),
      (this.rect = { x: 0, y: 0, w: 0, h: 0 }),
      (this.initialPos = this.entity.getPosition().clone()),
      (this.initialRot = this.entity.getRotation().clone()),
      (this.pipes = t.root.findByTag("pipe")),
      t.on(
        "game:pause",
        function () {
          (this.paused = !0), (this.entity.sprite.speed = 0);
        },
        this
      ),
      t.on(
        "game:unpause",
        function () {
          (this.paused = !1), (this.entity.sprite.speed = 1);
        },
        this
      ),
      t.on(
        "game:press",
        function (t, i) {
          this.flap();
        },
        this
      ),
      this.on("enable", function () {
        t.on(
          "game:press",
          function (t, i) {
            this.flap();
          },
          this
        ),
          this.reset();
      }),
      this.on("disable", function () {
        t.off("game:press");
      }),
      this.reset();
  }),
  (Bird.prototype.reset = function () {
    this.app;
    (this.velocity = 0),
      (this.state = "getready"),
      this.entity.setPosition(this.initialPos),
      this.entity.setRotation(this.initialRot),
      (this.entity.sprite.speed = 1);
  }),
  (Bird.prototype.flap = function () {
    var t = this.app;
    this.paused ||
      ("getready" === this.state &&
        (t.fire("game:play"),
        (this.state = "play"),
        (this.entity.sprite.speed = 2)),
      "play" === this.state &&
        (t.fire("game:audio", "Flap"), (this.velocity = this.flapVelocity)));
  }),
  (Bird.prototype.die = function (t) {
    var i = this.app;
    (this.state = "dead"),
      (this.entity.sprite.speed = 0),
      i.fire("game:audio", "Hit"),
      i.fire("flash:white"),
      i.fire("game:gameover"),
      t &&
        setTimeout(function () {
          i.fire("game:audio", "Die");
        }, 500);
  }),
  (Bird.prototype.circleRectangleIntersect = function (t, i) {
    var e = t.x,
      s = t.y,
      a = t.r,
      r = i.x,
      h = i.y,
      n = i.w,
      o = i.h,
      p = Math.abs(e - r - n / 2),
      d = Math.abs(s - h - o / 2);
    if (p > n / 2 + a) return !1;
    if (d > o / 2 + a) return !1;
    if (p <= n / 2) return !0;
    if (d <= o / 2) return !0;
    var y = p - n / 2,
      l = d - o / 2;
    return y * y + l * l <= a * a;
  }),
  (Bird.prototype.update = function (t) {
    var i = this.app;
    if (!this.paused) {
      var e = "play" === this.state,
        s = "dead" === this.state;
      e && i.keyboard.wasPressed(pc.KEY_SPACE) && this.flap();
      var a = this.entity.getPosition(),
        r = a.y;
      if ((e || s) && a.y >= this.lowestHeight) {
        (this.velocity -= this.gravity * t),
          (r += this.velocity * t) < this.lowestHeight &&
            (r = this.lowestHeight),
          this.entity.setPosition(a.x, r, 0);
        var h = pc.math.clamp(this.velocity, -2, -0.75);
        (h += 1), this.entity.setLocalEulerAngles(0, 0, 90 * h);
      }
      if (e) {
        r <= this.lowestHeight && this.die(!1);
        var n = this.rect,
          o = this.circle;
        (o.x = a.x), (o.y = a.y), (o.r = this.radius);
        for (var p = 0; p < this.pipes.length; p++) {
          var d = this.pipes[p],
            y = d.sprite._meshInstance.aabb,
            l = y.getMin(),
            u = y.getMax();
          (n.x = l.x),
            (n.y = l.y),
            (n.w = u.x - l.x),
            (n.h = "Pipe Top" === d.name ? 1e3 : u.y - l.y),
            this.circleRectangleIntersect(o, n) && this.die(!0);
        }
      }
    }
  });
var CameraAspect = pc.createScript("cameraAspect");
(CameraAspect.prototype.initialize = function () {
  this.currentOrthoHeight = this.entity.camera.orthoHeight;
}),
  (CameraAspect.prototype.update = function (t) {
    var e = this.app.graphicsDevice.canvas,
      i = e.width / e.height,
      r = pc.math.clamp(0.72 / i, 1, 2);
    r !== this.currentOrthoHeight &&
      ((this.entity.camera.orthoHeight = r), (this.currentOrthoHeight = r));
  });
var Score = pc.createScript("score");
Score.attributes.add("name", { type: "string", default: "score" }),
  Score.attributes.add("display", { type: "entity", array: !0 }),
  Score.attributes.add("numbers", {
    type: "asset",
    assetType: "sprite",
    array: !0,
  }),
  (Score.prototype.initialize = function () {
    var t = this.app,
      e = [];
    t.on(
      "ui:" + this.name,
      function (t) {
        for (
          !(function (t, e) {
            var r = t.toString();
            e.length = 0;
            for (var a = 0, i = r.length; a < i; a++) e.push(+r.charAt(a));
          })(t, e);
          e.length < this.display.length;

        )
          e.unshift(-1);
        var r = this.numbers;
        this.display.forEach(function (t, a) {
          var i = e[a];
          (t.enabled = -1 !== i), -1 !== i && (t.sprite.sprite = r[i].resource);
        });
      },
      this
    );
  });
var PipeHeight = pc.createScript("pipeHeight");
(PipeHeight.prototype.initialize = function () {
  var i = this.app;
  (this.pipe1 = i.root.findByName("Pipe 1")),
    (this.pipe2 = i.root.findByName("Pipe 2")),
    (this.pipe3 = i.root.findByName("Pipe 3")),
    (this.heights = []),
    this.heights.push(0.8 * (Math.random() - 0.5) + 0.1),
    this.heights.push(0.8 * (Math.random() - 0.5) + 0.1),
    this.heights.push(0.8 * (Math.random() - 0.5) + 0.1),
    this.setPipeHeights(),
    i.on(
      "pipes:cycle",
      function () {
        this.heights.shift(),
          this.heights.push(0.75 * (Math.random() - 0.5)),
          this.setPipeHeights();
      },
      this
    );
}),
  (PipeHeight.prototype.setPipeHeights = function () {
    var i;
    (i = this.pipe1.getLocalPosition()),
      this.pipe1.setLocalPosition(i.x, this.heights[0], i.z),
      (i = this.pipe2.getLocalPosition()),
      this.pipe2.setLocalPosition(i.x, this.heights[1], i.z),
      (i = this.pipe3.getLocalPosition()),
      this.pipe3.setLocalPosition(i.x, this.heights[2], i.z);
  });
var Scroll = pc.createScript("scroll");
Scroll.attributes.add("startEvent", { type: "string", default: "start" }),
  Scroll.attributes.add("stopEvent", { type: "string", default: "stop" }),
  Scroll.attributes.add("resetEvent", { type: "string", default: "reset" }),
  Scroll.attributes.add("cycleEvent", { type: "string", default: "cycle" }),
  Scroll.attributes.add("startX", { type: "number", default: 1 }),
  Scroll.attributes.add("endX", { type: "number", default: -1 }),
  Scroll.attributes.add("speed", { type: "number", default: 1 }),
  Scroll.attributes.add("frozen", { type: "boolean", default: !1 }),
  (Scroll.prototype.initialize = function () {
    var t = this.app;
    (this.paused = !1),
      (this.initialPos = this.entity.getPosition().clone()),
      (this.initialRot = this.entity.getRotation().clone()),
      t.on(
        this.resetEvent,
        function () {
          this.entity.setPosition(this.initialPos),
            this.entity.setRotation(this.initialRot);
        },
        this
      ),
      t.on(
        this.startEvent,
        function () {
          this.frozen = !1;
        },
        this
      ),
      t.on(
        this.stopEvent,
        function () {
          this.frozen = !0;
        },
        this
      ),
      t.on(
        "game:pause",
        function () {
          this.paused = !0;
        },
        this
      ),
      t.on(
        "game:unpause",
        function () {
          this.paused = !1;
        },
        this
      );
  }),
  (Scroll.prototype.update = function (t) {
    var e = this.app;
    this.frozen ||
      this.paused ||
      (this.entity.translateLocal((this.speed * t) / (1 / 60), 0, 0),
      this.entity.getLocalPosition().x < this.endX &&
        (this.entity.translateLocal(this.startX - this.endX, 0, 0),
        e.fire(this.cycleEvent)));
  });
var Scoreboard = pc.createScript("scoreboard");
Scoreboard.prototype.initialize = function () {
  var e = this.app,
    r = e.assets;
  (this.score = {}),
    (this.score.current = 0),
    (this.score.best = 0),
    e.on(
      "ui:showscoreboard",
      function (t, i) {
        (e.root.findByName("OK Button").enabled = !1),
          (e.root.findByName("Share Button").enabled = !1),
          (this.score.current = 0),
          (this.score.best = i),
          e.fire("ui:current", 0),
          e.fire("ui:best", i);
        var n = this.entity.findByName("Medal");
        n.enabled = !1;
        var o = this.entity.findByName("New");
        o.enabled = !1;
        new TWEEN.Tween(this.score)
          .to({ current: t }, 500)
          .onUpdate(function (r) {
            var t = Math.round(r.current);
            e.fire("ui:current", t), t > i && e.fire("ui:best", t);
          })
          .onComplete(function () {
            t >= 40
              ? (n.sprite.sprite = r.find("Medal Platinum", "sprite").resource)
              : t >= 30
              ? (n.sprite.sprite = r.find("Medal Gold", "sprite").resource)
              : t >= 20
              ? (n.sprite.sprite = r.find("Medal Silver", "sprite").resource)
              : t >= 10 &&
                (n.sprite.sprite = r.find("Medal Bronze", "sprite").resource),
              (n.enabled = t >= 10),
              t > i && (o.enabled = !0),
              (e.root.findByName("OK Button").enabled = !0),
              (e.root.findByName("Share Button").enabled = !0);
          })
          .delay(1750)
          .start();
      },
      this
    );
};
var Input = pc.createScript("input");
Input.prototype.initialize = function () {
  var e = this.app,
    press = function (n, t) {
      var i = { processed: !1 };
      e.fire("ui:press", n, t, i), i.processed || e.fire("game:press", n, t);
    },
    release = function (n) {
      e.fire("ui:release");
    };
  window.addEventListener(
    "mousedown",
    function (e) {
      e.preventDefault(), press(e.clientX, e.clientY);
    },
    { passive: !1 }
  ),
    window.addEventListener("mouseup", release, { passive: !1 }),
    window.addEventListener(
      "touchstart",
      function (e) {
        e.preventDefault();
        var n = e.changedTouches[0];
        press(n.clientX, n.clientY);
      },
      { passive: !1 }
    ),
    window.addEventListener("touchend", release, { passive: !1 });
};
var Tween = pc.createScript("tween");
Tween.attributes.add("tweens", {
  type: "json",
  schema: [
    {
      name: "autoPlay",
      title: "Autoplay",
      description: "Play tween immediately.",
      type: "boolean",
      default: !1,
    },
    {
      name: "event",
      title: "Trigger Event",
      description:
        "Play tween on the specified event name. This event must be fired on the global application object (e.g. this.app.fire('eventname');).",
      type: "string",
    },
    {
      name: "path",
      title: "Path",
      description:
        "The path from the entity to the property. e.g. 'light.color', 'camera.fov' or 'script.vehicle.speed'.",
      type: "string",
    },
    { name: "start", title: "Start", type: "vec4" },
    { name: "end", title: "End", type: "vec4" },
    {
      name: "easingFunction",
      title: "Easing Function",
      description:
        "The easing functions: Linear, Quadratic, Cubic, Quartic, Quintic, Sinusoidal, Exponential, Circular, Elastic, Back and Bounce.",
      type: "number",
      enum: [
        { Linear: 0 },
        { Quadratic: 1 },
        { Cubic: 2 },
        { Quartic: 3 },
        { Quintic: 4 },
        { Sinusoidal: 5 },
        { Exponential: 6 },
        { Circular: 7 },
        { Elastic: 8 },
        { Back: 9 },
        { Bounce: 10 },
      ],
    },
    {
      name: "easingType",
      title: "Easing Type",
      description:
        "Whether to ease in, easy out or ease in and then out using the specified easing function. Note that for a Linear easing function, the easing type is ignored.",
      type: "number",
      enum: [{ In: 0 }, { Out: 1 }, { InOut: 2 }],
    },
    {
      name: "delay",
      title: "Delay",
      description:
        "Time to wait in milliseconds after receiving the trigger event before executing the tween. Defaults to 0.",
      type: "number",
      default: 0,
    },
    {
      name: "duration",
      title: "Duration",
      description:
        "Time to execute the tween in milliseconds. Defaults to 1000.",
      type: "number",
      default: 1e3,
    },
    {
      name: "repeat",
      title: "Repeat",
      description:
        "The number of times the tween should be repeated after the initial playback. -1 will repeat forever. Defaults to 0.",
      type: "number",
      default: 0,
    },
    {
      name: "repeatDelay",
      title: "Repeat Delay",
      description:
        "Time to wait in milliseconds before executing each repeat of the tween. Defaults to 0.",
      type: "number",
      default: 0,
    },
    {
      name: "yoyo",
      title: "Yoyo",
      description:
        "This function only has effect if used along with repeat. When active, the behaviour of the tween will be like a yoyo, i.e. it will bounce to and from the start and end values, instead of just repeating the same sequence from the beginning. Defaults to false.",
      type: "boolean",
      default: !1,
    },
    {
      name: "startEvent",
      title: "Start Event",
      description:
        "Executed right before the tween starts animating, after any delay time specified by the delay method. This will be executed only once per tween, i.e. it will not be run when the tween is repeated via repeat(). It is great for synchronising to other events or triggering actions you want to happen when a tween starts.",
      type: "string",
    },
    {
      name: "stopEvent",
      title: "Stop Event",
      description:
        "Executed when a tween is explicitly stopped via stop(), but not when it is completed normally.",
      type: "string",
    },
    {
      name: "updateEvent",
      title: "Update Event",
      description:
        "Executed each time the tween is updated, after the values have been actually updated.",
      type: "string",
    },
    {
      name: "completeEvent",
      title: "Complete Event",
      description:
        "Executed when a tween is finished normally (i.e. not stopped).",
      type: "string",
    },
    {
      name: "repeatEvent",
      title: "Repeat Event",
      description:
        "Executed whenever a tween has just finished one repetition and will begin another.",
      type: "string",
    },
  ],
  array: !0,
}),
  (Tween.prototype.initialize = function () {
    var e,
      t = this.app;
    (this.tweenInstances = []), (this.tweenCallbacks = []);
    var makeStartCallback = function (e) {
      return function () {
        this.start(e);
      };
    };
    for (e = 0; e < this.tweens.length; e++) {
      var n = this.tweens[e];
      n.autoPlay && this.start(e),
        n.event.length > 0 &&
          ((this.tweenCallbacks[e] = {
            event: n.event,
            cb: makeStartCallback(e),
          }),
          t.on(this.tweenCallbacks[e].event, this.tweenCallbacks[e].cb, this));
    }
    this.on("enable", function () {
      for (e = 0; e < this.tweens.length; e++)
        this.tweenInstances[e] &&
          this.tweenInstances[e].isPaused() &&
          this.tweenInstances[e].isPaused() &&
          this.tweenInstances[e].resume();
    }),
      this.on("disable", function () {
        for (e = 0; e < this.tweens.length; e++)
          this.tweenInstances[e] &&
            this.tweenInstances[e].isPlaying() &&
            this.tweenInstances[e].pause();
      }),
      this.on("attr", function (n, i, a) {
        for (e = 0; e < this.tweenCallbacks.length; e++)
          this.tweenCallbacks[e] &&
            (t.off(
              this.tweenCallbacks[e].event,
              this.tweenCallbacks[e].cb,
              this
            ),
            (this.tweenCallbacks[e] = null));
        for (e = 0; e < this.tweens.length; e++) {
          var s = this.tweens[e];
          s.event.length > 0 &&
            ((this.tweenCallbacks[e] = {
              event: s.event,
              cb: makeStartCallback(e),
            }),
            t.on(
              this.tweenCallbacks[e].event,
              this.tweenCallbacks[e].cb,
              this
            ));
        }
      });
  }),
  (Tween.prototype.start = function (e) {
    var t,
      n = this.app,
      a = this.tweens[e],
      s = [
        "Linear",
        "Quadratic",
        "Cubic",
        "Quartic",
        "Quintic",
        "Sinusoidal",
        "Exponential",
        "Circular",
        "Elastic",
        "Back",
        "Bounce",
      ];
    t =
      0 === a.easingFunction
        ? TWEEN.Easing[s[a.easingFunction]].None
        : TWEEN.Easing[s[a.easingFunction]][
            ["In", "Out", "InOut"][a.easingType]
          ];
    var o = this.tweenInstances;
    o[e] && o[e].stop();
    var l = a.path.split("."),
      r = this.entity;
    for (i = 0; i < l.length - 1; i++) r = r[l[i]];
    var c,
      p,
      u = l[l.length - 1],
      h = r[u],
      d = "number" == typeof h,
      f = a.start,
      w = a.end;
    if (d) (c = { x: f.x }), (p = { x: w.x });
    else if (h instanceof pc.Vec2)
      (c = new pc.Vec2(f.x, f.y)), (p = new pc.Vec2(w.x, w.y));
    else if (h instanceof pc.Vec3)
      (c = new pc.Vec3(f.x, f.y, f.z)), (p = new pc.Vec3(w.x, w.y, w.z));
    else if (h instanceof pc.Vec4) (c = f.clone()), (p = w.clone());
    else {
      if (!(h instanceof pc.Color))
        return void console.error(
          "ERROR: tween - specified property must be a number, vec2, vec3, vec4 or color"
        );
      (c = new pc.Color(f.x, f.y, f.z, f.w)),
        (p = new pc.Color(w.x, w.y, w.z, w.w));
    }
    var updateProperty = function (e) {
      switch (u) {
        case "eulerAngles":
          r.setEulerAngles(e);
          break;
        case "localEulerAngles":
          r.setLocalEulerAngles(e);
          break;
        case "localPosition":
          r.setLocalPosition(e);
          break;
        case "localScale":
          r.setLocalScale(e);
          break;
        case "position":
          r.setPosition(e);
          break;
        default:
          (r[u] = d ? e.x : e), r instanceof pc.Material && r.update();
      }
    };
    updateProperty(c),
      (o[e] = new TWEEN.Tween(c)
        .to(p, a.duration)
        .easing(t)
        .onStart(function (e) {
          "" !== a.startEvent && n.fire(a.startEvent);
        })
        .onStop(function (t) {
          "" !== a.stopEvent && n.fire(a.stopEvent), (o[e] = null);
        })
        .onUpdate(function (e) {
          updateProperty(e), "" !== a.updateEvent && n.fire(a.updateEvent);
        })
        .onComplete(function (t) {
          "" !== a.completeEvent && n.fire(a.completeEvent), (o[e] = null);
        })
        .onRepeat(function (e) {
          "" !== a.repeatEvent && n.fire(a.repeatEvent);
        })
        .repeat(-1 === a.repeat ? 1 / 0 : a.repeat)
        .repeatDelay(a.repeatDelay)
        .yoyo(a.yoyo)
        .delay(a.delay)
        .start());
  });
var app = pc.Application.getApplication();
app &&
  app.on("update", function (e) {
    TWEEN.update();
  });
var Enable = pc.createScript("enable");
Enable.attributes.add("enableEvent", { type: "string" }),
  Enable.attributes.add("disableEvent", { type: "string" }),
  (Enable.prototype.initialize = function () {
    this.app.on(
      this.enableEvent,
      function () {
        this.entity.enabled = !0;
      },
      this
    ),
      this.app.on(
        this.disableEvent,
        function () {
          this.entity.enabled = !1;
        },
        this
      );
  });
