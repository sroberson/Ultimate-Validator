/*
Copyright (c) 2011 Martin Mahoney | http://bioluminous.net

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/** Initialize the core validator, and returns an object for use in creating instances **/
var UJV = (function() {

	/** The Base object from which new instances are created **/
	function BaseValidator(map) {
		this.RuleMap = map || {};
	};

	/**
		ValidateForm: When bound to a form, it iterates through each assigned rule set, running the rules
		against that particular field.
	**/
	BaseValidator.prototype.ValidateForm = function(formObj) {
		// exit if this is not a valid form element
		if ( ! this.TestIsValidElement(formObj, "form") ){
			return false;
		}

		// declare all our vars
		var invalidFields = [], // <-- store any fields that fail validation
		fieldKey,
		fieldElm,
		ruleKey,
		ruleObj,
		isValid;

		// for each field, get rules
		for (fieldKey in this.RuleMap) {
			// get the field as a DOM element witht he fieldKey
			fieldElm = this.GetElement(formObj, fieldKey);
			// if no field found, skip
			if(fieldElm === null) continue;
			// clean up the input string
			fieldElm.value = this.TrimAll(fieldElm.value);
			// for each rule..
			for (ruleKey in this.RuleMap[fieldKey]) {
				// get rule object
				ruleObj = this.RuleMap[fieldKey][ruleKey];
				// added field element to ruleObj
				ruleObj.fieldElm = fieldElm
				// validator return state
				isValid = false;

				// if default validator, passed as a string, look it up and execute
				if (typeof ruleObj.validator !== 'function') {
					isValid = this[ruleObj.validator](fieldElm, ruleObj.args);
				}
				// if a custom validator function, execute that
				else{
					isValid = ruleObj.validator.call(this, fieldElm, ruleObj.args);
				}
				// if it failed, push it on the invalid stack
				if(isValid === false) invalidFields.push(ruleObj);
			}
		}

		// process the validation state and take action accordingly
		if(invalidFields.length > 0){
			return this.OnFormError(formObj, invalidFields);
		}
		else{
			return this.OnFormSuccess(formObj);
		}
	};

	/**
		ValidateField: Runs against a single form field, it iterates through each assigned rule set, running the rules
		against that particular field.
	**/
	BaseValidator.prototype.ValidateField = function(fieldElm){
		// exit if this is not a valid form element
		if(typeof fieldElm === "undefined" || fieldElm === null){
			return false;
		}

		// declare all our vars
		var fieldKey,
		rulesObj,
		ruleKey,
		ruleObj,
		isValid;

		// get name or id as string
		fieldKey = this.GetNameOrID(fieldElm);
		// if no field with name or ID found, exit...
		if(fieldKey === null){
			return false;
		}
		// get rules for this field only
		rulesObj = this.RuleMap[fieldKey];
		// clean up the input string
		fieldElm.value = this.TrimAll(fieldElm.value);
		// for each rule..
		for (ruleKey in rulesObj) {
			// get rule object
			ruleObj = rulesObj[ruleKey];
			// added field element to fieldObj for use downstream
			ruleObj.fieldElm = fieldElm
			// validator return state
			isValid = false;
			// if default validator, passed as a string, look it up and execute
			if (typeof ruleObj.validator !== 'function') {
				isValid = this[ruleObj.validator](fieldElm, ruleObj.args);
			}
			// if a custom validator function, execute that
			else{
				isValid = ruleObj.validator.call(this, fieldElm, ruleObj.args);
			}
			// process the validation state and take action accordingly
			isValid ? this.OnFieldSuccess(ruleObj) : this.OnFieldError(ruleObj);
			// if the rule passed, move on to the next one, otherwise return false to fail validation
			if(isValid) {continue;}
			else {return false; }
		}

		// all rules passed, OK
		return true;
	};

	/** BUILT-IN VALIDATION RULES **/
	BaseValidator.prototype.Email = function(o) {
		return /^[A-Z0-9._%\+\-\']+@(?:[A-Z0-9-]+\.)+[A-Z]{2,10}$/i.test(o.value);
	};

	BaseValidator.prototype.Required =  function(o) {
		return o.value.length >= 1 ? true : false;
	};

	BaseValidator.prototype.ValidChars =  function(o){
		return /^[A-Za-z\-\s]*$/i.test(o.value);
	};

	BaseValidator.prototype.ValidCharsExt1 =  function(o){
		return /^[A-Za-z@&\-'\s]*$/i.test(o.value);
	};

	// need to add a few more....

	/**** utility methods *****/

	/* removes leading and trailing whitespace*/
	BaseValidator.prototype.TrimEnds  =  function(str) {
		if(!str) return "";
		str = str.replace(/^\s\s*/, ""),
			ws = /\s/,
			i = str.length;
		while (ws.test(str.charAt(--i)));
		return str.slice(0, i + 1);
	};

	/* removes leading, trailing, and repeated whitespaces( but leaves one between words ) */
	BaseValidator.prototype.TrimAll  =  function(str) {
		if(!str) return "";
		str = str.replace(/^\s\s*/, ""),
			ws = /\s/,
			i = str.length;
		while (ws.test(str.charAt(--i)));
		var trimmed = str.slice(0, i + 1);
		return trimmed.replace(/\s+/, " ");
	};

	/* check that we have a valid form element  */
	BaseValidator.prototype.TestIsValidElement =  function(obj, tagname) {
		if(typeof obj !== "undefined" && obj !== null){
			// now test element and tag type are correct
			try{
				if(obj.nodeType === 1){
					if(obj.tagName === tagname.toUpperCase()){ return true; }
				}
			}
			catch(e){  }
		}
		return false;
	};

	/* get an element by ID, if no ID, try getting it from the form's elements collection ( f is expected to be a form object ) */
	BaseValidator.prototype.GetElement =  function(f, str) {
		return document.getElementById(str) ? document.getElementById(str) :
			f.elements[str] ? f.elements[str] : null;
	};

	/* look for an ID on this element, if not found, try to get a NAME */
	BaseValidator.prototype.GetNameOrID =  function(el){
		return el.getAttribute("id") ? el.getAttribute("id") :
			el.getAttribute("name") ? el.getAttribute("name") : null;
	};

	/* Test for existence of an error class */
	BaseValidator.prototype.HasClass = function(el,cls, expr) {
		var ex = cls !== null ? new RegExp("\\b" + cls + "\\b") : expr;
		return ex.test(el.className);
	};

	/* Add an error class */
	BaseValidator.prototype.AddClass = function (el,cls) {
		var expr = new RegExp("\\b" + cls + "\\b");
		if ( !this.HasClass(el, null, expr) ) {
			el.className += " " + cls;
			el.className = this.TrimAll(el.className);
		}
	};

	/* Remove an error class */
	BaseValidator.prototype.RemoveClass = function (el,cls) {
		var expr = new RegExp("\\b" + cls + "\\b");
		if(this.HasClass(el, null, expr)){
			el.className = el.className.replace(expr, "");
			el.className = this.TrimAll(el.className);
		}
	};

	/**** Error styling methods. These functions can be overidden as desired *****/

	/* Remove error classes from a single field on successful validation */
	BaseValidator.prototype.OnFieldSuccess =  function (o) {
		var f = o.fieldElm,
		l = f.parentNode.getElementsByTagName("label")[0];

		this.RemoveClass(f, "fieldErrorBorder");
		this.RemoveClass(l, "fieldErrorText");
		return true;
	};

	/* Add error classes to a single field on failed validation */
	BaseValidator.prototype.OnFieldError =  function (o) {
		var f = o.fieldElm,
		l = f.parentNode.getElementsByTagName("label")[0];

		this.AddClass(f, "fieldErrorBorder");
		this.AddClass(l, "fieldErrorText");
		return false;
	};

	/* Remove error classes from a all fields on successful validation */
	BaseValidator.prototype.OnFormSuccess =  function (form) {
		var i, f, l;

		for (i=form.elements.length; i--;){
			f = form.elements[i];
			l = f.parentNode.getElementsByTagName("label")[0];
			this.RemoveClass(f, "fieldErrorBorder");
			this.RemoveClass(l, "fieldErrorText");
		}
		return true;
	};

	/* Add error classes to all fields that failed validation */
	BaseValidator.prototype.OnFormError =  function (form, errors) {
		var i, j, f, l, f2, l2;

		for (i=form.elements.length; i--;){
			f = form.elements[i];
			l = f.parentNode.getElementsByTagName("label")[0];
			this.RemoveClass(f, "fieldErrorBorder");
			this.RemoveClass(l, "fieldErrorText");
		}

		for (j=errors.length; j--;){
			f2 = errors[j].fieldElm;
			l2 = f2.parentNode.getElementsByTagName("label")[0];
			this.AddClass(f2, "fieldErrorBorder");
			this.AddClass(l2, "fieldErrorText");
		}
		return false;
	};

	/** Public object for getting a validator instance **/
	return {
		GetInstance: function(map) {
			return new BaseValidator(map);
		}
	}
})();

/**
You define rules for each form field. The string key is the fields DOM Id or Name attribute.
You can choose built-in validators, or pass a custom function that runs against the field objects
value and returns true or false. It must always do so, as its the condition the Validator uses
to know if it should flag the field as invalid or not
 **/
var ValidatorMap = {

	"firstname" : {
		"rulel" : { validator : function(o){
			return  o.value === "BANANAS" ? false : true;
		}, msg : "Your name is required to process the application" },

		"rule2" : { validator : "Required", msg : "Your name is required to process the application" },
		"rule3" : { validator : "ValidChars", msg : "Please enter a valid e-mail address in the format name@provider.com" }
	},

	"email" : {
		"rulel" : { validator : function(o){
			return o.value === "fake@fake.com" ? false : true;
		}, msg : "Your E-mail Address is required to process the application" },

		"rule2" : { validator : "Required", msg : "Your E-mail Address is required to process the application" },
		"rule3" : { validator : "Email", msg : "Please enter a valid e-mail address in the format name@provider.com" }
	}
};


// get a new instance and pass a validator map to use with it
var v = UJV.GetInstance(ValidatorMap);

// bind to a form and call the validator instance's ValidateForm method, passing the form as a DOM element
var formElm = document.getElementById("form1").addEventListener("submit",
	function(e){
		var result = v.ValidateForm(this);
		e.preventDefault();
	},
false);

// bind to an individual form field and call the validator instance's ValidateField method, passing the field as a DOM element
var fieldElm = document.getElementById("firstname").addEventListener("blur",
	function(e){
		var result = v.ValidateField(this);
		e.preventDefault();
	},
false);
