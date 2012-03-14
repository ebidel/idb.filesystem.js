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
console.log(fileEntry)
    fileEntry.createWriter(function(fileWriter) {
      fileWriter.onwriteend = function(e) {
      	console.log('WRITE DONE');
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
  	    entry.file(function(f) {
  	      if (f.type.match('audio/') || f.type.match('video/ogg')) {
  	        var audio = new Audio();

  	      	var size = Math.round(f.size * 100 / (1024 * 1024) / 100);

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
  	      	  a.title = size + 'MB';
  	      	  a.appendChild(audio);
  	      	  a.onclick = function(e) {
  	      	  	var audio = this.querySelector('audio');
  	      	  	if (audio.paused) {
  	      	      audio.play();
                  this.classList.add('playing');
	  	      	  } else {
	  	      	    audio.pause();
                  this.classList.remove('playing');
	  	      	  }
  	      	    e.preventDefault();
  	      	  };
  	      	  li.appendChild(a);
	  	      } else {
	  	        li.textContent = entry.name;
	  	      }

	  	      var a = document.createElement('a');
	  	      a.href = '';
	  	      a.textContent = 'delete';
	  	      a.classList.add('delete');
	  	      a.onclick = function(e) {
	  	      	entry.remove(function() {
	  	      		var li = e.target.parentElement;
	  	      	  li.parentElement.removeChild(li);
	  	      		logger.log('<p>Removed ' + entry.name + '</p>');
	  	      	});
	  	      	return false;
	  	      };
	  	      li.appendChild(a);
  	      } else {
            li.textContent = entry.name;
          }
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

window.addEventListener('DOMContentLoaded', function(e) {

}, false);

window.addEventListener('load', function(e) {
  var dnd = new DnDFileController('body', function(files) {
    [].forEach.call(files, writeFile);
  });
  openFS();
}, false);
