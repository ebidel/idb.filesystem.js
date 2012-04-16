idb.filer.js
===========

idb.filer.js is a [well tested](master/tests) JavaScript polyfill implementation
of the HTML5 [Filesystem API][1]. It is intended for browsers that do not
support the API natively.

The library works by using [IndexedDB][2] as its underlying storage layer. Essentially,
this means that any browser supporting IndexedDB also supports the Filesystem API!
All you need to do is make Filesystem API calls, and the rest is magic.

Supported Browsers
------------------

* Firefox 14a1+

Unlisted browsers and/or versions (e.g. earlier versions of Firefox) that
which IndexedDB will likely work; I just haven't tested them.

[1]: http://dev.w3.org/2009/dap/file-system/pub/FileSystem/
[2]: https://developer.mozilla.org/en/IndexedDB

Using with filer.js
------------------

[filer.js](https://github.com/ebidel/filer.js) is a convenience library for the
HTML5 Filesystem API. It wraps API calls with familiar UNIX commands
(`cp`, `mv`, `ls`) for its own API.

filer.js works well with idb.filer.js, with a few exceptions. Unimplemented
methods in this library and `filer.open()` (because `filesystem:` URLs are not
known by unsupported browsers). There may be other API calls in filer.js that
do not work, but I haven't tested them.

Demo
===============

Two demo apps are included under [/demo](master/demos). The
[basic demo](http://html5-demos.appspot.com/static/filesystem/idbfiler.js/demos/basic/index.html)
allows you add files to the app by drag and drop from the desktop. The second demo 
is a slightly modified version of filer.js's [playground app](http://html5-demos.appspot.com/static/filesystem/idbfiler.js/demos/playground/index.html). What's exciting is that the same app now works in other browsers besides Chrome!

<a href="http://html5-demos.appspot.com/static/filesystem/idbfiler.js/demos/basic/index.html">
  <img src="//github.com/ebidel/idb.filer.js/raw/master/demos/basic/images/demo_screenshot.png" title="Demo app screenshot" alt="Demo app screenshot">
</a>

Getting started
===============

**See my [HTML5Rocks article](http://www.html5rocks.com/tutorials/file/filesystem/)
on the Filesystem API.**

Basic example of opening the filesystem and writing to a new .txt file:

    window.BlobBuilder = window.BlobBuilder || window.MozBlobBuilder ||
                         window.WebKitBlobBuilder || window.MSBlobBuilder;

		window.requestFileSystem(TEMPORARY, 1024 * 1024, function(fs) {
	  	console.log('Opened ' + fs.name);

	  	fs.root.getFile('NewFile.txt', {create: true}, function(fileEntry) {
		    fileEntry.createWriter(function(fileWriter) {

		      fileWriter.onwritestart = function() {
		        console.log('WRITE START');
		      };

		      fileWriter.onwriteend = function() {
		        console.log('WRITE END');
		      };

          var bb = new BlobBuilder();
          bb.append('1234567890');

		      fileWriter.write(bb.getBlob('text/plain'));
			  }, onError);
	  }, function(e) {
	  	console.log('Error', e);
	  });
