;
(function (window, document, $, Q, customFiles, undefined) {
	'use strict';

	// Check for the various File API support.
	if (window.File && window.FileReader && window.FileList && window.Blob) {
		// Great success! All the File APIs are supported.
	} else {
		alert('The File APIs are not fully supported in this browser.');
	}
	
	function FileHandler(domEl) {
		this.el = domEl;
		this.jQueryEl = domEl instanceof $;
		this.handler = null;
		this.files = [];

		this.setListener();
		return this;
	}

	Object.defineProperties(FileHandler.prototype, {
		'setListener': {
			value: setListener
		},
		'removeListener': {
			value: removeListener
		},
		'handleFileSelect': {
			value: handleFileSelect
		},
		registerFile: {
			value: registerFile
		},
		unregisterFile: {
			value: unregisterFile
		}
	});

	function setListener() {
		var self = this;

		var listen = self.jQueryEl ?
			$.prototype.on.bind(self.el) : self.el.addEventListener;

		var handler = self.handleFileSelect.bind(self);
		self.handler = handler;

		return self.jQueryEl ? listen('change', self.handler) :
			listen('change', self.handler, false);
	}

	function removeListener() {
		var self = this;

		if (!self.handler) {
			return false;
		}

		var remove = self.jQueryEl ?
			$.prototype.off.bind(self.el) : self.el.removeEventListener;

		return self.jQueryEl ?
			remove('change', self.handler) : remove('change', self.handler, false);
	}

	function handleFileSelect(evt) {
		var self = this;

		var prop = this.jQueryEl ?
			this.el.attr('name') : this.el.getAttribute('name');
		prop = prop && prop.replace('[]', '');

		// FileList object
		Array.prototype.forEach.call(evt.target[prop], function(file) {
			self.registerFile(file);
		});

		return self;
	}
	
	function registerFile(file) {
		var defer = Q.defer();
		var self = this; 
		
		Q.when(customFiles.extend(file), function(file) {
			self.files.push(file);
			defer.resolve(file);
		});
		
//		this[extendedFile.customType] = this[extendedFile.customType] || [];
//		this[extendedFile.customType].push(extendedFile);
		return defer.promise;
	}

	function unregisterFile(file) {
		var idx = this.files.indexOf(file);
		if (idx > -1) {
			this.files.splice(idx, 1);
		}
		
		var idx = this[file.customType].indexOf(file);
		if (idx > -1) {
			this[file.customType].splice(idx, 1);
		}
		
		return file;
	}

	window.FileHandler = FileHandler;

})(this, this.document, jQuery, Q, customFiles);