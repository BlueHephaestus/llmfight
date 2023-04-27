! function(t, e) {
    let n = null;
    ! function t(e, i, a, o) {
        var r = !!(e.Worker && e.Blob && e.Promise && e.OffscreenCanvas && e.OffscreenCanvasRenderingContext2D && e.HTMLCanvasElement && e.HTMLCanvasElement.prototype.transferControlToOffscreen && e.URL && e.URL.createObjectURL);

        function l() {}

        function c(t) {
            var n = i.exports.Promise,
                a = void 0 !== n ? n : e.Promise;
            return "function" == typeof a ? new a(t) : (t(l, l), null)
        }
        var s, u, h, d, f, g, m, b, v, p = (h = Math.floor(1e3 / 60), d = {}, f = 0, "function" == typeof requestAnimationFrame && "function" == typeof cancelAnimationFrame ? (s = function(t) {
                var e = Math.random();
                return d[e] = requestAnimationFrame(function n(i) {
                    f === i || f + h - 1 < i ? (f = i, delete d[e], t()) : d[e] = requestAnimationFrame(n)
                }), e
            }, u = function(t) {
                d[t] && cancelAnimationFrame(d[t])
            }) : (s = function(t) {
                return setTimeout(t, h)
            }, u = function(t) {
                return clearTimeout(t)
            }), {
                frame: s,
                cancel: u
            }),
            y = (b = {}, function() {
                if (g) return g;
                if (!a && r) {
                    var e = ["var CONFETTI, SIZE = {}, module = {};", "(" + t.toString() + ")(this, module, true, SIZE);", "onmessage = function(msg) {", "  if (msg.data.options) {", "    CONFETTI(msg.data.options).then(function () {", "      if (msg.data.callback) {", "        postMessage({ callback: msg.data.callback });", "      }", "    });", "  } else if (msg.data.reset) {", "    CONFETTI.reset();", "  } else if (msg.data.resize) {", "    SIZE.width = msg.data.resize.width;", "    SIZE.height = msg.data.resize.height;", "  } else if (msg.data.canvas) {", "    SIZE.width = msg.data.canvas.width;", "    SIZE.height = msg.data.canvas.height;", "    CONFETTI = module.exports.create(msg.data.canvas);", "  }", "}"].join("\n");
                    try {
                        g = new Worker(URL.createObjectURL(new Blob([e])))
                    } catch (t) {
                        return void 0 !== typeof console && "function" == typeof console.warn && console.warn("ðŸŽŠ Could not load worker", t), null
                    }! function(t) {
                        function e(e, n) {
                            t.postMessage({
                                options: e || {},
                                callback: n
                            })
                        }
                        t.init = function(e) {
                            var n = e.transferControlToOffscreen();
                            t.postMessage({
                                canvas: n
                            }, [n])
                        }, t.fire = function(n, i, a) {
                            if (m) return e(n, null), m;
                            var o = Math.random().toString(36).slice(2);
                            return m = c(function(i) {
                                function r(e) {
                                    e.data.callback === o && (delete b[o], t.removeEventListener("message", r), m = null, a(), i())
                                }
                                t.addEventListener("message", r), e(n, o), b[o] = r.bind(null, {
                                    data: {
                                        callback: o
                                    }
                                })
                            })
                        }, t.reset = function() {
                            for (var e in t.postMessage({
                                    reset: !0
                                }), b) b[e](), delete b[e]
                        }
                    }(g)
                }
                return g
            }),
            w = {
                container: null,
                particleCount: 50,
                angle: 90,
                spread: 45,
                startVelocity: 45,
                decay: .9,
                gravity: 1,
                drift: 0,
                ticks: 200,
                x: .5,
                y: .5,
                shapes: ["square", "circle"],
                zIndex: 100,
                colors: ["#26ccff", "#a25afd", "#ff5e7e", "#88ff5a", "#fcff42", "#ffa62d", "#ff36ff"],
                disableForReducedMotion: !1,
                scalar: 1
            };

        function M(t, e, n) {
            return function(t, e) {
                return n ? n(t) : t
            }(t && null != t[e] ? t[e] : w[e])
        }

        function x(t) {
            return t < 0 ? 0 : Math.floor(t)
        }

        function C(t) {
            return parseInt(t, 16)
        }

        function S(t) {
            return t.map(k)
        }

        function k(t) {
            var e = String(t).replace(/[^0-9a-f]/gi, "");
            return e.length < 6 && (e = e[0] + e[0] + e[1] + e[1] + e[2] + e[2]), {
                r: C(e.substring(0, 2)),
                g: C(e.substring(2, 4)),
                b: C(e.substring(4, 6))
            }
        }

        function E(t) {
            t.width = document.documentElement.clientWidth, t.height = document.documentElement.clientHeight
        }

        function I(t) {
            var e = t.getBoundingClientRect();
            t.width = e.width, t.height = e.height
        }

        function T(t, e, n, i, r) {
            var l, s, u = e.slice(),
                h = t.getContext("2d"),
                d = c(function(e) {
                        function c() {
                            l = s = null, h.clearRect(0, 0, i.width, i.height), r(), e()
                        }
                        l = p.frame(function e() {
                                !a || i.width === o.width && i.height === o.height || (i.width = t.width = o.width, i.height = t.height = o.height), i.width || i.height || (n(t), i.width = t.width, i.height = t.height), h.clearRect(0, 0, i.width, i.height), (u = u.filter(function(t) {
                                        return function(t, e) {
                                            e.x += Math.cos(e.angle2D) * e.velocity + e.drift, e.y += Math.sin(e.angle2D) * e.velocity + e.gravity, e.wobble += e.wobbleSpeed, e.velocity *= e.decay, e.tiltAngle += .1, e.tiltSin = Math.sin(e.tiltAngle), e.tiltCos = Math.cos(e.tiltAngle), e.random = Math.random() + 2, e.wobbleX = e.x + 10 * e.scalar * Math.cos(e.wobble), e.wobbleY = e.y + 10 * e.scalar * Math.sin(e.wobble);
                                            var n = e.tick++/e.totalTicks,i=e.x+e.random*e.tiltCos,a=e.y+e.random*e.tiltSin,o=e.wobbleX+e.random*e.tiltCos,r=e.wobbleY+e.random*e.tiltSin;return t.fillStyle="rgba("+e.color.r+", "+e.color.g+", "+e.color.b+", "+(1-n)+")",t.beginPath(),"circle"===e.shape?t.ellipse?t.ellipse(e.x,e.y,Math.abs(o-i)*e.ovalScalar,Math.abs(r-a)*e.ovalScalar,Math.PI/
                                            10 * e.wobble, 0, 2 * Math.PI): function(t, e, n, i, a, o, r, l, c) {
                                            t.save(), t.translate(e, n), t.rotate(o), t.scale(i, a), t.arc(0, 0, 1, 0, l, void 0), t.restore()
                                        }(t, e.x, e.y, Math.abs(o - i) * e.ovalScalar, Math.abs(r - a) * e.ovalScalar, Math.PI / 10 * e.wobble, 0, 2 * Math.PI): (t.moveTo(Math.floor(e.x), Math.floor(e.y)), t.lineTo(Math.floor(e.wobbleX), Math.floor(a)), t.lineTo(Math.floor(o), Math.floor(r)), t.lineTo(Math.floor(i), Math.floor(e.wobbleY))), t.closePath(), t.fill(), e.tick < e.totalTicks
                                    }(h, t)
                                })).length ? l = p.frame(e) : c()
                        }), s = c
                });
        return {
            addFettis: function(t) {
                return u = u.concat(t), d
            },
            canvas: t,
            promise: d,
            reset: function() {
                l && p.cancel(l), s && s()
            }
        }
    }

    function R(t, i) {
        var a, o = !t,
            l = !!M(i || {}, "resize"),
            s = M(i, "disableForReducedMotion", Boolean),
            u = r && M(i || {}, "useWorker") ? y() : null,
            h = o ? E : I,
            d = !(!t || !u || !t.__confetti_initialized),
            f = "function" == typeof matchMedia && matchMedia("(prefers-reduced-motion)").matches;

        function g() {
            return n
        }

        function m(n) { 
            var i = s || M(n, "disableForReducedMotion", Boolean),
                r = M(n, "zIndex", Number);
            if (i && f) return c(function(t) {
                t()
            });
            o && a ? t = a.canvas : o && !t && (t = function(t) {
                var e = Math.round((g().getBoundingClientRect().width - window.innerWidth) / 2),
                    n = Math.round((g().getBoundingClientRect().height - window.innerHeight) / 2),
                    i = document.createElement("canvas");
                return i.style.position = "fixed", i.style.width = "100vw", i.style.height = "100vh", i.style.top = "0px", i.style.left = 0 + "px", i.style.pointerEvents = "none", i.style.zIndex = t, i
            }(r), g().appendChild(t)), l && !d && h(t);
            var m = {
                width: t.width,
                height: t.height
            };

            function b() {
                if (u) {
                    var e = {
                        getBoundingClientRect: function() {
                            if (!o) return t.getBoundingClientRect()
                        }
                    };
                    return h(e), void u.postMessage({
                        resize: {
                            width: e.width,
                            height: e.height
                        }
                    })
                }
                m.width = m.height = null
            }

            function v() {
                a = null, l && e.removeEventListener("resize", b), o && t && (g().removeChild(t), t = null, d = !1)
            }
            return u && !d && u.init(t), d = !0, u && (t.__confetti_initialized = !0), l && e.addEventListener("resize", b, !1), u ? u.fire(n, m, v) : function(e, n, i) {
                for (var o, r, l, c, s = M(e, "particleCount", x), u = M(e, "angle", Number), d = M(e, "spread", Number), f = M(e, "startVelocity", Number), g = M(e, "decay", Number), m = M(e, "gravity", Number), b = M(e, "drift", Number), v = M(e, "colors", S), p = M(e, "ticks", Number), y = M(e, "shapes"), w = M(e, "scalar"), C = function(t) {
                        var e = M(t, "origin", Object);
                        return e.x = M(e, "x", Number), e.y = M(e, "y", Number), e
                    }(e), k = s, E = [], I = t.width * C.x, R = t.height * C.y; k--;) E.push((r = (o = {
                    x: I,
                    y: R,
                    angle: u,
                    spread: d,
                    startVelocity: f,
                    color: v[k % v.length],
                    shape: y[(c = y.length, Math.floor(Math.random() * (c - 0)) + 0)],
                    ticks: p,
                    decay: g,
                    gravity: m,
                    drift: b,
                    scalar: w
                }).angle * (Math.PI / 180), l = o.spread * (Math.PI / 180), {
                    x: o.x,
                    y: o.y,
                    wobble: 10 * Math.random(),
                    wobbleSpeed: Math.min(.11, .1 * Math.random() + .05),
                    velocity: .5 * o.startVelocity + Math.random() * o.startVelocity,
                    angle2D: -r + (.5 * l - Math.random() * l),
                    tiltAngle: (.5 * Math.random() + .25) * Math.PI,
                    color: o.color,
                    shape: o.shape,
                    tick: 0,
                    totalTicks: o.ticks,
                    decay: o.decay,
                    drift: o.drift,
                    random: Math.random() + 2,
                    tiltSin: 0,
                    tiltCos: 0,
                    wobbleX: 0,
                    wobbleY: 0,
                    gravity: 3 * o.gravity,
                    ovalScalar: .6,
                    scalar: o.scalar
                }));
                return a ? a.addFettis(E) : (a = T(t, E, h, n, i)).promise
            }(n, m, v)
        }
        return m.reset = function() {
            u && u.reset(), a && a.reset()
        }, m
    }

    function F() {
        return v || (v = R(null, {
            useWorker: !0,
            resize: !0
        })), v
    }
    i.exports = function() {
        let t = arguments[0];
        return void 0 !== t.container && null === n && (n = null !== (n = null !== t.container && "string" == typeof t.container ? document.querySelector(t.container) : t.container) && n instanceof Element ? n : document.body, console.log(n)), F().apply(this, arguments)
    }, i.exports.reset = function() {
        F().reset()
    }, i.exports.create = R
}(function() {
    return void 0 !== t ? t : "undefined" != typeof self ? self : this || {}
}(), e, !1), t.confetti = e.exports
}(window, {});

window.mplConfetti = { 

    start(parent=null) {
        let count = window.innerWidth/2;
        count = count>=200 ? 200 : count;
        let port = (window.innerWidth<window.innerHeight);
        
        let defaults = {
            origin: {
                x:0.5,
                y: 0.6
            }
        };

        const fire = function(particleRatio, opts,parent=null) {
            confetti(Object.assign({}, defaults, opts, {
                container:parent,
                particleCount: Math.floor(count * particleRatio)
            }));
        }

        fire(0.25, {spread: 26,startVelocity: 60,},parent);
        fire(0.2, { spread: 60,},parent);
        fire(0.4, {spread: 100,decay: 0.91, scalar: 0.8},parent);
        fire(0.1, {spread: 120,startVelocity: 25,decay: 0.92,scalar: 1.2},parent);
        fire(0.05, {spread: 120,startVelocity: 35,},parent);
    },
};


