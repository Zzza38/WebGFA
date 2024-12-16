let analytics = () => {
    let analytics = {};
    analytics.user = localStorage.getItem('user')
    analytics.UID = localStorage.getItem('UID')
    analytics.page = location.pathname
    analytics.data = Object(localStorage.getItem('analytics'))
    if (!analytics.data) analytics.data = {sites: []}

    return analytics
}