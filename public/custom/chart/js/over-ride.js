// Wait for the minified App to load
function extendApp() {
    if (typeof App !== 'undefined') {
        App.prototype.openGenerateDialog = function (prompt) {
            if (this.chatWindow == null) {
                this.chatWindow = new ChatWindow(this, 224, 104, 280, 320);
                this.chatWindow.window.addListener('show', mxUtils.bind(this, function () {
                    this.fireEvent(new mxEventObject('chat'));
                }));
                this.chatWindow.window.addListener('hide', function () {
                    this.fireEvent(new mxEventObject('chat'));
                });
                this.chatWindow.window.setVisible(true);
                this.fireEvent(new mxEventObject('chat'));
            }
            else {
                this.chatWindow.window.setVisible(true);
            }

            if (prompt != null) {
                this.chatWindow.generate(prompt);
            }
        };


        var ChatWindow = function (editorUi, x, y, w, h) {
            var graph = editorUi.editor.graph;
            console.log("ffffffffffffffffffffffffffffffffff");
            var div = document.createElement('div');
            div.style.display = 'flex';
            div.style.flexDirection = 'column';
            div.style.overflow = 'hidden';
            div.style.height = '100%';
            div.style.padding = '10px 12px 20px 12px';
            div.style.boxSizing = 'border-box';

            mxEvent.addGestureListeners(div, mxUtils.bind(this, function (evt) {
                if (editorUi.sidebar != null) {
                    editorUi.sidebar.hideTooltip();
                }
            }), null, null);

            var hist = document.createElement('div');
            hist.style.flexGrow = '1';
            hist.style.overflow = 'auto';
            hist.style.fontSize = '12px';
            hist.style.marginRight = '-8px';
            hist.style.paddingRight = '8px';

            mxEvent.addListener(hist, 'scroll', function () {
                if (editorUi.sidebar != null) {
                    editorUi.sidebar.hideTooltip();
                }
            });

            div.appendChild(hist);

            var user = document.createElement('div');
            user.style.borderRadius = '20px';
            user.style.backgroundColor = 'light-dark(#e0e0e0, #3a3a3a)';
            user.style.padding = '8px';
            user.style.marginTop = '8px';

            var options = document.createElement('div');
            options.style.display = 'flex';
            options.style.gap = '6px';
            options.style.paddingRight = '8px';
            options.style.justifyContent = 'start';

            var typeSelect = document.createElement('select');
            typeSelect.style.borderColor = 'transparent';
            typeSelect.style.textOverflow = 'ellipsis';
            typeSelect.style.padding = '5px';
            typeSelect.style.minWidth = '0';

            var createPublicOption = document.createElement('option');

            if (typeof mxMermaidToDrawio !== 'undefined' && window.isMermaidEnabled &&
                mxUtils.indexOf(Editor.aiActions, 'createPublic') >= 0) {
                createPublicOption.setAttribute('value', 'createPublic');
                mxUtils.write(createPublicOption, mxResources.get('create') +
                    ' (' + mxResources.get('draw.io') + ')');
                typeSelect.appendChild(createPublicOption);
            }

            var includeOption = document.createElement('option');
            var selectionOption = document.createElement('option');
            var createOption = document.createElement('option');
            var helpOption = document.createElement('option');

            if (typeof mxMermaidToDrawio !== 'undefined' && window.isMermaidEnabled &&
                mxUtils.indexOf(Editor.aiActions, 'create') >= 0) {
                createOption.setAttribute('value', 'create');
                mxUtils.write(createOption, mxResources.get('create'));
                typeSelect.appendChild(createOption);
            }

            if (mxUtils.indexOf(Editor.aiActions, 'update') >= 0) {
                includeOption.setAttribute('value', 'includeCopyOfMyDiagram');
                mxUtils.write(includeOption, mxResources.get('includeCopyOfMyDiagram'));
                typeSelect.appendChild(includeOption);

                selectionOption.setAttribute('value', 'selectionOnly');
                mxUtils.write(selectionOption, mxResources.get('selectionOnly'));
                typeSelect.appendChild(selectionOption);
            }

            if (mxUtils.indexOf(Editor.aiActions, 'assist') >= 0) {
                helpOption.setAttribute('value', 'assist');
                mxUtils.write(helpOption, mxResources.get('help'));
                typeSelect.appendChild(helpOption);
            }

            // Adds a drop down for selecting the model from Editor.aiModels
            var modelSelect = typeSelect.cloneNode(false);

            // Lists AI models with valid config and key
            for (var i = 0; i < Editor.aiModels.length; i++) {
                var model = Editor.aiModels[i];

                if (Editor.aiConfigs[model.config] && Editor.aiGlobals[
                    Editor.aiConfigs[model.config].apiKey] != null) {

                    console.log('ddddddddddddddddddddddddddddddddd');
                    var modelOption = document.createElement('option');
                    modelOption.setAttribute('value', model.name);
                    mxUtils.write(modelOption, model.name);
                    modelSelect.appendChild(modelOption);
                }
            }

            var publicChat = modelSelect.children.length == 0;
            var inner = document.createElement('div');
            inner.style.whiteSpace = 'nowrap';
            inner.style.textOverflow = 'clip';
            inner.style.cursor = 'default';

            var inp = document.createElement('input');
            inp.setAttribute('type', 'text');
            inp.style.width = '100%';
            inp.style.outline = 'none';
            inp.style.border = 'none';
            inp.style.background = 'transparent';
            inp.style.padding = '6px 30px 6px 10px';
            inp.style.boxSizing = 'border-box';
            inner.appendChild(inp);

            var sendImg = document.createElement('img');
            sendImg.setAttribute('src', Editor.sendImage);
            sendImg.setAttribute('title', mxResources.get('sendMessage'));
            sendImg.className = 'geAdaptiveAsset';
            sendImg.style.position = 'relative';
            sendImg.style.cursor = 'pointer';
            sendImg.style.opacity = '0.5';
            sendImg.style.height = '19px';
            sendImg.style.left = '-28px';
            sendImg.style.top = '5px';
            inner.appendChild(sendImg);
            user.appendChild(inner);

            if (!publicChat) {
                if (urlParams['test'] != 1) {
                    createPublicOption.parentNode.removeChild(createPublicOption);
                }

                options.appendChild(typeSelect);

                if (modelSelect.children.length > 1) {
                    options.appendChild(modelSelect);
                }

                user.appendChild(options);
            }

            if (typeSelect.children.length > 0) {
                typeSelect.value = typeSelect.children[0].value;
            }

            var ignoreChange = false;
            var lastType = typeSelect.value;

            var updateDropdowns = function () {
                inp.setAttribute('placeholder', mxResources.get(
                    (typeSelect.value == 'create' ||
                        typeSelect.value == 'createPublic') ?
                        'describeYourDiagram' :
                        'askMeAnything'));
            };

            updateDropdowns();

            function typeChanged() {
                if (!ignoreChange) {
                    lastType = typeSelect.value;
                    updateDropdowns();
                }

                modelSelect.style.display =
                    (typeSelect.value == 'createPublic') ?
                        'none' : '';
            };

            mxEvent.addListener(typeSelect, 'change', typeChanged);
            typeChanged();

            function updateType() {
                ignoreChange = true;
                typeSelect.value = lastType;

                if (graph.isSelectionEmpty()) {
                    selectionOption.setAttribute('disabled', 'disabled');

                    if (typeSelect.value == 'selectionOnly') {
                        typeSelect.value = 'includeCopyOfMyDiagram';
                    }
                }
                else {
                    selectionOption.removeAttribute('disabled');
                }

                if (editorUi.isDiagramEmpty()) {
                    includeOption.setAttribute('disabled', 'disabled');

                    if (typeSelect.value == 'includeCopyOfMyDiagram') {
                        typeSelect.value = 'help';
                    }
                }
                else {
                    includeOption.removeAttribute('disabled');
                }

                ignoreChange = false;
            };

            graph.selectionModel.addListener(mxEvent.CHANGE, updateType);
            graph.getModel().addListener(mxEvent.CHANGE, updateType);
            updateType();

            function createBubble() {
                var bubble = document.createElement('div');
                bubble.style.textAlign = 'left';
                bubble.style.padding = '6px';
                bubble.style.margin = '6px 0';

                return bubble;
            }

            function addBubble(text) {
                var bubble = createBubble();
                mxUtils.write(bubble, text);
                hist.appendChild(bubble);

                return bubble;
            };

            function addMessage(prompt) {
                var elts = [];
                var bubble = addBubble(prompt);
                elts.push(bubble);

                bubble.style.marginBottom = '2px';
                bubble.style.marginLeft = '40%';
                bubble.style.borderRadius = '10px';
                bubble.style.backgroundColor = 'light-dark(#e0e0e0, #3a3a3a)';

                var buttons = document.createElement('div');
                buttons.className = 'geInlineButtons';
                buttons.style.display = 'flex';
                buttons.style.justifyContent = 'end';
                elts.push(buttons);

                var btn = document.createElement('img');
                btn.className = 'geAdaptiveAsset geLibraryButton';
                btn.setAttribute('src', Editor.trashImage);
                btn.setAttribute('title', mxResources.get('remove'));
                buttons.appendChild(btn);

                mxEvent.addListener(btn, 'click', mxUtils.bind(this, function (evt) {
                    if (mxEvent.isShiftDown(evt)) {
                        hist.innerHTML = '';
                    }
                    else {
                        // Removes all elements in elts from their parent
                        for (var i = 0; i < elts.length; i++) {
                            if (elts[i].parentNode != null) {
                                elts[i].parentNode.removeChild(elts[i]);
                            }
                        }

                        elts = [];
                    }
                }));

                btn = btn.cloneNode();
                btn.setAttribute('src', Editor.copyImage);
                btn.setAttribute('title', mxResources.get('copy'));
                mxEvent.addListener(btn, 'click', mxUtils.bind(this, function () {
                    editorUi.writeTextToClipboard(prompt, mxUtils.bind(this, function (e) {
                        editorUi.handleError(e);
                    }), function () {
                        editorUi.alert(mxResources.get('copiedToClipboard'));
                    });
                }));
                buttons.appendChild(btn);

                btn = btn.cloneNode();
                btn.setAttribute('src', Editor.editImage);
                btn.setAttribute('title', mxResources.get('edit'));
                buttons.appendChild(btn);

                mxEvent.addListener(btn, 'click', mxUtils.bind(this, function () {
                    inp.value = prompt;
                    inp.focus();

                    if (mxClient.IS_GC || mxClient.IS_FF || document.documentMode >= 5) {
                        inp.select();
                    }
                    else {
                        document.execCommand('selectAll', false, null);
                    }
                }));

                hist.appendChild(buttons);

                var waiting = addBubble('');
                waiting.className = 'geSidebar';
                waiting.style.marginTop = '2px';

                function createRetryButton(title) {
                    var buttons = document.createElement('div');
                    buttons.style.display = 'flex';

                    var btn = document.createElement('img');
                    btn.className = 'geAdaptiveAsset geLibraryButton';
                    btn.setAttribute('src', Editor.refreshImage);
                    btn.setAttribute('title', (title != null) ? title : mxResources.get('tryAgain'));
                    buttons.appendChild(btn);
                    mxEvent.addListener(btn, 'click', processMessage);

                    return buttons;
                };

                function parseAIMarkup(text) {
                    return mxUtils.htmlEntities(text, false)
                        // Headings (consume surrounding newlines)
                        .replace(/\n*^##### (.+)$\n*/gm, '<h5>$1</h5>')
                        .replace(/\n*^#### (.+)$\n*/gm, '<h4>$1</h4>')
                        .replace(/\n*^### (.+)$\n*/gm, '<h3>$1</h3>')
                        .replace(/\n*^## (.+)$\n*/gm, '<h2>$1</h2>')
                        .replace(/\n*^# (.+)$\n*/gm, '<h1>$1</h1>')
                        // Bold
                        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                        // Italic
                        .replace(/\*(.+?)\*/g, '<em>$1</em>')
                        // Inline code
                        .replace(/`([^`]+)`/g, '<code>$1</code>')
                };

                function createDivForText(text) {
                    var wrapper = document.createElement('div');
                    wrapper.style.whiteSpace = 'pre-wrap';
                    wrapper.innerHTML = Graph.sanitizeHtml(parseAIMarkup(text));

                    return wrapper;
                };

                function createError(message) {
                    var title = mxResources.get('error') + ': ';
                    var wrapper = document.createElement('div');
                    wrapper.style.whiteSpace = 'pre-wrap';

                    if (message.substring(0, title.length) != title) {
                        message = title + message;
                    }

                    mxUtils.write(wrapper, message);
                    wrapper.appendChild(createRetryButton());

                    return wrapper;
                };

                var handleError = mxUtils.bind(this, function (e) {
                    waiting.innerHTML = '';
                    waiting.appendChild(createError(e.message));
                    waiting.scrollIntoView({
                        behavior: 'smooth',
                        block: 'end', inline: 'nearest'
                    });
                    EditorUi.debug('EditorUi.ChatWindow.handleError',
                        'error', e);

                    if (window.console != null) {
                        console.error(e);
                    }
                });

                var page = editorUi.currentPage;
                var theModel = modelSelect.value;
                var type = typeSelect.value;
                var aiModel = null;

                for (var i = 0; i < Editor.aiModels.length; i++) {
                    var model = Editor.aiModels[i];

                    if (model.name == theModel) {
                        aiModel = model;
                        break;
                    }
                }

                if (type != 'createPublic' && (aiModel == null ||
                    Editor.aiConfigs[aiModel.config] == null)) {
                    handleError({ message: mxResources.get('invalidCallFnNotFound', [theModel]) });

                    return;
                }

                var config = (aiModel != null) ? Editor.aiConfigs[aiModel.config] : null;
                var thePrompt = prompt;
                var sentModel = null;
                var t0 = Date.now();
                var data = null;
                var xml = null;

                if (type == 'includeCopyOfMyDiagram' || type == 'selectionOnly') {
                    var enc = new mxCodec(mxUtils.createXmlDocument());

                    // Ignores unselected cells
                    if (type == 'selectionOnly') {
                        enc.isObjectIgnored = function (obj) {
                            return obj.constructor == mxCell &&
                                (!graph.model.isRoot(obj) &&
                                    !graph.model.isLayer(obj) &&
                                    !graph.isCellSelected(obj) &&
                                    !graph.isAncestorSelected(obj));
                        };
                    }

                    xml = enc.encode(graph.getModel());

                    // Sets xml.ownerDocument.documentElement == xml so
                    // that forward references work correctly
                    xml.ownerDocument.appendChild(xml);
                    data = mxUtils.getXml(xml);
                }

                var resolver = function (name) {
                    var value = null;

                    if (name == 'prompt') {
                        value = thePrompt;
                    }
                    else if (name == 'data' && xml != null) {
                        value = data;
                    }
                    else if (name == 'model') {
                        value = aiModel.model;
                    }
                    else if (name == 'apiKey') {
                        name = config.apiKey;
                    }
                    else if (name == 'action') {
                        if (type == 'selectionOnly' || type == 'includeCopyOfMyDiagram') {
                            name = 'update';
                        }
                        else {
                            name = type;
                        }
                    }

                    if (value == null) {
                        value = Editor.replacePlaceholders(Editor.aiGlobals[name], resolver);
                    }

                    return value;
                };

                // Clones all properties of the given object and replaces
                // placeholders in string properties recursively
                var populateTemplate = function (obj, result) {
                    if (result == null) {
                        result = new obj.constructor();
                    }

                    for (var key in obj) {
                        var value = obj[key];

                        if (typeof value === 'object') {
                            result[key] = populateTemplate(value);
                        }
                        else if (typeof value === 'string') {
                            result[key] = Editor.replacePlaceholders(value, resolver);
                        }
                        else {
                            result[key] = value;
                        }
                    }

                    return result;
                };

                var params = (config != null) ? populateTemplate(config.request) : null;

                var processMessage = mxUtils.bind(this, function () {
                    waiting.innerHTML = '';
                    elts.push(waiting);

                    var wrapper = document.createElement('div');
                    wrapper.style.display = 'flex';
                    wrapper.style.alignItems = 'center';
                    mxUtils.write(wrapper, mxResources.get('loading') + '...');

                    var img = document.createElement('img');
                    img.className = 'geAdaptiveAsset';
                    img.setAttribute('src', Editor.svgSpinImage);
                    img.style.width = '16px';
                    img.style.height = '16px';
                    img.style.marginLeft = '6px';
                    wrapper.appendChild(img);
                    waiting.appendChild(wrapper);

                    waiting.scrollIntoView({
                        behavior: 'smooth',
                        block: 'end', inline: 'nearest'
                    });

                    var handleResponse = mxUtils.bind(this, function (data, prompt) {
                        var dt = Date.now() - t0;
                        EditorUi.debug('EditorUi.ChatWindow.handleResponse',
                            'data', data, 'prompt', [prompt], 'time', dt);
                        var cells = null;

                        if (data != null && data.length > 1 && data[1].length > 0) {
                            try {
                                cells = editorUi.stringToCells(data[1]);
                            }
                            catch (e) {
                                throw new Error(e.toString() + '\n\n' + data[1]);
                            }
                        }

                        if (cells != null && cells.length > 0) {
                            var bbox = graph.getBoundingBoxFromGeometry(cells);
                            editorUi.sidebar.graph.moveCells(cells, -bbox.x, -bbox.y);

                            var clickFn = mxUtils.bind(this, function (e) {
                                console.log('Image clicked');
                                if (editorUi.sidebar != null) {
                                    editorUi.sidebar.hideTooltip();
                                }

                                if (xml != null && sentModel == null) {
                                    var dec = new mxCodec(xml.ownerDocument);
                                    sentModel = new mxGraphModel();
                                    dec.decode(xml, sentModel);
                                }

                                graph.model.beginUpdate();
                                try {
                                    if (sentModel != null && page != null &&
                                        editorUi.getPageIndex(page) != null) {
                                        editorUi.selectPage(page);
                                        var doc = mxUtils.parseXml(data[1]);
                                        var codec = new mxCodec(doc);
                                        var receivedModel = new mxGraphModel();
                                        codec.decode(doc.documentElement, receivedModel);

                                        // Creates a diff of the sent and recevied diagram
                                        // to patch the current page and not lose changes
                                        var patch = editorUi.diffCells(
                                            sentModel.root, receivedModel.root);
                                        console.log('Diagram added via patchPage');
                                        editorUi.patchPage(page, patch, null, true);
                                        EditorUi.debug('EditorUi.ChatWindow.handleResponse',
                                            'sentModel', sentModel, 'receivedModel', receivedModel,
                                            'patch', patch);
                                    }
                                    else {
                                        var pt = graph.getFreeInsertPoint();
                                        console.log('Diagram added via importCells at point', pt);
                                        graph.setSelectionCells(graph.importCells(
                                            cells, pt.x, pt.y));
                                        EditorUi.debug('EditorUi.ChatWindow.handleResponse',
                                            'cells', graph.getSelectionCell());
                                    }
                                }
                                finally {
                                    graph.model.endUpdate();
                                }

                                graph.scrollCellToVisible(graph.getSelectionCell());
                                mxEvent.consume(e);
                            });

                            waiting.innerHTML = '';
                            bubble = waiting;

                            if (data[0].length > 0) {
                                bubble.appendChild(createDivForText(data[0]));
                            }

                            if (data[1].length > 0) {
                                var svg = editorUi.getSvgForXml(data[1]);
                                svg.style.overflow = 'visible';
                                svg.style.padding = '1px';
                                svg.style.cursor = 'move';
                                svg.style.width = '160px';
                                svg.style.height = 'auto';
                                svg.style.maxHeight = '460px';

                                var item = document.createElement('a');
                                item.className = 'geItem';
                                item.style.padding = '4px';
                                item.style.borderRadius = '10px';
                                item.appendChild(svg);
                                bubble.appendChild(item);
                                editorUi.sidebar.createItem(cells, prompt, true, true, bbox.width, bbox.height,
                                    true, true, clickFn, null, null, null, null, null, item);

                                if (!publicChat && type != 'createPublic' && urlParams['test'] == 1) {
                                    item.setAttribute('title', theModel + ' (' + dt + ' ms)');
                                }

                                var buttons = document.createElement('div');
                                buttons.style.display = 'flex';

                                var btn = document.createElement('img');
                                btn.className = 'geAdaptiveAsset geLibraryButton';
                                btn.setAttribute('src', Editor.refreshImage);
                                btn.setAttribute('title', mxResources.get('refresh'));
                                buttons.appendChild(btn);
                                mxEvent.addListener(btn, 'click', processMessage);

                                if (editorUi.getServiceName() == 'draw.io') {
                                    btn = btn.cloneNode();
                                    btn.setAttribute('src', Editor.shareImage);
                                    btn.setAttribute('title', mxResources.get(!editorUi.isStandaloneApp() ?
                                        'openInNewWindow' : 'export'));
                                    buttons.appendChild(btn);

                                    mxEvent.addListener(btn, 'click', mxUtils.bind(this, function (evt) {
                                        if (!editorUi.isStandaloneApp()) {
                                            editorUi.editor.editAsNew(data[1]);
                                        }
                                        else {
                                            editorUi.saveData('export.xml', 'xml', data[1], 'text/xml');
                                        }
                                    }));
                                }

                                btn = btn.cloneNode();
                                btn.setAttribute('src', Editor.magnifyImage);
                                btn.setAttribute('title', mxResources.get('preview'));
                                buttons.appendChild(btn);

                                mxEvent.addListener(btn, 'click', mxUtils.bind(this, function (evt) {
                                    console.log('Preview button clicked');
                                    var ww = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
                                    var wh = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

                                    editorUi.sidebar.createTooltip(bubble, cells, Math.min(ww - 120, 1600), Math.min(wh - 120, 1200),
                                        prompt, true, new mxPoint(mxEvent.getClientX(evt), mxEvent.getClientY(evt)), true, function () {
                                            wasVisible = editorUi.sidebar.tooltip != null &&
                                                editorUi.sidebar.tooltip.style.display != 'none';
                                        }, true, false);
                                }));

                                btn = btn.cloneNode();

                                if (xml != null && page != null &&
                                    editorUi.getPageIndex(page) != null) {
                                    btn.setAttribute('src', Editor.checkImage);
                                    btn.setAttribute('title', mxResources.get('apply'));
                                }
                                else {
                                    btn.setAttribute('src', Editor.plusImage);
                                    btn.setAttribute('title', mxResources.get('insert'));
                                }

                                buttons.appendChild(btn);
                                mxEvent.addListener(btn, 'click', clickFn);
                                bubble.appendChild(buttons);
                            }

                            if (data[2].length > 0) {
                                bubble.appendChild(createDivForText(data[2]));
                            }
                        }
                        else {
                            waiting.innerHTML = '';
                            bubble = waiting;
                            waiting.scrollIntoView({
                                behavior: 'smooth',
                                block: 'end', inline: 'nearest'
                            });

                            if (data == null) {
                                mxUtils.write(bubble, mxResources.get('errShowingDiag'));
                            }
                            else {
                                bubble.style.whiteSpace = 'pre-wrap';
                                bubble.appendChild(createDivForText(data[0]));
                                bubble.appendChild(createDivForText(data[2]));
                                bubble.appendChild(createRetryButton(mxResources.get('refresh')));
                            }
                        }

                        bubble.scrollIntoView({
                            behavior: 'smooth',
                            block: 'end', inline: 'nearest'
                        });
                    });
                    console.log(publicChat, type, thePrompt);
                    if (publicChat || type == 'createPublic') {
                        editorUi.generateOpenAiMermaidDiagram(thePrompt, function (xml) {
                            handleResponse(['', xml, ''], thePrompt);
                        }, handleError, true);
                    }
                    else {
                        editorUi.createTimeout(editorUi.editor.generateTimeout, mxUtils.bind(this, function (timeout) {
                            var handleErrorWithTimeout = mxUtils.bind(this, function (e) {
                                timeout.clear();
                                handleError(e);
                            });

                            var url = Editor.replacePlaceholders(config.endpoint, resolver);
                            var req = new mxXmlRequest(url, JSON.stringify(params), 'POST');

                            req.setRequestHeaders = mxUtils.bind(this, function (request, params) {
                                request.setRequestHeader('Content-Type', 'application/json');

                                for (var key in config.requestHeaders) {
                                    request.setRequestHeader(key, Editor.replacePlaceholders(
                                        config.requestHeaders[key], resolver));
                                }
                            });

                            EditorUi.debug('EditorUi.ChatWindow.addMessage send', 'url', url,
                                'params', params, 'aiModel', aiModel, 'config', config);

                            req.send(mxUtils.bind(this, function (req) {
                                if (timeout.clear()) {
                                    try {
                                        if (req.getStatus() >= 200 && req.getStatus() <= 299) {
                                            var response = JSON.parse(req.getText());

                                            console.log(response, config.responsePath);
                                            var result = Editor.executeSimpleJsonPath(response, config.responsePath);

                                            var text = mxUtils.trim((result.length > 0) ? result[0] : req.getText());
                                            var mermaid = editorUi.extractMermaidDeclaration(text);
                                            EditorUi.debug('EditorUi.ChatWindow.addMessage response',
                                                'params', params, 'response', response,
                                                'text', [text], 'mermaid', [mermaid]);

                                            if (mermaid == null) {
                                                console.log(mermaid, 'mermaid not found');
                                                handleResponse(Editor.extractGraphModelFromText(text), thePrompt);
                                            }
                                            else {
                                                console.log(mermaid, 'mermaid');
                                                editorUi.parseMermaidDiagram(mermaid, null, mxUtils.bind(this, function (xml) {
                                                    handleResponse(['', xml, ''], thePrompt);
                                                }), mxUtils.bind(this, function (e) {
                                                    handleErrorWithTimeout(e);
                                                }), null, true);
                                            }
                                        }
                                        else {
                                            var result = 'Error: ' + req.getStatus();

                                            try {
                                                var resp = JSON.parse(req.getText());

                                                if (resp != null && resp.error != null &&
                                                    resp.error.message != null) {
                                                    result = resp.error.message;
                                                }
                                            }
                                            catch (e) {
                                                // ignore
                                            }

                                            waiting.innerHTML = '';
                                            mxUtils.write(waiting, result);
                                            waiting.scrollIntoView(
                                                {
                                                    behavior: 'smooth', block: 'end',
                                                    inline: 'nearest'
                                                });
                                        }
                                    }
                                    catch (e) {
                                        handleErrorWithTimeout(e);
                                    }
                                }
                            }), handleErrorWithTimeout);
                        }), function (e) {
                            waiting.innerHTML = '';
                            waiting.appendChild(createError(e.message));
                            waiting.scrollIntoView({
                                behavior: 'smooth',
                                block: 'end', inline: 'nearest'
                            });
                            EditorUi.debug('EditorUi.ChatWindow.addMessage',
                                'error', e);
                        });
                    }
                });

                processMessage();
            };

            div.appendChild(user);

            function send() {
                if (mxUtils.trim(inp.value) != '') {
                    try {
                        addMessage(inp.value);
                        inp.value = '';
                    }
                    catch (e) {
                        EditorUi.debug('EditorUi.ChatWindow.send', 'error', e);
                    }
                }
            };

            mxEvent.addListener(sendImg, 'click', send);

            mxEvent.addListener(inp, 'keydown', function (evt) {
                if (evt.keyCode == 13 && !mxEvent.isShiftDown(evt)) {
                    send();
                }
            });

            this.generate = mxUtils.bind(this, function (prompt) {
                inp.value = prompt;
                send();
            });

            this.window = new mxWindow(mxResources.get('generate'),
                div, x, y, w, h, true, true);
            this.window.minimumSize = new mxRectangle(0, 0, 120, 100);
            this.window.destroyOnClose = false;
            this.window.setMaximizable(false);
            this.window.setResizable(true);
            this.window.setClosable(true);

            // Adds help icon to title bar
            if (!editorUi.isOffline()) {
                var icon = editorUi.createHelpIcon('https://www.drawio.com/doc/faq/configure-ai-options');
                icon.style.cursor = 'help';
                icon.style.opacity = '0.5';
                this.window.buttons.insertBefore(icon, this.window.buttons.firstChild);
            }

            this.window.addListener(mxEvent.DESTROY, mxUtils.bind(this, function () {
                graph.getModel().removeListener(updateType);
            }));

            this.window.addListener('show', mxUtils.bind(this, function () {
                this.window.fit();
                inp.focus();
            }));

            editorUi.installResizeHandler(this, true);
            editorUi.installResizeHandler(this, true);
        };

        // --- EXPOSE EditorUi INSTANCE ---
        // Hook into EditorUi.prototype.createUi which is called during
        // initialization of every EditorUi (and App, which extends it).
        // This avoids wrapping the App constructor (which breaks static
        // properties like App.main, App.initPluginCallback, etc.).
        var _origCreateUi = EditorUi.prototype.createUi;
        EditorUi.prototype.createUi = function () {
            window.__editorUi = this;
            console.log('[over-ride.js] EditorUi captured via createUi');
            return _origCreateUi.apply(this, arguments);
        };

        // --- AI XML MERGE HANDLER ---
        // Listens for 'mergeAiXml' postMessage from the parent window.
        // Uses graph.importCells() to ADD new cells at a free position
        // without replacing existing content or changing view settings.
        // This is the same pattern as the ChatWindow clickFn above.
        window.addEventListener('message', function (evt) {
            if (!evt.data || typeof evt.data !== 'string') return;
            try {
                var msg = JSON.parse(evt.data);
                if (msg.action !== 'mergeAiXml' || !msg.xml) return;

                console.log('[over-ride.js] mergeAiXml received, xml length:', msg.xml.length);

                var editorUi = window.__editorUi;
                console.log('[over-ride.js] __editorUi:', !!editorUi);

                if (!editorUi || !editorUi.editor || !editorUi.editor.graph) {
                    console.warn('[over-ride.js] mergeAiXml: EditorUi not ready');
                    (window.opener || window.parent).postMessage(
                        JSON.stringify({ event: 'mergeAiXml', success: false }),
                        '*'
                    );
                    return;
                }

                var graph = editorUi.editor.graph;

                try {
                    // Parse XML to cell objects using draw.io's built-in parser
                    var cells = editorUi.stringToCells(msg.xml);
                    console.log('[over-ride.js] stringToCells returned', cells ? cells.length : 0, 'cells');

                    if (cells == null || cells.length === 0) {
                        console.warn('[over-ride.js] mergeAiXml: No cells parsed from XML');
                        return;
                    }

                    // Normalize cell bounding box to origin before inserting
                    var bbox = graph.getBoundingBoxFromGeometry(cells);
                    if (bbox) {
                        editorUi.sidebar.graph.moveCells(cells, -bbox.x, -bbox.y);
                    }

                    // Find a position that doesn't overlap existing content
                    var pt = graph.getFreeInsertPoint();
                    console.log('[over-ride.js] Inserting at', pt.x, pt.y);

                    // Add cells to the graph model — preserves everything existing
                    graph.model.beginUpdate();
                    try {
                        graph.setSelectionCells(graph.importCells(cells, pt.x, pt.y));
                    } finally {
                        graph.model.endUpdate();
                    }

                    // Scroll to the newly inserted cells
                    graph.scrollCellToVisible(graph.getSelectionCell());
                    console.log('[over-ride.js] mergeAiXml: SUCCESS');

                    // Notify parent of success
                    (window.opener || window.parent).postMessage(
                        JSON.stringify({ event: 'mergeAiXml', success: true }),
                        '*'
                    );
                } catch (e) {
                    console.error('[over-ride.js] mergeAiXml: Import failed', e);
                    (window.opener || window.parent).postMessage(
                        JSON.stringify({ event: 'mergeAiXml', success: false, error: e.message }),
                        '*'
                    );
                }
            } catch (e) {
                // Ignore non-JSON messages
            }
        });

        // --- ADDED SAVE/LOAD LOGIC ---
        const urlParams = new URLSearchParams(window.location.search);
        const flowId = urlParams.get('id');

        // Override Save
        const oldSave = App.prototype.save;
        App.prototype.save = function (name, file, success, error) {
            if (flowId) {
                const xml = mxUtils.getXml(this.editor.getGraphXml());

                console.log(xml);
                fetch(`/api/flows/${flowId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ xml: xml })
                })
                    .then(res => res.json())
                    .then(data => {
                        console.log('Flow saved:', data);
                        if (success) success();
                    })
                    .catch(err => {
                        console.error('Save failed:', err);
                        if (error) error(err);
                    });
            } else {
                // For new flows, we might want to create a record first
                // or just fallback to default save
                oldSave.apply(this, arguments);
            }
        };
//Editor save

EditorUi.prototype.save = function(name)
{
    console.log('Save');
	if (name != null)
	{
		if (this.editor.graph.isEditing())
		{
			this.editor.graph.stopEditing();
		}
		
		var xml = mxUtils.getXml(this.editor.getGraphXml());
		
		try
		{
			if (Editor.useLocalStorage)
			{
				if (localStorage.getItem(name) != null &&
					!mxUtils.confirm(mxResources.get('replaceIt', [name])))
				{
					return;
				}

				localStorage.setItem(name, xml);

				this.updateStatus(mxUtils.bind(this, function()
				{
					this.editor.setStatus(mxUtils.htmlEntities(
						mxResources.get('saved')) + ' ' + new Date());
				}));
			}
			else
			{
				if (xml.length < MAX_REQUEST_SIZE)
				{
					new mxXmlRequest(SAVE_URL, 'filename=' + encodeURIComponent(name) +
						'&xml=' + encodeURIComponent(xml)).simulate(document, '_blank');
				}
				else
				{
					mxUtils.alert(mxResources.get('drawingTooLarge'));
					mxUtils.popup(xml);
					
					return;
				}
			}

			this.editor.setModified(false);
			this.editor.setFilename(name);
			this.updateDocumentTitle();
		}
		catch (e)
		{
			this.updateStatus(mxUtils.bind(this, function()
			{
				this.editor.setStatus(mxUtils.htmlEntities(
					mxResources.get('errorSavingFile')));
			}));
		}
	}
};
        // Load flow if ID exists
        if (flowId) {
            const originalOnLoad = App.prototype.onLoad;
            App.prototype.onLoad = function () {
                originalOnLoad.apply(this, arguments);
                fetch(`/api/flows/${flowId}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.xml) {
                            const doc = mxUtils.parseXml(data.xml);
                            this.editor.setGraphXml(doc.documentElement);
                        }
                    })
                    .catch(err => console.error('Load failed:', err));
            };
        }
        // ------------------------------
    } else {
        // Retry after a short delay if App is not yet defined
        setTimeout(extendApp, 100);
    }
}

extendApp();
