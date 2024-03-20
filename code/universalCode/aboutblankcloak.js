function AB() {
    let inFrame
  
    try {
      inFrame = window !== top
    } catch (e) {
      inFrame = true
    }
  
    if (!inFrame && !navigator.userAgent.includes('Firefox')) {
      const popup = open('about:blank', '_blank')
      if (!popup || popup.closed) {
        alert('Please allow popups and redirects.')
      } else {
        const doc = popup.document
        const iframe = doc.createElement('iframe')
        const style = iframe.style
        const link = doc.createElement('link')
        const name = 'My Drive - Google Drive'
        const icon = 'https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png'
        doc.title = name
        link.rel = 'icon'
        link.href = icon
        iframe.src = location.href
        style.position = 'fixed'
        style.top = style.bottom = style.left = style.right = 0
        style.border = style.outline = 'none'
        style.width = style.height = '100%'
        doc.head.appendChild(link)
        doc.body.appendChild(iframe)
        location.replace('https://hwps.schoology.com')
      }
    }
  }