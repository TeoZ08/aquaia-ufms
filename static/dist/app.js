// node_modules/@hotwired/stimulus/dist/stimulus.js
var EventListener = class {
  constructor(eventTarget, eventName, eventOptions) {
    this.eventTarget = eventTarget;
    this.eventName = eventName;
    this.eventOptions = eventOptions;
    this.unorderedBindings = /* @__PURE__ */ new Set();
  }
  connect() {
    this.eventTarget.addEventListener(this.eventName, this, this.eventOptions);
  }
  disconnect() {
    this.eventTarget.removeEventListener(this.eventName, this, this.eventOptions);
  }
  bindingConnected(binding) {
    this.unorderedBindings.add(binding);
  }
  bindingDisconnected(binding) {
    this.unorderedBindings.delete(binding);
  }
  handleEvent(event) {
    const extendedEvent = extendEvent(event);
    for (const binding of this.bindings) {
      if (extendedEvent.immediatePropagationStopped) {
        break;
      } else {
        binding.handleEvent(extendedEvent);
      }
    }
  }
  hasBindings() {
    return this.unorderedBindings.size > 0;
  }
  get bindings() {
    return Array.from(this.unorderedBindings).sort((left, right) => {
      const leftIndex = left.index, rightIndex = right.index;
      return leftIndex < rightIndex ? -1 : leftIndex > rightIndex ? 1 : 0;
    });
  }
};
function extendEvent(event) {
  if ("immediatePropagationStopped" in event) {
    return event;
  } else {
    const { stopImmediatePropagation } = event;
    return Object.assign(event, {
      immediatePropagationStopped: false,
      stopImmediatePropagation() {
        this.immediatePropagationStopped = true;
        stopImmediatePropagation.call(this);
      }
    });
  }
}
var Dispatcher = class {
  constructor(application) {
    this.application = application;
    this.eventListenerMaps = /* @__PURE__ */ new Map();
    this.started = false;
  }
  start() {
    if (!this.started) {
      this.started = true;
      this.eventListeners.forEach((eventListener) => eventListener.connect());
    }
  }
  stop() {
    if (this.started) {
      this.started = false;
      this.eventListeners.forEach((eventListener) => eventListener.disconnect());
    }
  }
  get eventListeners() {
    return Array.from(this.eventListenerMaps.values()).reduce((listeners, map) => listeners.concat(Array.from(map.values())), []);
  }
  bindingConnected(binding) {
    this.fetchEventListenerForBinding(binding).bindingConnected(binding);
  }
  bindingDisconnected(binding, clearEventListeners = false) {
    this.fetchEventListenerForBinding(binding).bindingDisconnected(binding);
    if (clearEventListeners)
      this.clearEventListenersForBinding(binding);
  }
  handleError(error2, message, detail = {}) {
    this.application.handleError(error2, `Error ${message}`, detail);
  }
  clearEventListenersForBinding(binding) {
    const eventListener = this.fetchEventListenerForBinding(binding);
    if (!eventListener.hasBindings()) {
      eventListener.disconnect();
      this.removeMappedEventListenerFor(binding);
    }
  }
  removeMappedEventListenerFor(binding) {
    const { eventTarget, eventName, eventOptions } = binding;
    const eventListenerMap = this.fetchEventListenerMapForEventTarget(eventTarget);
    const cacheKey = this.cacheKey(eventName, eventOptions);
    eventListenerMap.delete(cacheKey);
    if (eventListenerMap.size == 0)
      this.eventListenerMaps.delete(eventTarget);
  }
  fetchEventListenerForBinding(binding) {
    const { eventTarget, eventName, eventOptions } = binding;
    return this.fetchEventListener(eventTarget, eventName, eventOptions);
  }
  fetchEventListener(eventTarget, eventName, eventOptions) {
    const eventListenerMap = this.fetchEventListenerMapForEventTarget(eventTarget);
    const cacheKey = this.cacheKey(eventName, eventOptions);
    let eventListener = eventListenerMap.get(cacheKey);
    if (!eventListener) {
      eventListener = this.createEventListener(eventTarget, eventName, eventOptions);
      eventListenerMap.set(cacheKey, eventListener);
    }
    return eventListener;
  }
  createEventListener(eventTarget, eventName, eventOptions) {
    const eventListener = new EventListener(eventTarget, eventName, eventOptions);
    if (this.started) {
      eventListener.connect();
    }
    return eventListener;
  }
  fetchEventListenerMapForEventTarget(eventTarget) {
    let eventListenerMap = this.eventListenerMaps.get(eventTarget);
    if (!eventListenerMap) {
      eventListenerMap = /* @__PURE__ */ new Map();
      this.eventListenerMaps.set(eventTarget, eventListenerMap);
    }
    return eventListenerMap;
  }
  cacheKey(eventName, eventOptions) {
    const parts = [eventName];
    Object.keys(eventOptions).sort().forEach((key) => {
      parts.push(`${eventOptions[key] ? "" : "!"}${key}`);
    });
    return parts.join(":");
  }
};
var defaultActionDescriptorFilters = {
  stop({ event, value }) {
    if (value)
      event.stopPropagation();
    return true;
  },
  prevent({ event, value }) {
    if (value)
      event.preventDefault();
    return true;
  },
  self({ event, value, element }) {
    if (value) {
      return element === event.target;
    } else {
      return true;
    }
  }
};
var descriptorPattern = /^(?:(?:([^.]+?)\+)?(.+?)(?:\.(.+?))?(?:@(window|document))?->)?(.+?)(?:#([^:]+?))(?::(.+))?$/;
function parseActionDescriptorString(descriptorString) {
  const source = descriptorString.trim();
  const matches = source.match(descriptorPattern) || [];
  let eventName = matches[2];
  let keyFilter = matches[3];
  if (keyFilter && !["keydown", "keyup", "keypress"].includes(eventName)) {
    eventName += `.${keyFilter}`;
    keyFilter = "";
  }
  return {
    eventTarget: parseEventTarget(matches[4]),
    eventName,
    eventOptions: matches[7] ? parseEventOptions(matches[7]) : {},
    identifier: matches[5],
    methodName: matches[6],
    keyFilter: matches[1] || keyFilter
  };
}
function parseEventTarget(eventTargetName) {
  if (eventTargetName == "window") {
    return window;
  } else if (eventTargetName == "document") {
    return document;
  }
}
function parseEventOptions(eventOptions) {
  return eventOptions.split(":").reduce((options, token) => Object.assign(options, { [token.replace(/^!/, "")]: !/^!/.test(token) }), {});
}
function stringifyEventTarget(eventTarget) {
  if (eventTarget == window) {
    return "window";
  } else if (eventTarget == document) {
    return "document";
  }
}
function camelize(value) {
  return value.replace(/(?:[_-])([a-z0-9])/g, (_, char) => char.toUpperCase());
}
function namespaceCamelize(value) {
  return camelize(value.replace(/--/g, "-").replace(/__/g, "_"));
}
function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
function dasherize(value) {
  return value.replace(/([A-Z])/g, (_, char) => `-${char.toLowerCase()}`);
}
function tokenize(value) {
  return value.match(/[^\s]+/g) || [];
}
function isSomething(object) {
  return object !== null && object !== void 0;
}
function hasProperty(object, property) {
  return Object.prototype.hasOwnProperty.call(object, property);
}
var allModifiers = ["meta", "ctrl", "alt", "shift"];
var Action = class {
  constructor(element, index, descriptor, schema) {
    this.element = element;
    this.index = index;
    this.eventTarget = descriptor.eventTarget || element;
    this.eventName = descriptor.eventName || getDefaultEventNameForElement(element) || error("missing event name");
    this.eventOptions = descriptor.eventOptions || {};
    this.identifier = descriptor.identifier || error("missing identifier");
    this.methodName = descriptor.methodName || error("missing method name");
    this.keyFilter = descriptor.keyFilter || "";
    this.schema = schema;
  }
  static forToken(token, schema) {
    return new this(token.element, token.index, parseActionDescriptorString(token.content), schema);
  }
  toString() {
    const eventFilter = this.keyFilter ? `.${this.keyFilter}` : "";
    const eventTarget = this.eventTargetName ? `@${this.eventTargetName}` : "";
    return `${this.eventName}${eventFilter}${eventTarget}->${this.identifier}#${this.methodName}`;
  }
  shouldIgnoreKeyboardEvent(event) {
    if (!this.keyFilter) {
      return false;
    }
    const filters = this.keyFilter.split("+");
    if (this.keyFilterDissatisfied(event, filters)) {
      return true;
    }
    const standardFilter = filters.filter((key) => !allModifiers.includes(key))[0];
    if (!standardFilter) {
      return false;
    }
    if (!hasProperty(this.keyMappings, standardFilter)) {
      error(`contains unknown key filter: ${this.keyFilter}`);
    }
    return this.keyMappings[standardFilter].toLowerCase() !== event.key.toLowerCase();
  }
  shouldIgnoreMouseEvent(event) {
    if (!this.keyFilter) {
      return false;
    }
    const filters = [this.keyFilter];
    if (this.keyFilterDissatisfied(event, filters)) {
      return true;
    }
    return false;
  }
  get params() {
    const params = {};
    const pattern = new RegExp(`^data-${this.identifier}-(.+)-param$`, "i");
    for (const { name, value } of Array.from(this.element.attributes)) {
      const match = name.match(pattern);
      const key = match && match[1];
      if (key) {
        params[camelize(key)] = typecast(value);
      }
    }
    return params;
  }
  get eventTargetName() {
    return stringifyEventTarget(this.eventTarget);
  }
  get keyMappings() {
    return this.schema.keyMappings;
  }
  keyFilterDissatisfied(event, filters) {
    const [meta, ctrl, alt, shift] = allModifiers.map((modifier) => filters.includes(modifier));
    return event.metaKey !== meta || event.ctrlKey !== ctrl || event.altKey !== alt || event.shiftKey !== shift;
  }
};
var defaultEventNames = {
  a: () => "click",
  button: () => "click",
  form: () => "submit",
  details: () => "toggle",
  input: (e) => e.getAttribute("type") == "submit" ? "click" : "input",
  select: () => "change",
  textarea: () => "input"
};
function getDefaultEventNameForElement(element) {
  const tagName = element.tagName.toLowerCase();
  if (tagName in defaultEventNames) {
    return defaultEventNames[tagName](element);
  }
}
function error(message) {
  throw new Error(message);
}
function typecast(value) {
  try {
    return JSON.parse(value);
  } catch (o_O) {
    return value;
  }
}
var Binding = class {
  constructor(context, action) {
    this.context = context;
    this.action = action;
  }
  get index() {
    return this.action.index;
  }
  get eventTarget() {
    return this.action.eventTarget;
  }
  get eventOptions() {
    return this.action.eventOptions;
  }
  get identifier() {
    return this.context.identifier;
  }
  handleEvent(event) {
    const actionEvent = this.prepareActionEvent(event);
    if (this.willBeInvokedByEvent(event) && this.applyEventModifiers(actionEvent)) {
      this.invokeWithEvent(actionEvent);
    }
  }
  get eventName() {
    return this.action.eventName;
  }
  get method() {
    const method = this.controller[this.methodName];
    if (typeof method == "function") {
      return method;
    }
    throw new Error(`Action "${this.action}" references undefined method "${this.methodName}"`);
  }
  applyEventModifiers(event) {
    const { element } = this.action;
    const { actionDescriptorFilters } = this.context.application;
    const { controller } = this.context;
    let passes = true;
    for (const [name, value] of Object.entries(this.eventOptions)) {
      if (name in actionDescriptorFilters) {
        const filter = actionDescriptorFilters[name];
        passes = passes && filter({ name, value, event, element, controller });
      } else {
        continue;
      }
    }
    return passes;
  }
  prepareActionEvent(event) {
    return Object.assign(event, { params: this.action.params });
  }
  invokeWithEvent(event) {
    const { target, currentTarget } = event;
    try {
      this.method.call(this.controller, event);
      this.context.logDebugActivity(this.methodName, { event, target, currentTarget, action: this.methodName });
    } catch (error2) {
      const { identifier, controller, element, index } = this;
      const detail = { identifier, controller, element, index, event };
      this.context.handleError(error2, `invoking action "${this.action}"`, detail);
    }
  }
  willBeInvokedByEvent(event) {
    const eventTarget = event.target;
    if (event instanceof KeyboardEvent && this.action.shouldIgnoreKeyboardEvent(event)) {
      return false;
    }
    if (event instanceof MouseEvent && this.action.shouldIgnoreMouseEvent(event)) {
      return false;
    }
    if (this.element === eventTarget) {
      return true;
    } else if (eventTarget instanceof Element && this.element.contains(eventTarget)) {
      return this.scope.containsElement(eventTarget);
    } else {
      return this.scope.containsElement(this.action.element);
    }
  }
  get controller() {
    return this.context.controller;
  }
  get methodName() {
    return this.action.methodName;
  }
  get element() {
    return this.scope.element;
  }
  get scope() {
    return this.context.scope;
  }
};
var ElementObserver = class {
  constructor(element, delegate) {
    this.mutationObserverInit = { attributes: true, childList: true, subtree: true };
    this.element = element;
    this.started = false;
    this.delegate = delegate;
    this.elements = /* @__PURE__ */ new Set();
    this.mutationObserver = new MutationObserver((mutations) => this.processMutations(mutations));
  }
  start() {
    if (!this.started) {
      this.started = true;
      this.mutationObserver.observe(this.element, this.mutationObserverInit);
      this.refresh();
    }
  }
  pause(callback) {
    if (this.started) {
      this.mutationObserver.disconnect();
      this.started = false;
    }
    callback();
    if (!this.started) {
      this.mutationObserver.observe(this.element, this.mutationObserverInit);
      this.started = true;
    }
  }
  stop() {
    if (this.started) {
      this.mutationObserver.takeRecords();
      this.mutationObserver.disconnect();
      this.started = false;
    }
  }
  refresh() {
    if (this.started) {
      const matches = new Set(this.matchElementsInTree());
      for (const element of Array.from(this.elements)) {
        if (!matches.has(element)) {
          this.removeElement(element);
        }
      }
      for (const element of Array.from(matches)) {
        this.addElement(element);
      }
    }
  }
  processMutations(mutations) {
    if (this.started) {
      for (const mutation of mutations) {
        this.processMutation(mutation);
      }
    }
  }
  processMutation(mutation) {
    if (mutation.type == "attributes") {
      this.processAttributeChange(mutation.target, mutation.attributeName);
    } else if (mutation.type == "childList") {
      this.processRemovedNodes(mutation.removedNodes);
      this.processAddedNodes(mutation.addedNodes);
    }
  }
  processAttributeChange(element, attributeName) {
    if (this.elements.has(element)) {
      if (this.delegate.elementAttributeChanged && this.matchElement(element)) {
        this.delegate.elementAttributeChanged(element, attributeName);
      } else {
        this.removeElement(element);
      }
    } else if (this.matchElement(element)) {
      this.addElement(element);
    }
  }
  processRemovedNodes(nodes) {
    for (const node of Array.from(nodes)) {
      const element = this.elementFromNode(node);
      if (element) {
        this.processTree(element, this.removeElement);
      }
    }
  }
  processAddedNodes(nodes) {
    for (const node of Array.from(nodes)) {
      const element = this.elementFromNode(node);
      if (element && this.elementIsActive(element)) {
        this.processTree(element, this.addElement);
      }
    }
  }
  matchElement(element) {
    return this.delegate.matchElement(element);
  }
  matchElementsInTree(tree = this.element) {
    return this.delegate.matchElementsInTree(tree);
  }
  processTree(tree, processor) {
    for (const element of this.matchElementsInTree(tree)) {
      processor.call(this, element);
    }
  }
  elementFromNode(node) {
    if (node.nodeType == Node.ELEMENT_NODE) {
      return node;
    }
  }
  elementIsActive(element) {
    if (element.isConnected != this.element.isConnected) {
      return false;
    } else {
      return this.element.contains(element);
    }
  }
  addElement(element) {
    if (!this.elements.has(element)) {
      if (this.elementIsActive(element)) {
        this.elements.add(element);
        if (this.delegate.elementMatched) {
          this.delegate.elementMatched(element);
        }
      }
    }
  }
  removeElement(element) {
    if (this.elements.has(element)) {
      this.elements.delete(element);
      if (this.delegate.elementUnmatched) {
        this.delegate.elementUnmatched(element);
      }
    }
  }
};
var AttributeObserver = class {
  constructor(element, attributeName, delegate) {
    this.attributeName = attributeName;
    this.delegate = delegate;
    this.elementObserver = new ElementObserver(element, this);
  }
  get element() {
    return this.elementObserver.element;
  }
  get selector() {
    return `[${this.attributeName}]`;
  }
  start() {
    this.elementObserver.start();
  }
  pause(callback) {
    this.elementObserver.pause(callback);
  }
  stop() {
    this.elementObserver.stop();
  }
  refresh() {
    this.elementObserver.refresh();
  }
  get started() {
    return this.elementObserver.started;
  }
  matchElement(element) {
    return element.hasAttribute(this.attributeName);
  }
  matchElementsInTree(tree) {
    const match = this.matchElement(tree) ? [tree] : [];
    const matches = Array.from(tree.querySelectorAll(this.selector));
    return match.concat(matches);
  }
  elementMatched(element) {
    if (this.delegate.elementMatchedAttribute) {
      this.delegate.elementMatchedAttribute(element, this.attributeName);
    }
  }
  elementUnmatched(element) {
    if (this.delegate.elementUnmatchedAttribute) {
      this.delegate.elementUnmatchedAttribute(element, this.attributeName);
    }
  }
  elementAttributeChanged(element, attributeName) {
    if (this.delegate.elementAttributeValueChanged && this.attributeName == attributeName) {
      this.delegate.elementAttributeValueChanged(element, attributeName);
    }
  }
};
function add(map, key, value) {
  fetch2(map, key).add(value);
}
function del(map, key, value) {
  fetch2(map, key).delete(value);
  prune(map, key);
}
function fetch2(map, key) {
  let values = map.get(key);
  if (!values) {
    values = /* @__PURE__ */ new Set();
    map.set(key, values);
  }
  return values;
}
function prune(map, key) {
  const values = map.get(key);
  if (values != null && values.size == 0) {
    map.delete(key);
  }
}
var Multimap = class {
  constructor() {
    this.valuesByKey = /* @__PURE__ */ new Map();
  }
  get keys() {
    return Array.from(this.valuesByKey.keys());
  }
  get values() {
    const sets = Array.from(this.valuesByKey.values());
    return sets.reduce((values, set) => values.concat(Array.from(set)), []);
  }
  get size() {
    const sets = Array.from(this.valuesByKey.values());
    return sets.reduce((size, set) => size + set.size, 0);
  }
  add(key, value) {
    add(this.valuesByKey, key, value);
  }
  delete(key, value) {
    del(this.valuesByKey, key, value);
  }
  has(key, value) {
    const values = this.valuesByKey.get(key);
    return values != null && values.has(value);
  }
  hasKey(key) {
    return this.valuesByKey.has(key);
  }
  hasValue(value) {
    const sets = Array.from(this.valuesByKey.values());
    return sets.some((set) => set.has(value));
  }
  getValuesForKey(key) {
    const values = this.valuesByKey.get(key);
    return values ? Array.from(values) : [];
  }
  getKeysForValue(value) {
    return Array.from(this.valuesByKey).filter(([_key, values]) => values.has(value)).map(([key, _values]) => key);
  }
};
var SelectorObserver = class {
  constructor(element, selector, delegate, details) {
    this._selector = selector;
    this.details = details;
    this.elementObserver = new ElementObserver(element, this);
    this.delegate = delegate;
    this.matchesByElement = new Multimap();
  }
  get started() {
    return this.elementObserver.started;
  }
  get selector() {
    return this._selector;
  }
  set selector(selector) {
    this._selector = selector;
    this.refresh();
  }
  start() {
    this.elementObserver.start();
  }
  pause(callback) {
    this.elementObserver.pause(callback);
  }
  stop() {
    this.elementObserver.stop();
  }
  refresh() {
    this.elementObserver.refresh();
  }
  get element() {
    return this.elementObserver.element;
  }
  matchElement(element) {
    const { selector } = this;
    if (selector) {
      const matches = element.matches(selector);
      if (this.delegate.selectorMatchElement) {
        return matches && this.delegate.selectorMatchElement(element, this.details);
      }
      return matches;
    } else {
      return false;
    }
  }
  matchElementsInTree(tree) {
    const { selector } = this;
    if (selector) {
      const match = this.matchElement(tree) ? [tree] : [];
      const matches = Array.from(tree.querySelectorAll(selector)).filter((match2) => this.matchElement(match2));
      return match.concat(matches);
    } else {
      return [];
    }
  }
  elementMatched(element) {
    const { selector } = this;
    if (selector) {
      this.selectorMatched(element, selector);
    }
  }
  elementUnmatched(element) {
    const selectors = this.matchesByElement.getKeysForValue(element);
    for (const selector of selectors) {
      this.selectorUnmatched(element, selector);
    }
  }
  elementAttributeChanged(element, _attributeName) {
    const { selector } = this;
    if (selector) {
      const matches = this.matchElement(element);
      const matchedBefore = this.matchesByElement.has(selector, element);
      if (matches && !matchedBefore) {
        this.selectorMatched(element, selector);
      } else if (!matches && matchedBefore) {
        this.selectorUnmatched(element, selector);
      }
    }
  }
  selectorMatched(element, selector) {
    this.delegate.selectorMatched(element, selector, this.details);
    this.matchesByElement.add(selector, element);
  }
  selectorUnmatched(element, selector) {
    this.delegate.selectorUnmatched(element, selector, this.details);
    this.matchesByElement.delete(selector, element);
  }
};
var StringMapObserver = class {
  constructor(element, delegate) {
    this.element = element;
    this.delegate = delegate;
    this.started = false;
    this.stringMap = /* @__PURE__ */ new Map();
    this.mutationObserver = new MutationObserver((mutations) => this.processMutations(mutations));
  }
  start() {
    if (!this.started) {
      this.started = true;
      this.mutationObserver.observe(this.element, { attributes: true, attributeOldValue: true });
      this.refresh();
    }
  }
  stop() {
    if (this.started) {
      this.mutationObserver.takeRecords();
      this.mutationObserver.disconnect();
      this.started = false;
    }
  }
  refresh() {
    if (this.started) {
      for (const attributeName of this.knownAttributeNames) {
        this.refreshAttribute(attributeName, null);
      }
    }
  }
  processMutations(mutations) {
    if (this.started) {
      for (const mutation of mutations) {
        this.processMutation(mutation);
      }
    }
  }
  processMutation(mutation) {
    const attributeName = mutation.attributeName;
    if (attributeName) {
      this.refreshAttribute(attributeName, mutation.oldValue);
    }
  }
  refreshAttribute(attributeName, oldValue) {
    const key = this.delegate.getStringMapKeyForAttribute(attributeName);
    if (key != null) {
      if (!this.stringMap.has(attributeName)) {
        this.stringMapKeyAdded(key, attributeName);
      }
      const value = this.element.getAttribute(attributeName);
      if (this.stringMap.get(attributeName) != value) {
        this.stringMapValueChanged(value, key, oldValue);
      }
      if (value == null) {
        const oldValue2 = this.stringMap.get(attributeName);
        this.stringMap.delete(attributeName);
        if (oldValue2)
          this.stringMapKeyRemoved(key, attributeName, oldValue2);
      } else {
        this.stringMap.set(attributeName, value);
      }
    }
  }
  stringMapKeyAdded(key, attributeName) {
    if (this.delegate.stringMapKeyAdded) {
      this.delegate.stringMapKeyAdded(key, attributeName);
    }
  }
  stringMapValueChanged(value, key, oldValue) {
    if (this.delegate.stringMapValueChanged) {
      this.delegate.stringMapValueChanged(value, key, oldValue);
    }
  }
  stringMapKeyRemoved(key, attributeName, oldValue) {
    if (this.delegate.stringMapKeyRemoved) {
      this.delegate.stringMapKeyRemoved(key, attributeName, oldValue);
    }
  }
  get knownAttributeNames() {
    return Array.from(new Set(this.currentAttributeNames.concat(this.recordedAttributeNames)));
  }
  get currentAttributeNames() {
    return Array.from(this.element.attributes).map((attribute) => attribute.name);
  }
  get recordedAttributeNames() {
    return Array.from(this.stringMap.keys());
  }
};
var TokenListObserver = class {
  constructor(element, attributeName, delegate) {
    this.attributeObserver = new AttributeObserver(element, attributeName, this);
    this.delegate = delegate;
    this.tokensByElement = new Multimap();
  }
  get started() {
    return this.attributeObserver.started;
  }
  start() {
    this.attributeObserver.start();
  }
  pause(callback) {
    this.attributeObserver.pause(callback);
  }
  stop() {
    this.attributeObserver.stop();
  }
  refresh() {
    this.attributeObserver.refresh();
  }
  get element() {
    return this.attributeObserver.element;
  }
  get attributeName() {
    return this.attributeObserver.attributeName;
  }
  elementMatchedAttribute(element) {
    this.tokensMatched(this.readTokensForElement(element));
  }
  elementAttributeValueChanged(element) {
    const [unmatchedTokens, matchedTokens] = this.refreshTokensForElement(element);
    this.tokensUnmatched(unmatchedTokens);
    this.tokensMatched(matchedTokens);
  }
  elementUnmatchedAttribute(element) {
    this.tokensUnmatched(this.tokensByElement.getValuesForKey(element));
  }
  tokensMatched(tokens) {
    tokens.forEach((token) => this.tokenMatched(token));
  }
  tokensUnmatched(tokens) {
    tokens.forEach((token) => this.tokenUnmatched(token));
  }
  tokenMatched(token) {
    this.delegate.tokenMatched(token);
    this.tokensByElement.add(token.element, token);
  }
  tokenUnmatched(token) {
    this.delegate.tokenUnmatched(token);
    this.tokensByElement.delete(token.element, token);
  }
  refreshTokensForElement(element) {
    const previousTokens = this.tokensByElement.getValuesForKey(element);
    const currentTokens = this.readTokensForElement(element);
    const firstDifferingIndex = zip(previousTokens, currentTokens).findIndex(([previousToken, currentToken]) => !tokensAreEqual(previousToken, currentToken));
    if (firstDifferingIndex == -1) {
      return [[], []];
    } else {
      return [previousTokens.slice(firstDifferingIndex), currentTokens.slice(firstDifferingIndex)];
    }
  }
  readTokensForElement(element) {
    const attributeName = this.attributeName;
    const tokenString = element.getAttribute(attributeName) || "";
    return parseTokenString(tokenString, element, attributeName);
  }
};
function parseTokenString(tokenString, element, attributeName) {
  return tokenString.trim().split(/\s+/).filter((content) => content.length).map((content, index) => ({ element, attributeName, content, index }));
}
function zip(left, right) {
  const length = Math.max(left.length, right.length);
  return Array.from({ length }, (_, index) => [left[index], right[index]]);
}
function tokensAreEqual(left, right) {
  return left && right && left.index == right.index && left.content == right.content;
}
var ValueListObserver = class {
  constructor(element, attributeName, delegate) {
    this.tokenListObserver = new TokenListObserver(element, attributeName, this);
    this.delegate = delegate;
    this.parseResultsByToken = /* @__PURE__ */ new WeakMap();
    this.valuesByTokenByElement = /* @__PURE__ */ new WeakMap();
  }
  get started() {
    return this.tokenListObserver.started;
  }
  start() {
    this.tokenListObserver.start();
  }
  stop() {
    this.tokenListObserver.stop();
  }
  refresh() {
    this.tokenListObserver.refresh();
  }
  get element() {
    return this.tokenListObserver.element;
  }
  get attributeName() {
    return this.tokenListObserver.attributeName;
  }
  tokenMatched(token) {
    const { element } = token;
    const { value } = this.fetchParseResultForToken(token);
    if (value) {
      this.fetchValuesByTokenForElement(element).set(token, value);
      this.delegate.elementMatchedValue(element, value);
    }
  }
  tokenUnmatched(token) {
    const { element } = token;
    const { value } = this.fetchParseResultForToken(token);
    if (value) {
      this.fetchValuesByTokenForElement(element).delete(token);
      this.delegate.elementUnmatchedValue(element, value);
    }
  }
  fetchParseResultForToken(token) {
    let parseResult = this.parseResultsByToken.get(token);
    if (!parseResult) {
      parseResult = this.parseToken(token);
      this.parseResultsByToken.set(token, parseResult);
    }
    return parseResult;
  }
  fetchValuesByTokenForElement(element) {
    let valuesByToken = this.valuesByTokenByElement.get(element);
    if (!valuesByToken) {
      valuesByToken = /* @__PURE__ */ new Map();
      this.valuesByTokenByElement.set(element, valuesByToken);
    }
    return valuesByToken;
  }
  parseToken(token) {
    try {
      const value = this.delegate.parseValueForToken(token);
      return { value };
    } catch (error2) {
      return { error: error2 };
    }
  }
};
var BindingObserver = class {
  constructor(context, delegate) {
    this.context = context;
    this.delegate = delegate;
    this.bindingsByAction = /* @__PURE__ */ new Map();
  }
  start() {
    if (!this.valueListObserver) {
      this.valueListObserver = new ValueListObserver(this.element, this.actionAttribute, this);
      this.valueListObserver.start();
    }
  }
  stop() {
    if (this.valueListObserver) {
      this.valueListObserver.stop();
      delete this.valueListObserver;
      this.disconnectAllActions();
    }
  }
  get element() {
    return this.context.element;
  }
  get identifier() {
    return this.context.identifier;
  }
  get actionAttribute() {
    return this.schema.actionAttribute;
  }
  get schema() {
    return this.context.schema;
  }
  get bindings() {
    return Array.from(this.bindingsByAction.values());
  }
  connectAction(action) {
    const binding = new Binding(this.context, action);
    this.bindingsByAction.set(action, binding);
    this.delegate.bindingConnected(binding);
  }
  disconnectAction(action) {
    const binding = this.bindingsByAction.get(action);
    if (binding) {
      this.bindingsByAction.delete(action);
      this.delegate.bindingDisconnected(binding);
    }
  }
  disconnectAllActions() {
    this.bindings.forEach((binding) => this.delegate.bindingDisconnected(binding, true));
    this.bindingsByAction.clear();
  }
  parseValueForToken(token) {
    const action = Action.forToken(token, this.schema);
    if (action.identifier == this.identifier) {
      return action;
    }
  }
  elementMatchedValue(element, action) {
    this.connectAction(action);
  }
  elementUnmatchedValue(element, action) {
    this.disconnectAction(action);
  }
};
var ValueObserver = class {
  constructor(context, receiver) {
    this.context = context;
    this.receiver = receiver;
    this.stringMapObserver = new StringMapObserver(this.element, this);
    this.valueDescriptorMap = this.controller.valueDescriptorMap;
  }
  start() {
    this.stringMapObserver.start();
    this.invokeChangedCallbacksForDefaultValues();
  }
  stop() {
    this.stringMapObserver.stop();
  }
  get element() {
    return this.context.element;
  }
  get controller() {
    return this.context.controller;
  }
  getStringMapKeyForAttribute(attributeName) {
    if (attributeName in this.valueDescriptorMap) {
      return this.valueDescriptorMap[attributeName].name;
    }
  }
  stringMapKeyAdded(key, attributeName) {
    const descriptor = this.valueDescriptorMap[attributeName];
    if (!this.hasValue(key)) {
      this.invokeChangedCallback(key, descriptor.writer(this.receiver[key]), descriptor.writer(descriptor.defaultValue));
    }
  }
  stringMapValueChanged(value, name, oldValue) {
    const descriptor = this.valueDescriptorNameMap[name];
    if (value === null)
      return;
    if (oldValue === null) {
      oldValue = descriptor.writer(descriptor.defaultValue);
    }
    this.invokeChangedCallback(name, value, oldValue);
  }
  stringMapKeyRemoved(key, attributeName, oldValue) {
    const descriptor = this.valueDescriptorNameMap[key];
    if (this.hasValue(key)) {
      this.invokeChangedCallback(key, descriptor.writer(this.receiver[key]), oldValue);
    } else {
      this.invokeChangedCallback(key, descriptor.writer(descriptor.defaultValue), oldValue);
    }
  }
  invokeChangedCallbacksForDefaultValues() {
    for (const { key, name, defaultValue, writer } of this.valueDescriptors) {
      if (defaultValue != void 0 && !this.controller.data.has(key)) {
        this.invokeChangedCallback(name, writer(defaultValue), void 0);
      }
    }
  }
  invokeChangedCallback(name, rawValue, rawOldValue) {
    const changedMethodName = `${name}Changed`;
    const changedMethod = this.receiver[changedMethodName];
    if (typeof changedMethod == "function") {
      const descriptor = this.valueDescriptorNameMap[name];
      try {
        const value = descriptor.reader(rawValue);
        let oldValue = rawOldValue;
        if (rawOldValue) {
          oldValue = descriptor.reader(rawOldValue);
        }
        changedMethod.call(this.receiver, value, oldValue);
      } catch (error2) {
        if (error2 instanceof TypeError) {
          error2.message = `Stimulus Value "${this.context.identifier}.${descriptor.name}" - ${error2.message}`;
        }
        throw error2;
      }
    }
  }
  get valueDescriptors() {
    const { valueDescriptorMap } = this;
    return Object.keys(valueDescriptorMap).map((key) => valueDescriptorMap[key]);
  }
  get valueDescriptorNameMap() {
    const descriptors = {};
    Object.keys(this.valueDescriptorMap).forEach((key) => {
      const descriptor = this.valueDescriptorMap[key];
      descriptors[descriptor.name] = descriptor;
    });
    return descriptors;
  }
  hasValue(attributeName) {
    const descriptor = this.valueDescriptorNameMap[attributeName];
    const hasMethodName = `has${capitalize(descriptor.name)}`;
    return this.receiver[hasMethodName];
  }
};
var TargetObserver = class {
  constructor(context, delegate) {
    this.context = context;
    this.delegate = delegate;
    this.targetsByName = new Multimap();
  }
  start() {
    if (!this.tokenListObserver) {
      this.tokenListObserver = new TokenListObserver(this.element, this.attributeName, this);
      this.tokenListObserver.start();
    }
  }
  stop() {
    if (this.tokenListObserver) {
      this.disconnectAllTargets();
      this.tokenListObserver.stop();
      delete this.tokenListObserver;
    }
  }
  tokenMatched({ element, content: name }) {
    if (this.scope.containsElement(element)) {
      this.connectTarget(element, name);
    }
  }
  tokenUnmatched({ element, content: name }) {
    this.disconnectTarget(element, name);
  }
  connectTarget(element, name) {
    var _a;
    if (!this.targetsByName.has(name, element)) {
      this.targetsByName.add(name, element);
      (_a = this.tokenListObserver) === null || _a === void 0 ? void 0 : _a.pause(() => this.delegate.targetConnected(element, name));
    }
  }
  disconnectTarget(element, name) {
    var _a;
    if (this.targetsByName.has(name, element)) {
      this.targetsByName.delete(name, element);
      (_a = this.tokenListObserver) === null || _a === void 0 ? void 0 : _a.pause(() => this.delegate.targetDisconnected(element, name));
    }
  }
  disconnectAllTargets() {
    for (const name of this.targetsByName.keys) {
      for (const element of this.targetsByName.getValuesForKey(name)) {
        this.disconnectTarget(element, name);
      }
    }
  }
  get attributeName() {
    return `data-${this.context.identifier}-target`;
  }
  get element() {
    return this.context.element;
  }
  get scope() {
    return this.context.scope;
  }
};
function readInheritableStaticArrayValues(constructor, propertyName) {
  const ancestors = getAncestorsForConstructor(constructor);
  return Array.from(ancestors.reduce((values, constructor2) => {
    getOwnStaticArrayValues(constructor2, propertyName).forEach((name) => values.add(name));
    return values;
  }, /* @__PURE__ */ new Set()));
}
function readInheritableStaticObjectPairs(constructor, propertyName) {
  const ancestors = getAncestorsForConstructor(constructor);
  return ancestors.reduce((pairs, constructor2) => {
    pairs.push(...getOwnStaticObjectPairs(constructor2, propertyName));
    return pairs;
  }, []);
}
function getAncestorsForConstructor(constructor) {
  const ancestors = [];
  while (constructor) {
    ancestors.push(constructor);
    constructor = Object.getPrototypeOf(constructor);
  }
  return ancestors.reverse();
}
function getOwnStaticArrayValues(constructor, propertyName) {
  const definition = constructor[propertyName];
  return Array.isArray(definition) ? definition : [];
}
function getOwnStaticObjectPairs(constructor, propertyName) {
  const definition = constructor[propertyName];
  return definition ? Object.keys(definition).map((key) => [key, definition[key]]) : [];
}
var OutletObserver = class {
  constructor(context, delegate) {
    this.started = false;
    this.context = context;
    this.delegate = delegate;
    this.outletsByName = new Multimap();
    this.outletElementsByName = new Multimap();
    this.selectorObserverMap = /* @__PURE__ */ new Map();
    this.attributeObserverMap = /* @__PURE__ */ new Map();
  }
  start() {
    if (!this.started) {
      this.outletDefinitions.forEach((outletName) => {
        this.setupSelectorObserverForOutlet(outletName);
        this.setupAttributeObserverForOutlet(outletName);
      });
      this.started = true;
      this.dependentContexts.forEach((context) => context.refresh());
    }
  }
  refresh() {
    this.selectorObserverMap.forEach((observer) => observer.refresh());
    this.attributeObserverMap.forEach((observer) => observer.refresh());
  }
  stop() {
    if (this.started) {
      this.started = false;
      this.disconnectAllOutlets();
      this.stopSelectorObservers();
      this.stopAttributeObservers();
    }
  }
  stopSelectorObservers() {
    if (this.selectorObserverMap.size > 0) {
      this.selectorObserverMap.forEach((observer) => observer.stop());
      this.selectorObserverMap.clear();
    }
  }
  stopAttributeObservers() {
    if (this.attributeObserverMap.size > 0) {
      this.attributeObserverMap.forEach((observer) => observer.stop());
      this.attributeObserverMap.clear();
    }
  }
  selectorMatched(element, _selector, { outletName }) {
    const outlet = this.getOutlet(element, outletName);
    if (outlet) {
      this.connectOutlet(outlet, element, outletName);
    }
  }
  selectorUnmatched(element, _selector, { outletName }) {
    const outlet = this.getOutletFromMap(element, outletName);
    if (outlet) {
      this.disconnectOutlet(outlet, element, outletName);
    }
  }
  selectorMatchElement(element, { outletName }) {
    const selector = this.selector(outletName);
    const hasOutlet = this.hasOutlet(element, outletName);
    const hasOutletController = element.matches(`[${this.schema.controllerAttribute}~=${outletName}]`);
    if (selector) {
      return hasOutlet && hasOutletController && element.matches(selector);
    } else {
      return false;
    }
  }
  elementMatchedAttribute(_element, attributeName) {
    const outletName = this.getOutletNameFromOutletAttributeName(attributeName);
    if (outletName) {
      this.updateSelectorObserverForOutlet(outletName);
    }
  }
  elementAttributeValueChanged(_element, attributeName) {
    const outletName = this.getOutletNameFromOutletAttributeName(attributeName);
    if (outletName) {
      this.updateSelectorObserverForOutlet(outletName);
    }
  }
  elementUnmatchedAttribute(_element, attributeName) {
    const outletName = this.getOutletNameFromOutletAttributeName(attributeName);
    if (outletName) {
      this.updateSelectorObserverForOutlet(outletName);
    }
  }
  connectOutlet(outlet, element, outletName) {
    var _a;
    if (!this.outletElementsByName.has(outletName, element)) {
      this.outletsByName.add(outletName, outlet);
      this.outletElementsByName.add(outletName, element);
      (_a = this.selectorObserverMap.get(outletName)) === null || _a === void 0 ? void 0 : _a.pause(() => this.delegate.outletConnected(outlet, element, outletName));
    }
  }
  disconnectOutlet(outlet, element, outletName) {
    var _a;
    if (this.outletElementsByName.has(outletName, element)) {
      this.outletsByName.delete(outletName, outlet);
      this.outletElementsByName.delete(outletName, element);
      (_a = this.selectorObserverMap.get(outletName)) === null || _a === void 0 ? void 0 : _a.pause(() => this.delegate.outletDisconnected(outlet, element, outletName));
    }
  }
  disconnectAllOutlets() {
    for (const outletName of this.outletElementsByName.keys) {
      for (const element of this.outletElementsByName.getValuesForKey(outletName)) {
        for (const outlet of this.outletsByName.getValuesForKey(outletName)) {
          this.disconnectOutlet(outlet, element, outletName);
        }
      }
    }
  }
  updateSelectorObserverForOutlet(outletName) {
    const observer = this.selectorObserverMap.get(outletName);
    if (observer) {
      observer.selector = this.selector(outletName);
    }
  }
  setupSelectorObserverForOutlet(outletName) {
    const selector = this.selector(outletName);
    const selectorObserver = new SelectorObserver(document.body, selector, this, { outletName });
    this.selectorObserverMap.set(outletName, selectorObserver);
    selectorObserver.start();
  }
  setupAttributeObserverForOutlet(outletName) {
    const attributeName = this.attributeNameForOutletName(outletName);
    const attributeObserver = new AttributeObserver(this.scope.element, attributeName, this);
    this.attributeObserverMap.set(outletName, attributeObserver);
    attributeObserver.start();
  }
  selector(outletName) {
    return this.scope.outlets.getSelectorForOutletName(outletName);
  }
  attributeNameForOutletName(outletName) {
    return this.scope.schema.outletAttributeForScope(this.identifier, outletName);
  }
  getOutletNameFromOutletAttributeName(attributeName) {
    return this.outletDefinitions.find((outletName) => this.attributeNameForOutletName(outletName) === attributeName);
  }
  get outletDependencies() {
    const dependencies = new Multimap();
    this.router.modules.forEach((module) => {
      const constructor = module.definition.controllerConstructor;
      const outlets = readInheritableStaticArrayValues(constructor, "outlets");
      outlets.forEach((outlet) => dependencies.add(outlet, module.identifier));
    });
    return dependencies;
  }
  get outletDefinitions() {
    return this.outletDependencies.getKeysForValue(this.identifier);
  }
  get dependentControllerIdentifiers() {
    return this.outletDependencies.getValuesForKey(this.identifier);
  }
  get dependentContexts() {
    const identifiers = this.dependentControllerIdentifiers;
    return this.router.contexts.filter((context) => identifiers.includes(context.identifier));
  }
  hasOutlet(element, outletName) {
    return !!this.getOutlet(element, outletName) || !!this.getOutletFromMap(element, outletName);
  }
  getOutlet(element, outletName) {
    return this.application.getControllerForElementAndIdentifier(element, outletName);
  }
  getOutletFromMap(element, outletName) {
    return this.outletsByName.getValuesForKey(outletName).find((outlet) => outlet.element === element);
  }
  get scope() {
    return this.context.scope;
  }
  get schema() {
    return this.context.schema;
  }
  get identifier() {
    return this.context.identifier;
  }
  get application() {
    return this.context.application;
  }
  get router() {
    return this.application.router;
  }
};
var Context = class {
  constructor(module, scope) {
    this.logDebugActivity = (functionName, detail = {}) => {
      const { identifier, controller, element } = this;
      detail = Object.assign({ identifier, controller, element }, detail);
      this.application.logDebugActivity(this.identifier, functionName, detail);
    };
    this.module = module;
    this.scope = scope;
    this.controller = new module.controllerConstructor(this);
    this.bindingObserver = new BindingObserver(this, this.dispatcher);
    this.valueObserver = new ValueObserver(this, this.controller);
    this.targetObserver = new TargetObserver(this, this);
    this.outletObserver = new OutletObserver(this, this);
    try {
      this.controller.initialize();
      this.logDebugActivity("initialize");
    } catch (error2) {
      this.handleError(error2, "initializing controller");
    }
  }
  connect() {
    this.bindingObserver.start();
    this.valueObserver.start();
    this.targetObserver.start();
    this.outletObserver.start();
    try {
      this.controller.connect();
      this.logDebugActivity("connect");
    } catch (error2) {
      this.handleError(error2, "connecting controller");
    }
  }
  refresh() {
    this.outletObserver.refresh();
  }
  disconnect() {
    try {
      this.controller.disconnect();
      this.logDebugActivity("disconnect");
    } catch (error2) {
      this.handleError(error2, "disconnecting controller");
    }
    this.outletObserver.stop();
    this.targetObserver.stop();
    this.valueObserver.stop();
    this.bindingObserver.stop();
  }
  get application() {
    return this.module.application;
  }
  get identifier() {
    return this.module.identifier;
  }
  get schema() {
    return this.application.schema;
  }
  get dispatcher() {
    return this.application.dispatcher;
  }
  get element() {
    return this.scope.element;
  }
  get parentElement() {
    return this.element.parentElement;
  }
  handleError(error2, message, detail = {}) {
    const { identifier, controller, element } = this;
    detail = Object.assign({ identifier, controller, element }, detail);
    this.application.handleError(error2, `Error ${message}`, detail);
  }
  targetConnected(element, name) {
    this.invokeControllerMethod(`${name}TargetConnected`, element);
  }
  targetDisconnected(element, name) {
    this.invokeControllerMethod(`${name}TargetDisconnected`, element);
  }
  outletConnected(outlet, element, name) {
    this.invokeControllerMethod(`${namespaceCamelize(name)}OutletConnected`, outlet, element);
  }
  outletDisconnected(outlet, element, name) {
    this.invokeControllerMethod(`${namespaceCamelize(name)}OutletDisconnected`, outlet, element);
  }
  invokeControllerMethod(methodName, ...args) {
    const controller = this.controller;
    if (typeof controller[methodName] == "function") {
      controller[methodName](...args);
    }
  }
};
function bless(constructor) {
  return shadow(constructor, getBlessedProperties(constructor));
}
function shadow(constructor, properties) {
  const shadowConstructor = extend(constructor);
  const shadowProperties = getShadowProperties(constructor.prototype, properties);
  Object.defineProperties(shadowConstructor.prototype, shadowProperties);
  return shadowConstructor;
}
function getBlessedProperties(constructor) {
  const blessings = readInheritableStaticArrayValues(constructor, "blessings");
  return blessings.reduce((blessedProperties, blessing) => {
    const properties = blessing(constructor);
    for (const key in properties) {
      const descriptor = blessedProperties[key] || {};
      blessedProperties[key] = Object.assign(descriptor, properties[key]);
    }
    return blessedProperties;
  }, {});
}
function getShadowProperties(prototype, properties) {
  return getOwnKeys(properties).reduce((shadowProperties, key) => {
    const descriptor = getShadowedDescriptor(prototype, properties, key);
    if (descriptor) {
      Object.assign(shadowProperties, { [key]: descriptor });
    }
    return shadowProperties;
  }, {});
}
function getShadowedDescriptor(prototype, properties, key) {
  const shadowingDescriptor = Object.getOwnPropertyDescriptor(prototype, key);
  const shadowedByValue = shadowingDescriptor && "value" in shadowingDescriptor;
  if (!shadowedByValue) {
    const descriptor = Object.getOwnPropertyDescriptor(properties, key).value;
    if (shadowingDescriptor) {
      descriptor.get = shadowingDescriptor.get || descriptor.get;
      descriptor.set = shadowingDescriptor.set || descriptor.set;
    }
    return descriptor;
  }
}
var getOwnKeys = (() => {
  if (typeof Object.getOwnPropertySymbols == "function") {
    return (object) => [...Object.getOwnPropertyNames(object), ...Object.getOwnPropertySymbols(object)];
  } else {
    return Object.getOwnPropertyNames;
  }
})();
var extend = (() => {
  function extendWithReflect(constructor) {
    function extended() {
      return Reflect.construct(constructor, arguments, new.target);
    }
    extended.prototype = Object.create(constructor.prototype, {
      constructor: { value: extended }
    });
    Reflect.setPrototypeOf(extended, constructor);
    return extended;
  }
  function testReflectExtension() {
    const a = function() {
      this.a.call(this);
    };
    const b = extendWithReflect(a);
    b.prototype.a = function() {
    };
    return new b();
  }
  try {
    testReflectExtension();
    return extendWithReflect;
  } catch (error2) {
    return (constructor) => class extended extends constructor {
    };
  }
})();
function blessDefinition(definition) {
  return {
    identifier: definition.identifier,
    controllerConstructor: bless(definition.controllerConstructor)
  };
}
var Module = class {
  constructor(application, definition) {
    this.application = application;
    this.definition = blessDefinition(definition);
    this.contextsByScope = /* @__PURE__ */ new WeakMap();
    this.connectedContexts = /* @__PURE__ */ new Set();
  }
  get identifier() {
    return this.definition.identifier;
  }
  get controllerConstructor() {
    return this.definition.controllerConstructor;
  }
  get contexts() {
    return Array.from(this.connectedContexts);
  }
  connectContextForScope(scope) {
    const context = this.fetchContextForScope(scope);
    this.connectedContexts.add(context);
    context.connect();
  }
  disconnectContextForScope(scope) {
    const context = this.contextsByScope.get(scope);
    if (context) {
      this.connectedContexts.delete(context);
      context.disconnect();
    }
  }
  fetchContextForScope(scope) {
    let context = this.contextsByScope.get(scope);
    if (!context) {
      context = new Context(this, scope);
      this.contextsByScope.set(scope, context);
    }
    return context;
  }
};
var ClassMap = class {
  constructor(scope) {
    this.scope = scope;
  }
  has(name) {
    return this.data.has(this.getDataKey(name));
  }
  get(name) {
    return this.getAll(name)[0];
  }
  getAll(name) {
    const tokenString = this.data.get(this.getDataKey(name)) || "";
    return tokenize(tokenString);
  }
  getAttributeName(name) {
    return this.data.getAttributeNameForKey(this.getDataKey(name));
  }
  getDataKey(name) {
    return `${name}-class`;
  }
  get data() {
    return this.scope.data;
  }
};
var DataMap = class {
  constructor(scope) {
    this.scope = scope;
  }
  get element() {
    return this.scope.element;
  }
  get identifier() {
    return this.scope.identifier;
  }
  get(key) {
    const name = this.getAttributeNameForKey(key);
    return this.element.getAttribute(name);
  }
  set(key, value) {
    const name = this.getAttributeNameForKey(key);
    this.element.setAttribute(name, value);
    return this.get(key);
  }
  has(key) {
    const name = this.getAttributeNameForKey(key);
    return this.element.hasAttribute(name);
  }
  delete(key) {
    if (this.has(key)) {
      const name = this.getAttributeNameForKey(key);
      this.element.removeAttribute(name);
      return true;
    } else {
      return false;
    }
  }
  getAttributeNameForKey(key) {
    return `data-${this.identifier}-${dasherize(key)}`;
  }
};
var Guide = class {
  constructor(logger) {
    this.warnedKeysByObject = /* @__PURE__ */ new WeakMap();
    this.logger = logger;
  }
  warn(object, key, message) {
    let warnedKeys = this.warnedKeysByObject.get(object);
    if (!warnedKeys) {
      warnedKeys = /* @__PURE__ */ new Set();
      this.warnedKeysByObject.set(object, warnedKeys);
    }
    if (!warnedKeys.has(key)) {
      warnedKeys.add(key);
      this.logger.warn(message, object);
    }
  }
};
function attributeValueContainsToken(attributeName, token) {
  return `[${attributeName}~="${token}"]`;
}
var TargetSet = class {
  constructor(scope) {
    this.scope = scope;
  }
  get element() {
    return this.scope.element;
  }
  get identifier() {
    return this.scope.identifier;
  }
  get schema() {
    return this.scope.schema;
  }
  has(targetName) {
    return this.find(targetName) != null;
  }
  find(...targetNames) {
    return targetNames.reduce((target, targetName) => target || this.findTarget(targetName) || this.findLegacyTarget(targetName), void 0);
  }
  findAll(...targetNames) {
    return targetNames.reduce((targets, targetName) => [
      ...targets,
      ...this.findAllTargets(targetName),
      ...this.findAllLegacyTargets(targetName)
    ], []);
  }
  findTarget(targetName) {
    const selector = this.getSelectorForTargetName(targetName);
    return this.scope.findElement(selector);
  }
  findAllTargets(targetName) {
    const selector = this.getSelectorForTargetName(targetName);
    return this.scope.findAllElements(selector);
  }
  getSelectorForTargetName(targetName) {
    const attributeName = this.schema.targetAttributeForScope(this.identifier);
    return attributeValueContainsToken(attributeName, targetName);
  }
  findLegacyTarget(targetName) {
    const selector = this.getLegacySelectorForTargetName(targetName);
    return this.deprecate(this.scope.findElement(selector), targetName);
  }
  findAllLegacyTargets(targetName) {
    const selector = this.getLegacySelectorForTargetName(targetName);
    return this.scope.findAllElements(selector).map((element) => this.deprecate(element, targetName));
  }
  getLegacySelectorForTargetName(targetName) {
    const targetDescriptor = `${this.identifier}.${targetName}`;
    return attributeValueContainsToken(this.schema.targetAttribute, targetDescriptor);
  }
  deprecate(element, targetName) {
    if (element) {
      const { identifier } = this;
      const attributeName = this.schema.targetAttribute;
      const revisedAttributeName = this.schema.targetAttributeForScope(identifier);
      this.guide.warn(element, `target:${targetName}`, `Please replace ${attributeName}="${identifier}.${targetName}" with ${revisedAttributeName}="${targetName}". The ${attributeName} attribute is deprecated and will be removed in a future version of Stimulus.`);
    }
    return element;
  }
  get guide() {
    return this.scope.guide;
  }
};
var OutletSet = class {
  constructor(scope, controllerElement) {
    this.scope = scope;
    this.controllerElement = controllerElement;
  }
  get element() {
    return this.scope.element;
  }
  get identifier() {
    return this.scope.identifier;
  }
  get schema() {
    return this.scope.schema;
  }
  has(outletName) {
    return this.find(outletName) != null;
  }
  find(...outletNames) {
    return outletNames.reduce((outlet, outletName) => outlet || this.findOutlet(outletName), void 0);
  }
  findAll(...outletNames) {
    return outletNames.reduce((outlets, outletName) => [...outlets, ...this.findAllOutlets(outletName)], []);
  }
  getSelectorForOutletName(outletName) {
    const attributeName = this.schema.outletAttributeForScope(this.identifier, outletName);
    return this.controllerElement.getAttribute(attributeName);
  }
  findOutlet(outletName) {
    const selector = this.getSelectorForOutletName(outletName);
    if (selector)
      return this.findElement(selector, outletName);
  }
  findAllOutlets(outletName) {
    const selector = this.getSelectorForOutletName(outletName);
    return selector ? this.findAllElements(selector, outletName) : [];
  }
  findElement(selector, outletName) {
    const elements = this.scope.queryElements(selector);
    return elements.filter((element) => this.matchesElement(element, selector, outletName))[0];
  }
  findAllElements(selector, outletName) {
    const elements = this.scope.queryElements(selector);
    return elements.filter((element) => this.matchesElement(element, selector, outletName));
  }
  matchesElement(element, selector, outletName) {
    const controllerAttribute = element.getAttribute(this.scope.schema.controllerAttribute) || "";
    return element.matches(selector) && controllerAttribute.split(" ").includes(outletName);
  }
};
var Scope = class _Scope {
  constructor(schema, element, identifier, logger) {
    this.targets = new TargetSet(this);
    this.classes = new ClassMap(this);
    this.data = new DataMap(this);
    this.containsElement = (element2) => {
      return element2.closest(this.controllerSelector) === this.element;
    };
    this.schema = schema;
    this.element = element;
    this.identifier = identifier;
    this.guide = new Guide(logger);
    this.outlets = new OutletSet(this.documentScope, element);
  }
  findElement(selector) {
    return this.element.matches(selector) ? this.element : this.queryElements(selector).find(this.containsElement);
  }
  findAllElements(selector) {
    return [
      ...this.element.matches(selector) ? [this.element] : [],
      ...this.queryElements(selector).filter(this.containsElement)
    ];
  }
  queryElements(selector) {
    return Array.from(this.element.querySelectorAll(selector));
  }
  get controllerSelector() {
    return attributeValueContainsToken(this.schema.controllerAttribute, this.identifier);
  }
  get isDocumentScope() {
    return this.element === document.documentElement;
  }
  get documentScope() {
    return this.isDocumentScope ? this : new _Scope(this.schema, document.documentElement, this.identifier, this.guide.logger);
  }
};
var ScopeObserver = class {
  constructor(element, schema, delegate) {
    this.element = element;
    this.schema = schema;
    this.delegate = delegate;
    this.valueListObserver = new ValueListObserver(this.element, this.controllerAttribute, this);
    this.scopesByIdentifierByElement = /* @__PURE__ */ new WeakMap();
    this.scopeReferenceCounts = /* @__PURE__ */ new WeakMap();
  }
  start() {
    this.valueListObserver.start();
  }
  stop() {
    this.valueListObserver.stop();
  }
  get controllerAttribute() {
    return this.schema.controllerAttribute;
  }
  parseValueForToken(token) {
    const { element, content: identifier } = token;
    return this.parseValueForElementAndIdentifier(element, identifier);
  }
  parseValueForElementAndIdentifier(element, identifier) {
    const scopesByIdentifier = this.fetchScopesByIdentifierForElement(element);
    let scope = scopesByIdentifier.get(identifier);
    if (!scope) {
      scope = this.delegate.createScopeForElementAndIdentifier(element, identifier);
      scopesByIdentifier.set(identifier, scope);
    }
    return scope;
  }
  elementMatchedValue(element, value) {
    const referenceCount = (this.scopeReferenceCounts.get(value) || 0) + 1;
    this.scopeReferenceCounts.set(value, referenceCount);
    if (referenceCount == 1) {
      this.delegate.scopeConnected(value);
    }
  }
  elementUnmatchedValue(element, value) {
    const referenceCount = this.scopeReferenceCounts.get(value);
    if (referenceCount) {
      this.scopeReferenceCounts.set(value, referenceCount - 1);
      if (referenceCount == 1) {
        this.delegate.scopeDisconnected(value);
      }
    }
  }
  fetchScopesByIdentifierForElement(element) {
    let scopesByIdentifier = this.scopesByIdentifierByElement.get(element);
    if (!scopesByIdentifier) {
      scopesByIdentifier = /* @__PURE__ */ new Map();
      this.scopesByIdentifierByElement.set(element, scopesByIdentifier);
    }
    return scopesByIdentifier;
  }
};
var Router = class {
  constructor(application) {
    this.application = application;
    this.scopeObserver = new ScopeObserver(this.element, this.schema, this);
    this.scopesByIdentifier = new Multimap();
    this.modulesByIdentifier = /* @__PURE__ */ new Map();
  }
  get element() {
    return this.application.element;
  }
  get schema() {
    return this.application.schema;
  }
  get logger() {
    return this.application.logger;
  }
  get controllerAttribute() {
    return this.schema.controllerAttribute;
  }
  get modules() {
    return Array.from(this.modulesByIdentifier.values());
  }
  get contexts() {
    return this.modules.reduce((contexts, module) => contexts.concat(module.contexts), []);
  }
  start() {
    this.scopeObserver.start();
  }
  stop() {
    this.scopeObserver.stop();
  }
  loadDefinition(definition) {
    this.unloadIdentifier(definition.identifier);
    const module = new Module(this.application, definition);
    this.connectModule(module);
    const afterLoad = definition.controllerConstructor.afterLoad;
    if (afterLoad) {
      afterLoad.call(definition.controllerConstructor, definition.identifier, this.application);
    }
  }
  unloadIdentifier(identifier) {
    const module = this.modulesByIdentifier.get(identifier);
    if (module) {
      this.disconnectModule(module);
    }
  }
  getContextForElementAndIdentifier(element, identifier) {
    const module = this.modulesByIdentifier.get(identifier);
    if (module) {
      return module.contexts.find((context) => context.element == element);
    }
  }
  proposeToConnectScopeForElementAndIdentifier(element, identifier) {
    const scope = this.scopeObserver.parseValueForElementAndIdentifier(element, identifier);
    if (scope) {
      this.scopeObserver.elementMatchedValue(scope.element, scope);
    } else {
      console.error(`Couldn't find or create scope for identifier: "${identifier}" and element:`, element);
    }
  }
  handleError(error2, message, detail) {
    this.application.handleError(error2, message, detail);
  }
  createScopeForElementAndIdentifier(element, identifier) {
    return new Scope(this.schema, element, identifier, this.logger);
  }
  scopeConnected(scope) {
    this.scopesByIdentifier.add(scope.identifier, scope);
    const module = this.modulesByIdentifier.get(scope.identifier);
    if (module) {
      module.connectContextForScope(scope);
    }
  }
  scopeDisconnected(scope) {
    this.scopesByIdentifier.delete(scope.identifier, scope);
    const module = this.modulesByIdentifier.get(scope.identifier);
    if (module) {
      module.disconnectContextForScope(scope);
    }
  }
  connectModule(module) {
    this.modulesByIdentifier.set(module.identifier, module);
    const scopes = this.scopesByIdentifier.getValuesForKey(module.identifier);
    scopes.forEach((scope) => module.connectContextForScope(scope));
  }
  disconnectModule(module) {
    this.modulesByIdentifier.delete(module.identifier);
    const scopes = this.scopesByIdentifier.getValuesForKey(module.identifier);
    scopes.forEach((scope) => module.disconnectContextForScope(scope));
  }
};
var defaultSchema = {
  controllerAttribute: "data-controller",
  actionAttribute: "data-action",
  targetAttribute: "data-target",
  targetAttributeForScope: (identifier) => `data-${identifier}-target`,
  outletAttributeForScope: (identifier, outlet) => `data-${identifier}-${outlet}-outlet`,
  keyMappings: Object.assign(Object.assign({ enter: "Enter", tab: "Tab", esc: "Escape", space: " ", up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight", home: "Home", end: "End", page_up: "PageUp", page_down: "PageDown" }, objectFromEntries("abcdefghijklmnopqrstuvwxyz".split("").map((c) => [c, c]))), objectFromEntries("0123456789".split("").map((n) => [n, n])))
};
function objectFromEntries(array) {
  return array.reduce((memo, [k, v]) => Object.assign(Object.assign({}, memo), { [k]: v }), {});
}
var Application = class {
  constructor(element = document.documentElement, schema = defaultSchema) {
    this.logger = console;
    this.debug = false;
    this.logDebugActivity = (identifier, functionName, detail = {}) => {
      if (this.debug) {
        this.logFormattedMessage(identifier, functionName, detail);
      }
    };
    this.element = element;
    this.schema = schema;
    this.dispatcher = new Dispatcher(this);
    this.router = new Router(this);
    this.actionDescriptorFilters = Object.assign({}, defaultActionDescriptorFilters);
  }
  static start(element, schema) {
    const application = new this(element, schema);
    application.start();
    return application;
  }
  async start() {
    await domReady();
    this.logDebugActivity("application", "starting");
    this.dispatcher.start();
    this.router.start();
    this.logDebugActivity("application", "start");
  }
  stop() {
    this.logDebugActivity("application", "stopping");
    this.dispatcher.stop();
    this.router.stop();
    this.logDebugActivity("application", "stop");
  }
  register(identifier, controllerConstructor) {
    this.load({ identifier, controllerConstructor });
  }
  registerActionOption(name, filter) {
    this.actionDescriptorFilters[name] = filter;
  }
  load(head, ...rest) {
    const definitions = Array.isArray(head) ? head : [head, ...rest];
    definitions.forEach((definition) => {
      if (definition.controllerConstructor.shouldLoad) {
        this.router.loadDefinition(definition);
      }
    });
  }
  unload(head, ...rest) {
    const identifiers = Array.isArray(head) ? head : [head, ...rest];
    identifiers.forEach((identifier) => this.router.unloadIdentifier(identifier));
  }
  get controllers() {
    return this.router.contexts.map((context) => context.controller);
  }
  getControllerForElementAndIdentifier(element, identifier) {
    const context = this.router.getContextForElementAndIdentifier(element, identifier);
    return context ? context.controller : null;
  }
  handleError(error2, message, detail) {
    var _a;
    this.logger.error(`%s

%o

%o`, message, error2, detail);
    (_a = window.onerror) === null || _a === void 0 ? void 0 : _a.call(window, message, "", 0, 0, error2);
  }
  logFormattedMessage(identifier, functionName, detail = {}) {
    detail = Object.assign({ application: this }, detail);
    this.logger.groupCollapsed(`${identifier} #${functionName}`);
    this.logger.log("details:", Object.assign({}, detail));
    this.logger.groupEnd();
  }
};
function domReady() {
  return new Promise((resolve) => {
    if (document.readyState == "loading") {
      document.addEventListener("DOMContentLoaded", () => resolve());
    } else {
      resolve();
    }
  });
}
function ClassPropertiesBlessing(constructor) {
  const classes = readInheritableStaticArrayValues(constructor, "classes");
  return classes.reduce((properties, classDefinition) => {
    return Object.assign(properties, propertiesForClassDefinition(classDefinition));
  }, {});
}
function propertiesForClassDefinition(key) {
  return {
    [`${key}Class`]: {
      get() {
        const { classes } = this;
        if (classes.has(key)) {
          return classes.get(key);
        } else {
          const attribute = classes.getAttributeName(key);
          throw new Error(`Missing attribute "${attribute}"`);
        }
      }
    },
    [`${key}Classes`]: {
      get() {
        return this.classes.getAll(key);
      }
    },
    [`has${capitalize(key)}Class`]: {
      get() {
        return this.classes.has(key);
      }
    }
  };
}
function OutletPropertiesBlessing(constructor) {
  const outlets = readInheritableStaticArrayValues(constructor, "outlets");
  return outlets.reduce((properties, outletDefinition) => {
    return Object.assign(properties, propertiesForOutletDefinition(outletDefinition));
  }, {});
}
function getOutletController(controller, element, identifier) {
  return controller.application.getControllerForElementAndIdentifier(element, identifier);
}
function getControllerAndEnsureConnectedScope(controller, element, outletName) {
  let outletController = getOutletController(controller, element, outletName);
  if (outletController)
    return outletController;
  controller.application.router.proposeToConnectScopeForElementAndIdentifier(element, outletName);
  outletController = getOutletController(controller, element, outletName);
  if (outletController)
    return outletController;
}
function propertiesForOutletDefinition(name) {
  const camelizedName = namespaceCamelize(name);
  return {
    [`${camelizedName}Outlet`]: {
      get() {
        const outletElement = this.outlets.find(name);
        const selector = this.outlets.getSelectorForOutletName(name);
        if (outletElement) {
          const outletController = getControllerAndEnsureConnectedScope(this, outletElement, name);
          if (outletController)
            return outletController;
          throw new Error(`The provided outlet element is missing an outlet controller "${name}" instance for host controller "${this.identifier}"`);
        }
        throw new Error(`Missing outlet element "${name}" for host controller "${this.identifier}". Stimulus couldn't find a matching outlet element using selector "${selector}".`);
      }
    },
    [`${camelizedName}Outlets`]: {
      get() {
        const outlets = this.outlets.findAll(name);
        if (outlets.length > 0) {
          return outlets.map((outletElement) => {
            const outletController = getControllerAndEnsureConnectedScope(this, outletElement, name);
            if (outletController)
              return outletController;
            console.warn(`The provided outlet element is missing an outlet controller "${name}" instance for host controller "${this.identifier}"`, outletElement);
          }).filter((controller) => controller);
        }
        return [];
      }
    },
    [`${camelizedName}OutletElement`]: {
      get() {
        const outletElement = this.outlets.find(name);
        const selector = this.outlets.getSelectorForOutletName(name);
        if (outletElement) {
          return outletElement;
        } else {
          throw new Error(`Missing outlet element "${name}" for host controller "${this.identifier}". Stimulus couldn't find a matching outlet element using selector "${selector}".`);
        }
      }
    },
    [`${camelizedName}OutletElements`]: {
      get() {
        return this.outlets.findAll(name);
      }
    },
    [`has${capitalize(camelizedName)}Outlet`]: {
      get() {
        return this.outlets.has(name);
      }
    }
  };
}
function TargetPropertiesBlessing(constructor) {
  const targets = readInheritableStaticArrayValues(constructor, "targets");
  return targets.reduce((properties, targetDefinition) => {
    return Object.assign(properties, propertiesForTargetDefinition(targetDefinition));
  }, {});
}
function propertiesForTargetDefinition(name) {
  return {
    [`${name}Target`]: {
      get() {
        const target = this.targets.find(name);
        if (target) {
          return target;
        } else {
          throw new Error(`Missing target element "${name}" for "${this.identifier}" controller`);
        }
      }
    },
    [`${name}Targets`]: {
      get() {
        return this.targets.findAll(name);
      }
    },
    [`has${capitalize(name)}Target`]: {
      get() {
        return this.targets.has(name);
      }
    }
  };
}
function ValuePropertiesBlessing(constructor) {
  const valueDefinitionPairs = readInheritableStaticObjectPairs(constructor, "values");
  const propertyDescriptorMap = {
    valueDescriptorMap: {
      get() {
        return valueDefinitionPairs.reduce((result, valueDefinitionPair) => {
          const valueDescriptor = parseValueDefinitionPair(valueDefinitionPair, this.identifier);
          const attributeName = this.data.getAttributeNameForKey(valueDescriptor.key);
          return Object.assign(result, { [attributeName]: valueDescriptor });
        }, {});
      }
    }
  };
  return valueDefinitionPairs.reduce((properties, valueDefinitionPair) => {
    return Object.assign(properties, propertiesForValueDefinitionPair(valueDefinitionPair));
  }, propertyDescriptorMap);
}
function propertiesForValueDefinitionPair(valueDefinitionPair, controller) {
  const definition = parseValueDefinitionPair(valueDefinitionPair, controller);
  const { key, name, reader: read, writer: write } = definition;
  return {
    [name]: {
      get() {
        const value = this.data.get(key);
        if (value !== null) {
          return read(value);
        } else {
          return definition.defaultValue;
        }
      },
      set(value) {
        if (value === void 0) {
          this.data.delete(key);
        } else {
          this.data.set(key, write(value));
        }
      }
    },
    [`has${capitalize(name)}`]: {
      get() {
        return this.data.has(key) || definition.hasCustomDefaultValue;
      }
    }
  };
}
function parseValueDefinitionPair([token, typeDefinition], controller) {
  return valueDescriptorForTokenAndTypeDefinition({
    controller,
    token,
    typeDefinition
  });
}
function parseValueTypeConstant(constant) {
  switch (constant) {
    case Array:
      return "array";
    case Boolean:
      return "boolean";
    case Number:
      return "number";
    case Object:
      return "object";
    case String:
      return "string";
  }
}
function parseValueTypeDefault(defaultValue) {
  switch (typeof defaultValue) {
    case "boolean":
      return "boolean";
    case "number":
      return "number";
    case "string":
      return "string";
  }
  if (Array.isArray(defaultValue))
    return "array";
  if (Object.prototype.toString.call(defaultValue) === "[object Object]")
    return "object";
}
function parseValueTypeObject(payload) {
  const { controller, token, typeObject } = payload;
  const hasType = isSomething(typeObject.type);
  const hasDefault = isSomething(typeObject.default);
  const fullObject = hasType && hasDefault;
  const onlyType = hasType && !hasDefault;
  const onlyDefault = !hasType && hasDefault;
  const typeFromObject = parseValueTypeConstant(typeObject.type);
  const typeFromDefaultValue = parseValueTypeDefault(payload.typeObject.default);
  if (onlyType)
    return typeFromObject;
  if (onlyDefault)
    return typeFromDefaultValue;
  if (typeFromObject !== typeFromDefaultValue) {
    const propertyPath = controller ? `${controller}.${token}` : token;
    throw new Error(`The specified default value for the Stimulus Value "${propertyPath}" must match the defined type "${typeFromObject}". The provided default value of "${typeObject.default}" is of type "${typeFromDefaultValue}".`);
  }
  if (fullObject)
    return typeFromObject;
}
function parseValueTypeDefinition(payload) {
  const { controller, token, typeDefinition } = payload;
  const typeObject = { controller, token, typeObject: typeDefinition };
  const typeFromObject = parseValueTypeObject(typeObject);
  const typeFromDefaultValue = parseValueTypeDefault(typeDefinition);
  const typeFromConstant = parseValueTypeConstant(typeDefinition);
  const type = typeFromObject || typeFromDefaultValue || typeFromConstant;
  if (type)
    return type;
  const propertyPath = controller ? `${controller}.${typeDefinition}` : token;
  throw new Error(`Unknown value type "${propertyPath}" for "${token}" value`);
}
function defaultValueForDefinition(typeDefinition) {
  const constant = parseValueTypeConstant(typeDefinition);
  if (constant)
    return defaultValuesByType[constant];
  const hasDefault = hasProperty(typeDefinition, "default");
  const hasType = hasProperty(typeDefinition, "type");
  const typeObject = typeDefinition;
  if (hasDefault)
    return typeObject.default;
  if (hasType) {
    const { type } = typeObject;
    const constantFromType = parseValueTypeConstant(type);
    if (constantFromType)
      return defaultValuesByType[constantFromType];
  }
  return typeDefinition;
}
function valueDescriptorForTokenAndTypeDefinition(payload) {
  const { token, typeDefinition } = payload;
  const key = `${dasherize(token)}-value`;
  const type = parseValueTypeDefinition(payload);
  return {
    type,
    key,
    name: camelize(key),
    get defaultValue() {
      return defaultValueForDefinition(typeDefinition);
    },
    get hasCustomDefaultValue() {
      return parseValueTypeDefault(typeDefinition) !== void 0;
    },
    reader: readers[type],
    writer: writers[type] || writers.default
  };
}
var defaultValuesByType = {
  get array() {
    return [];
  },
  boolean: false,
  number: 0,
  get object() {
    return {};
  },
  string: ""
};
var readers = {
  array(value) {
    const array = JSON.parse(value);
    if (!Array.isArray(array)) {
      throw new TypeError(`expected value of type "array" but instead got value "${value}" of type "${parseValueTypeDefault(array)}"`);
    }
    return array;
  },
  boolean(value) {
    return !(value == "0" || String(value).toLowerCase() == "false");
  },
  number(value) {
    return Number(value.replace(/_/g, ""));
  },
  object(value) {
    const object = JSON.parse(value);
    if (object === null || typeof object != "object" || Array.isArray(object)) {
      throw new TypeError(`expected value of type "object" but instead got value "${value}" of type "${parseValueTypeDefault(object)}"`);
    }
    return object;
  },
  string(value) {
    return value;
  }
};
var writers = {
  default: writeString,
  array: writeJSON,
  object: writeJSON
};
function writeJSON(value) {
  return JSON.stringify(value);
}
function writeString(value) {
  return `${value}`;
}
var Controller = class {
  constructor(context) {
    this.context = context;
  }
  static get shouldLoad() {
    return true;
  }
  static afterLoad(_identifier, _application) {
    return;
  }
  get application() {
    return this.context.application;
  }
  get scope() {
    return this.context.scope;
  }
  get element() {
    return this.scope.element;
  }
  get identifier() {
    return this.scope.identifier;
  }
  get targets() {
    return this.scope.targets;
  }
  get outlets() {
    return this.scope.outlets;
  }
  get classes() {
    return this.scope.classes;
  }
  get data() {
    return this.scope.data;
  }
  initialize() {
  }
  connect() {
  }
  disconnect() {
  }
  dispatch(eventName, { target = this.element, detail = {}, prefix = this.identifier, bubbles = true, cancelable = true } = {}) {
    const type = prefix ? `${prefix}:${eventName}` : eventName;
    const event = new CustomEvent(type, { detail, bubbles, cancelable });
    target.dispatchEvent(event);
    return event;
  }
};
Controller.blessings = [
  ClassPropertiesBlessing,
  TargetPropertiesBlessing,
  ValuePropertiesBlessing,
  OutletPropertiesBlessing
];
Controller.targets = [];
Controller.outlets = [];
Controller.values = {};

// static/src/lib/format.js
var STATUSES = ["Aberto", "Em an\xE1lise", "Resolvido"];
var PRIORITY_WEIGHT = { Urgente: 4, Alta: 3, M\u00E9dia: 2, Baixa: 1 };
var STATUS_WEIGHT = { Aberto: 3, "Em an\xE1lise": 2, Resolvido: 1 };
var WATER_TARIFF_LABEL = "Tarifa estimada para c\xE1lculo do MVP";
function formatNumber(value, maximumFractionDigits = 0) {
  return Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits });
}
function formatDecimal(value, maximumFractionDigits = 2) {
  return Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits
  });
}
function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
function formatDate(timestamp) {
  if (!timestamp) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(Number(timestamp) * 1e3));
}
function formatDatetime(timestamp) {
  if (!timestamp) return "";
  return new Date(Number(timestamp) * 1e3).toISOString();
}
function shortText(value, maxLength) {
  const text = String(value || "");
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}\u2026` : text;
}
function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[char]);
}
function slug(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function normalizeSearch(value) {
  return slug(value).replace(/-/g, " ");
}
function toneForPriority(priority) {
  const value = slug(priority);
  if (value === "urgente" || value === "alta") return "red";
  if (value === "media") return "orange";
  return "green";
}
function badgeClass(value) {
  const tone = toneForPriority(value);
  if (tone === "red") return "aqua-badge aqua-badge-red";
  if (tone === "orange") return "aqua-badge aqua-badge-orange";
  if (slug(value) === "resolvido" || slug(value) === "baixa") return "aqua-badge aqua-badge-green";
  return "aqua-badge aqua-badge-blue";
}
function impactFor(item, tariff = 71.03) {
  const litersPerDay = Number(item.litros_por_dia_estimados || item.litros_dia || 0);
  const litersPerMonth = Number(item.litros_mes || litersPerDay * 30);
  const cubicMetersPerMonth = Number(item.m3_mes || litersPerMonth / 1e3);
  const costPerMonth = Number(item.custo_mes || cubicMetersPerMonth * tariff);
  const costPerYear = Number(item.custo_ano || costPerMonth * 12);
  return {
    litersPerDay,
    litersPerMonth,
    cubicMetersPerMonth,
    costPerMonth,
    costPerYear
  };
}

// static/src/lib/campus_points.js
var DEFAULT_CAMPUS = { lat: -20.5032738, lng: -54.6134936, zoom: 16 };
var CAMPUS_POINT_GROUPS = [
  [
    { key: "bloco-7", terms: ["bloco-7"], label: "Bloco 7", lat: -20.50462, lng: -54.61333, x: 56, y: 52 },
    { key: "bloco-12", terms: ["bloco-12"], label: "Bloco 12", lat: -20.50738, lng: -54.61509, x: 48, y: 67 }
  ],
  [
    { key: "biblioteca", terms: ["biblioteca", "biblioteca-central"], label: "Biblioteca Central", lat: -20.50095, lng: -54.61172, x: 66, y: 36 },
    { key: "restaurante", terms: ["restaurante-universitario", "ru"], label: "Restaurante Universit\xE1rio", lat: -20.50542, lng: -54.61598, x: 47, y: 60 },
    { key: "facom", terms: ["facom", "computacao"], label: "Facom", lat: -20.50616, lng: -54.61389, x: 53, y: 62 },
    { key: "faeng", terms: ["faeng", "engenharia"], label: "Faeng", lat: -20.50652, lng: -54.61294, x: 57, y: 65 },
    { key: "inqui", terms: ["inqui", "quimica"], label: "Inqui", lat: -20.50858, lng: -54.61945, x: 32, y: 73 },
    { key: "hospital", terms: ["hospital-universitario", "hospital", "hu"], label: "Hospital Universit\xE1rio", lat: -20.50256, lng: -54.61929, x: 31, y: 39 },
    { key: "reitoria", terms: ["reitoria", "proece", "proaes"], label: "Reitoria e pr\xF3-reitorias", lat: -20.49945, lng: -54.61395, x: 55, y: 25 },
    { key: "famed", terms: ["famed", "medicina"], label: "Famed", lat: -20.50115, lng: -54.61403, x: 53, y: 36 },
    { key: "inma", terms: ["inma", "matematica"], label: "Inma", lat: -20.50585, lng: -54.61114, x: 67, y: 61 },
    { key: "infi", terms: ["infi", "fisica"], label: "Infi", lat: -20.50566, lng: -54.61172, x: 64, y: 60 }
  ],
  [
    { key: "laboratorios", terms: ["laboratorio", "laboratorios"], label: "Laborat\xF3rios", lat: -20.50023, lng: -54.61655, x: 43, y: 28 },
    { key: "banheiros", terms: ["banheiro", "sanitario", "sanitarios"], label: "Banheiros do campus", lat: -20.504, lng: -54.6131, x: 57, y: 50 },
    { key: "bebedouro", terms: ["bebedouro", "filtro", "purificador"], label: "Pontos de bebedouro", lat: -20.504, lng: -54.61238, x: 60, y: 51 },
    { key: "administrativo", terms: ["administrativa", "administrativo", "sala-administrativa"], label: "\xC1rea administrativa", lat: -20.50018, lng: -54.61462, x: 51, y: 31 },
    { key: "area-externa", terms: ["area-externa", "externa", "jardim", "irrigacao"], label: "\xC1rea externa", lat: -20.5037, lng: -54.6112, x: 64, y: 49 },
    { key: "esportes", terms: ["estadio", "moreninho", "ginasio", "esportivo"], label: "Complexo esportivo", lat: -20.50455, lng: -54.60986, x: 72, y: 56 }
  ]
];
function matchesPointTerm(text, term) {
  const normalizedTerm = slug(term);
  if (!normalizedTerm) return false;
  if (normalizedTerm.length <= 2) return text.split("-").includes(normalizedTerm);
  return text.includes(normalizedTerm);
}
function resolveCampusPoint(local) {
  const text = slug(local);
  for (const group of CAMPUS_POINT_GROUPS) {
    const found = group.find((point) => point.terms.some((term) => matchesPointTerm(text, term)));
    if (found) return found;
  }
  return {
    key: "campus-centro",
    label: "Centro da Cidade Universit\xE1ria",
    lat: DEFAULT_CAMPUS.lat,
    lng: DEFAULT_CAMPUS.lng,
    x: 57,
    y: 48
  };
}
function getMostCriticalItem(items = []) {
  return [...items].sort((a, b) => {
    const priorityDiff = (PRIORITY_WEIGHT[b.prioridade] || 0) - (PRIORITY_WEIGHT[a.prioridade] || 0);
    if (priorityDiff) return priorityDiff;
    return Number(b.litros_por_dia_estimados || 0) - Number(a.litros_por_dia_estimados || 0);
  })[0] || null;
}
function getDominantStatus(items = []) {
  const counts = /* @__PURE__ */ new Map();
  items.forEach((item) => counts.set(item.status, (counts.get(item.status) || 0) + 1));
  const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1] || (STATUS_WEIGHT[b[0]] || 0) - (STATUS_WEIGHT[a[0]] || 0))[0];
  return dominant ? dominant[0] : "Sem status";
}
function buildMapData(occurrences = []) {
  const grouped = /* @__PURE__ */ new Map();
  occurrences.forEach((item) => {
    const point = resolveCampusPoint(item.local);
    const current = grouped.get(point.key) || {
      ...point,
      count: 0,
      liters: 0,
      urgent: 0,
      items: []
    };
    current.count += 1;
    current.liters += Number(item.litros_por_dia_estimados || 0);
    current.urgent += ["Urgente", "Alta"].includes(item.prioridade) ? 1 : 0;
    current.items.push(item);
    grouped.set(point.key, current);
  });
  if (!grouped.size) {
    return [{
      key: "demo-centro",
      label: "Centro do campus",
      count: 0,
      liters: 0,
      urgent: 0,
      lat: DEFAULT_CAMPUS.lat,
      lng: DEFAULT_CAMPUS.lng,
      x: 57,
      y: 48,
      items: []
    }];
  }
  return [...grouped.values()];
}

// static/src/controllers/dashboard_controller.js
var dashboard_controller_default = class extends Controller {
  static targets = [
    "homeStats",
    "impactStats",
    "recentList",
    "campusPreview",
    "stats",
    "list",
    "search",
    "statusFilter",
    "priorityFilter",
    "statusSegment"
  ];
  static values = {
    endpoint: { type: String, default: "/api/ocorrencias" },
    tariff: { type: Number, default: 71.03 }
  };
  connect() {
    this.occurrences = [];
    this.request = null;
    this.load();
  }
  handleScreenChange(event) {
    if (["dashboard", "painel", "mapa"].includes(event.detail?.screen)) this.load();
  }
  reload() {
    this.load(true);
  }
  async load(force = false) {
    if (this.request && !force) return this.request;
    this.request = fetch(this.endpointValue).then((response) => response.ok ? response.json() : Promise.reject(new Error("N\xE3o foi poss\xEDvel carregar ocorr\xEAncias."))).then((payload) => {
      this.occurrences = Array.isArray(payload) ? payload : [];
      this.render();
      window.dispatchEvent(new CustomEvent("aquaia:occurrences-updated", { detail: { occurrences: this.occurrences } }));
    }).catch((error2) => {
      window.dispatchEvent(new CustomEvent("aquaia:toast", { detail: { message: error2.message } }));
    }).finally(() => {
      this.request = null;
    });
    return this.request;
  }
  filter() {
    this.renderPanel();
  }
  setStatus(event) {
    const status = event.params.status || "";
    if (this.hasStatusFilterTarget) this.statusFilterTarget.value = status;
    this.statusSegmentTargets.forEach((button) => {
      button.classList.toggle("is-active", (button.dataset.dashboardStatusParam || "") === status);
    });
    this.renderPanel();
  }
  async updateStatus(event) {
    const id = event.currentTarget.dataset.id;
    const status = event.currentTarget.value;
    if (!id) return;
    try {
      const response = await fetch(`/api/ocorrencias/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.erro || "N\xE3o foi poss\xEDvel atualizar o status.");
      await this.load(true);
      window.dispatchEvent(new CustomEvent("aquaia:toast", { detail: { message: "Status atualizado." } }));
    } catch (error2) {
      window.dispatchEvent(new CustomEvent("aquaia:toast", { detail: { message: error2.message } }));
    }
  }
  render() {
    this.renderHome();
    this.renderRecent();
    this.renderCampusPreview();
    this.renderPanel();
  }
  renderHome() {
    const total = this.occurrences.length;
    const open = this.occurrences.filter((item) => item.status !== "Resolvido").length;
    const urgent = this.occurrences.filter((item) => ["Urgente", "Alta"].includes(item.prioridade)).length;
    const resolved = this.occurrences.filter((item) => item.status === "Resolvido").length;
    const liters = this.occurrences.reduce((sum, item) => sum + Number(item.litros_por_dia_estimados || 0), 0);
    const impact = impactFor({ litros_por_dia_estimados: liters }, this.tariffValue);
    const responseIndex = total ? Math.max(45, Math.min(99, 100 - open * 4 - urgent * 8 + resolved * 5)) : 100;
    if (this.hasHomeStatsTarget) {
      this.homeStatsTarget.innerHTML = `
        ${this.metricCard("Ocorr\xEAncias abertas", open, "Demandas aguardando manuten\xE7\xE3o")}
        ${this.metricCard("Litros/dia monitorados", `${formatNumber(liters)} L`, "Potencial de desperd\xEDcio em aten\xE7\xE3o")}
        ${this.metricCard("Pontos cr\xEDticos", urgent, "Prioridade alta ou urgente")}
        ${this.metricCard("\xCDndice de resposta", `${responseIndex}%`, "Rela\xE7\xE3o entre abertas e resolvidas")}
      `;
    }
    if (this.hasImpactStatsTarget) {
      this.impactStatsTarget.innerHTML = `
        ${this.impactCell(`${formatNumber(impact.litersPerMonth)} L`, "Litros/m\xEAs estimados")}
        ${this.impactCell(formatCurrency(impact.costPerMonth), "Custo estimado/m\xEAs")}
        ${this.impactCell(String(resolved), "Ocorr\xEAncias resolvidas")}
      `;
    }
  }
  metricCard(label, value, help) {
    return `
      <article class="aqua-metric">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <p>${escapeHtml(help)}</p>
      </article>
    `;
  }
  impactCell(value, label) {
    return `<div class="aqua-impact-cell"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
  }
  renderRecent() {
    if (!this.hasRecentListTarget) return;
    const latest = [...this.occurrences].sort((a, b) => Number(b.criado_em || 0) - Number(a.criado_em || 0)).slice(0, 3);
    if (!latest.length) {
      this.recentListTarget.innerHTML = this.emptyState("Nenhuma ocorr\xEAncia registrada ainda.", "Registre o primeiro ponto de aten\xE7\xE3o h\xEDdrica do campus.");
      return;
    }
    this.recentListTarget.innerHTML = latest.map((item) => `
      <article class="aqua-panel p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <strong class="block text-sm">${escapeHtml(item.local)}</strong>
            <p class="mt-1 text-xs aqua-muted">${escapeHtml(item.tipo_ocorrencia)}</p>
          </div>
          <span class="${badgeClass(item.prioridade)}">${escapeHtml(item.prioridade)}</span>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <span class="aqua-badge aqua-badge-blue">${formatNumber(item.litros_por_dia_estimados)} L/dia</span>
          <span class="${badgeClass(item.status)}">${escapeHtml(item.status)}</span>
        </div>
      </article>
    `).join("");
  }
  renderCampusPreview() {
    if (!this.hasCampusPreviewTarget) return;
    const points = buildMapData(this.occurrences).filter((point) => point.count > 0).sort((a, b) => b.urgent - a.urgent || b.count - a.count || b.liters - a.liters).slice(0, 3);
    if (!points.length) {
      this.campusPreviewTarget.innerHTML = this.emptyState("Mapa pronto para receber dados.", "Os pontos cr\xEDticos aparecem aqui quando houver registros.");
      return;
    }
    this.campusPreviewTarget.innerHTML = points.map((point, index) => {
      const critical = getMostCriticalItem(point.items);
      return `
        <article class="aqua-panel p-4">
          <div class="flex gap-3">
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-aqua-cyan text-sm font-extrabold text-white">${index + 1}</span>
            <div>
              <strong class="block text-sm">${escapeHtml(point.label)}</strong>
              <p class="mt-1 text-xs aqua-muted">${point.count} ocorr\xEAncia(s), ${formatNumber(point.liters)} L/dia</p>
              <small class="mt-2 block text-xs text-aqua-cyan">${critical ? `${escapeHtml(critical.prioridade)} prioridade em ${escapeHtml(shortText(critical.tipo_ocorrencia, 42))}` : "Sem ocorr\xEAncia cr\xEDtica"}</small>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }
  renderPanel() {
    const filtered = this.filteredOccurrences();
    const total = this.occurrences.length;
    const open = this.occurrences.filter((item) => item.status !== "Resolvido").length;
    const critical = this.occurrences.filter((item) => ["Urgente", "Alta"].includes(item.prioridade)).length;
    const liters = this.occurrences.reduce((sum, item) => sum + Number(item.litros_por_dia_estimados || 0), 0);
    if (this.hasStatsTarget) {
      this.statsTarget.innerHTML = `
        ${this.statCard("Total", total)}
        ${this.statCard("Abertas", open)}
        ${this.statCard("Litros/dia", formatNumber(liters))}
        ${this.statCard("Cr\xEDticas", critical)}
      `;
    }
    if (!this.hasListTarget) return;
    if (!filtered.length) {
      this.listTarget.innerHTML = this.emptyState("Nenhuma ocorr\xEAncia encontrada com estes filtros.", "Ajuste busca, prioridade ou status para ampliar a lista.");
      return;
    }
    this.listTarget.innerHTML = filtered.map((item) => this.occurrenceCard(item)).join("");
  }
  statCard(label, value) {
    return `<div class="aqua-panel p-3 text-center"><strong class="block text-[0.68rem] uppercase tracking-[0.12em] aqua-muted">${escapeHtml(label)}</strong><p class="mt-1 text-lg font-extrabold">${escapeHtml(value)}</p></div>`;
  }
  occurrenceCard(item) {
    const impact = impactFor(item, this.tariffValue);
    return `
      <article class="aqua-card p-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="max-w-2xl">
            <h3 class="text-base font-extrabold">${escapeHtml(item.local)}</h3>
            <p class="mt-1 text-sm aqua-muted">${escapeHtml(item.tipo_ocorrencia)}</p>
            <p class="mt-2 text-sm text-aqua-ink/65">${escapeHtml(shortText(item.descricao, 130))}</p>
          </div>
          <span class="${badgeClass(item.status)}">${escapeHtml(item.status)}</span>
        </div>
        <div class="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <span class="${badgeClass(item.prioridade)}">${escapeHtml(item.prioridade)} prioridade</span>
          <span class="${badgeClass(item.gravidade)}">${escapeHtml(item.gravidade)}</span>
          <span class="aqua-badge aqua-badge-blue">${formatNumber(impact.litersPerDay)} L/dia</span>
          <span class="aqua-badge aqua-badge-green">${formatCurrency(impact.costPerMonth)}/m\xEAs</span>
        </div>
        <div class="mt-4 grid gap-3 rounded-2xl bg-aqua-mint/60 p-3 text-sm md:grid-cols-4">
          <div><span class="block text-xs aqua-muted">Litros/m\xEAs</span><strong>${formatNumber(impact.litersPerMonth)} L</strong></div>
          <div><span class="block text-xs aqua-muted">m\xB3/m\xEAs</span><strong>${formatNumber(impact.cubicMetersPerMonth, 2)} m\xB3</strong></div>
          <div><span class="block text-xs aqua-muted">Custo/ano</span><strong>${formatCurrency(impact.costPerYear)}</strong></div>
          <div><span class="block text-xs aqua-muted">Fonte</span><strong>${escapeHtml(item.fonte_analise)}</strong></div>
        </div>
        <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
          <time class="text-xs aqua-muted" datetime="${formatDatetime(item.criado_em)}">${formatDate(item.criado_em)}</time>
          <select class="aqua-input max-w-56 text-sm font-bold" data-id="${escapeHtml(item.id)}" data-action="change->dashboard#updateStatus" aria-label="Atualizar status da ocorr\xEAncia">
            ${STATUSES.map((status) => `<option ${item.status === status ? "selected" : ""}>${status}</option>`).join("")}
          </select>
        </div>
      </article>
    `;
  }
  filteredOccurrences() {
    const query = normalizeSearch(this.hasSearchTarget ? this.searchTarget.value : "");
    const status = this.hasStatusFilterTarget ? this.statusFilterTarget.value : "";
    const priority = this.hasPriorityFilterTarget ? this.priorityFilterTarget.value : "";
    return this.occurrences.filter((item) => {
      const text = normalizeSearch(`${item.local} ${item.tipo_ocorrencia} ${item.status} ${item.descricao} ${item.gravidade} ${item.prioridade}`);
      const queryOk = !query || text.includes(query);
      const statusOk = !status || item.status === status;
      const priorityOk = !priority || item.prioridade === priority;
      return queryOk && statusOk && priorityOk;
    });
  }
  emptyState(title, text) {
    return `
      <div class="aqua-panel grid min-h-40 place-items-center p-6 text-center">
        <div>
          <img src="/static/assets/brand/06_icon_letter_a_wave.png" alt="" class="mx-auto h-12 w-24 object-contain" />
          <strong class="mt-3 block">${escapeHtml(title)}</strong>
          <p class="mt-2 max-w-md text-sm aqua-muted">${escapeHtml(text)}</p>
        </div>
      </div>
    `;
  }
};

// static/src/controllers/image_preview_controller.js
var MAX_IMAGE_SIZE = 8 * 1024 * 1024;
var ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
var image_preview_controller_default = class extends Controller {
  static targets = ["input", "preview", "previewImage", "removeButton", "error"];
  connect() {
    this.previewUrl = null;
  }
  preview() {
    this.clearError();
    this.revokePreview();
    const file = this.inputTarget.files[0];
    if (!file) {
      this.clear();
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      this.showError("Envie uma imagem JPG, PNG ou WEBP.");
      this.inputTarget.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      this.showError("A imagem deve ter at\xE9 8 MB.");
      this.inputTarget.value = "";
      return;
    }
    this.previewUrl = URL.createObjectURL(file);
    this.previewImageTarget.src = this.previewUrl;
    this.previewTarget.classList.remove("hidden");
    if (this.hasRemoveButtonTarget) this.removeButtonTarget.classList.remove("hidden");
  }
  remove(event) {
    event.preventDefault();
    this.inputTarget.value = "";
    this.clear();
  }
  clear() {
    this.revokePreview();
    this.previewImageTarget.removeAttribute("src");
    this.previewTarget.classList.add("hidden");
    if (this.hasRemoveButtonTarget) this.removeButtonTarget.classList.add("hidden");
  }
  reset() {
    if (this.hasInputTarget) this.inputTarget.value = "";
    this.clear();
  }
  revokePreview() {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = null;
    }
  }
  showError(message) {
    if (!this.hasErrorTarget) return;
    this.errorTarget.textContent = message;
    this.errorTarget.classList.remove("hidden");
  }
  clearError() {
    if (!this.hasErrorTarget) return;
    this.errorTarget.textContent = "";
    this.errorTarget.classList.add("hidden");
  }
};

// static/src/controllers/map_controller.js
var map_controller_default = class extends Controller {
  static targets = ["map", "unavailable", "campusView", "osmView", "campusMarkers", "providerLabel", "modeButton"];
  static values = {
    markerIconUrl: String,
    centerLat: { type: Number, default: DEFAULT_CAMPUS.lat },
    centerLng: { type: Number, default: DEFAULT_CAMPUS.lng },
    zoom: { type: Number, default: DEFAULT_CAMPUS.zoom },
    tariff: { type: Number, default: 71.03 }
  };
  connect() {
    this.occurrences = [];
    this.mode = "osm";
    this.map = null;
    this.layer = null;
  }
  handleScreenChange(event) {
    if (event.detail?.screen === "mapa") {
      this.initMap();
      this.render();
    }
  }
  updateFromEvent(event) {
    this.occurrences = event.detail?.occurrences || [];
    this.render();
  }
  setMode(event) {
    this.mode = event.params.mode || "osm";
    this.modeButtonTargets.forEach((button) => button.classList.toggle("is-active", button.dataset.mapModeParam === this.mode));
    this.osmViewTarget.classList.toggle("hidden", this.mode !== "osm");
    this.campusViewTarget.classList.toggle("hidden", this.mode !== "campus");
    if (this.hasProviderLabelTarget) {
      this.providerLabelTarget.textContent = this.mode === "osm" ? "OpenStreetMap + Leaflet, sem cadastro" : "Mapa oficial UFMS com pontos do MVP";
    }
    if (this.mode === "osm") {
      this.initMap();
      window.setTimeout(() => {
        if (this.map) this.map.invalidateSize();
      }, 120);
    }
    this.render();
  }
  initMap() {
    if (this.map || !this.hasMapTarget) return;
    if (!window.L) {
      this.showUnavailable();
      this.mode = "campus";
      return;
    }
    this.map = L.map(this.mapTarget, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true
    }).setView([this.centerLatValue, this.centerLngValue], this.zoomValue);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(this.map);
    this.layer = L.layerGroup().addTo(this.map);
    if (this.hasUnavailableTarget) this.unavailableTarget.classList.add("hidden");
  }
  showUnavailable() {
    if (this.hasUnavailableTarget) this.unavailableTarget.classList.remove("hidden");
    if (this.hasOsmViewTarget) this.osmViewTarget.classList.add("hidden");
    if (this.hasCampusViewTarget) this.campusViewTarget.classList.remove("hidden");
  }
  render() {
    this.renderCampusMarkers();
    this.renderOsmMarkers();
  }
  renderCampusMarkers() {
    if (!this.hasCampusMarkersTarget) return;
    const data = buildMapData(this.occurrences);
    this.campusMarkersTarget.innerHTML = data.map((point) => {
      const tone = this.toneForPoint(point);
      const color = this.colorForTone(tone);
      const label = point.count || "\u2022";
      return `
        <button class="aqua-campus-marker" style="left:${point.x}%; top:${point.y}%; --aqua-marker-ring:${color}" type="button" title="${escapeHtml(point.label)}">
          ${escapeHtml(label)}
          <small>${escapeHtml(point.label)}</small>
        </button>
      `;
    }).join("");
  }
  renderOsmMarkers() {
    if (!this.map || !window.L || !this.layer) return;
    this.layer.clearLayers();
    const data = buildMapData(this.occurrences);
    const bounds = [];
    data.forEach((point) => {
      const tone = this.toneForPoint(point);
      const color = this.colorForTone(tone);
      const label = point.count || "\u2022";
      const icon = L.divIcon({
        className: "aquaia-marker-icon",
        html: `<div class="aqua-leaflet-marker" style="--aqua-marker-url:url('${this.markerIconUrlValue}');--aqua-marker-ring:${color}"><span>${escapeHtml(label)}</span></div>`,
        iconSize: [46, 46],
        iconAnchor: [23, 23]
      });
      const marker = L.marker([point.lat, point.lng], { icon }).addTo(this.layer);
      marker.bindPopup(this.popupHtml(point));
      bounds.push([point.lat, point.lng]);
    });
    if (bounds.length > 1) {
      this.map.fitBounds(bounds, { padding: [44, 44], maxZoom: 17 });
    } else if (bounds.length === 1) {
      this.map.setView(bounds[0], Math.max(this.map.getZoom(), 16));
    }
  }
  popupHtml(point) {
    const critical = getMostCriticalItem(point.items);
    const dominantStatus = getDominantStatus(point.items);
    const impact = impactFor({ litros_por_dia_estimados: point.liters }, this.tariffValue);
    const itemsHtml = point.items.length ? point.items.slice(0, 3).map((item) => `
          <small class="block">
            <b>${escapeHtml(shortText(item.local, 42))}</b>
            <span>${escapeHtml(item.tipo_ocorrencia)} \xB7 ${escapeHtml(item.prioridade)} \xB7 ${formatNumber(item.litros_por_dia_estimados)} L/dia</span>
          </small>
        `).join("") : "<small>Sem ocorr\xEAncias cadastradas neste ponto.</small>";
    return `
      <div class="min-w-52 font-sans">
        <strong class="block text-sm">${escapeHtml(point.label)}</strong>
        <p class="mt-1 text-xs text-aqua-ink/65">${point.count} ocorr\xEAncia(s) mapeada(s)</p>
        <p class="text-xs text-aqua-ink/65">${formatNumber(point.liters)} L/dia \xB7 ${formatCurrency(impact.costPerMonth)}/m\xEAs</p>
        <p class="text-xs text-aqua-ink/65">Mais cr\xEDtica: ${critical ? `${escapeHtml(critical.prioridade)} \xB7 ${escapeHtml(shortText(critical.tipo_ocorrencia, 44))}` : "Sem ocorr\xEAncias"}</p>
        <p class="text-xs text-aqua-ink/65">Status predominante: ${escapeHtml(dominantStatus)}</p>
        <div class="mt-2 grid gap-1 text-xs">${itemsHtml}</div>
      </div>
    `;
  }
  toneForPoint(point) {
    if (!point.count) return "institutional";
    if (point.urgent > 0) return "red";
    if (point.count > 1) return "orange";
    return "blue";
  }
  colorForTone(tone) {
    if (tone === "red") return "#E5483F";
    if (tone === "orange") return "#F59E0B";
    if (tone === "institutional") return "#238689";
    return "#25C5E9";
  }
};

// static/src/controllers/nav_controller.js
var nav_controller_default = class extends Controller {
  static targets = ["screen", "tab", "mobileMenu", "mobileButton"];
  connect() {
    this.showScreen("dashboard");
  }
  show(event) {
    const screen = event.currentTarget.dataset.screen;
    if (!screen) return;
    this.showScreen(screen);
  }
  showScreen(screen) {
    this.screenTargets.forEach((target) => {
      target.classList.toggle("is-active", target.id === screen);
    });
    this.tabTargets.forEach((target) => {
      target.classList.toggle("is-active", target.dataset.screen === screen);
    });
    this.closeMenu();
    window.dispatchEvent(new CustomEvent("aquaia:screen-changed", { detail: { screen } }));
  }
  toggleMenu() {
    if (!this.hasMobileMenuTarget) return;
    const isOpen = this.mobileMenuTarget.classList.toggle("hidden") === false;
    if (this.hasMobileButtonTarget) this.mobileButtonTarget.setAttribute("aria-expanded", String(isOpen));
  }
  closeMenu() {
    if (this.hasMobileMenuTarget) this.mobileMenuTarget.classList.add("hidden");
    if (this.hasMobileButtonTarget) this.mobileButtonTarget.setAttribute("aria-expanded", "false");
  }
  closeOnEscape(event) {
    if (event.key === "Escape") this.closeMenu();
  }
};

// static/src/controllers/occurrence_form_controller.js
var occurrence_form_controller_default = class extends Controller {
  static targets = ["form", "submitButton", "resultCard", "result", "status", "requiredField", "counter"];
  static values = {
    endpoint: { type: String, default: "/api/ocorrencias" },
    tariff: { type: Number, default: 71.03 }
  };
  connect() {
    this.resetCounter();
  }
  async submit(event) {
    event.preventDefault();
    if (!this.validateRequiredFields()) return;
    this.setLoading(true);
    this.setStatus("Enviando ocorr\xEAncia para an\xE1lise...");
    try {
      const response = await fetch(this.endpointValue, {
        method: "POST",
        body: new FormData(this.formTarget)
      });
      const payload = await this.parseJson(response);
      if (!response.ok) {
        throw new Error(payload.erro || "N\xE3o foi poss\xEDvel registrar a ocorr\xEAncia.");
      }
      this.renderAnalysis(payload);
      this.formTarget.reset();
      this.resetCounter();
      window.dispatchEvent(new CustomEvent("aquaia:form-reset"));
      window.dispatchEvent(new CustomEvent("aquaia:occurrence-created", { detail: { occurrence: payload } }));
      window.dispatchEvent(new CustomEvent("aquaia:toast", { detail: { message: "Ocorr\xEAncia registrada e analisada." } }));
      this.setStatus("Ocorr\xEAncia registrada com sucesso.");
    } catch (error2) {
      this.setStatus(error2.message, true);
      window.dispatchEvent(new CustomEvent("aquaia:toast", { detail: { message: error2.message } }));
    } finally {
      this.setLoading(false);
    }
  }
  countDescription(event) {
    if (!this.hasCounterTarget) return;
    const maxLength = Number(event.currentTarget.getAttribute("maxlength") || 600);
    const currentLength = String(event.currentTarget.value || "").length;
    this.counterTarget.textContent = `${currentLength}/${maxLength}`;
  }
  resetCounter() {
    if (this.hasCounterTarget) this.counterTarget.textContent = "0/600";
  }
  async parseJson(response) {
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch (_error) {
      return { erro: "Resposta inesperada do servidor." };
    }
  }
  validateRequiredFields() {
    const missing = this.requiredFieldTargets.find((field) => !String(field.value || "").trim());
    if (!missing) return true;
    missing.focus();
    this.setStatus("Preencha local, ambiente e descri\xE7\xE3o antes de enviar.", true);
    return false;
  }
  setLoading(isLoading) {
    if (!this.hasSubmitButtonTarget) return;
    this.submitButtonTarget.disabled = isLoading;
    this.submitButtonTarget.textContent = isLoading ? "Analisando..." : "Analisar ocorr\xEAncia";
  }
  setStatus(message, isError = false) {
    if (!this.hasStatusTarget) return;
    this.statusTarget.textContent = message;
    this.statusTarget.classList.toggle("text-red-700", isError);
    this.statusTarget.classList.toggle("text-aqua-cyan", !isError);
  }
  renderAnalysis(data) {
    if (!this.hasResultTarget || !this.hasResultCardTarget) return;
    const impact = impactFor(data, this.tariffValue);
    const observation = data.observacao_tecnica ? `<div class="aqua-panel p-4"><strong class="text-sm">Observa\xE7\xE3o t\xE9cnica</strong><p class="mt-1 text-sm aqua-muted">${escapeHtml(data.observacao_tecnica)}</p></div>` : "";
    this.resultTarget.innerHTML = `
      <div class="grid gap-4">
        <div class="aqua-panel p-4">
          <span class="text-xs font-extrabold uppercase tracking-[0.14em] text-aqua-cyan">Classifica\xE7\xE3o</span>
          <h3 class="mt-2 text-xl font-extrabold">${escapeHtml(data.tipo_ocorrencia)}</h3>
          <p class="mt-2 text-sm aqua-muted">${escapeHtml(data.justificativa)}</p>
        </div>
        <div class="grid gap-3 md:grid-cols-4">
          <div class="aqua-panel p-4"><span class="text-xs aqua-muted">Gravidade</span><strong class="${badgeClass(data.gravidade)} mt-2">${escapeHtml(data.gravidade)}</strong></div>
          <div class="aqua-panel p-4"><span class="text-xs aqua-muted">Prioridade</span><strong class="${badgeClass(data.prioridade)} mt-2">${escapeHtml(data.prioridade)}</strong></div>
          <div class="aqua-panel p-4"><span class="text-xs aqua-muted">Litros/dia</span><strong class="mt-2 block text-lg">${formatNumber(impact.litersPerDay)} L</strong></div>
          <div class="aqua-panel p-4"><span class="text-xs aqua-muted">Fonte</span><strong class="mt-2 block text-sm">${escapeHtml(data.fonte_analise)}</strong></div>
        </div>
        <div class="aqua-panel p-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <strong>Como calculamos o impacto</strong>
              <p class="mt-1 text-xs aqua-muted">${escapeHtml(WATER_TARIFF_LABEL)}. Estimativa inicial para triagem.</p>
            </div>
            <span class="${badgeClass(data.confianca)}">${escapeHtml(data.confianca)} confian\xE7a</span>
          </div>
          <div class="mt-4 grid gap-2 md:grid-cols-5">
            <div class="rounded-2xl bg-white p-3 text-sm"><span class="block text-xs aqua-muted">Par\xE2metro</span><strong>${formatNumber(impact.litersPerDay)} L/dia</strong></div>
            <div class="rounded-2xl bg-white p-3 text-sm"><span class="block text-xs aqua-muted">Litros/m\xEAs</span><strong>${formatNumber(impact.litersPerMonth)} L</strong></div>
            <div class="rounded-2xl bg-white p-3 text-sm"><span class="block text-xs aqua-muted">m\xB3/m\xEAs</span><strong>${formatDecimal(impact.cubicMetersPerMonth)} m\xB3</strong></div>
            <div class="rounded-2xl bg-white p-3 text-sm"><span class="block text-xs aqua-muted">Custo/m\xEAs</span><strong>${formatCurrency(impact.costPerMonth)}</strong></div>
            <div class="rounded-2xl bg-white p-3 text-sm"><span class="block text-xs aqua-muted">Custo/ano</span><strong>${formatCurrency(impact.costPerYear)}</strong></div>
          </div>
        </div>
        <div class="aqua-panel p-4">
          <strong>Sugest\xE3o de a\xE7\xE3o</strong>
          <p class="mt-2 text-sm aqua-muted">${escapeHtml(data.acao_sugerida)}</p>
        </div>
        ${observation}
      </div>
    `;
    this.resultCardTarget.classList.remove("hidden");
    this.resultCardTarget.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

// static/src/controllers/toast_controller.js
var toast_controller_default = class extends Controller {
  static targets = ["message"];
  connect() {
    this.timeout = null;
  }
  show(event) {
    const message = event.detail?.message || "Opera\xE7\xE3o conclu\xEDda.";
    this.messageTarget.textContent = message;
    this.element.classList.remove("hidden");
    window.clearTimeout(this.timeout);
    this.timeout = window.setTimeout(() => this.hide(), 3600);
  }
  hide() {
    this.element.classList.add("hidden");
  }
};

// static/src/app.js
window.Stimulus = Application.start();
Stimulus.register("dashboard", dashboard_controller_default);
Stimulus.register("image-preview", image_preview_controller_default);
Stimulus.register("map", map_controller_default);
Stimulus.register("nav", nav_controller_default);
Stimulus.register("occurrence-form", occurrence_form_controller_default);
Stimulus.register("toast", toast_controller_default);
//# sourceMappingURL=app.js.map
