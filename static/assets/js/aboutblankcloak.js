function AB() {
  let inFrame

  try {
    inFrame = window !== top
  } catch (e) {
    inFrame = true
  }
  // Checks if it isn't in iframe, and if it is not in Firefox.
  if (!inFrame && !navigator.userAgent.includes('Firefox')) {
    const popup = open('about:blank', '_blank');
    if (!popup || popup.closed) {
      // alert('Please allow popups and redirects.')
    } else {
      const doc = popup.document
      // Creates a iframe to the website.
      const iframe = doc.createElement('iframe');
      const { style } = iframe;
      const link = doc.createElement('link');
      const script = doc.createElement('script');
      let name;
      let icon;
      if (localStorage.getItem("nameAB") !== null) {
        name = localStorage.getItem("nameAB");
      }
      else {
        name = 'WebGFA';
      }
      if (localStorage.getItem("icoAB") !== null) {
        icon = localStorage.getItem("icoAB");
      }
      else {
        icon = '/favicon.ico';
      }
      doc.title = name;
      link.rel = 'icon';
      link.href = icon;
      script.innerHTML = "window.onbeforeunload = function() {return ''}"
      iframe.src = location.href;
      style.position = 'fixed';
      style.top = style.bottom = style.left = style.right = 0;
      style.border = style.outline = 'none';
      style.width = style.height = '100%';
      doc.head.appendChild(link);
      doc.body.appendChild(iframe);
      doc.body.appendChild(script);
      location.replace('https://hwps.schoology.com');
    }
  }
}

AB();

