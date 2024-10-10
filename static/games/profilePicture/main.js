async function encode64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 64;
                canvas.height = 64;
                ctx.drawImage(img, 0, 0, 64, 64);
                const dataUrl = canvas.toDataURL('image/png');
                resolve(dataUrl);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function decode64(base64) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = base64;
    });
}

document.getElementById('encodeButton').addEventListener('click', async () => {
    const fileInput = document.getElementById('inputFile');
    if (fileInput.files.length > 0) {
        try {
            const base64 = await encode64(fileInput.files[0]);
            uploadImage(base64);
            let img = document.createElement('img');
            img.src = base64;
            let body = document.getElementsByTagName('body')[0];
            body.appendChild(img);
        } catch (error) {
            console.error('Error encoding image:', error);
        }
    } else {
        alert('Please select an image file first.');
    }
});

async function updateField(collection, docId, fieldName, fieldValue) {
    console.log()
    const docRef = doc(firestore, collection, docId);
    try {
        await setDoc(docRef, {
            [fieldName]: fieldValue  // Replace 'newFieldName' and 'newValue' with your field name and value
        }, { merge: true });
        console.log("Field added or updated successfully");
    } catch (error) {
        console.error("Error adding or updating field: ", error);
    }
}
async function uploadImage(img) {
    const username = getCookie('user');
    updateField('data', 'profilePics', username, img);
}
