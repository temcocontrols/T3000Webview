// import { SVG, Element, extend, create } from "@svgdotjs/svg.js";


var svg = function (e) {
  return new SVG.Doc(e);
};

var SVG = {
  ns: "http://www.w3.org/2000/svg",
  xlink: "http://www.w3.org/1999/xlink",
  did: 0,
  create: function (e) {
    return document.createElementNS(this.ns, e);
  },
  extend: function (e, t) {
    for (var n in t) e.prototype[n] = t[n];
  },
};


// SVG.ns = "http://www.w3.org/2000/svg";
// SVG.xlink = "http://www.w3.org/1999/xlink";
// SVG.did = 0;

// SVG.create = create;

SVG.svg = function (e) {
  return new SVG.Doc(e);
};

SVG.Element = function (e) {
  (this.node = e) && (this.type = e.nodeName),
    (this.attrs = {
      "fill-opacity": 1,
      "stroke-opacity": 1,
      "stroke-width": 0,
      fill: "#000",
      stroke: "#000",
      opacity: 1,
      x: 0,
      y: 0,
      cx: 0,
      cy: 0,
      width: 0,
      height: 0,
      r: 0,
      rx: 0,
      ry: 0,
    }),
    (this.trans = {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      skewX: 0,
      skewY: 0,
    });
};

SVG. extend(SVG.Element, {
  move: function (e, t) {
    return this.attr({
      x: e,
      y: t,
    });
  },
  center: function (e, t) {
    var n = this.bbox();
    return this.move(e - n.width / 2, t - n.height / 2);
  },
  size: function (e, t) {
    return this.attr({
      width: e,
      height: t,
    });
  },
  clone: function () {
    var e;
    if (this instanceof SVG.Wrap)
      ((e = this.parent[this.child.node.nodeName]()).attrs = this.attrs),
        (e.child.trans = this.child.trans),
        e.child.attr(this.child.attrs).transform({}),
        e.plot &&
          e.plot(
            this.child.attrs[this.child instanceof SVG.Path ? "d" : "points"]
          );
    else {
      var t = this.node.nodeName;
      (e =
        "rect" == t
          ? this.parent[t](this.attrs.width, this.attrs.height)
          : "ellipse" == t
          ? this.parent[t](2 * this.attrs.rx, 2 * this.attrs.ry)
          : "image" == t
          ? this.parent[t](this.src)
          : "text" == t
          ? this.parent[t](this.content)
          : "g" == t
          ? this.parent.group()
          : this.parent[t]()).attr(this.attrs);
    }
    return (e.trans = this.trans), e.transform({});
  },
  remove: function () {
    return null != this.parent ? this.parent.remove(this) : void 0;
  },
  doc: function () {
    return this._parent(SVG.Doc);
  },
  nested: function () {
    return this._parent(SVG.Nested);
  },
  attr: function (e, t, n) {
    if (arguments.length < 2) {
      if ("object" != typeof e)
        return this._isStyle(e)
          ? "text" == e
            ? this.content
            : "leading" == e
            ? this[e]
            : this.style[e]
          : this.attrs[e];
      for (t in e) this.attr(t, e[t]);
    } else {
      if (((this.attrs[e] = t), "x" == e && this._isText()))
        for (var i = this.lines.length - 1; i >= 0; i--)
          this.lines[i].attr(e, t);
      else
        null != n
          ? this.node.setAttributeNS(n, e, t)
          : this.node.setAttribute(e, t);
      this._isStyle(e) &&
        ("text" == e
          ? this.text(t)
          : "leading" == e
          ? (this[e] = t)
          : (this.style[e] = t),
        this.text(this.content));
    }
    return this;
  },
  transform: function (e) {
    if ("string" == typeof e) return this.trans[e];
    var t,
      n = [];
    for (t in e) null != e[t] && (this.trans[t] = e[t]);
    if (0 != (e = this.trans).rotation) {
      var i = this.bbox();
      n.push(
        "rotate(" +
          e.rotation +
          "," +
          (null != e.cx ? e.cx : i.cx) +
          "," +
          (null != e.cy ? e.cy : i.cy) +
          ")"
      );
    }
    return (
      n.push("scale(" + e.scaleX + "," + e.scaleY + ")"),
      0 != e.skewX && n.push("skewX(" + e.skewX + ")"),
      0 != e.skewY && n.push("skewY(" + e.skewY + ")"),
      n.push("translate(" + e.x + "," + e.y + ")"),
      this.attr("transform", n.join(" "))
    );
  },
  data: function (e, t) {
    console.log("USE HVAC SVG TO SET DATA", e, t);

    if (arguments.length < 2)
       try {
        return JSON.parse(this.attr("data-" + e));
       } catch (t) {
         return this.attr("data-" + e);
       }
    else
      null === t
        ? this.node.removeAttribute("data-" + e)
        : this.attr("data-" + e, JSON.stringify(t));
    return this;
  },
  bbox: function () {
    var e = this.node.getBBox();
    return {
      x: e.x + this.trans.x,
      y: e.y + this.trans.y,
      cx: e.x + this.trans.x + e.width / 2,
      cy: e.y + this.trans.y + e.height / 2,
      width: e.width,
      height: e.height,
    };
  },
  rbox: function () {
    var e = this.node.getBoundingClientRect();
    return {
      x: e.left,
      y: e.top,
      width: e.width,
      height: e.height,
    };
  },
  inside: function (e, t) {
    var n = this.bbox();
    return e > n.x && t > n.y && e < n.x + n.width && t < n.y + n.height;
  },
  show: function () {
    return (this.node.style.display = ""), this;
  },
  hide: function () {
    return (this.node.style.display = "none"), this;
  },
  visible: function () {
    return "none" != this.node.style.display;
  },
  _parent: function (e) {
    for (var t = this; null != t && !(t instanceof e); ) t = t.parent;
    return t;
  },
  _isStyle: function (e) {
    return (
      !("string" != typeof e || !this._isText()) && /^font|text|leading/.test(e)
    );
  },
  _isText: function () {
    return this instanceof SVG.Text;
  },
});

SVG.Container = function (e) {
  this.constructor.call(this, e);
};

SVG.Container.prototype = new SVG.Element();

SVG. extend(SVG.Container, {
  add: function (e, t) {
    if (!this.has(e)) {
      t = t == null ? this.children().length : t;
      this.children().splice(t, 0, e);
      this.node.insertBefore(e.node, this.node.childNodes[t] || null);
      e.parent = this;
    }
    return this;
  },
  put: function (e, t) {
    return this.add(e, t), e;
  },
  has: function (e) {
    return this.children().indexOf(e) >= 0;
  },
  children: function () {
    return this._children || (this._children = []);
  },
  each: function (e) {
    var t,
      n = this.children();
    for (t = 0, length = n.length; t < length; t++)
      n[t] instanceof SVG.Shape && e.apply(n[t], [t, n]);
    return this;
  },
  remove: function (e) {
    return this.removeAt(this.children().indexOf(e));
  },
  removeAt: function (e) {
    if (0 <= e && e < this.children().length) {
      var t = this.children()[e];
      this.children().splice(e, 1),
        this.node.removeChild(t.node),
        (t.parent = null);
    }
    return this;
  },
  defs: function () {
    return this._defs || (this._defs = this.put(new SVG.Defs(), 0));
  },
  level: function () {
    return this.remove(this.defs()).put(this.defs(), 0);
  },
  group: function () {
    return this.put(new SVG.G());
  },
  rect: function (e, t) {
    return this.put(new SVG.Rect().size(e, t));
  },
  circle: function (e) {
    return this.ellipse(e);
  },
  ellipse: function (e, t) {
    return this.put(new SVG.Ellipse().size(e, t));
  },
  polyline: function (e) {
    return this.put(new SVG.Wrap(new SVG.Polyline())).plot(e);
  },
  polygon: function (e) {
    return this.put(new SVG.Wrap(new SVG.Polygon())).plot(e);
  },
  path: function (e) {
    return this.put(new SVG.Wrap(new SVG.Path())).plot(e);
  },
  image: function (e, t, n) {
    return (
      (t = null != t ? t : 100),
      this.put(new SVG.Image().load(e).size(t, null != n ? n : t))
    );
  },
  text: function (e) {
    return this.put(new SVG.Text().text(e));
  },
  nested: function () {
    return this.put(new SVG.Nested());
  },
  gradient: function (e, t) {
    return this.defs().gradient(e, t);
  },
  pattern: function (e, t, n) {
    return this.defs().pattern(e, t, n);
  },
  mask: function () {
    return this.defs().put(new SVG.Mask());
  },
  first: function () {
    return this.children()[0] instanceof SVG.Defs
      ? this.children()[1]
      : this.children()[0];
  },
  last: function () {
    return this.children()[this.children().length - 1];
  },
  clear: function () {
    for (this._children = []; this.node.hasChildNodes(); )
      this.node.removeChild(this.node.lastChild);
    return this;
  },
});

SVG.FX = function (e) {
  this.target = e;
};

SVG. extend(SVG.FX, {
  animate: function (e, t) {
    (e = null == e ? 1000 : e), (t = t || "<>");
    var n,
      i,
      o,
      r = this.target,
      a = this,
      s = new Date().getTime(),
      c = s + e;
    return (
      (this.interval = setInterval(
        function () {
          var l,
            u = new Date().getTime(),
            p = u > c ? 1 : (u - s) / e;
          if (null == n) for (var h in ((n = []), a.attrs)) n.push(h);
          if (null == i) {
            for (var h in ((i = []), a.trans)) i.push(h);
            o = {};
          }
          for (
            p =
              "<>" == t
                ? -Math.cos(p * Math.PI) / 2 + 0.5
                : ">" == t
                ? Math.sin((p * Math.PI) / 2)
                : "<" == t
                ? 1 - Math.cos((p * Math.PI) / 2)
                : "-" == t
                ? p
                : "function" == typeof t
                ? t(p)
                : p,
              a._move
                ? r.move(a._at(a._move.x, p), a._at(a._move.y, p))
                : a._center &&
                  r.move(a._at(a._center.x, p), a._at(a._center.y, p)),
              a._size &&
                r.size(a._at(a._size.width, p), a._at(a._size.height, p)),
              l = n.length - 1;
            l >= 0;
            l--
          )
            r.attr(n[l], a._at(a.attrs[n[l]], p));
          if (i.length > 0) {
            for (l = i.length - 1; l >= 0; l--)
              o[i[l]] = a._at(a.trans[i[l]], p);
            r.transform(o);
          }
          u > c &&
            (clearInterval(a.interval),
            a._after ? a._after.apply(r, [a]) : a.stop());
        },
        e > 10 ? 10 : e
      )),
      this
    );
  },
  attr: function (e, t, n) {
    if ("object" == typeof e) for (var i in e) this.attr(i, e[i]);
    else
      this.attrs[e] = {
        from: this.target.attr(e),
        to: t,
      };
    return this;
  },
  transform: function (e) {
    for (var t in e)
      this.trans[t] = {
        from: this.target.trans[t],
        to: e[t],
      };
    return this;
  },
  move: function (e, t) {
    var n = this.target.bbox();
    return (
      (this._move = {
        x: {
          from: n.x,
          to: e,
        },
        y: {
          from: n.y,
          to: t,
        },
      }),
      this
    );
  },
  size: function (e, t) {
    var n = this.target.bbox();
    return (
      (this._size = {
        width: {
          from: n.width,
          to: e,
        },
        height: {
          from: n.height,
          to: t,
        },
      }),
      this
    );
  },
  center: function (e, t) {
    var n = this.target.bbox();
    return (
      (this._move = {
        x: {
          from: n.cx,
          to: e,
        },
        y: {
          from: n.cy,
          to: t,
        },
      }),
      this
    );
  },
  after: function (e) {
    return (this._after = e), this;
  },
  stop: function () {
    return (
      clearInterval(this.interval),
      (this.attrs = {}),
      (this.trans = {}),
      (this._move = null),
      (this._size = null),
      (this._after = null),
      this
    );
  },
  _at: function (e, t) {
    return "number" == typeof e.from
      ? e.from + (e.to - e.from) * t
      : e.to.r || /^#/.test(e.to)
      ? this._color(e, t)
      : t < 1
      ? e.from
      : e.to;
  },
  _color: function (e, t) {
    var n, i;
    return (
      (n = this._h2r(e.from || "#000")),
      (i = this._h2r(e.to)),
      this._r2h({
        r: ~~(n.r + (i.r - n.r) * t),
        g: ~~(n.g + (i.g - n.g) * t),
        b: ~~(n.b + (i.b - n.b) * t),
      })
    );
  },
  _h2r: function (e) {
    var t = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(this._fh(e));
    return t
      ? {
          r: parseInt(t[1], 16),
          g: parseInt(t[2], 16),
          b: parseInt(t[3], 16),
        }
      : {
          r: 0,
          g: 0,
          b: 0,
        };
  },
  _r2h: function (e) {
    return "#" + this._c2h(e.r) + this._c2h(e.g) + this._c2h(e.b);
  },
  _c2h: function (e) {
    var t = e.toString(16);
    return 1 == t.length ? "0" + t : t;
  },
  _fh: function (e) {
    return 4 == e.length
      ? [
          "#",
          e.substring(1, 2),
          e.substring(1, 2),
          e.substring(2, 3),
          e.substring(2, 3),
          e.substring(3, 4),
          e.substring(3, 4),
        ].join("")
      : e;
  },
});

SVG. extend(SVG.Element, {
  animate: function (e, t) {
    return (this._fx || (this._fx = new SVG.FX(this))).stop().animate(e, t);
  },
  stop: function () {
    return this._fx.stop(), this;
  },
});

SVG.on = function (e, t, n) {
  e.addEventListener
    ? e.addEventListener(t, n, !1)
    : e.attachEvent("on" + t, n);
};

SVG.off = function (e, t, n) {
  e.removeEventListener
    ? e.removeEventListener(t, n, !1)
    : e.detachEvent("on" + t, n);
};

SVG.extend(SVG.Element, {
  on: function (e, t) {
    return SVG.on(this.node, e, t), this;
  },
  off: function (e, t) {
    return SVG.off(this.node, e, t), this;
  },
});

SVG.G = function () {
  this.constructor.call(this, SVG.create("g"));
};

SVG.G.prototype = new SVG.Container();

SVG.extend(SVG.G, {
  defs: function () {
    return this.doc().defs();
  },
});

SVG. extend(SVG.Element, {
  siblings: function () {
    return this.parent.children();
  },
  position: function () {
    return this.siblings().indexOf(this);
  },
  next: function () {
    return this.siblings()[this.position() + 1];
  },
  previous: function () {
    return this.siblings()[this.position() - 1];
  },
  forward: function () {
    return this.parent.remove(this).put(this, this.position() + 1);
  },
  backward: function () {
    var e;
    return (
      this.parent.level(),
      (e = this.position()) > 1 && this.parent.remove(this).add(this, e - 1),
      this
    );
  },
  front: function () {
    return this.parent.remove(this).put(this);
  },
  back: function () {
    return (
      this.parent.level(),
      this.position() > 1 && this.parent.remove(this).add(this, 0),
      this
    );
  },
});

SVG.Defs = function () {
  this.constructor.call(this, SVG.create("defs"));
};

SVG.Defs.prototype = new SVG.Container();

SVG.Mask = function () {
  this.constructor.call(this, SVG.create("mask")),
    this.attr("id", (this.id = "svgjs_element_" + SVG.did++));
};

SVG.Mask.prototype = new SVG.Container();

SVG. extend(SVG.Element, {
  maskWith: function (e) {
    return (
      (this.mask = e instanceof SVG.Mask ? e : this.parent.mask().add(e)),
      this.attr("mask", "url(#" + this.mask.id + ")")
    );
  },
});

SVG.Pattern = function (e) {
  this.constructor.call(this, SVG.create("pattern")),
    this.attr("id", (this.id = "svgjs_element_" + SVG.did++));
};

SVG.Pattern.prototype = new SVG.Container();

SVG. extend(SVG.Pattern, {
  fill: function () {
    return "url(#" + this.id + ")";
  },
});

SVG. extend(SVG.Defs, {
  pattern: function (e, t, n) {
    var i = this.put(new SVG.Pattern());
    return (
      n(i),
      i.attr({
        x: 0,
        y: 0,
        width: e,
        height: t,
        patternUnits: "userSpaceOnUse",
      })
    );
  },
});

SVG.Gradient = function (e) {
  this.constructor.call(this, SVG.create(e + "Gradient")),
    this.attr("id", (this.id = "svgjs_element_" + SVG.did++)),
    (this.type = e);
};

SVG.Gradient.prototype = new SVG.Container();

SVG. extend(SVG.Gradient, {
  from: function (e, t) {
    return "radial" == this.type
      ? this.attr({
          fx: e + "%",
          fy: t + "%",
        })
      : this.attr({
          x1: e + "%",
          y1: t + "%",
        });
  },
  to: function (e, t) {
    return "radial" == this.type
      ? this.attr({
          cx: e + "%",
          cy: t + "%",
        })
      : this.attr({
          x2: e + "%",
          y2: t + "%",
        });
  },
  radius: function (e) {
    return "radial" == this.type
      ? this.attr({
          r: e + "%",
        })
      : this;
  },
  at: function (e) {
    return this.put(new SVG.Stop(e));
  },
  update: function (e) {
    for (; this.node.hasChildNodes(); )
      this.node.removeChild(this.node.lastChild);
    return e(this), this;
  },
  fill: function () {
    return "url(#" + this.id + ")";
  },
});

SVG. extend(SVG.Defs, {
  gradient: function (e, t) {
    var n = this.put(new SVG.Gradient(e));
    return t(n), n;
  },
});

SVG.Stop = function (e) {
  this.constructor.call(this, SVG.create("stop")), this.update(e);
};

SVG.Stop.prototype = new SVG.Element();

SVG. extend(SVG.Stop, {
  update: function (e) {
    var t,
      n = "",
      i = ["opacity", "color"];
    for (t = i.length - 1; t >= 0; t--)
      null != e[i[t]] && (n += "stop-" + i[t] + ":" + e[i[t]] + ";");
    return this.attr({
      offset: (null != e.offset ? e.offset : this.attrs.offset || 0) + "%",
      style: n,
    });
  },
});

SVG.Doc = function (e) {
  this.constructor.call(this, SVG.create("svg")),
    (this.parent = "string" == typeof e ? document.getElementById(e) : e),
    this.attr({
      xmlns: SVG.ns,
      version: "1.1",
      width: "100%",
      height: "100%",
    })
      .attr("xmlns:xlink", SVG.xlink)
      .attr("xlink", SVG.xlink, SVG.ns)
      .defs(),
    this.stage();
};

SVG.Doc.prototype = new SVG.Container();

SVG.Doc.prototype.stage = function () {
  const parentElement = this.parent;
  const newDiv = document.createElement("div");

  // Set the style for the new div
  newDiv.style.cssText = "position:relative;height:100%;";

  // Append the new div to the parent element
  if (parentElement) {
    parentElement.appendChild(newDiv);
  } else {
    this.parent = document.createElement("div");
    this.parent.appendChild(newDiv);
  }

  // Append the current node to the new div
  newDiv.appendChild(this.node);

  // Define a function to handle the document ready state
  const handleReadyState = () => {
    if (document.readyState === "complete") {
      // Set the style for the current node
      this.attr("style", "position:absolute;overflow:hidden;");

      // Use a timeout to change the style and re-append the node
      setTimeout(() => {
        this.attr("style", "position:relative;overflow:hidden;");
        try {
          parentElement.removeChild(this.node.parentNode);
          this.node.parentNode.removeChild(this.node);
          parentElement.appendChild(this.node);
        } catch (error) {
          // Handle any errors that occur during the DOM manipulation
          console.error(error);
        }
      }, 5);
    } else {
      // If the document is not ready, check again after 10 milliseconds
      setTimeout(handleReadyState, 10);
    }
  };

  // Immediately invoke the handleReadyState function
  handleReadyState();

  return this;
};

SVG.Shape = function (e) {
  this.constructor.call(this, e);
};

SVG.Shape.prototype = new SVG.Element();

SVG.Wrap = function (e) {
  this.constructor.call(this, SVG.create("g")),
    this.node.insertBefore(e.node, null),
    (this.child = e),
    (this.type = e.node.nodeName);
};

SVG.Wrap.prototype = new SVG.Shape();

SVG. extend(SVG.Wrap, {
  move: function (e, t) {
    return this.transform({
      x: e,
      y: t,
    });
  },
  size: function (e, t) {
    var n = e / this._b.width;
    return (
      this.child.transform({
        scaleX: n,
        scaleY: null != t ? t / this._b.height : n,
      }),
      this
    );
  },
  center: function (e, t) {
    return this.move(
      e + (this._b.width * this.child.trans.scaleX) / -2,
      t + (this._b.height * this.child.trans.scaleY) / -2
    );
  },
  attr: function (e, t, n) {
    if ("object" == typeof e) for (t in e) this.attr(t, e[t]);
    else {
      if (arguments.length < 2)
        return "transform" == e ? this.attrs[e] : this.child.attrs[e];
      "transform" == e
        ? ((this.attrs[e] = t),
          null != n
            ? this.node.setAttributeNS(n, e, t)
            : this.node.setAttribute(e, t))
        : this.child.attr(e, t, n);
    }
    return this;
  },
  plot: function (e) {
    return (
      this.child.plot(e),
      (this._b = this.child.bbox()),
      this.child.transform({
        x: -this._b.x,
        y: -this._b.y,
      }),
      this
    );
  },
});

SVG.Rect = function () {
  this.constructor.call(this, SVG.create("rect"));
};

SVG.Rect.prototype = new SVG.Shape();

SVG.Ellipse = function () {
  this.constructor.call(this, SVG.create("ellipse"));
};

SVG.Ellipse.prototype = new SVG.Shape();

SVG. extend(SVG.Ellipse, {
  move: function (e, t) {
    return (this.attrs.x = e), (this.attrs.y = t), this.center();
  },
  size: function (e, t) {
    return this.attr({
      rx: e / 2,
      ry: (null != t ? t : e) / 2,
    }).center();
  },
  center: function (e, t) {
    return this.attr({
      cx: e || (this.attrs.x || 0) + (this.attrs.rx || 0),
      cy: t || (this.attrs.y || 0) + (this.attrs.ry || 0),
    });
  },
});

SVG.Line = function () {
  this.constructor.call(this, SVG.create("line"));
};

SVG.Line.prototype = new SVG.Shape();

SVG. extend(SVG.Line, {
  move: function (e, t) {
    var n = this.bbox();
    return this.attr({
      x1: this.attr("x1") - n.x + e,
      y1: this.attr("y1") - n.y + t,
      x2: this.attr("x2") - n.x + e,
      y2: this.attr("y2") - n.y + t,
    });
  },
  center: function (e, t) {
    var n = this.bbox();
    return this.move(e - n.width / 2, t - n.height / 2);
  },
  size: function (e, t) {
    var n = this.bbox();
    return (
      this.attr(this.attr("x1") < this.attr("x2") ? "x2" : "x1", n.x + e),
      this.attr(this.attr("y1") < this.attr("y2") ? "y2" : "y1", n.y + t)
    );
  },
});

SVG. extend(SVG.Container, {
  line: function (e, t, n, i) {
    return this.put(
      new SVG.Line().attr({
        x1: e,
        y1: t,
        x2: n,
        y2: i,
      })
    );
  },
});

SVG.Poly = {
  plot: function (e) {
    return this.attr("points", e || "0,0"), this;
  },
};

SVG.Polyline = function () {
  this.constructor.call(this, SVG.create("polyline"));
};

SVG.Polyline.prototype = new SVG.Shape();

SVG. extend(SVG.Polyline, SVG.Poly);

SVG.Polygon = function () {
  this.constructor.call(this, SVG.create("polygon"));
};

SVG.Polygon.prototype = new SVG.Shape();

SVG. extend(SVG.Polygon, SVG.Poly);

SVG.Path = function () {
  this.constructor.call(this, SVG.create("path"));
};

SVG.Path.prototype = new SVG.Shape();

SVG. extend(SVG.Path, {
  move: function (e, t) {
    this.transform({
      x: e,
      y: t,
    });
  },
  plot: function (e) {
    return this.attr("d", e || "M0,0");
  },
});

SVG.Image = function () {
  this.constructor.call(this, SVG.create("image"));
};

SVG.Image.prototype = new SVG.Shape();

SVG. extend(SVG.Image, {
  load: function (e) {
    return (this.src = e), e ? this.attr("xlink:href", e, SVG.xlink) : this;
  },
});

var e = ["size", "family", "weight", "stretch", "variant", "style"];

function t() {
  this.constructor.call(this, SVG.create("tspan"));
}

SVG.Text = function () {
  this.constructor.call(this, SVG.create("text")),
    (this.style = {
      "font-size": 16,
      "font-family": "Helvetica",
      "text-anchor": "start",
    }),
    (this.leading = 1.2);
};

SVG.Text.prototype = new SVG.Shape();

SVG. extend(SVG.Text, {
  text: function (e) {
    (this.content = e = e || "text"), (this.lines = []);
    for (
      var n,
        i,
        o,
        r = this._style(),
        a = (this.doc(), e.split("\n")),
        s = this.style["font-size"];
      this.node.hasChildNodes();

    )
      this.node.removeChild(this.node.lastChild);
    for (n = 0, i = a.length; n < i; n++)
      (o = new t().text(a[n]).attr({
        dy: s * this.leading - (0 == n ? 0.3 * s : 0),
        x: this.attrs.x || 0,
        style: r,
      })),
        this.node.appendChild(o.node),
        this.lines.push(o);
    return this.attr("style", r);
  },
  _style: function () {
    var t,
      n = "";
    for (t = e.length - 1; t >= 0; t--)
      null != this.style["font-" + e[t]] &&
        (n += "font-" + e[t] + ":" + this.style["font-" + e[t]] + ";");
    return (n += "text-anchor:" + this.style["text-anchor"] + ";");
  },
});

t.prototype = new SVG.Shape();

SVG. extend(t, {
  text: function (e) {
    return this.node.appendChild(document.createTextNode(e)), this;
  },
});

SVG.Nested = function () {
  this.constructor.call(this, SVG.create("svg")),
    this.attr("overflow", "visible");
};

SVG.Nested.prototype = new SVG.Container();

SVG._stroke = [
  "color",
  "width",
  "opacity",
  "linecap",
  "linejoin",
  "miterlimit",
  "dasharray",
  "dashoffset",
];

SVG._fill = ["color", "opacity", "rule"];

var n = function (e, t) {
  return "color" == t ? e : e + "-" + t;
};

["fill", "stroke"].forEach(function (e) {
  SVG.Shape.prototype[e] = function (t) {
    var i;
    if ("string" == typeof t) this.attr(e, t);
    else
      for (i = SVG["_" + e].length - 1; i >= 0; i--)
        null != t[SVG["_" + e][i]] &&
          this.attr(n(e, SVG["_" + e][i]), t[SVG["_" + e][i]]);
    return this;
  };
});

[(SVG.Element, SVG.FX)].forEach(function (e) {
  e &&
    SVG. extend(e, {
      rotate: function (e) {
        return this.transform({
          rotation: e || 0,
        });
      },
      skew: function (e, t) {
        return this.transform({
          skewX: e || 0,
          skewY: t || 0,
        });
      },
      scale: function (e, t) {
        return this.transform({
          scaleX: e,
          scaleY: null == t ? e : t,
        });
      },
      opacity: function (e) {
        return this.attr("opacity", e);
      },
    });
});

SVG.G &&
  SVG. extend(SVG.G, {
    move: function (e, t) {
      return this.transform({
        x: e,
        y: t,
      });
    },
  });

SVG.Text &&
  SVG. extend(SVG.Text, {
    font: function (t) {
      var n,
        i = {};
      for (n in t)
        "leading" == n
          ? (i[n] = t[n])
          : "anchor" == n
          ? (i["text-anchor"] = t[n])
          : e.indexOf(n) > -1 && (i["font-" + n] = t[n]);
      return this.attr(i).text(this.content);
    },
  });

[
  "click",
  "dblclick",
  "mousedown",
  "mouseup",
  "mouseover",
  "mouseout",
  "mousemove",
  "mouseenter",
  "mouseleave",
  "touchstart",
  "touchend",
  "touchmove",
  "touchcancel",
].forEach(function (e) {
  SVG.Element.prototype[e] = function (t) {
    var n = this;
    return (
      (this.node["on" + e] =
        "function" == typeof t
          ? function () {
              return t.apply(n, arguments);
            }
          : null),
      this
    );
  };
});
/*
extend(Element.prototype, {});
extend(Element, {
  t1: function () {
    console.log(
      `Hvac.SVG.js extend svg.js Element ${this.type.toString()}---------------------------------------`,
      this
    );
  },
  // data: function () {
  //   console.log("extend Element data", this);
  // },
});
*/
const HvacSVG = SVG;

export default HvacSVG;
