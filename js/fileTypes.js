;
(function (window, document, $, Q, FileReader, XLSX, Papa, undefined) {
	'use strict';

	// Custom File Types
	// ========================================================================
	var customFiles = {
		extend: extendFile
	};

	function extendFile(file) {
		var defer = Q.defer();
		var type = String.prototype.trim.call(file.type) !== "" ? 
				file.type : askAboutType(file);
		// csv -> "type/csv"
		// ods -> "application/vnd.oasis.opendocument.spreadsheet"
		// xlsx -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
		// zip -> "application/zip"
		// pdf -> "application/pdf"
		// docx -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

//		if (file.type.indexOf('image/') === 0) {
//			return new ImageFile(file);
//		}
//
//		if (file.type === 'type/csv') {
//			return new CSVFile(file);
//		}

		Q.when(type, createFile);

		function createFile(type) {
			switch (type) {
//			== images ==
				case "image":
				case "image/png":
				case "image/gif":
				case "image/pjpg":
				case "image/jpg":
				case "image/pjpeg":
				case "image/jpeg":
				case "image/png":
					defer.resolve(new ImageFile(file));
					break;

//			== excel ==
				case "ods":
				case "application/vnd.oasis.opendocument.spreadsheet": // .ods
				case "xlsx":
				case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": // .xlsx
					defer.resolve(new XLSXFile(file));
					break;

				case "csv":
				case "text/csv":
					defer.resolve(new CSVFile(file));
					break;

				default:
					defer.resolve(new BasicFile(file));
					break;
			}
		}

		return defer.promise;
	}

	function askAboutType(file) {
		var defer = Q.defer();

		var modal = [
			'<div class="modal-ibge">',
			'<div>',
			'<div class="modal-ibge-content">',
			'<div class="modal-ibge-header">',
			'<p class="modal-ibge-title">',
			'Qual o tipo do arquivo ',
			file.name,
			'?',
			'</p>',
			'</div>',
			'<div class="modal-ibge-body">',
			'</div>',
			'<div class="modal-ibge-footer">',
			'</div>',
			'</div>',
			'</div>',
			'</div>'
		].join('');

		var select = [
			'<select>',
			'<option value="csv">CSV</option>',
			'<option value="xlsx">XLSX</option>',
			'<option value="ods">ODS</option>',
			'<option value="image">Imagem</option>',
			'<option value="text">Texto comum</option>',
			'</select>'
		].join('');

		var btn = [
			'<button type="button">',
			'Confirmar',
			'</button>'
		].join('');

		var $modal = $(modal);
		var $select = $(select);
		var $btn = $(btn);

		var listener = function (evt) {
			evt.preventDefault();
			var value = $select.val();
			$btn.off('click', listener);
			$modal.remove();
			defer.resolve(value);
		};
		$btn.on('click', listener);

		$modal.find('.modal-ibge-body').append($select);
		$modal.find('.modal-ibge-footer').append($btn);


		$modal.appendTo('body');

		return defer.promise;
	}

	window.customFiles = customFiles;




	/*
	 * Basic/TXT Files
	 * ------------------------------------------------------------------------
	 */
	function BasicFile(file) {
		var self = this;

		Object.keys(file).forEach(function (key) {
			self[key] = file[key];
		});

		self.value = file;
		this.customType = 'text';
		self.Text = "";

		return self;
	}
	BasicFile.prototype = Object.create(window.File.prototype);

	Object.defineProperties(BasicFile.prototype, {
		readFile: {
			value: readAsText
		},
		hasText: {
			value: hasText
		},
		'upload': {
			value: upload
		},
		appendTo: {
			value: appendTo
		}
	});

	function readAsText() {
		var self = this;
		var file = this.value;

		if (self.hasText()) {
			return self.Text;
		}

		var defer = Q.defer();

		var reader = new FileReader();
		reader.onload = function (event) {
			var contents = event.target.result;
//			console.log("File contents: " + contents);
			self.Text = contents;
			defer.resolve(contents);
		};

		reader.onerror = function (event) {
			console.error("File could not be read! Code " + event.target.error.code);
			defer.reject(event.target.error);
		};

		reader.readAsText(file);

		return defer.promise;
	}

	function hasText() {
		return this.Text && this.Text.trim() !== "";
	}

	function upload(url, cb) {
		cb = cb || defaultCallback;
		var file = this.value;

		return Q($.post(url, file)).then(cb);

		function defaultCallback(responseText) {
			if (responseText.status === 'error') {
				return responseText.message;
			}
			return responseText;
		}
	}

	function appendTo(element, tag, cssClass) {
		tag = tag || '<p />';
		cssClass = cssClass || '';

		var defer = Q.defer();
		var self = this;

		Q.when(self.readFile(), function (txt) {
			var $el = $(tag, {
				'class': cssClass,
				'text': txt
			});

			defer.resolve($el.appendTo(element));
		});

		return defer.promise;
	}





	/*
	 * CSV Files
	 * ------------------------------------------------------------------------
	 */
	function CSVFile(file) {
		BasicFile.call(this, file);

		this.Table = null;
		return this;
	}
	CSVFile.prototype = Object.create(BasicFile.prototype);

	Object.defineProperties(CSVFile.prototype, {
		toTable: {
			value: toTable
		}
//		toEditableTable: {
//			value: toEditableTable
//		}
	});

	function toTable(headerRows, cssTableClass) {
		var self = this;

		if (self.Table) {
			return self.Table;
		}

		var defer = Q.defer();

		Q.when(self.readFile(), function (str) {
			var $table = $('<table/>', {
				'class': cssTableClass
			});

			var fastMode = (str.slice(0) === "'" && str.slice(-1) === "'") ||
				(str.slice(0) === '"' && str.slice(-1) === '"');

			var parse = Papa.parse(str, {
				delimiter: "", // auto-detect
				newline: "", // auto-detect
				header: false,
				dynamicTyping: true,
				preview: 0,
				encoding: "",
				worker: false,
				comments: false,
				//step: undefined,
				//complete: undefined,
				//error: undefined,
				download: false,
				skipEmptyLines: true,
				//chunk: undefined,
				fastMode: fastMode
			});

			var columns = [];

			if (Array.isArray(headerRows)) {
				columns = _buildColumns(headerRows);
			} else {
				if (isNaN(parseInt(headerRows, 10)) || headerRows < 1) {
					headerRows = 1;
				}

				var $thead = $('<thead/>');
				for (var i = 0; i < headerRows; i++) {
					var row = parse.data.shift();
					var $row = $('<tr/>');

					row.forEach(function (val) {
						$row.append($('<td>', {
							html: val
						}));
					});

					$thead.append($row);
				}
				$table.append($thead);
				$table.append('<tbody></tbody>');
			}


			var config = {};
			config.data = parse.data;
			if (columns.length) {
				config.columns = columns;
			}

			$table.dataTable(config);

			self.Table = $table;
			defer.resolve($table);
		});

		return defer.promise;

	}

	function _buildColumns(array) {
		return array.map(function (str) {
			return {
				title: str
			};
		});
	}

	function appendTo(element, cssClass) {
		cssClass = cssClass || '';

		var defer = Q.defer();
		var self = this;

		Q.when(self.toTable(), function ($table) {

			if (cssClass) {
				$table.addClass(cssClass);
			}

			defer.resolve($table.appendTo(element));
		});

		return defer.promise;
	}








	/*
	 * XSLX/ODS Files
	 * ------------------------------------------------------------------------
	 */
	function XLSXFile(file) {
		CSVFile.call(this, file);
		this.XLSX = null;
		this.customType = 'excel';
		return this;
	}
	XLSXFile.prototype = Object.create(CSVFile.prototype);

	Object.defineProperties(XLSXFile.prototype, {
		readFile: {
			value: toCSV
		},
		openFile: {
			value: readXLSXFile
		}
	});

	function readXLSXFile() {
		var reader = new FileReader();
		var self = this;
		var file = self.value;

		if (this.XLSX) {
			return this.XLSX;
		}

		var defer = Q.defer();

		var reader = new FileReader();
		reader.onload = function (event) {
			var data = event.target.result;
			//var wb = XLSX.read(data, {type: 'binary'});
			var arr = String.fromCharCode.apply(null, new Uint8Array(data));
			var wb = XLSX.read(btoa(arr), {
				type: 'base64'
			});
			self.XLSX = wb;
			defer.resolve(wb);
		};

		reader.onerror = function (event) {
			console.error("File could not be read! Code " + event.target.error.code);
			defer.reject(event.target.error);
		};

		//reader.readAsBinaryString(f);
		reader.readAsArrayBuffer(file);

		return defer.promise;
	}

	function toCSV(options) {
		var defer = Q.defer();
		var self = this;

		if (self.hasText()) {
			return self.Text;
		}

		Q.when(self.openFile(), function (file) {
			var result = [];
			file.SheetNames.forEach(function (sheetName) {
				var csv = XLSX.utils.sheet_to_csv(file.Sheets[sheetName]);
				if (csv.length > 0) {
//					result.push("");
					result.push(csv);
				}
			});
			self.Text = result.join("\n");
			defer.resolve(result.join("\n"));
		});

		return defer.promise;
	}











	/*
	 * Image Files
	 * ------------------------------------------------------------------------
	 */
	function ImageFile(file) {
		BasicFile.call(this, file);
		this.customType = 'image';
		this.Img = null;
		return this;
	}
	ImageFile.prototype = Object.create(BasicFile.prototype);

	Object.defineProperties(ImageFile.prototype, {
		'readFile': {
			value: buildImg
		},
		'appendTo': {
			value: appendImgTo
		}
	});

	function buildImg() {
		if (this.Img) {
			return this.Img;
		}

		var defer = Q.defer();
		var self = this;

		var reader = new FileReader();
		reader.onload = function (event) {
			var dataUri = event.target.result,
				img = document.createElement("img");

			img.src = dataUri;
//			document.body.appendChild(img);
			self.Img = img;
			defer.resolve(img);
		};

		reader.onerror = function (event) {
			console.error("File could not be read! Code " + event.target.error.code);
			defer.reject(event.target.error);
		};

		reader.readAsDataURL(self.value);

		return defer.promise;
	}

	function appendImgTo(element) {
		var defer = Q.defer();
		var self = this;

		Q.when(self.readFile(), function (img) {
			defer.resolve($(img).appendTo(element));
		});

		return defer.promise;
	}





})(this, this.document, jQuery, Q, FileReader, XLSX, Papa);