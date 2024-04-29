async function getProfilePic(){
    if (!firestore) {
        console.error("'/code/universalCode/firestore.js' isn't loaded!");
        return;
    }
    let docRef = doc(firestore, 'data', 'profilePic');
    let doc = await getDoc(docRef);
    if (!doc) window.profilePic = null; return;
    let docData = doc.data();
    const username = getCookie('user');
    names = Object.keys(docData);
    imgs = Object.values(docData);
    let index = names.indexOf(username);
    if (index === -1) window.profilePic = null; return;
    window.profilePic = imgs[index];
}
