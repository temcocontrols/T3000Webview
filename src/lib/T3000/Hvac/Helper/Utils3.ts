


class Utils3 {

  static CloneToDoc(e, t) {
    for (
      var a = document.createElementNS(e.namespaceURI, e.nodeName),
      r = 0,
      i = e.attributes.length;
      r < i;
      ++r
    ) {
      var n = e.attributes[r],
        o = n.nodeName;
      o.length &&
        (
          o[0] >= 'A' &&
          o[0] <= 'Z' &&
          (o = o.toLowerCase()),
          t ? '' !== n.nodeValue &&
            'xmlns' != o &&
            a.setAttribute(o, n.nodeValue) : '' !== n.nodeValue &&
          a.setAttribute(o, n.nodeValue)
        )
    }
    for (r = 0, i = e.childNodes.length; r < i; ++r) {
      var s = e.childNodes[r];
      1 == s.nodeType ? a.insertBefore(this.CloneToDoc(s, t), null) : a.insertBefore(document.createTextNode(s.nodeValue), null)
    }
    return a
  }

  static XML2Str(e) {
    try {
      return (new XMLSerializer).serializeToString(e)
    } catch (t) {
      try {
        return e.xml
      } catch (e) {
        alert('Xmlserializer not supported')
      }
    }
    return !1
  }

  static StrEscapeRegExp(e) {
    return e.replace(/([.*+?\^=!:${}()|\[\]\/\\])/g, '\\$1')
  }

  static StrReplaceAll(e, t, a) {
    return a.replace(new RegExp(this.StrEscapeRegExp(e), 'g'), t)
  }
}

export default Utils3
