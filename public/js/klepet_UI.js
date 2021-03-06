function divElementEnostavniTekst(sporocilo) {
  //vse < in > pretvori v text oznake
  sporocilo = sporocilo.replace(/\</g, '&lt;').replace(/\>/g, '&gt;');
  sporocilo = imgBackToHtml(sporocilo);
  sporocilo = iframeBackToHtml(sporocilo);
  return $('<div style="font-weight: bold"></div>').html(sporocilo);
}

function imgBackToHtml(sporocilo){
  var foundAt;
  foundAt = sporocilo.indexOf('&lt;img');
  while(foundAt>=0){
    sporocilo = sporocilo.slice(0,foundAt) + sporocilo.slice(foundAt).replace(/&lt;img/,'<img').replace(/\/&gt;/,'/>');
    foundAt = sporocilo.indexOf('&lt;img');  
  } 
  return sporocilo;
}

function iframeBackToHtml(sporocilo){
  var foundAt;
  var stringToFind = "&lt;iframe class=youtube src='https://www.youtube.com/embed/"
  foundAt = sporocilo.indexOf(stringToFind);
  while(foundAt>=0){
    sporocilo = sporocilo.slice(0,foundAt) + sporocilo.slice(foundAt).replace(/&lt;iframe/,'<iframe').replace(/allowfullscreen&gt;/,'allowfullscreen>').replace(/&lt;\/iframe&gt;/,'</iframe>');
    foundAt = sporocilo.indexOf(stringToFind);  
  } 
  return sporocilo;
}

function divElementHtmlTekst(sporocilo) {
  return $('<div></div>').html('<i>' + sporocilo + '</i>');
}

function procesirajVnosUporabnika(klepetApp, socket) {
  var sporocilo = $('#poslji-sporocilo').val();

  sporocilo = processImg(sporocilo);
  sporocilo = processYoutube(sporocilo);

  sporocilo = dodajSmeske(sporocilo);
  var sistemskoSporocilo;
  
  if (sporocilo.charAt(0) == '/') {
    sistemskoSporocilo = klepetApp.procesirajUkaz(sporocilo);
    if (sistemskoSporocilo) {
      $('#sporocila').append(divElementHtmlTekst(sistemskoSporocilo));
    }
  } else {
    sporocilo = filtirirajVulgarneBesede(sporocilo);
    klepetApp.posljiSporocilo(trenutniKanal, sporocilo);
    $('#sporocila').append(divElementEnostavniTekst(sporocilo));
    $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
  }

  $('#poslji-sporocilo').val('');
}

var socket = io.connect();
var trenutniVzdevek = "", trenutniKanal = "";

var vulgarneBesede = [];
$.get('/swearWords.txt', function(podatki) {
  vulgarneBesede = podatki.split('\r\n');
});

function filtirirajVulgarneBesede(vhod) {
  for (var i in vulgarneBesede) {
    vhod = vhod.replace(new RegExp('\\b' + vulgarneBesede[i] + '\\b', 'gi'), function() {
      var zamenjava = "";
      for (var j=0; j < vulgarneBesede[i].length; j++)
        zamenjava = zamenjava + "*";
      return zamenjava;
    });
  }
  return vhod;
}

$(document).ready(function() {
  var klepetApp = new Klepet(socket);

  socket.on('vzdevekSpremembaOdgovor', function(rezultat) {
    var sporocilo;
    if (rezultat.uspesno) {
      trenutniVzdevek = rezultat.vzdevek;
      $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
      sporocilo = 'Prijavljen si kot ' + rezultat.vzdevek + '.';
    } else {
      sporocilo = rezultat.sporocilo;
    }
    $('#sporocila').append(divElementHtmlTekst(sporocilo));
  });

  socket.on('pridruzitevOdgovor', function(rezultat) {
    trenutniKanal = rezultat.kanal;
    $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
    $('#sporocila').append(divElementHtmlTekst('Sprememba kanala.'));
  });

  socket.on('sporocilo', function (sporocilo) {
    var novElement = divElementEnostavniTekst(sporocilo.besedilo);
    $('#sporocila').append(novElement);
  });
  
  socket.on('kanali', function(kanali) {
    $('#seznam-kanalov').empty();

    for(var kanal in kanali) {
      kanal = kanal.substring(1, kanal.length);
      if (kanal != '') {
        $('#seznam-kanalov').append(divElementEnostavniTekst(kanal));
      }
    }

    $('#seznam-kanalov div').click(function() {
      klepetApp.procesirajUkaz('/pridruzitev ' + $(this).text());
      $('#poslji-sporocilo').focus();
    });
  });

  socket.on('uporabniki', function(uporabniki) {
    $('#seznam-uporabnikov').empty();
    for (var i=0; i < uporabniki.length; i++) {
      $('#seznam-uporabnikov').append(divElementEnostavniTekst(uporabniki[i]));
    }
    
    $('#seznam-uporabnikov div').click(function() {
      var input = $('#poslji-sporocilo');
      input.val("/zasebno " + "\"" + $(this).text() + "\" \"\"");
      input.focus();
      input.get(0).setSelectionRange(input.val().length-1,input.val().length-1);
    });
  });
  
  socket.on('dregljaj', function() {
    $('#vsebina').jrumble();
    $('#vsebina').trigger('startRumble');
    setTimeout(function(){$('#vsebina').trigger('stopRumble');}, 1500);
  });

  setInterval(function() {
    socket.emit('kanali');
    socket.emit('uporabniki', {kanal: trenutniKanal});
  }, 1000);

  $('#poslji-sporocilo').focus();

  $('#poslji-obrazec').submit(function() {
    procesirajVnosUporabnika(klepetApp, socket);
    return false;
  });
  
  
});

function dodajSmeske(vhodnoBesedilo) {
  var preslikovalnaTabela = {
    ";)": "wink.png",
    ":)": "smiley.png",
    "(y)": "like.png",
    ":*": "kiss.png",
    ":(": "sad.png"
  }
  for (var smesko in preslikovalnaTabela) {
    vhodnoBesedilo = vhodnoBesedilo.replace(smesko,
      "<img src='http://sandbox.lavbic.net/teaching/OIS/gradivo/" +
      preslikovalnaTabela[smesko] + "' />");
  }
  return vhodnoBesedilo;
}


function processImg(vhodnoBesedilo) {
  var pattern = /https?:\/\/([-a-zA-Z0-9:%_\+.~#?&//=]*)\.(jpg|JPG|gif|GIF|png|PNG)/g;
  var matches = vhodnoBesedilo.match(pattern);
  if (matches != null){
    for(var i = 0; i<matches.length; i++){
      vhodnoBesedilo += "<img class=slika src='" + matches[i] + "' />"
    }
  }
  return vhodnoBesedilo;
}

function processYoutube(vhodnoBesedilo) {
  var pattern = /https:\/\/www.youtube.com\/watch\?v=([\-&=\?\/\w])+/g;
  var matches = vhodnoBesedilo.match(pattern);
  if(matches != null){
    for(var i = 0; i<matches.length; i++){
      vhodnoBesedilo += "<iframe class=youtube src='https://www.youtube.com/embed/" + matches[i].slice(matches[i].indexOf('=')+1) + "' allowfullscreen></iframe>";
    }
  }
  return vhodnoBesedilo;
}
