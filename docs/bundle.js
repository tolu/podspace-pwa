/* Bundle built Tue Jul 17 2018 18:52:30 GMT+0200 (CEST), current version 1.0.0 */
(function () {
    'use strict';

    /**
     * @license
     * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
     * This code may only be used under the BSD style license found at
     * http://polymer.github.io/LICENSE.txt
     * The complete set of authors may be found at
     * http://polymer.github.io/AUTHORS.txt
     * The complete set of contributors may be found at
     * http://polymer.github.io/CONTRIBUTORS.txt
     * Code distributed by Google as part of the polymer project is also
     * subject to an additional IP rights grant found at
     * http://polymer.github.io/PATENTS.txt
     */
    // The first argument to JS template tags retain identity across multiple
    // calls to a tag for the same literal, so we can cache work done per literal
    // in a Map.
    const templateCaches = new Map();
    /**
     * Interprets a template literal as an HTML template that can efficiently
     * render to and update a container.
     */
    const html = (strings, ...values) => new TemplateResult(strings, values, 'html');
    /**
     * The return type of `html`, which holds a Template and the values from
     * interpolated expressions.
     */
    class TemplateResult {
        constructor(strings, values, type, partCallback = defaultPartCallback) {
            this.strings = strings;
            this.values = values;
            this.type = type;
            this.partCallback = partCallback;
        }
        /**
         * Returns a string of HTML used to create a <template> element.
         */
        getHTML() {
            const l = this.strings.length - 1;
            let html = '';
            let isTextBinding = true;
            for (let i = 0; i < l; i++) {
                const s = this.strings[i];
                html += s;
                // We're in a text position if the previous string closed its tags.
                // If it doesn't have any tags, then we use the previous text position
                // state.
                const closing = findTagClose(s);
                isTextBinding = closing > -1 ? closing < s.length : isTextBinding;
                html += isTextBinding ? nodeMarker : marker;
            }
            html += this.strings[l];
            return html;
        }
        getTemplateElement() {
            const template = document.createElement('template');
            template.innerHTML = this.getHTML();
            return template;
        }
    }
    /**
     * The default TemplateFactory which caches Templates keyed on
     * result.type and result.strings.
     */
    function defaultTemplateFactory(result) {
        let templateCache = templateCaches.get(result.type);
        if (templateCache === undefined) {
            templateCache = new Map();
            templateCaches.set(result.type, templateCache);
        }
        let template = templateCache.get(result.strings);
        if (template === undefined) {
            template = new Template(result, result.getTemplateElement());
            templateCache.set(result.strings, template);
        }
        return template;
    }
    /**
     * Renders a template to a container.
     *
     * To update a container with new values, reevaluate the template literal and
     * call `render` with the new result.
     *
     * @param result a TemplateResult created by evaluating a template tag like
     *     `html` or `svg`.
     * @param container A DOM parent to render to. The entire contents are either
     *     replaced, or efficiently updated if the same result type was previous
     *     rendered there.
     * @param templateFactory a function to create a Template or retreive one from
     *     cache.
     */
    function render(result, container, templateFactory = defaultTemplateFactory) {
        const template = templateFactory(result);
        let instance = container.__templateInstance;
        // Repeat render, just call update()
        if (instance !== undefined && instance.template === template &&
            instance._partCallback === result.partCallback) {
            instance.update(result.values);
            return;
        }
        // First render, create a new TemplateInstance and append it
        instance =
            new TemplateInstance(template, result.partCallback, templateFactory);
        container.__templateInstance = instance;
        const fragment = instance._clone();
        instance.update(result.values);
        removeNodes(container, container.firstChild);
        container.appendChild(fragment);
    }
    /**
     * An expression marker with embedded unique key to avoid collision with
     * possible text in templates.
     */
    const marker = `{{lit-${String(Math.random()).slice(2)}}}`;
    /**
     * An expression marker used text-positions, not attribute positions,
     * in template.
     */
    const nodeMarker = `<!--${marker}-->`;
    const markerRegex = new RegExp(`${marker}|${nodeMarker}`);
    /**
     * This regex extracts the attribute name preceding an attribute-position
     * expression. It does this by matching the syntax allowed for attributes
     * against the string literal directly preceding the expression, assuming that
     * the expression is in an attribute-value position.
     *
     * See attributes in the HTML spec:
     * https://www.w3.org/TR/html5/syntax.html#attributes-0
     *
     * "\0-\x1F\x7F-\x9F" are Unicode control characters
     *
     * " \x09\x0a\x0c\x0d" are HTML space characters:
     * https://www.w3.org/TR/html5/infrastructure.html#space-character
     *
     * So an attribute is:
     *  * The name: any character except a control character, space character, ('),
     *    ("), ">", "=", or "/"
     *  * Followed by zero or more space characters
     *  * Followed by "="
     *  * Followed by zero or more space characters
     *  * Followed by:
     *    * Any character except space, ('), ("), "<", ">", "=", (`), or
     *    * (") then any non-("), or
     *    * (') then any non-(')
     */
    const lastAttributeNameRegex = /[ \x09\x0a\x0c\x0d]([^\0-\x1F\x7F-\x9F \x09\x0a\x0c\x0d"'>=/]+)[ \x09\x0a\x0c\x0d]*=[ \x09\x0a\x0c\x0d]*(?:[^ \x09\x0a\x0c\x0d"'`<>=]*|"[^"]*|'[^']*)$/;
    /**
     * Finds the closing index of the last closed HTML tag.
     * This has 3 possible return values:
     *   - `-1`, meaning there is no tag in str.
     *   - `string.length`, meaning the last opened tag is unclosed.
     *   - Some positive number < str.length, meaning the index of the closing '>'.
     */
    function findTagClose(str) {
        const close = str.lastIndexOf('>');
        const open = str.indexOf('<', close + 1);
        return open > -1 ? str.length : close;
    }
    /**
     * A placeholder for a dynamic expression in an HTML template.
     *
     * There are two built-in part types: AttributePart and NodePart. NodeParts
     * always represent a single dynamic expression, while AttributeParts may
     * represent as many expressions are contained in the attribute.
     *
     * A Template's parts are mutable, so parts can be replaced or modified
     * (possibly to implement different template semantics). The contract is that
     * parts can only be replaced, not removed, added or reordered, and parts must
     * always consume the correct number of values in their `update()` method.
     *
     * TODO(justinfagnani): That requirement is a little fragile. A
     * TemplateInstance could instead be more careful about which values it gives
     * to Part.update().
     */
    class TemplatePart {
        constructor(type, index, name, rawName, strings) {
            this.type = type;
            this.index = index;
            this.name = name;
            this.rawName = rawName;
            this.strings = strings;
        }
    }
    const isTemplatePartActive = (part) => part.index !== -1;
    /**
     * An updateable Template that tracks the location of dynamic parts.
     */
    class Template {
        constructor(result, element) {
            this.parts = [];
            this.element = element;
            const content = this.element.content;
            // Edge needs all 4 parameters present; IE11 needs 3rd parameter to be null
            const walker = document.createTreeWalker(content, 133 /* NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT |
                   NodeFilter.SHOW_TEXT */, null, false);
            let index = -1;
            let partIndex = 0;
            const nodesToRemove = [];
            // The actual previous node, accounting for removals: if a node is removed
            // it will never be the previousNode.
            let previousNode;
            // Used to set previousNode at the top of the loop.
            let currentNode;
            while (walker.nextNode()) {
                index++;
                previousNode = currentNode;
                const node = currentNode = walker.currentNode;
                if (node.nodeType === 1 /* Node.ELEMENT_NODE */) {
                    if (!node.hasAttributes()) {
                        continue;
                    }
                    const attributes = node.attributes;
                    // Per https://developer.mozilla.org/en-US/docs/Web/API/NamedNodeMap,
                    // attributes are not guaranteed to be returned in document order. In
                    // particular, Edge/IE can return them out of order, so we cannot assume
                    // a correspondance between part index and attribute index.
                    let count = 0;
                    for (let i = 0; i < attributes.length; i++) {
                        if (attributes[i].value.indexOf(marker) >= 0) {
                            count++;
                        }
                    }
                    while (count-- > 0) {
                        // Get the template literal section leading up to the first
                        // expression in this attribute
                        const stringForPart = result.strings[partIndex];
                        // Find the attribute name
                        const attributeNameInPart = lastAttributeNameRegex.exec(stringForPart)[1];
                        // Find the corresponding attribute
                        // TODO(justinfagnani): remove non-null assertion
                        const attribute = attributes.getNamedItem(attributeNameInPart);
                        const stringsForAttributeValue = attribute.value.split(markerRegex);
                        this.parts.push(new TemplatePart('attribute', index, attribute.name, attributeNameInPart, stringsForAttributeValue));
                        node.removeAttribute(attribute.name);
                        partIndex += stringsForAttributeValue.length - 1;
                    }
                }
                else if (node.nodeType === 3 /* Node.TEXT_NODE */) {
                    const nodeValue = node.nodeValue;
                    if (nodeValue.indexOf(marker) < 0) {
                        continue;
                    }
                    const parent = node.parentNode;
                    const strings = nodeValue.split(markerRegex);
                    const lastIndex = strings.length - 1;
                    // We have a part for each match found
                    partIndex += lastIndex;
                    // Generate a new text node for each literal section
                    // These nodes are also used as the markers for node parts
                    for (let i = 0; i < lastIndex; i++) {
                        parent.insertBefore((strings[i] === '')
                            ? document.createComment('')
                            : document.createTextNode(strings[i]), node);
                        this.parts.push(new TemplatePart('node', index++));
                    }
                    parent.insertBefore(strings[lastIndex] === '' ?
                        document.createComment('') :
                        document.createTextNode(strings[lastIndex]), node);
                    nodesToRemove.push(node);
                }
                else if (node.nodeType === 8 /* Node.COMMENT_NODE */ &&
                    node.nodeValue === marker) {
                    const parent = node.parentNode;
                    // Add a new marker node to be the startNode of the Part if any of the
                    // following are true:
                    //  * We don't have a previousSibling
                    //  * previousSibling is being removed (thus it's not the
                    //    `previousNode`)
                    //  * previousSibling is not a Text node
                    //
                    // TODO(justinfagnani): We should be able to use the previousNode here
                    // as the marker node and reduce the number of extra nodes we add to a
                    // template. See https://github.com/PolymerLabs/lit-html/issues/147
                    const previousSibling = node.previousSibling;
                    if (previousSibling === null || previousSibling !== previousNode ||
                        previousSibling.nodeType !== Node.TEXT_NODE) {
                        parent.insertBefore(document.createComment(''), node);
                    }
                    else {
                        index--;
                    }
                    this.parts.push(new TemplatePart('node', index++));
                    nodesToRemove.push(node);
                    // If we don't have a nextSibling add a marker node.
                    // We don't have to check if the next node is going to be removed,
                    // because that node will induce a new marker if so.
                    if (node.nextSibling === null) {
                        parent.insertBefore(document.createComment(''), node);
                    }
                    else {
                        index--;
                    }
                    currentNode = previousNode;
                    partIndex++;
                }
            }
            // Remove text binding nodes after the walk to not disturb the TreeWalker
            for (const n of nodesToRemove) {
                n.parentNode.removeChild(n);
            }
        }
    }
    /**
     * Returns a value ready to be inserted into a Part from a user-provided value.
     *
     * If the user value is a directive, this invokes the directive with the given
     * part. If the value is null, it's converted to undefined to work better
     * with certain DOM APIs, like textContent.
     */
    const getValue = (part, value) => {
        // `null` as the value of a Text node will render the string 'null'
        // so we convert it to undefined
        if (isDirective(value)) {
            value = value(part);
            return noChange;
        }
        return value === null ? undefined : value;
    };
    const isDirective = (o) => typeof o === 'function' && o.__litDirective === true;
    /**
     * A sentinel value that signals that a value was handled by a directive and
     * should not be written to the DOM.
     */
    const noChange = {};
    const isPrimitiveValue = (value) => value === null ||
        !(typeof value === 'object' || typeof value === 'function');
    class AttributePart {
        constructor(instance, element, name, strings) {
            this.instance = instance;
            this.element = element;
            this.name = name;
            this.strings = strings;
            this.size = strings.length - 1;
            this._previousValues = [];
        }
        _interpolate(values, startIndex) {
            const strings = this.strings;
            const l = strings.length - 1;
            let text = '';
            for (let i = 0; i < l; i++) {
                text += strings[i];
                const v = getValue(this, values[startIndex + i]);
                if (v && v !== noChange &&
                    (Array.isArray(v) || typeof v !== 'string' && v[Symbol.iterator])) {
                    for (const t of v) {
                        // TODO: we need to recursively call getValue into iterables...
                        text += t;
                    }
                }
                else {
                    text += v;
                }
            }
            return text + strings[l];
        }
        _equalToPreviousValues(values, startIndex) {
            for (let i = startIndex; i < startIndex + this.size; i++) {
                if (this._previousValues[i] !== values[i] ||
                    !isPrimitiveValue(values[i])) {
                    return false;
                }
            }
            return true;
        }
        setValue(values, startIndex) {
            if (this._equalToPreviousValues(values, startIndex)) {
                return;
            }
            const s = this.strings;
            let value;
            if (s.length === 2 && s[0] === '' && s[1] === '') {
                // An expression that occupies the whole attribute value will leave
                // leading and trailing empty strings.
                value = getValue(this, values[startIndex]);
                if (Array.isArray(value)) {
                    value = value.join('');
                }
            }
            else {
                value = this._interpolate(values, startIndex);
            }
            if (value !== noChange) {
                this.element.setAttribute(this.name, value);
            }
            this._previousValues = values;
        }
    }
    class NodePart {
        constructor(instance, startNode, endNode) {
            this.instance = instance;
            this.startNode = startNode;
            this.endNode = endNode;
            this._previousValue = undefined;
        }
        setValue(value) {
            value = getValue(this, value);
            if (value === noChange) {
                return;
            }
            if (isPrimitiveValue(value)) {
                // Handle primitive values
                // If the value didn't change, do nothing
                if (value === this._previousValue) {
                    return;
                }
                this._setText(value);
            }
            else if (value instanceof TemplateResult) {
                this._setTemplateResult(value);
            }
            else if (Array.isArray(value) || value[Symbol.iterator]) {
                this._setIterable(value);
            }
            else if (value instanceof Node) {
                this._setNode(value);
            }
            else if (value.then !== undefined) {
                this._setPromise(value);
            }
            else {
                // Fallback, will render the string representation
                this._setText(value);
            }
        }
        _insert(node) {
            this.endNode.parentNode.insertBefore(node, this.endNode);
        }
        _setNode(value) {
            if (this._previousValue === value) {
                return;
            }
            this.clear();
            this._insert(value);
            this._previousValue = value;
        }
        _setText(value) {
            const node = this.startNode.nextSibling;
            value = value === undefined ? '' : value;
            if (node === this.endNode.previousSibling &&
                node.nodeType === Node.TEXT_NODE) {
                // If we only have a single text node between the markers, we can just
                // set its value, rather than replacing it.
                // TODO(justinfagnani): Can we just check if _previousValue is
                // primitive?
                node.textContent = value;
            }
            else {
                this._setNode(document.createTextNode(value));
            }
            this._previousValue = value;
        }
        _setTemplateResult(value) {
            const template = this.instance._getTemplate(value);
            let instance;
            if (this._previousValue && this._previousValue.template === template) {
                instance = this._previousValue;
            }
            else {
                instance = new TemplateInstance(template, this.instance._partCallback, this.instance._getTemplate);
                this._setNode(instance._clone());
                this._previousValue = instance;
            }
            instance.update(value.values);
        }
        _setIterable(value) {
            // For an Iterable, we create a new InstancePart per item, then set its
            // value to the item. This is a little bit of overhead for every item in
            // an Iterable, but it lets us recurse easily and efficiently update Arrays
            // of TemplateResults that will be commonly returned from expressions like:
            // array.map((i) => html`${i}`), by reusing existing TemplateInstances.
            // If _previousValue is an array, then the previous render was of an
            // iterable and _previousValue will contain the NodeParts from the previous
            // render. If _previousValue is not an array, clear this part and make a new
            // array for NodeParts.
            if (!Array.isArray(this._previousValue)) {
                this.clear();
                this._previousValue = [];
            }
            // Lets us keep track of how many items we stamped so we can clear leftover
            // items from a previous render
            const itemParts = this._previousValue;
            let partIndex = 0;
            for (const item of value) {
                // Try to reuse an existing part
                let itemPart = itemParts[partIndex];
                // If no existing part, create a new one
                if (itemPart === undefined) {
                    // If we're creating the first item part, it's startNode should be the
                    // container's startNode
                    let itemStart = this.startNode;
                    // If we're not creating the first part, create a new separator marker
                    // node, and fix up the previous part's endNode to point to it
                    if (partIndex > 0) {
                        const previousPart = itemParts[partIndex - 1];
                        itemStart = previousPart.endNode = document.createTextNode('');
                        this._insert(itemStart);
                    }
                    itemPart = new NodePart(this.instance, itemStart, this.endNode);
                    itemParts.push(itemPart);
                }
                itemPart.setValue(item);
                partIndex++;
            }
            if (partIndex === 0) {
                this.clear();
                this._previousValue = undefined;
            }
            else if (partIndex < itemParts.length) {
                const lastPart = itemParts[partIndex - 1];
                // Truncate the parts array so _previousValue reflects the current state
                itemParts.length = partIndex;
                this.clear(lastPart.endNode.previousSibling);
                lastPart.endNode = this.endNode;
            }
        }
        _setPromise(value) {
            this._previousValue = value;
            value.then((v) => {
                if (this._previousValue === value) {
                    this.setValue(v);
                }
            });
        }
        clear(startNode = this.startNode) {
            removeNodes(this.startNode.parentNode, startNode.nextSibling, this.endNode);
        }
    }
    const defaultPartCallback = (instance, templatePart, node) => {
        if (templatePart.type === 'attribute') {
            return new AttributePart(instance, node, templatePart.name, templatePart.strings);
        }
        else if (templatePart.type === 'node') {
            return new NodePart(instance, node, node.nextSibling);
        }
        throw new Error(`Unknown part type ${templatePart.type}`);
    };
    /**
     * An instance of a `Template` that can be attached to the DOM and updated
     * with new values.
     */
    class TemplateInstance {
        constructor(template, partCallback, getTemplate) {
            this._parts = [];
            this.template = template;
            this._partCallback = partCallback;
            this._getTemplate = getTemplate;
        }
        update(values) {
            let valueIndex = 0;
            for (const part of this._parts) {
                if (!part) {
                    valueIndex++;
                }
                else if (part.size === undefined) {
                    part.setValue(values[valueIndex]);
                    valueIndex++;
                }
                else {
                    part.setValue(values, valueIndex);
                    valueIndex += part.size;
                }
            }
        }
        _clone() {
            // Clone the node, rather than importing it, to keep the fragment in the
            // template's document. This leaves the fragment inert so custom elements
            // won't upgrade until after the main document adopts the node.
            const fragment = this.template.element.content.cloneNode(true);
            const parts = this.template.parts;
            if (parts.length > 0) {
                // Edge needs all 4 parameters present; IE11 needs 3rd parameter to be
                // null
                const walker = document.createTreeWalker(fragment, 133 /* NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT |
                       NodeFilter.SHOW_TEXT */, null, false);
                let index = -1;
                for (let i = 0; i < parts.length; i++) {
                    const part = parts[i];
                    const partActive = isTemplatePartActive(part);
                    // An inactive part has no coresponding Template node.
                    if (partActive) {
                        while (index < part.index) {
                            index++;
                            walker.nextNode();
                        }
                    }
                    this._parts.push(partActive ? this._partCallback(this, part, walker.currentNode) : undefined);
                }
            }
            return fragment;
        }
    }
    /**
     * Removes nodes, starting from `startNode` (inclusive) to `endNode`
     * (exclusive), from `container`.
     */
    const removeNodes = (container, startNode, endNode = null) => {
        let node = startNode;
        while (node !== endNode) {
            const n = node.nextSibling;
            container.removeChild(node);
            node = n;
        }
    };

    var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var coreInput_min = createCommonjsModule(function (module, exports) {
    !function(e,t){module.exports=t();}(commonjsGlobal,function(){var e="undefined"!=typeof window,o=(e&&/(android)/i.test(navigator.userAgent),e&&/iPad|iPhone|iPod/.test(String(navigator.platform))),i=function(e){void 0===e&&(e=!1);try{window.addEventListener("test",null,{get passive(){e=!0;}});}catch(e){}return e}();function t(e,t,n,r){(void 0===r&&(r=!1),"undefined"==typeof window||window[e=e+"-"+t])||(i||"object"!=typeof r||(r=Boolean(r.capture)),("resize"===t||"load"===t?window:document).addEventListener(window[e]=t,n,r));}var n={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","/":"&#x2F;","'":"&#x27;"};function r(e){return String(e||"").replace(/[&<>"'/]/g,function(e){return n[e]})}var a="prevent_recursive_dispatch_maximum_callstack";function u(e,t,n){void 0===n&&(n={});var r,i=""+a+t;if(e[i])return !0;e[i]=!0,"function"==typeof window.CustomEvent?r=new window.CustomEvent(t,{bubbles:!0,cancelable:!0,detail:n}):(r=document.createEvent("CustomEvent")).initCustomEvent(t,!0,!0,n);var o=e.dispatchEvent(r);return e[i]=null,o}function c(e,t){if(void 0===t&&(t=document),e){if(e.nodeType)return [e];if("string"==typeof e)return [].slice.call(t.querySelectorAll(e));if(e.length)return [].slice.call(e)}return []}var d="data-@nrk/core-input-1.0.4".replace(/\W+/g,"-"),l=13,f=27,s=33,p=34,v=35,m=36,b=38,g=40,y='[tabindex="-1"]',w=500;function x(e,t){var r="object"==typeof t?t:{content:t},i="string"==typeof r.content;return c(e).map(function(e){var t=e.nextElementSibling,n=void 0===r.ajax?e.getAttribute(d):r.ajax;return e.setAttribute(d,n||""),e.setAttribute(o?"data-role":"role","combobox"),e.setAttribute("aria-autocomplete","list"),e.setAttribute("autocomplete","off"),i&&(t.innerHTML=r.content),c("a,button",t).forEach(C),A(e,r.open),e})}function h(a){a.ctrlKey||a.altKey||a.metaKey||a.defaultPrevented||c("["+d+"]").forEach(function(e){var t,n,r=e.nextElementSibling,i=e===a.target||r.contains(a.target),o="click"===a.type&&i&&c(y,r).filter(function(e){return e.contains(a.target)})[0];o?(t=e,n={relatedTarget:r,currentTarget:o,value:o.value||o.textContent.trim()},u(t,"input.select",n)&&(t.value=n.value,t.focus(),A(t,!1))):A(e,i);});}function E(e,t){var n=e.nextElementSibling,r=c(y+":not([hidden])",n),i=r.indexOf(document.activeElement),o=!1;t.keyCode===g?o=r[i+1]||r[0]:t.keyCode===b?o=r[i-1]||r.pop():n.contains(t.target)&&(t.keyCode===v||t.keyCode===p?o=r.pop():t.keyCode===m||t.keyCode===s?o=r[0]:t.keyCode!==l&&e.focus()),n.hasAttribute("hidden")||t.keyCode!==f||t.preventDefault(),A(e,t.keyCode!==f),!1!==o&&t.preventDefault(),o&&o.focus();}function A(e,t){void 0===t&&(t="true"===e.getAttribute("aria-expanded")),e.nextElementSibling[t?"removeAttribute":"setAttribute"]("hidden",""),e.setAttribute("aria-expanded",t);}function C(e,t,n){e.setAttribute("aria-label",e.textContent.trim()+", "+(t+1)+" av "+n.length),e.setAttribute("tabindex","-1");}function k(e){var t=e.getAttribute(d),n=k.req=k.req||new window.XMLHttpRequest;if(!t)return !1;clearTimeout(k.timer),n.abort(),n.onload=function(){try{n.responseJSON=JSON.parse(n.responseText);}catch(e){n.responseJSON=!1;}u(e,"input.ajax",n);},k.timer=setTimeout(function(){e.value&&(n.open("GET",t.replace("{{value}}",window.encodeURIComponent(e.value)),!0),n.send());},w);}return x.escapeHTML=r,x.highlight=function(e,t){var n=t.replace(/[-/\\^$*+?.()|[\]{}]/g,"\\$&");return r(e).replace(new RegExp(n||".^","gi"),"<mark>$&</mark>")},t(d,"click",h),t(d,"focus",h,!0),t(d,"input",function(e){var r,t,n=e.target;n.hasAttribute(d)&&(t={relatedTarget:(r=n).nextElementSibling},u(r,"input.filter",t)&&!k(r)&&c(y,r.nextElementSibling).reduce(function(e,t){var n=-1!==t.textContent.toLowerCase().indexOf(r.value.toLowerCase());return t[n?"removeAttribute":"setAttribute"]("hidden",""),n?e.concat(t):e},[]).forEach(C));}),t(d,"keydown",function(e){if(!(e.ctrlKey||e.altKey||e.metaKey)){if(e.target.hasAttribute(d))return E(e.target,e);for(var t=e.target,n=void 0;t;t=t.parentElement)if((n=t.previousElementSibling)&&n.hasAttribute(d))return E(n,e)}}),x});

    });

    const podcastListItem = (list, className) => list.map((r) => {
        return html `
  <li class="pod-list-item">
    <button class="nrk-unset ${className}" id="${r.collectionId}" aria-label="${r.collectionName}">
      <img  aria-hidden="true"
            title="${r.collectionName}"
            src="${r.artworkUrl100}"
            alt="${r.trackName}" />
    </button>
  </li>`;
    });

    const header = (state) => {
        const gotResults = state.searchResults.length > 0;
        return html `
<header>
  <h1>${state.title}</h1>
  <div class="search">
    <input
      name="searchInput"
      class="search-field"
      autocomplete="off"
      type="text"
      placeholder="Search..." />
    <div class="search-results ${gotResults ? "" : "no-results"}">
      <ul class="list-container nrk-unset">
        ${podcastListItem(state.searchResults, "podcast-search-result")}
      </ul>
    </div>
    <button class="nrk-unset search-btn" type="submit">
      <svg style="width:1.5em;height:1.5em;vertical-align: middle;"
            aria-hidden="true"><use xlink:href="#nrk-search"></use></svg>
    </button>
  </form>
</header>`;
    };
    function initCoreInput() {
        console.log("init core input");
        coreInput_min(".search-field");
    }
    // observe dom and wait for header mounted to init core-input
    const mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach(({ addedNodes }) => {
            const list = Array.from(addedNodes).filter((e) => e instanceof HTMLElement);
            if (list.some((e) => e.querySelector("header") != null)) {
                mutationObserver.disconnect();
                initCoreInput();
            }
        });
    });
    mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
    });

    const pad = (value) => value.toString().padStart(2, "0");
    const durationSecToString = (duration) => {
        // 01:59:23 => 23 + (59*60) + (1*60*60)
        const d = new Date(0);
        d.setSeconds(Math.round(duration));
        if (duration >= 60 * 60) {
            return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
        }
        return `${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
    };
    const durationStringToSec = (duration) => {
        // 01:59:23 => 23 + (59*60) + (1*60*60)
        return duration.split(":").reverse().reduce((p, n, idx) => p + parseFloat(n) * Math.pow(60, idx), 0);
    };

    const playerUi = (playerState) => {
        const { showTitle = "No show", episodeTitle = "No episode", duration = 0, progress = 0, image = "https://via.placeholder.com/100x100", playing = false, } = playerState || {};
        const rangeValue = progress / duration * 100 || 0;
        const slider = document.querySelector("#slider");
        if (slider instanceof HTMLInputElement) {
            // HACK: set value here as well to re-render
            // @ts-ignore
            slider.value = rangeValue;
        }
        return html `
  <div class="pod-player">
    <div class="info">
      <img src="${image}" >
      <div class="titles">
        <div class="titles--show">${showTitle}</div>
        <div>${episodeTitle}</div>
      </div>
    </div>
    <div class="controls">
      <button class="icon skip-back"></button>
      <button class="icon play-pause ${playing ? "pause" : "play"}"></button>
      <button disabled class="time current">${durationSecToString(progress)}</button>
      <input id="slider" type="range"
              value="${rangeValue}"
              min="0"
              max="100"
              step="0.01" />
      <button disabled class="time left">-${durationSecToString(duration - progress)}</button>
      <button class="icon skip-ffw"></button>
    </div>
  </div>
  `;
    };

    const getAllCachedMp3Urls = async () => {
        const mp3Cache = await caches.open("audio");
        const keys = await mp3Cache.keys();
        return keys.map((r) => r.url);
    };
    const isOffline = (pod, cachedUrls) => {
        const url = pod.enclosure.url;
        return cachedUrls.find((cacheUrl) => cacheUrl.includes(url)) != null;
    };
    const getCachedMp3Url = async (pod) => {
        const url = pod.enclosure.url;
        const cachedUrls = await getAllCachedMp3Urls();
        return cachedUrls.find((cacheUrl) => cacheUrl.includes(url));
    };

    const podcastEpisode = (episode, offline) => {
        const icon = !offline
            ? html `<svg style="width:1.5em;height:1.5em" aria-hidden="true"><use xlink:href="#nrk-download" /></svg>`
            : html `<svg style="width:1.5em;height:1.5em" aria-hidden="true"><use xlink:href="#nrk-bookmark--active" /></svg>`;
        return html `
  <li class="podcast-episode">
    <button class="nrk-button playable" data-src="${episode.enclosure.url}">
      <svg style="width:1.5em;height:1.5em" aria-hidden="true"><use xlink:href="#nrk-media-play" /></svg>
    </button>
    <button disabled class="nrk-unset">
      ${episode.title} - ${episode.duration}
    </button>
    <button class="nrk-button ${offline ? "" : "offline-episode"}"
            aria-label="Offline podcast"
            data-src="${episode.enclosure.url}">
      ${icon}
    </button>
  </li>`;
    };

    const selectedPodcast = async (podcast) => {
        if (!podcast.meta) {
            return "";
        }
        const cachedMp3Urls = await getAllCachedMp3Urls();
        return html `
  <div class="podcasts-episodes">
    <h3>${podcast.meta.collectionName}</h3>
    <div>
      <button class="nrk-button remove-podcast" data-id="${podcast.meta.collectionId}" aria-label="Remove podcast">
        Remove
        <svg style="width:1.5em;height:1.5em" aria-hidden="true"><use xlink:href="#nrk-close-circle" /></svg>
      </button>
    </div>
    <ul class="nrk-unset">
      ${podcast.items.map((episode) => podcastEpisode(episode, isOffline(episode, cachedMp3Urls)))}
    </ul>
  </div>`;
    };

    function generateKey(key) {
        return encodeURIComponent(key);
    }
    const get = (key) => {
        const item = localStorage.getItem(generateKey(key));
        if (item) {
            console.info(`Cache hit on ${key}`);
            return JSON.parse(item);
        }
        console.warn(`Cache miss on ${key}`);
        return null;
    };
    const set = (key, data) => {
        localStorage.setItem(generateKey(key), JSON.stringify(data));
    };
    const createCache = (key) => {
        const _key = generateKey(key + "-");
        return {
            get: (partialKey) => get(generateKey(_key + partialKey)),
            set: (partialKey, value) => set(generateKey(_key + partialKey), value),
        };
    };

    const parser = new DOMParser();
    const rssStringToJson = (rssString) => {
        const xml = parser.parseFromString(rssString, "text/xml");
        const rssItems = Array.from(xml.querySelectorAll("channel > item")).map(xmlToJson).map((item) => {
            const { enclosure, pubDate, title } = item;
            const iTunesProps = Object.keys(item).filter((k) => k.includes("itunes:")).reduce((res, prop) => {
                const name = prop.split("itunes:")[1];
                res[name] = item[prop];
                return res;
            }, {});
            return { ...iTunesProps, enclosure, pubDate, title };
        });
        return { items: rssItems };
    };
    const NodeNames = {
        TEXT: "#text",
        CDATA: "#cdata-section",
    };
    // try parse numbers as numbers
    function getValue$1(value) {
        if (value != null && value.length && !isNaN(value)) {
            return parseFloat(value);
        }
        else {
            return (value || "").trim();
        }
    }
    /* Code started out as: https://davidwalsh.name/convert-xml-json */
    function xmlToJson(xml) {
        // return immediately for cdata and text
        if (xml.nodeType === Node.TEXT_NODE || xml.nodeType === Node.CDATA_SECTION_NODE) { // text
            return getValue$1(xml.nodeValue);
        }
        // Create the return object
        let obj = {};
        // Assign Attributes
        if (xml instanceof Element) { // element
            // do attributes
            if (xml.attributes.length > 0) {
                for (let j = 0; j < xml.attributes.length; j++) {
                    const attribute = xml.attributes.item(j);
                    if (attribute) {
                        obj[attribute.nodeName] = getValue$1(attribute.nodeValue);
                    }
                }
            }
        }
        // loop over children
        if (xml.hasChildNodes()) {
            for (let i = 0; i < xml.childNodes.length; i++) {
                const item = xml.childNodes.item(i);
                const nodeName = item.nodeName;
                // add first occurrence of nodeName as property
                if (typeof (obj[nodeName]) === "undefined") {
                    obj[nodeName] = xmlToJson(item);
                }
                else {
                    if (typeof obj[nodeName].push !== "function") {
                        obj[nodeName] = [obj[nodeName]];
                    }
                    obj[nodeName].push(xmlToJson(item));
                }
            }
            // throw away all text nodes that are not single children
            const keys = Object.keys(obj);
            if (keys.includes(NodeNames.TEXT) || keys.includes(NodeNames.CDATA)) {
                if (keys.length === 1) {
                    obj = obj[keys[0]];
                }
                else {
                    delete obj[NodeNames.TEXT];
                }
            }
        }
        return obj;
    }

    const cache = createCache("pod-feed");
    const getFeedItems = async (feedUrl) => {
        const cacheResponse = cache.get(feedUrl);
        if (cacheResponse) {
            return cacheResponse;
        }
        // get from network and add to cache
        let response;
        let text = "";
        let json;
        try {
            response = await fetch(feedUrl);
            text = await response.text();
        }
        catch (error) {
            console.error("OH NOES", error);
            console.warn("trying fallback via https://api.rss2json.com/v1/api.json ...");
            response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`);
            json = await response.json();
        }
        if (response.ok) {
            const data = json ? toRssItems(json) : rssStringToJson(text);
            cache.set(feedUrl, data);
            return data;
        }
        console.warn("Request failed", response);
        return { items: [] };
    };
    function toRssItems(rssData) {
        const total = rssData.items.length;
        return {
            items: rssData.items.map((i, idx) => ({
                title: i.title,
                duration: durationSecToString(i.enclosure.duration),
                enclosure: {
                    url: i.enclosure.link,
                    length: i.enclosure.duration,
                    type: i.enclosure.type,
                },
                episode: (total - idx).toString(),
                image: {
                    href: i.thumbnail,
                },
                pubDate: i.pubDate,
                subtitle: i.content,
                summary: i.description,
            })),
        };
    }

    // https://affiliate.itunes.apple.com/resources/documentation/itunes-store-web-service-search-api/
    const SEARCH_BASE = "https://itunes.apple.com/search?media=podcast&entity=podcast&limit=25&term=";
    const cache$1 = createCache("pod-search-res");
    const search = async (searchTerm) => {
        const cacheResponse = cache$1.get(searchTerm);
        if (cacheResponse) {
            return cacheResponse;
        }
        // get from network and add to cache
        const res = await fetch(SEARCH_BASE + encodeURIComponent(searchTerm));
        if (!res.ok) {
            throw new Error(`Response not ok: ${res.status} - ${res.statusText}`);
        }
        const json = await res.json();
        cache$1.set(searchTerm, json);
        return json;
    };

    const audio = new Audio();
    // @ts-ignore
    window.audio = audio;
    var player = {
        async play(pod) {
            const cacheUrl = await getCachedMp3Url(pod);
            let src = pod.enclosure.url;
            if (cacheUrl) {
                console.log("playing offline stuff");
                src = cacheUrl;
            }
            if (audio.src === src) {
                audio.play();
            }
            else {
                audio.src = src;
                audio.play();
            }
        },
        pause() {
            if (!audio.paused) {
                audio.pause();
            }
        },
        togglePlay() {
            if (!audio.paused) {
                audio.pause();
                return false;
            }
            audio.play();
            return true;
        },
        skip(value) {
            if (audio.src) {
                audio.currentTime += value;
            }
        },
        setProgress(percent) {
            if (audio.src) {
                const time = Math.min(100, percent) / 100 * audio.duration;
                audio.currentTime = time;
            }
        },
        reset() {
            if (audio) {
                audio.pause();
                audio.src = "";
                audio.currentTime = 0;
            }
        },
        addEventListener(event, handler) {
            audio.addEventListener(event, handler);
            return () => audio.removeEventListener(event, handler);
        },
    };

    const cache$2 = createCache("user-data");
    const podcasts = cache$2.get("podcasts") || [];
    const getPods = () => [...podcasts];
    const addPod = (pod) => {
        if (pod) {
            const podId = pod.collectionId.toString();
            // if we already have it, move it to top of list, by removing first
            if (getPod(podId)) {
                removePod(podId);
            }
            podcasts.unshift(pod);
            cache$2.set("podcasts", podcasts);
        }
    };
    const removePod = (podId) => {
        const pod = getPod(podId);
        if (pod) {
            podcasts.splice(podcasts.indexOf(pod), 1);
            cache$2.set("podcasts", podcasts);
        }
    };
    function getPod(podId) {
        return podcasts.find((p) => p.collectionId.toString() === podId);
    }

    const state = {
        title: "Podspace",
        searchResults: [],
        podcasts: getPods(),
        podcast: {
            meta: null,
            items: [],
        },
        player: undefined,
    };
    // @ts-ignore
    window.state = state;
    const template = (currentState) => {
        return html `
  <div>
    ${header(currentState)}
    <div class="podcasts-favorites">
      <h3>My Podcasts</h3>
      <ul class="nrk-unset list-container">
        ${podcastListItem(currentState.podcasts, "saved-podcast")}
      </ul>
    </div>
    ${selectedPodcast(currentState.podcast)}
  </div>
  ${playerUi(currentState.player)}
  `;
    };
    const updateState = (newState) => {
        Object.assign(state, newState);
        render(template(state), document.body);
    };
    document.addEventListener("keydown", async ({ target, keyCode }) => {
        if (target instanceof HTMLInputElement) {
            if (target.matches(".search-field") && keyCode === 13) {
                const { results } = await search(target.value);
                updateState({ searchResults: results });
                console.log(results);
            }
        }
    });
    document.addEventListener("click", async ({ target }) => {
        if (target instanceof HTMLElement) {
            if (target.matches(".podcast-search-result")) {
                const pod = state.searchResults.find((p) => p.collectionId.toString() === target.id);
                console.log("Adding pod", pod);
                addPod(pod);
                state.podcasts = getPods();
                console.log(state.podcasts.length);
                updateState({});
            }
            else if (target.matches(".remove-podcast")) {
                removePod(target.getAttribute("data-id") || "");
                state.podcasts = getPods();
                updateState({});
            }
            else if (target.matches(".offline-episode")) {
                const src = target.getAttribute("data-src");
                console.log("offline episode", src);
                target.classList.add("is-busy");
                // TODO: move all of this to offlineManager
                try {
                    // request with no-cors since that is what audio-element does
                    await fetch(src + "?podspace-offline", { mode: "no-cors" });
                    const handle = setInterval(async () => {
                        const pod = { enclosure: { url: src } };
                        if (!!(await getCachedMp3Url(pod))) {
                            clearInterval(handle);
                            console.log("episode available offline");
                            updateState({});
                        }
                    }, 350);
                }
                catch (err) {
                    console.error("mp3 fetch failed...");
                }
            }
            else if (target.matches(".saved-podcast")) {
                const pod = state.podcasts.find((p) => p.collectionId.toString() === target.id);
                if (pod) {
                    console.log("render feed for", pod.collectionName, pod.feedUrl, pod);
                    const { items } = await getFeedItems(pod.feedUrl);
                    state.podcast = {
                        meta: pod,
                        items,
                    };
                    updateState({});
                }
            }
            else if (target.matches(".playable")) {
                player.reset();
                const src = target.getAttribute("data-src") || "";
                const pod = state.podcast.items.find((p) => p.enclosure.url === src);
                if (pod) {
                    player.play(pod);
                    state.player = {
                        playing: true,
                        progress: 0,
                        showTitle: (state.podcast.meta || {}).collectionName,
                        episodeTitle: pod.title,
                        image: (state.podcast.meta || {}).artworkUrl100,
                        duration: durationStringToSec(pod.duration),
                    };
                    updateState({});
                }
                else {
                    state.player = undefined;
                    console.log("Found no pod with src = ", src);
                }
            }
            else if (target.matches(".pod-player .play-pause")) {
                const isPlaying = player.togglePlay();
                if (state.player) {
                    state.player.playing = isPlaying;
                    updateState({});
                }
            }
            else if (target.matches(".pod-player .skip-back")) {
                player.skip(-10);
            }
            else if (target.matches(".pod-player .skip-ffw")) {
                player.skip(30);
            }
        }
    });
    document.addEventListener("change", ({ target }) => {
        if (target instanceof HTMLInputElement) {
            if (target.matches(".pod-player input")) {
                console.log("onChange", target.value);
                player.setProgress(parseFloat(target.value));
            }
        }
    }, { capture: true, passive: true });
    player.addEventListener("timeupdate", (event) => {
        const { target } = event;
        if (state.player && target instanceof HTMLAudioElement) {
            state.player.progress = target.currentTime;
            updateState({});
        }
        // console.log('timeupdate', event);
    });
    // trigger first render
    updateState(state);
    // @ts-ignore
    document.querySelector("input").focus();
    if ("serviceWorker" in navigator) {
        console.log("we got service workers!");
        window.addEventListener("load", () => {
            navigator.serviceWorker.register("./sw.js").then((registration) => {
                // Registration was successful
                console.log("ServiceWorker registration successful with scope: ", registration.scope);
            }, (err) => {
                // registration failed :(
                console.log("ServiceWorker registration failed: ", err);
            });
        });
    }

}());
//# sourceMappingURL=bundle.js.map
