var config = {
    apiKey: "YOURS",
    authDomain: "PROJECT_ID.firebaseapp.com",
    databaseURL: "https://PROJECT_ID.firebaseio.com",
    projectId: "PROJECT_ID",
    storageBucket: "YOURS"
};
firebase.initializeApp(config);
firebase.auth().useDeviceLanguage();

var uiConfig = {
    signInSuccessUrl: 'https://YOURS.appspot.com',
    signInOptions: [
      firebase.auth.GoogleAuthProvider.PROVIDER_ID
    ]
};

// Initialize the FirebaseUI Widget using Firebase.
var ui = new firebaseui.auth.AuthUI(firebase.auth());
// The start method will wait until the DOM is loaded.
ui.start('#firebaseui-auth-container', uiConfig);


firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    toggleSections(true);
  } else {
    toggleSections(false);
  }
});

function toggleSections(hasUser) {
    if(hasUser) {
        document.getElementById('firebaseui-auth-container').style.display = 'none';
        document.getElementById('form').style.display = 'block';
    } else {
        document.getElementById('firebaseui-auth-container').style.display = 'block';
        document.getElementById('form').style.display = 'none';
    }
}

function twoDigits(nb) {
    if(nb < 10) {
        return '0' + nb;
    } else {
        return nb;
    }
}

function formatDate(date) {
    var day = date.getDate();
    var month = date.getMonth() + 1;
    var year = date.getFullYear();

    return twoDigits(day) + '/' + twoDigits(month) + '/' + year;
}

function initMaterializeCssElements() {
    var monthsInFrench = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    var daysInFrench = [
        'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'
    ];

   /* Date picker */
   var today = new Date();
    var datepickerOptions = {
        autoClose: true,
        format: 'dd/mm/yyyy',
        firstDay: 1,
        i18n: {
            weekdaysShort: daysInFrench.map(function(day) { return day.substr(0,3)}),
            weekdaysAbbrev: daysInFrench.map(function(day) { return day.substr(0,1)}),
            weekdays: daysInFrench,
            months: monthsInFrench,
            monthsShort: monthsInFrench.map(function(month) { return month.substr(0,3)}),
            clear: 'Effacer',
            cancel: 'Annuler'
        },
        defaultDate: today,
        setDefaultDate: true,
        maxDate: today
    };
    var datepicker = document.getElementById('datepicker');
    M.Datepicker.init(datepicker, datepickerOptions);
    datepicker.value = formatDate(today);

    /* Confirm modal */
    var modalOptions = {};
    var modal = document.getElementById('confirm-modal');
    M.Modal.init(modal, modalOptions);
}

function readyToGo() {
    var form = document.querySelector('#form > form');
    var formData = new FormData(form);

    document.getElementById('modal-meteo').innerText = formData.get('weather');
    document.getElementById('modal-type').innerText = formData.get('break');
    document.getElementById('modal-date').innerText = formData.get('date');
    document.getElementById('modal-message').innerText = formData.get('message');
    if(hasPhotos(formData.getAll('photos'))) {
        document.getElementById('modal-photos').innerText = formData.getAll('photos').length + ' photo(s)';
    } else {
        document.getElementById('modal-photos').innerText = 'Pas de photos';
    }

    var modal = M.Modal.getInstance(document.getElementById('confirm-modal'));
    modal.open();
}

function hasPhotos(photos) {
    return photos && photos.length && photos.every(function(photo) { return photo.size > 0});
}

function storePhotos(photos, date) {
    var storageRef = firebase.app().storage().ref();
    var promise = new Promise(function(resolve, reject) {
        var countdown = photos.length;

        photos.forEach(function(photo) {
            var childRef = storageRef.child('photos').child(date).child(photo.name);
            childRef.put(photo).then(function(snapshot) {
                console.log(snapshot);
                countdown-=1;

                if(countdown === 0) {
                    resolve();
                }
            });
        });
    });

    return promise;
}

function storeFakeSms(fakeSms) {
    var databaseRef = firebase.database().ref();
    var promise = new Promise(function(resolve, reject) {
        var key = databaseRef.child('sms').push().key;
        var update = {};
        update['/sms/' + key] = fakeSms;
        resolve(databaseRef.update(update));
    });

    return promise;
}

function publish() {
    var modal = M.Modal.getInstance(document.getElementById('confirm-modal'));
    var form = document.querySelector('#form > form');
    var formData = new FormData(form);

    var weatherMapping = {
        'Ensolleillé': 'clear-day',
        'Nuageux': 'cloudy-weather',
        'Pluvieux': 'rainy-weather',
        'Neigeux': 'snow-weather',
        'Venteux': 'windy-weather',
        'Tempête': 'storm-weather'
    };

    var breakMapping = {
        'Début de journée': 'start',
        'Fin de journée': 'finish',
        'Pause repas': 'eat',
        'A l\'auberge': 'camp',
        'Petite pause': 'break'
    };

    var fakeSms = {
        'weather': weatherMapping[formData.get('weather')],
        'break': breakMapping[formData.get('break')],
        'date': formData.get('date'),
        'message': formData.get('message'),
        'latitude': last_coordinates ? last_coordinates.latitude : '',
        'longitude': last_coordinates ? last_coordinates.longitude : ''
    };

    var promises = [];

    if(hasPhotos(formData.getAll('photos'))) {
        var d = fakeSms.date.replace(/\//g,'');
        promises.push(storePhotos(formData.getAll('photos'), d));
    }

    promises.push(storeFakeSms(fakeSms));

    Promise.all(promises).then(function() {
        form.reset();
        modal.close();
        var html = "<i class=\"material-icons\">check</i> Tout s'est bien passé !";
        M.toast({html: html})
    }).catch(function(e) {
        var html = "<i class=\"material-icons\">error</i> Aïe! Erreur ! Essaie à nouveau.";
        M.toast({html: html})
        console.error(e);
    });
}

var last_coordinates = null;
if(navigator.geolocation) {
    navigator.geolocation.watchPosition(function(position) {
        last_coordinates = position.coords;
    });
}

document.addEventListener('DOMContentLoaded', initMaterializeCssElements);
