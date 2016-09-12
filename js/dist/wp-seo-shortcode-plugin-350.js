(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

/* global tinyMCE */
/* global wpseoShortcodePluginL10n */
/* global ajaxurl */
/* global _ */
/* global JSON */
/* global console */
(function () {
	"use strict";

	/**
  * The Yoast Shortcode plugin parses the shortcodes in a given piece of text. It analyzes multiple input fields for shortcodes which it will preload using AJAX.
  *
  * @constructor
  * @property {RegExp} keywordRegex Used to match a given string for valid shortcode keywords.
  * @property {RegExp} closingTagRegex Used to match a given string for shortcode closing tags.
  * @property {RegExp} nonCaptureRegex Used to match a given string for non capturing shortcodes.
  * @property {Array} parsedShortcodes Used to store parsed shortcodes.
  */

	var YoastShortcodePlugin = function YoastShortcodePlugin(app) {
		this._app = app;

		this._app.registerPlugin("YoastShortcodePlugin", { status: "loading" });
		this.bindElementEvents();

		var keywordRegexString = "(" + wpseoShortcodePluginL10n.wpseo_shortcode_tags.join("|") + ")";

		// The regex for matching shortcodes based on the available shortcode keywords.
		this.keywordRegex = new RegExp(keywordRegexString, "g");
		this.closingTagRegex = new RegExp("\\[\\/" + keywordRegexString + "\\]", "g");
		this.nonCaptureRegex = new RegExp("\\[" + keywordRegexString + "[^\\]]*?\\]", "g");

		this.parsedShortcodes = [];

		this.loadShortcodes(this.declareReady.bind(this));
	};

	/* YOAST SEO CLIENT */

	/**
  * Declares ready with YoastSEO.
  */
	YoastShortcodePlugin.prototype.declareReady = function () {
		this._app.pluginReady("YoastShortcodePlugin");
		this.registerModifications();
	};

	/**
  * Declares reloaded with YoastSEO.
  */
	YoastShortcodePlugin.prototype.declareReloaded = function () {
		this._app.pluginReloaded("YoastShortcodePlugin");
	};

	/**
  * Registers the modifications for the content in which we want to replace shortcodes.
  */
	YoastShortcodePlugin.prototype.registerModifications = function () {
		this._app.registerModification("content", this.replaceShortcodes.bind(this), "YoastShortcodePlugin");
	};

	/**
  * The callback used to replace the shortcodes.
  *
  * @param {string} data
  * @returns {string}
  */
	YoastShortcodePlugin.prototype.replaceShortcodes = function (data) {
		var parsedShortcodes = this.parsedShortcodes;

		if (typeof data === "string" && parsedShortcodes.length > 0) {
			for (var i = 0; i < parsedShortcodes.length; i++) {
				data = data.replace(parsedShortcodes[i].shortcode, parsedShortcodes[i].output);
			}
		}

		return data;
	};

	/* DATA SOURCING */

	/**
  * Get data from inputfields and store them in an analyzerData object. This object will be used to fill
  * the analyzer and the snippetpreview
  *
  * @param {function} callback To declare either ready or reloaded after parsing.
  */
	YoastShortcodePlugin.prototype.loadShortcodes = function (callback) {
		var unparsedShortcodes = this.getUnparsedShortcodes(this.getShortcodes(this.getContentTinyMCE()));
		if (unparsedShortcodes.length > 0) {
			this.parseShortcodes(unparsedShortcodes, callback);
		} else {
			return callback();
		}
	};

	/**
  * Bind elements to be able to reload the dataset if shortcodes get added.
  */
	YoastShortcodePlugin.prototype.bindElementEvents = function () {
		var contentElement = document.getElementById("content") || false;
		var callback = _.debounce(this.loadShortcodes.bind(this, this.declareReloaded.bind(this)), 500);

		if (contentElement) {
			contentElement.addEventListener("keyup", callback);
			contentElement.addEventListener("change", callback);
		}

		if (typeof tinyMCE !== "undefined" && typeof tinyMCE.on === "function") {
			tinyMCE.on("addEditor", function (e) {
				e.editor.on("change", callback);
				e.editor.on("keyup", callback);
			});
		}
	};

	/**
  * gets content from the content field, if tinyMCE is initialized, use the getContent function to get the data from tinyMCE
  * @returns {String}
  */
	YoastShortcodePlugin.prototype.getContentTinyMCE = function () {
		var val = document.getElementById("content") && document.getElementById("content").value || "";
		if (typeof tinyMCE !== "undefined" && typeof tinyMCE.editors !== "undefined" && tinyMCE.editors.length !== 0) {
			val = tinyMCE.get("content") && tinyMCE.get("content").getContent() || "";
		}

		return val;
	};

	/* SHORTCODE PARSING */

	/**
  * Returns the unparsed shortcodes out of a collection of shortcodes.
  *
  * @param {Array} shortcodes
  * @returns {Array}
  */
	YoastShortcodePlugin.prototype.getUnparsedShortcodes = function (shortcodes) {
		if ((typeof shortcodes === "undefined" ? "undefined" : _typeof(shortcodes)) !== "object") {
			console.error("Failed to get unparsed shortcodes. Expected parameter to be an array, instead received " + (typeof shortcodes === "undefined" ? "undefined" : _typeof(shortcodes)));
			return false;
		}

		var unparsedShortcodes = [];

		for (var i = 0; i < shortcodes.length; i++) {
			var shortcode = shortcodes[i];
			if (unparsedShortcodes.indexOf(shortcode) === -1 && this.isUnparsedShortcode(shortcode)) {
				unparsedShortcodes.push(shortcode);
			}
		}

		return unparsedShortcodes;
	};

	/**
  * Checks if a given shortcode was already parsed.
  *
  * @param {string} shortcode
  * @returns {boolean}
  */
	YoastShortcodePlugin.prototype.isUnparsedShortcode = function (shortcode) {
		var already_exists = false;

		for (var i = 0; i < this.parsedShortcodes.length; i++) {
			if (this.parsedShortcodes[i].shortcode === shortcode) {
				already_exists = true;
			}
		}

		return already_exists === false;
	};

	/**
  * Gets the shortcodes from a given piece of text.
  *
  * @param {string} text
  * @returns {array} The matched shortcodes
  */
	YoastShortcodePlugin.prototype.getShortcodes = function (text) {
		if (typeof text !== "string") {
			/* jshint ignore:start */
			console.error("Failed to get shortcodes. Expected parameter to be a string, instead received" + (typeof text === "undefined" ? "undefined" : _typeof(text)));
			/* jshint ignore:end*/
			return false;
		}

		var captures = this.matchCapturingShortcodes(text);

		// Remove the capturing shortcodes from the text before trying to match the capturing shortcodes.
		for (var i = 0; i < captures.length; i++) {
			text = text.replace(captures[i], "");
		}

		var nonCaptures = this.matchNonCapturingShortcodes(text);

		return captures.concat(nonCaptures);
	};

	/**
  * Matches the capturing shortcodes from a given piece of text.
  *
  * @param {string} text
  * @returns {Array}
  */
	YoastShortcodePlugin.prototype.matchCapturingShortcodes = function (text) {
		var captures = [];

		// First identify which tags are being used in a capturing shortcode by looking for closing tags.
		var captureKeywords = (text.match(this.closingTagRegex) || []).join(" ").match(this.keywordRegex) || [];

		// Fetch the capturing shortcodes and strip them from the text so we can easily match the non capturing shortcodes.
		for (var i = 0; i < captureKeywords.length; i++) {
			var captureKeyword = captureKeywords[i];
			var captureRegex = "\\[" + captureKeyword + "[^\\]]*?\\].*?\\[\\/" + captureKeyword + "\\]";
			var matches = text.match(new RegExp(captureRegex, "g")) || [];

			captures = captures.concat(matches);
		}

		return captures;
	};

	/**
  * Matches the non capturing shortcodes from a given piece of text.
  *
  * @param {string} text
  * @returns {Array}
  */
	YoastShortcodePlugin.prototype.matchNonCapturingShortcodes = function (text) {
		return text.match(this.nonCaptureRegex) || [];
	};

	/**
  * Parses the unparsed shortcodes through AJAX and clears them.
  *
  * @param {Array} shortcodes shortcodes to be parsed.
  * @param {function} callback function to be called in the context of the AJAX callback.
  */
	YoastShortcodePlugin.prototype.parseShortcodes = function (shortcodes, callback) {
		if (typeof callback !== "function") {
			/* jshint ignore:start */
			console.error("Failed to parse shortcodes. Expected parameter to be a function, instead received " + (typeof callback === "undefined" ? "undefined" : _typeof(callback)));
			/* jshint ignore:end */
			return false;
		}

		if ((typeof shortcodes === "undefined" ? "undefined" : _typeof(shortcodes)) === "object" && shortcodes.length > 0) {
			jQuery.post(ajaxurl, {
				action: "wpseo_filter_shortcodes",
				_wpnonce: wpseoShortcodePluginL10n.wpseo_filter_shortcodes_nonce,
				data: shortcodes
			}, function (shortcodeResults) {
				this.saveParsedShortcodes(shortcodeResults, callback);
			}.bind(this));
		} else {
			return callback();
		}
	};

	/**
  * Saves the shortcodes that were parsed with AJAX to `this.parsedShortcodes`
  *
  * @param {Array} shortcodeResults
  * @param {function} callback
  */
	YoastShortcodePlugin.prototype.saveParsedShortcodes = function (shortcodeResults, callback) {
		shortcodeResults = JSON.parse(shortcodeResults);
		for (var i = 0; i < shortcodeResults.length; i++) {
			this.parsedShortcodes.push(shortcodeResults[i]);
		}

		callback();
	};

	window.YoastShortcodePlugin = YoastShortcodePlugin;
})();

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9zcmMvd3Atc2VvLXNob3J0Y29kZS1wbHVnaW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0UsYUFBVztBQUNaOztBQUVBOzs7Ozs7Ozs7O0FBU0EsS0FBSSx1QkFBdUIsU0FBdkIsb0JBQXVCLENBQVUsR0FBVixFQUFnQjtBQUMxQyxPQUFLLElBQUwsR0FBWSxHQUFaOztBQUVBLE9BQUssSUFBTCxDQUFVLGNBQVYsQ0FBMEIsc0JBQTFCLEVBQWtELEVBQUUsUUFBUSxTQUFWLEVBQWxEO0FBQ0EsT0FBSyxpQkFBTDs7QUFFQSxNQUFJLHFCQUFxQixNQUFNLHlCQUF5QixvQkFBekIsQ0FBOEMsSUFBOUMsQ0FBb0QsR0FBcEQsQ0FBTixHQUFrRSxHQUEzRjs7QUFFQTtBQUNBLE9BQUssWUFBTCxHQUFvQixJQUFJLE1BQUosQ0FBWSxrQkFBWixFQUFnQyxHQUFoQyxDQUFwQjtBQUNBLE9BQUssZUFBTCxHQUF1QixJQUFJLE1BQUosQ0FBWSxXQUFXLGtCQUFYLEdBQWdDLEtBQTVDLEVBQW1ELEdBQW5ELENBQXZCO0FBQ0EsT0FBSyxlQUFMLEdBQXVCLElBQUksTUFBSixDQUFZLFFBQVEsa0JBQVIsR0FBNkIsYUFBekMsRUFBd0QsR0FBeEQsQ0FBdkI7O0FBRUEsT0FBSyxnQkFBTCxHQUF3QixFQUF4Qjs7QUFFQSxPQUFLLGNBQUwsQ0FBcUIsS0FBSyxZQUFMLENBQWtCLElBQWxCLENBQXdCLElBQXhCLENBQXJCO0FBQ0EsRUFoQkQ7O0FBa0JBOztBQUVBOzs7QUFHQSxzQkFBcUIsU0FBckIsQ0FBK0IsWUFBL0IsR0FBOEMsWUFBVztBQUN4RCxPQUFLLElBQUwsQ0FBVSxXQUFWLENBQXVCLHNCQUF2QjtBQUNBLE9BQUsscUJBQUw7QUFDQSxFQUhEOztBQUtBOzs7QUFHQSxzQkFBcUIsU0FBckIsQ0FBK0Is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OUI7QUFDQSxDQWhSQyxHQUFGIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qIGdsb2JhbCB0aW55TUNFICovXG4vKiBnbG9iYWwgd3BzZW9TaG9ydGNvZGVQbHVnaW5MMTBuICovXG4vKiBnbG9iYWwgYWpheHVybCAqL1xuLyogZ2xvYmFsIF8gKi9cbi8qIGdsb2JhbCBKU09OICovXG4vKiBnbG9iYWwgY29uc29sZSAqL1xuKCBmdW5jdGlvbigpIHtcblx0XCJ1c2Ugc3RyaWN0XCI7XG5cblx0LyoqXG5cdCAqIFRoZSBZb2FzdCBTaG9ydGNvZGUgcGx1Z2luIHBhcnNlcyB0aGUgc2hvcnRjb2RlcyBpbiBhIGdpdmVuIHBpZWNlIG9mIHRleHQuIEl0IGFuYWx5emVzIG11bHRpcGxlIGlucHV0IGZpZWxkcyBmb3Igc2hvcnRjb2RlcyB3aGljaCBpdCB3aWxsIHByZWxvYWQgdXNpbmcgQUpBWC5cblx0ICpcblx0ICogQGNvbnN0cnVjdG9yXG5cdCAqIEBwcm9wZXJ0eSB7UmVnRXhwfSBrZXl3b3JkUmVnZXggVXNlZCB0byBtYXRjaCBhIGdpdmVuIHN0cmluZyBmb3IgdmFsaWQgc2hvcnRjb2RlIGtleXdvcmRzLlxuXHQgKiBAcHJvcGVydHkge1JlZ0V4cH0gY2xvc2luZ1RhZ1JlZ2V4IFVzZWQgdG8gbWF0Y2ggYSBnaXZlbiBzdHJpbmcgZm9yIHNob3J0Y29kZSBjbG9zaW5nIHRhZ3MuXG5cdCAqIEBwcm9wZXJ0eSB7UmVnRXhwfSBub25DYXB0dXJlUmVnZXggVXNlZCB0byBtYXRjaCBhIGdpdmVuIHN0cmluZyBmb3Igbm9uIGNhcHR1cmluZyBzaG9ydGNvZGVzLlxuXHQgKiBAcHJvcGVydHkge0FycmF5fSBwYXJzZWRTaG9ydGNvZGVzIFVzZWQgdG8gc3RvcmUgcGFyc2VkIHNob3J0Y29kZXMuXG5cdCAqL1xuXHR2YXIgWW9hc3RTaG9ydGNvZGVQbHVnaW4gPSBmdW5jdGlvbiggYXBwICkge1xuXHRcdHRoaXMuX2FwcCA9IGFwcDtcblxuXHRcdHRoaXMuX2FwcC5yZWdpc3RlclBsdWdpbiggXCJZb2FzdFNob3J0Y29kZVBsdWdpblwiLCB7IHN0YXR1czogXCJsb2FkaW5nXCIgfSApO1xuXHRcdHRoaXMuYmluZEVsZW1lbnRFdmVudHMoKTtcblxuXHRcdHZhciBrZXl3b3JkUmVnZXhTdHJpbmcgPSBcIihcIiArIHdwc2VvU2hvcnRjb2RlUGx1Z2luTDEwbi53cHNlb19zaG9ydGNvZGVfdGFncy5qb2luKCBcInxcIiApICsgXCIpXCI7XG5cblx0XHQvLyBUaGUgcmVnZXggZm9yIG1hdGNoaW5nIHNob3J0Y29kZXMgYmFzZWQgb24gdGhlIGF2YWlsYWJsZSBzaG9ydGNvZGUga2V5d29yZHMuXG5cdFx0dGhpcy5rZXl3b3JkUmVnZXggPSBuZXcgUmVnRXhwKCBrZXl3b3JkUmVnZXhTdHJpbmcsIFwiZ1wiICk7XG5cdFx0dGhpcy5jbG9zaW5nVGFnUmVnZXggPSBuZXcgUmVnRXhwKCBcIlxcXFxbXFxcXC9cIiArIGtleXdvcmRSZWdleFN0cmluZyArIFwiXFxcXF1cIiwgXCJnXCIgKTtcblx0XHR0aGlzLm5vbkNhcHR1cmVSZWdleCA9IG5ldyBSZWdFeHAoIFwiXFxcXFtcIiArIGtleXdvcmRSZWdleFN0cmluZyArIFwiW15cXFxcXV0qP1xcXFxdXCIsIFwiZ1wiICk7XG5cblx0XHR0aGlzLnBhcnNlZFNob3J0Y29kZXMgPSBbXTtcblxuXHRcdHRoaXMubG9hZFNob3J0Y29kZXMoIHRoaXMuZGVjbGFyZVJlYWR5LmJpbmQoIHRoaXMgKSApO1xuXHR9O1xuXG5cdC8qIFlPQVNUIFNFTyBDTElFTlQgKi9cblxuXHQvKipcblx0ICogRGVjbGFyZXMgcmVhZHkgd2l0aCBZb2FzdFNFTy5cblx0ICovXG5cdFlvYXN0U2hvcnRjb2RlUGx1Z2luLnByb3RvdHlwZS5kZWNsYXJlUmVhZHkgPSBmdW5jdGlvbigpIHtcblx0XHR0aGlzLl9hcHAucGx1Z2luUmVhZHkoIFwiWW9hc3RTaG9ydGNvZGVQbHVnaW5cIiApO1xuXHRcdHRoaXMucmVnaXN0ZXJNb2RpZmljYXRpb25zKCk7XG5cdH07XG5cblx0LyoqXG5cdCAqIERlY2xhcmVzIHJlbG9hZGVkIHdpdGggWW9hc3RTRU8uXG5cdCAqL1xuXHRZb2FzdFNob3J0Y29kZVBsdWdpbi5wcm90b3R5cGUuZGVjbGFyZVJlbG9hZGVkID0gZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5fYXBwLnBsdWdpblJlbG9hZGVkKCBcIllvYXN0U2hvcnRjb2RlUGx1Z2luXCIgKTtcblx0fTtcblxuXHQvKipcblx0ICogUmVnaXN0ZXJzIHRoZSBtb2RpZmljYXRpb25zIGZvciB0aGUgY29udGVudCBpbiB3aGljaCB3ZSB3YW50IHRvIHJlcGxhY2Ugc2hvcnRjb2Rlcy5cblx0ICovXG5cdFlvYXN0U2hvcnRjb2RlUGx1Z2luLnByb3RvdHlwZS5yZWdpc3Rlck1vZGlmaWNhdGlvbnMgPSBmdW5jdGlvbigpIHtcblx0XHR0aGlzLl9hcHAucmVnaXN0ZXJNb2RpZmljYXRpb24oIFwiY29udGVudFwiLCB0aGlzLnJlcGxhY2VTaG9ydGNvZGVzLmJpbmQoIHRoaXMgKSwgXCJZb2FzdFNob3J0Y29kZVBsdWdpblwiICk7XG5cdH07XG5cblx0LyoqXG5cdCAqIFRoZSBjYWxsYmFjayB1c2VkIHRvIHJlcGxhY2UgdGhlIHNob3J0Y29kZXMuXG5cdCAqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBkYXRhXG5cdCAqIEByZXR1cm5zIHtzdHJpbmd9XG5cdCAqL1xuXHRZb2FzdFNob3J0Y29kZVBsdWdpbi5wcm90b3R5cGUucmVwbGFjZVNob3J0Y29kZXMgPSBmdW5jdGlvbiggZGF0YSApIHtcblx0XHR2YXIgcGFyc2VkU2hvcnRjb2RlcyA9IHRoaXMucGFyc2VkU2hvcnRjb2RlcztcblxuXHRcdGlmICggdHlwZW9mIGRhdGEgPT09IFwic3RyaW5nXCIgJiYgcGFyc2VkU2hvcnRjb2Rlcy5sZW5ndGggPiAwICkge1xuXHRcdFx0Zm9yICggdmFyIGkgPSAwOyBpIDwgcGFyc2VkU2hvcnRjb2Rlcy5sZW5ndGg7IGkrKyApIHtcblx0XHRcdFx0ZGF0YSA9IGRhdGEucmVwbGFjZSggcGFyc2VkU2hvcnRjb2Rlc1sgaSBdLnNob3J0Y29kZSwgcGFyc2VkU2hvcnRjb2Rlc1sgaSBdLm91dHB1dCApO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBkYXRhO1xuXHR9O1xuXG5cdC8qIERBVEEgU09VUkNJTkcgKi9cblxuXHQvKipcblx0ICogR2V0IGRhdGEgZnJvbSBpbnB1dGZpZWxkcyBhbmQgc3RvcmUgdGhlbSBpbiBhbiBhbmFseXplckRhdGEgb2JqZWN0LiBUaGlzIG9iamVjdCB3aWxsIGJlIHVzZWQgdG8gZmlsbFxuXHQgKiB0aGUgYW5hbHl6ZXIgYW5kIHRoZSBzbmlwcGV0cHJldmlld1xuXHQgKlxuXHQgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayBUbyBkZWNsYXJlIGVpdGhlciByZWFkeSBvciByZWxvYWRlZCBhZnRlciBwYXJzaW5nLlxuXHQgKi9cblx0WW9hc3RTaG9ydGNvZGVQbHVnaW4ucHJvdG90eXBlLmxvYWRTaG9ydGNvZGVzID0gZnVuY3Rpb24oIGNhbGxiYWNrICkge1xuXHRcdHZhciB1bnBhcnNlZFNob3J0Y29kZXMgPSB0aGlzLmdldFVucGFyc2VkU2hvcnRjb2RlcyggdGhpcy5nZXRTaG9ydGNvZGVzKCB0aGlzLmdldENvbnRlbnRUaW55TUNFKCkgKSApO1xuXHRcdGlmICggdW5wYXJzZWRTaG9ydGNvZGVzLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHR0aGlzLnBhcnNlU2hvcnRjb2RlcyggdW5wYXJzZWRTaG9ydGNvZGVzLCBjYWxsYmFjayApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gY2FsbGJhY2soKTtcblx0XHR9XG5cdH07XG5cblx0LyoqXG5cdCAqIEJpbmQgZWxlbWVudHMgdG8gYmUgYWJsZSB0byByZWxvYWQgdGhlIGRhdGFzZXQgaWYgc2hvcnRjb2RlcyBnZXQgYWRkZWQuXG5cdCAqL1xuXHRZb2FzdFNob3J0Y29kZVBsdWdpbi5wcm90b3R5cGUuYmluZEVsZW1lbnRFdmVudHMgPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgY29udGVudEVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCggXCJjb250ZW50XCIgKSB8fCBmYWxzZTtcblx0XHR2YXIgY2FsbGJhY2sgPSAgXy5kZWJvdW5jZShcdHRoaXMubG9hZFNob3J0Y29kZXMuYmluZCggdGhpcywgdGhpcy5kZWNsYXJlUmVsb2FkZWQuYmluZCggdGhpcyApICksIDUwMCApO1xuXG5cdFx0aWYgKCBjb250ZW50RWxlbWVudCApIHtcblx0XHRcdGNvbnRlbnRFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoIFwia2V5dXBcIiwgY2FsbGJhY2sgKTtcblx0XHRcdGNvbnRlbnRFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoIFwiY2hhbmdlXCIsIGNhbGxiYWNrICk7XG5cdFx0fVxuXG5cdFx0aWYoIHR5cGVvZiB0aW55TUNFICE9PSBcInVuZGVmaW5lZFwiICYmIHR5cGVvZiB0aW55TUNFLm9uID09PSBcImZ1bmN0aW9uXCIgKSB7XG5cdFx0XHR0aW55TUNFLm9uKCBcImFkZEVkaXRvclwiLCBmdW5jdGlvbiggZSApIHtcblx0XHRcdFx0ZS5lZGl0b3Iub24oIFwiY2hhbmdlXCIsIGNhbGxiYWNrICk7XG5cdFx0XHRcdGUuZWRpdG9yLm9uKCBcImtleXVwXCIsIGNhbGxiYWNrICk7XG5cdFx0XHR9ICk7XG5cdFx0fVxuXHR9O1xuXG5cdC8qKlxuXHQgKiBnZXRzIGNvbnRlbnQgZnJvbSB0aGUgY29udGVudCBmaWVsZCwgaWYgdGlueU1DRSBpcyBpbml0aWFsaXplZCwgdXNlIHRoZSBnZXRDb250ZW50IGZ1bmN0aW9uIHRvIGdldCB0aGUgZGF0YSBmcm9tIHRpbnlNQ0Vcblx0ICogQHJldHVybnMge1N0cmluZ31cblx0ICovXG5cdFlvYXN0U2hvcnRjb2RlUGx1Z2luLnByb3RvdHlwZS5nZXRDb250ZW50VGlueU1DRSA9IGZ1bmN0aW9uKCkge1xuXHRcdHZhciB2YWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCggXCJjb250ZW50XCIgKSAmJiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCggXCJjb250ZW50XCIgKS52YWx1ZSB8fCBcIlwiO1xuXHRcdGlmICggdHlwZW9mIHRpbnlNQ0UgIT09IFwidW5kZWZpbmVkXCIgJiYgdHlwZW9mIHRpbnlNQ0UuZWRpdG9ycyAhPT0gXCJ1bmRlZmluZWRcIiAmJiB0aW55TUNFLmVkaXRvcnMubGVuZ3RoICE9PSAwICkge1xuXHRcdFx0dmFsID0gdGlueU1DRS5nZXQoIFwiY29udGVudFwiICkgJiYgdGlueU1DRS5nZXQoIFwiY29udGVudFwiICkuZ2V0Q29udGVudCgpIHx8IFwiXCI7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHZhbDtcblx0fTtcblxuXHQvKiBTSE9SVENPREUgUEFSU0lORyAqL1xuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIHRoZSB1bnBhcnNlZCBzaG9ydGNvZGVzIG91dCBvZiBhIGNvbGxlY3Rpb24gb2Ygc2hvcnRjb2Rlcy5cblx0ICpcblx0ICogQHBhcmFtIHtBcnJheX0gc2hvcnRjb2Rlc1xuXHQgKiBAcmV0dXJucyB7QXJyYXl9XG5cdCAqL1xuXHRZb2FzdFNob3J0Y29kZVBsdWdpbi5wcm90b3R5cGUuZ2V0VW5wYXJzZWRTaG9ydGNvZGVzID0gZnVuY3Rpb24oIHNob3J0Y29kZXMgKSB7XG5cdFx0aWYgKCB0eXBlb2Ygc2hvcnRjb2RlcyAhPT0gXCJvYmplY3RcIiApIHtcblx0XHRcdGNvbnNvbGUuZXJyb3IoIFwiRmFpbGVkIHRvIGdldCB1bnBhcnNlZCBzaG9ydGNvZGVzLiBFeHBlY3RlZCBwYXJhbWV0ZXIgdG8gYmUgYW4gYXJyYXksIGluc3RlYWQgcmVjZWl2ZWQgXCIgKyB0eXBlb2Ygc2hvcnRjb2RlcyApO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdHZhciB1bnBhcnNlZFNob3J0Y29kZXMgPSBbXTtcblxuXHRcdGZvciAoIHZhciBpID0gMDsgaSA8IHNob3J0Y29kZXMubGVuZ3RoOyBpKysgKSB7XG5cdFx0XHR2YXIgc2hvcnRjb2RlID0gc2hvcnRjb2Rlc1sgaSBdO1xuXHRcdFx0aWYgKCB1bnBhcnNlZFNob3J0Y29kZXMuaW5kZXhPZiggc2hvcnRjb2RlICkgPT09IC0xICYmIHRoaXMuaXNVbnBhcnNlZFNob3J0Y29kZSggc2hvcnRjb2RlICkgKSB7XG5cdFx0XHRcdHVucGFyc2VkU2hvcnRjb2Rlcy5wdXNoKCBzaG9ydGNvZGUgKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gdW5wYXJzZWRTaG9ydGNvZGVzO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBDaGVja3MgaWYgYSBnaXZlbiBzaG9ydGNvZGUgd2FzIGFscmVhZHkgcGFyc2VkLlxuXHQgKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gc2hvcnRjb2RlXG5cdCAqIEByZXR1cm5zIHtib29sZWFufVxuXHQgKi9cblx0WW9hc3RTaG9ydGNvZGVQbHVnaW4ucHJvdG90eXBlLmlzVW5wYXJzZWRTaG9ydGNvZGUgPSBmdW5jdGlvbiggc2hvcnRjb2RlICkge1xuXHRcdHZhciBhbHJlYWR5X2V4aXN0cyA9IGZhbHNlO1xuXG5cdFx0Zm9yICggdmFyIGkgPSAwOyBpIDwgdGhpcy5wYXJzZWRTaG9ydGNvZGVzLmxlbmd0aDsgaSsrICkge1xuXHRcdFx0aWYgKCB0aGlzLnBhcnNlZFNob3J0Y29kZXNbIGkgXS5zaG9ydGNvZGUgPT09IHNob3J0Y29kZSApIHtcblx0XHRcdFx0YWxyZWFkeV9leGlzdHMgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBhbHJlYWR5X2V4aXN0cyA9PT0gZmFsc2U7XG5cdH07XG5cblx0LyoqXG5cdCAqIEdldHMgdGhlIHNob3J0Y29kZXMgZnJvbSBhIGdpdmVuIHBpZWNlIG9mIHRleHQuXG5cdCAqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0XG5cdCAqIEByZXR1cm5zIHthcnJheX0gVGhlIG1hdGNoZWQgc2hvcnRjb2Rlc1xuXHQgKi9cblx0WW9hc3RTaG9ydGNvZGVQbHVnaW4ucHJvdG90eXBlLmdldFNob3J0Y29kZXMgPSBmdW5jdGlvbiggdGV4dCApIHtcblx0XHRpZiAoIHR5cGVvZiB0ZXh0ICE9PSBcInN0cmluZ1wiICkge1xuXHRcdFx0LyoganNoaW50IGlnbm9yZTpzdGFydCAqL1xuXHRcdFx0Y29uc29sZS5lcnJvciggXCJGYWlsZWQgdG8gZ2V0IHNob3J0Y29kZXMuIEV4cGVjdGVkIHBhcmFtZXRlciB0byBiZSBhIHN0cmluZywgaW5zdGVhZCByZWNlaXZlZFwiICsgdHlwZW9mIHRleHQgKTtcblx0XHRcdC8qIGpzaGludCBpZ25vcmU6ZW5kKi9cblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHR2YXIgY2FwdHVyZXMgPSB0aGlzLm1hdGNoQ2FwdHVyaW5nU2hvcnRjb2RlcyggdGV4dCApO1xuXG5cdFx0Ly8gUmVtb3ZlIHRoZSBjYXB0dXJpbmcgc2hvcnRjb2RlcyBmcm9tIHRoZSB0ZXh0IGJlZm9yZSB0cnlpbmcgdG8gbWF0Y2ggdGhlIGNhcHR1cmluZyBzaG9ydGNvZGVzLlxuXHRcdGZvciAoIHZhciBpID0gMDsgaSA8IGNhcHR1cmVzLmxlbmd0aDsgaSsrICkge1xuXHRcdFx0dGV4dCA9IHRleHQucmVwbGFjZSggY2FwdHVyZXNbIGkgXSwgXCJcIiApO1xuXHRcdH1cblxuXHRcdHZhciBub25DYXB0dXJlcyA9IHRoaXMubWF0Y2hOb25DYXB0dXJpbmdTaG9ydGNvZGVzKCB0ZXh0ICk7XG5cblx0XHRyZXR1cm4gY2FwdHVyZXMuY29uY2F0KCBub25DYXB0dXJlcyApO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBNYXRjaGVzIHRoZSBjYXB0dXJpbmcgc2hvcnRjb2RlcyBmcm9tIGEgZ2l2ZW4gcGllY2Ugb2YgdGV4dC5cblx0ICpcblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHRcblx0ICogQHJldHVybnMge0FycmF5fVxuXHQgKi9cblx0WW9hc3RTaG9ydGNvZGVQbHVnaW4ucHJvdG90eXBlLm1hdGNoQ2FwdHVyaW5nU2hvcnRjb2RlcyA9IGZ1bmN0aW9uKCB0ZXh0ICkge1xuXHRcdHZhciBjYXB0dXJlcyA9IFtdO1xuXG5cdFx0Ly8gRmlyc3QgaWRlbnRpZnkgd2hpY2ggdGFncyBhcmUgYmVpbmcgdXNlZCBpbiBhIGNhcHR1cmluZyBzaG9ydGNvZGUgYnkgbG9va2luZyBmb3IgY2xvc2luZyB0YWdzLlxuXHRcdHZhciBjYXB0dXJlS2V5d29yZHMgPSAoIHRleHQubWF0Y2goIHRoaXMuY2xvc2luZ1RhZ1JlZ2V4ICkgfHwgW10gKS5qb2luKCBcIiBcIiApLm1hdGNoKCB0aGlzLmtleXdvcmRSZWdleCApIHx8IFtdO1xuXG5cdFx0Ly8gRmV0Y2ggdGhlIGNhcHR1cmluZyBzaG9ydGNvZGVzIGFuZCBzdHJpcCB0aGVtIGZyb20gdGhlIHRleHQgc28gd2UgY2FuIGVhc2lseSBtYXRjaCB0aGUgbm9uIGNhcHR1cmluZyBzaG9ydGNvZGVzLlxuXHRcdGZvciAoIHZhciBpID0gMDsgaSA8IGNhcHR1cmVLZXl3b3Jkcy5sZW5ndGg7IGkrKyApIHtcblx0XHRcdHZhciBjYXB0dXJlS2V5d29yZCA9IGNhcHR1cmVLZXl3b3Jkc1sgaSBdO1xuXHRcdFx0dmFyIGNhcHR1cmVSZWdleCA9IFwiXFxcXFtcIiArIGNhcHR1cmVLZXl3b3JkICsgXCJbXlxcXFxdXSo/XFxcXF0uKj9cXFxcW1xcXFwvXCIgKyBjYXB0dXJlS2V5d29yZCArIFwiXFxcXF1cIjtcblx0XHRcdHZhciBtYXRjaGVzID0gdGV4dC5tYXRjaCggbmV3IFJlZ0V4cCggY2FwdHVyZVJlZ2V4LCBcImdcIiApICkgfHwgW107XG5cblx0XHRcdGNhcHR1cmVzID0gY2FwdHVyZXMuY29uY2F0KCBtYXRjaGVzICk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGNhcHR1cmVzO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBNYXRjaGVzIHRoZSBub24gY2FwdHVyaW5nIHNob3J0Y29kZXMgZnJvbSBhIGdpdmVuIHBpZWNlIG9mIHRleHQuXG5cdCAqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0XG5cdCAqIEByZXR1cm5zIHtBcnJheX1cblx0ICovXG5cdFlvYXN0U2hvcnRjb2RlUGx1Z2luLnByb3RvdHlwZS5tYXRjaE5vbkNhcHR1cmluZ1Nob3J0Y29kZXMgPSBmdW5jdGlvbiggdGV4dCApIHtcblx0XHRyZXR1cm4gdGV4dC5tYXRjaCggdGhpcy5ub25DYXB0dXJlUmVnZXggKSB8fCBbXTtcblx0fTtcblxuXHQvKipcblx0ICogUGFyc2VzIHRoZSB1bnBhcnNlZCBzaG9ydGNvZGVzIHRocm91Z2ggQUpBWCBhbmQgY2xlYXJzIHRoZW0uXG5cdCAqXG5cdCAqIEBwYXJhbSB7QXJyYXl9IHNob3J0Y29kZXMgc2hvcnRjb2RlcyB0byBiZSBwYXJzZWQuXG5cdCAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBpbiB0aGUgY29udGV4dCBvZiB0aGUgQUpBWCBjYWxsYmFjay5cblx0ICovXG5cdFlvYXN0U2hvcnRjb2RlUGx1Z2luLnByb3RvdHlwZS5wYXJzZVNob3J0Y29kZXMgPSBmdW5jdGlvbiggc2hvcnRjb2RlcywgY2FsbGJhY2sgKSB7XG5cdFx0aWYgKCB0eXBlb2YgY2FsbGJhY2sgIT09IFwiZnVuY3Rpb25cIiApIHtcblx0XHRcdC8qIGpzaGludCBpZ25vcmU6c3RhcnQgKi9cblx0XHRcdGNvbnNvbGUuZXJyb3IoIFwiRmFpbGVkIHRvIHBhcnNlIHNob3J0Y29kZXMuIEV4cGVjdGVkIHBhcmFtZXRlciB0byBiZSBhIGZ1bmN0aW9uLCBpbnN0ZWFkIHJlY2VpdmVkIFwiICsgdHlwZW9mIGNhbGxiYWNrICk7XG5cdFx0XHQvKiBqc2hpbnQgaWdub3JlOmVuZCAqL1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGlmICggdHlwZW9mIHNob3J0Y29kZXMgPT09IFwib2JqZWN0XCIgJiYgc2hvcnRjb2Rlcy5sZW5ndGggPiAwICkge1xuXHRcdFx0alF1ZXJ5LnBvc3QoIGFqYXh1cmwsIHtcblx0XHRcdFx0YWN0aW9uOiBcIndwc2VvX2ZpbHRlcl9zaG9ydGNvZGVzXCIsXG5cdFx0XHRcdF93cG5vbmNlOiB3cHNlb1Nob3J0Y29kZVBsdWdpbkwxMG4ud3BzZW9fZmlsdGVyX3Nob3J0Y29kZXNfbm9uY2UsXG5cdFx0XHRcdGRhdGE6IHNob3J0Y29kZXMsXG5cdFx0XHR9LFxuXHRcdFx0XHRmdW5jdGlvbiggc2hvcnRjb2RlUmVzdWx0cyApIHtcblx0XHRcdFx0XHR0aGlzLnNhdmVQYXJzZWRTaG9ydGNvZGVzKCBzaG9ydGNvZGVSZXN1bHRzLCBjYWxsYmFjayApO1xuXHRcdFx0XHR9LmJpbmQoIHRoaXMgKVxuXHRcdFx0KTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRyZXR1cm4gY2FsbGJhY2soKTtcblx0XHR9XG5cdH07XG5cblx0LyoqXG5cdCAqIFNhdmVzIHRoZSBzaG9ydGNvZGVzIHRoYXQgd2VyZSBwYXJzZWQgd2l0aCBBSkFYIHRvIGB0aGlzLnBhcnNlZFNob3J0Y29kZXNgXG5cdCAqXG5cdCAqIEBwYXJhbSB7QXJyYXl9IHNob3J0Y29kZVJlc3VsdHNcblx0ICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2tcblx0ICovXG5cdFlvYXN0U2hvcnRjb2RlUGx1Z2luLnByb3RvdHlwZS5zYXZlUGFyc2VkU2hvcnRjb2RlcyA9IGZ1bmN0aW9uKCBzaG9ydGNvZGVSZXN1bHRzLCBjYWxsYmFjayApIHtcblx0XHRzaG9ydGNvZGVSZXN1bHRzID0gSlNPTi5wYXJzZSggc2hvcnRjb2RlUmVzdWx0cyApO1xuXHRcdGZvciAoIHZhciBpID0gMDsgaSA8IHNob3J0Y29kZVJlc3VsdHMubGVuZ3RoOyBpKysgKSB7XG5cdFx0XHR0aGlzLnBhcnNlZFNob3J0Y29kZXMucHVzaCggc2hvcnRjb2RlUmVzdWx0c1sgaSBdICk7XG5cdFx0fVxuXG5cdFx0Y2FsbGJhY2soKTtcblx0fTtcblxuXHR3aW5kb3cuWW9hc3RTaG9ydGNvZGVQbHVnaW4gPSBZb2FzdFNob3J0Y29kZVBsdWdpbjtcbn0oKSApO1xuIl19