// Nuke idb: /Users/{user}/Library/Application Support/Firefox/Profiles/i9soh8wz.default/indexedDB/

window.requestFileSystem = window.requestFileSystem ||
                           window.webkitRequestFileSystem;
window.URL = window.URL || window.webkitURL;

var openFSButton = document.querySelector('#openFSButton');

var logger = new Logger('#log');
var fs = null;

function onError(e) {
  console.log('Error - ', e);
}

function clearFS() {
	fs.root.createReader().readEntries(function(results) {
	  [].forEach.call(results, function(entry) {
		  if (entry.isDirectory) {
			  entry.removeRecursively(function() {}, onError);
			} else {
				entry.remove(function() {}, onError);
			}
		});
  }, onError);
  logger.log('<p>Database deleted!</p>');
}

function openFS() {
  window.requestFileSystem(TEMPORARY, 1024*1024, function(myFs) {
  	fs = myFs;
  	openFSButton.disabled = true;
  	logger.log('<p>Opened <em>' + fs.name, + '</em></p>');
  	getAllEntries();
  }, function(e) {
  	logger.log(e);
  });
}

function writeFile(file, i) {
  fs.root.getFile(file.name, {create: true}, function(fileEntry) {
    fileEntry.createWriter(function(fileWriter) {
      fileWriter.onwritestart = function() {
        console.log('WRITE START');
      };
      fileWriter.onwriteend = function() {
        console.log('WRITE END');
      };
      fileWriter.write(file);
	}, onError);

    getAllEntries();
  }, onError);
}

function getAllEntries() {
	fs.root.createReader().readEntries(function(results) {
		var frag = document.createDocumentFragment();
		// Native readEntries() returns an EntryArray, which doesn't have forEach.
		[].forEach.call(results, function(entry) {
  	  var li = document.createElement('li');
  	  if (entry.isFile) {
        var deleteLink = document.createElement('a');
        deleteLink.href = '';
        deleteLink.textContent = 'delete';
        deleteLink.classList.add('delete');
        deleteLink.onclick = function(e) {
          entry.remove(function() {
            var li = e.target.parentElement.parentElement;
            li.parentElement.removeChild(li);
            logger.log('<p>Removed ' + entry.name + '</p>');
          });
          return false;
        };

  	    entry.file(function(f) {
          var size = Math.round(f.size * 100 / (1024 * 1024)) / 100;

          var span = document.createElement('span');
          span.title = size + 'MB';

          if (size < 1) {
            size = Math.round(f.size * 100 / 1024) / 100;
            span.title = size + 'KB';
          }

  	      if (f.type.match('audio/') || f.type.match('video/ogg')) {

            var audio = new Audio();

            if (audio.canPlayType(f.type)) {
            	audio.src = window.URL.createObjectURL(f);
  	      	  //audio.type = f.type;
  	      	  //audio.controls = true;
  	      	  audio.onended = function(e) {
  	            window.URL.revokeObjectURL(this.src);
  	          };

  	      	  var a = document.createElement('a');
  	      	  a.href = '';
  	      	  a.textContent = entry.name;
  	      	  a.appendChild(audio);
  	      	  a.onclick = playPauseAudio;

              span.appendChild(a);
	  	      } else {
              span.textContent = entry.name + " (can't play)";
	  	      }
  	      } else {
            span.textContent = entry.name;
          }

          span.appendChild(deleteLink);
          li.appendChild(span);
	      }, onError);
  	  } else {
  	    console.log('got a directory')	
  	  }
  	  frag.appendChild(li);
  	});

  	var entries = document.querySelector('#entries');
  	entries.innerHTML = '<ul></ul>';
  	entries.appendChild(frag);

  }, onError);
}

function playPauseAudio(e) {
  var a = e.target;
  var audio = a.querySelector('audio');
  if (audio.paused) {
    audio.play();
    a.classList.add('playing');
  } else {
    audio.pause();
    a.classList.remove('playing');
  }
  e.preventDefault();
}

window.addEventListener('DOMContentLoaded', function(e) {

}, false);

window.addEventListener('load', function(e) {
  var dnd = new DnDFileController('body', function(files) {
    [].forEach.call(files, writeFile);
  });
  openFS();
}, false);
