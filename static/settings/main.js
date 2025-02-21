// load particles.js
particlesJS.load('particles-js', 'particles.json', function () {
    console.log('callback - particles.js config loaded');
});

// Customization menu
let isCusMenuOpen = false;
function handleCustomization() {
    isCusMenuOpen = !isCusMenuOpen; // Toggle the menu state
    let button = document.getElementById('cus-toggleMenu');
    let menu = document.getElementById('cus-menu');
    let defaultColors = {
        main: "#007bff",
        mainText: "#ffffff",
        buttonText: "#ffffff",
        bg: "#000000"
    };

    if (!localStorage.getItem('cus-mainColor') || localStorage.getItem('cus-mainColor') === localStorage.getItem('cus-bgColor')) {
        Object.values(defaultColors).forEach((color, i) => {
            const keyName = Object.keys(defaultColors)[i];
            localStorage.setItem(`cus-${keyName}Color`, color);
        });
    }

    if (isCusMenuOpen) {
        menu.style.display = ''; // Show menu
        button.innerText = 'Close Customization Menu';
        document.getElementById('cus-resetDefault').addEventListener('click', resetToDefaultColors);

        // Set the initial color of each picker from localStorage
        Object.keys(pickrs).forEach((key) => {
            const color = localStorage.getItem(`cus-${key}Color`);
            pickrs[key].setColor(color);
        });
    } else {
        menu.style.display = 'none'; // Hide menu
        button.innerText = 'Open Customization Menu';
    }
}
function resetToDefaultColors() {
    let defaultColors = {
        main: "#007bff",
        mainText: "#ffffff",
        buttonText: "#ffffff",
        bg: "#000000"
    };
    Object.keys(pickrs).forEach((key) => {
        pickrs[key].setColor(defaultColors[key]);
    });
}
function handleColorChange(picker, color) {
    let colorValue = color.toHEXA().toString();
    localStorage.setItem(`cus-${picker.options.el.id.split('-')[1]}`, colorValue);

    switch (picker.options.el.id) {
        case 'cus-mainColor':
            let buttons = document.getElementsByClassName('game-link');
            for (let i = 0; i < buttons.length; i++) {
                buttons[i].style.backgroundColor = colorValue;
            }
            break;
        case 'cus-mainTextColor':
            document.body.style.color = colorValue;
            break;
        case 'cus-buttonTextColor':
            let buttons1 = document.getElementsByClassName('game-link');
            for (let i = 0; i < buttons1.length; i++) {
                buttons1[i].style.color = colorValue;
            }
            break;
        case 'cus-bgColor':
            document.body.style.backgroundColor = colorValue;
            break;
        default:
            break;
    }
}
function loadCustomization() {
    Object.keys(pickrs).forEach((key) => {
        const color = localStorage.getItem(`cus-${key}Color`);
        pickrs[key].setColor(color);
    });
}
const pickrOptions = {
    theme: 'classic',
    default: '#000000',
    swatches: [
        '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722', '#795548', '#9E9E9E', '#607D8B'
    ],
    components: {
        preview: true,
        opacity: true,
        hue: true,
        interaction: {
            hex: true,
            rgba: true,
            hsla: true,
            hsva: true,
            cmyk: true,
            input: true,
            clear: true,
            save: true
        }
    }
};
const pickrs = {
    main: Pickr.create({
        el: '#cus-mainColor',
        ...pickrOptions
    }),
    mainText: Pickr.create({
        el: '#cus-mainTextColor',
        ...pickrOptions
    }),
    buttonText: Pickr.create({
        el: '#cus-buttonTextColor',
        ...pickrOptions
    }),
    bg: Pickr.create({
        el: '#cus-bgColor',
        ...pickrOptions
    })
};
Object.keys(pickrs).forEach((key) => {
    pickrs[key].on('save', (color) => handleColorChange(pickrs[key], color));
});
document.getElementById('cus-toggleMenu').addEventListener('click', handleCustomization);

// it doesnt want to work without a timeout
// even 1 ms works
// and yes i tried to use DOMContentLoaded
// but it still doesnt work
setTimeout(loadCustomization, 1);

// Cloaking
document.addEventListener('DOMContentLoaded', () => {
    const cloakPresets = {
        'Default': {
            icoAB: '/favicon.ico',
            nameAB: 'WebGFA'
        },
        'Clever': {
            icoAB: '/assets/media/images/clever.png',
            nameAB: 'Clever | Portal'
        },
        'Canvas': {
            icoAB: '/assets/media/images/canvas.png',
            nameAB: 'Dashboard'
        },
        'Edpuzzle': {
            icoAB: '/assets/media/images/edpuzzle.png',
            nameAB: 'Edpuzzle'
        },
        'Google': {
            icoAB: '/assets/media/images/google.png',
            nameAB: 'Google'
        },
        'Google Meet': {
            icoAB: '/assets/media/images/google-meet.png',
            nameAB: 'Google Meet'
        },
        'Classroom': {
            icoAB: '/assets/media/images/classroom.png',
            nameAB: 'Home'
        },
        'Drive': {
            icoAB: '/assets/media/images/drive.png',
            nameAB: 'My Drive - Google Drive'
        },
        'Google Docs': {
            icoAB: '/assets/media/images/google-docs.ico',
            nameAB: 'Google Docs'
        },
        'Google Slides': {
            icoAB: '/assets/media/images/google-slides.ico',
            nameAB: 'Google Slides'
        },
        'Gmail': {
            icoAB: '/assets/media/images/gmail.png',
            nameAB: 'Gmail'
        },
        'Khan': {
            icoAB: '/assets/media/images/khan.png',
            nameAB: 'Dashboard | Khan Academy'
        },
        'Campus': {
            icoAB: '/assets/media/images/campus.png',
            nameAB: 'Infinite Campus'
        },
        'IXL': {
            icoAB: '/assets/media/images/ixl.png',
            nameAB: 'IXL | Dashboard'
        },
        'LinkIt': {
            icoAB: '/assets/media/images/linkit.ico',
            nameAB: 'Test Taker'
        },
        'Schoology': {
            icoAB: '/assets/media/images/schoology.png',
            nameAB: 'Home | Schoology'
        },
        'i-Ready Math': {
            icoAB: '/assets/media/images/i-ready.ico',
            nameAB: 'Math To Do, i-Ready'
        },
        'i-Ready Reading': {
            icoAB: '/assets/media/images/i-ready.ico',
            nameAB: 'Reading To Do, i-Ready'
        },
        'ClassLink Login': {
            icoAB: '/assets/media/images/classlink-login.png',
            nameAB: 'Login'
        },
        'Wikipedia': {
            icoAB: '/assets/media/images/wikipedia.png',
            nameAB: 'Wikipedia'
        },
        'Britannica': {
            icoAB: '/assets/media/images/britannica.png',
            nameAB: 'Encyclopedia Britannica | Britannica'
        },
        'Ducksters': {
            icoAB: '/assets/media/images/ducksters.png',
            nameAB: 'Ducksters'
        },
        'Minga': {
            icoAB: '/assets/media/images/minga.png',
            nameAB: 'Minga – Creating Amazing Schools'
        },
        'i-Ready Learning Games': {
            icoAB: '/assets/media/images/i-ready.ico',
            nameAB: 'Learning Games, i-Ready'
        },
        'NoRedInk Home': {
            icoAB: '/assets/media/images/noredink.webp',
            nameAB: 'Student Home | NoRedInk'
        },
        'Newsela Binder': {
            icoAB: '/assets/media/images/newsela.png',
            nameAB: 'Newsela | Binder'
        },
        'Newsela Assignments': {
            icoAB: '/assets/media/images/newsela.png',
            nameAB: 'Newsela | Assignments'
        },
        'Newsela Home': {
            icoAB: '/assets/media/images/newsela.png',
            nameAB: 'Newsela | Instructional Content Platform'
        },
        'PowerSchool Sign In': {
            icoAB: '/assets/media/images/powerschool.png',
            nameAB: 'Student and Parent Sign In'
        },
        'PowerSchool Grades and Attendance': {
            icoAB: '/assets/media/images/powerschool.png',
            nameAB: 'Grades and Attendance'
        },
        'PowerSchool Teacher Comments': {
            icoAB: '/assets/media/images/powerschool.png',
            nameAB: 'Teacher Comments'
        },
        'PowerSchool Standards Grades': {
            icoAB: '/assets/media/images/powerschool.png',
            nameAB: 'Standards Grades'
        },
        'PowerSchool Attendance': {
            icoAB: '/assets/media/images/powerschool.png',
            nameAB: 'Attendance'
        },
        'Nearpod': {
            icoAB: '/assets/media/images/nearpod.png',
            nameAB: 'Nearpod'
        },
        'StudentVUE': {
            icoAB: '/assets/media/images/studentvue.ico',
            nameAB: 'StudentVUE'
        },
        'Quizlet Home': {
            icoAB: '/assets/media/images/quizlet.webp',
            nameAB: 'Flashcards, learning tools and textbook solutions | Quizlet'
        },
        'Google Forms Locked Mode': {
            icoAB: '/assets/media/images/googleforms.png',
            nameAB: 'Start your quiz'
        },
        'DeltaMath': {
            icoAB: '/assets/media/images/deltamath.png',
            nameAB: 'DeltaMath'
        },
        'Kami': {
            icoAB: '/assets/media/images/kami.png',
            nameAB: 'Kami'
        },
        'GoGuardian Admin Restricted': {
            icoAB: '/assets/media/images/goguardian-lock.png',
            nameAB: 'Restricted'
        },
        'GoGuardian Teacher Block': {
            icoAB: '/assets/media/images/goguardian.png',
            nameAB: 'Uh oh!'
        },
        'World History Encyclopedia': {
            icoAB: '/assets/media/images/worldhistoryencyclopedia.png',
            nameAB: 'World History Encyclopedia'
        }
    };

    const customSelectTrigger = document.querySelector('.custom-select-trigger');
    const customOptions = document.querySelector('.custom-options');
    const setClock = document.getElementById('cloak-setCloak');
    Object.keys(cloakPresets).forEach((key) => {
        let option = document.createElement('div');
        option.classList.add('custom-option');
        option.dataset.value = key;
        option.innerHTML = `<img src="${cloakPresets[key].icoAB}" alt="${key} icon">${key}`;
        customOptions.appendChild(option);
    });

    customSelectTrigger.addEventListener('click', () => {
        customSelectTrigger.parentElement.classList.toggle('open');
    });

    customOptions.addEventListener('click', (e) => {
        if (e.target.classList.contains('custom-option')) {
            customSelectTrigger.querySelector('span').innerText = e.target.innerText;
            customSelectTrigger.parentElement.classList.remove('open');
        }
    });

    setClock.addEventListener('click', () => {
        const selected = customSelectTrigger.querySelector('span').innerText;
        const selectedPreset = cloakPresets[selected];
        localStorage.setItem('nameAB', selectedPreset.nameAB);
        localStorage.setItem('icoAB', selectedPreset.icoAB);
    });
});