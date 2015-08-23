var model;
var handlers = {};

$(document).ready(function () {

    var ICON_SIZE = 61;
    var ITEMS_PER_ROW = 6;
    var ROWS_PER_TAB = 3;
    var ITEMS_PER_TAB = ITEMS_PER_ROW * ROWS_PER_TAB;

    function BuildItem(params) {
        var self = this;

        params = params || {};
        _.assign(this, params);
        self.count = ko.observable(0);
        self.hotkey = ko.observable('');
        self.empty = ko.observable(true);
        self.filled = ko.computed(function() { return !self.empty(); });
        self.active = ko.observable(false);
        self.visible = ko.observable(true);
        self.buildIcon = ko.observable(params.buildIcon || '');
        self.ingrid = ko.observable(false);//in build grid
        self.build = ko.observable(false);//buildable by selected
        self.hidden = ko.observable(true);//hidden in ui

        self.Buildable = ko.computed(function() { return self.build() && self.ingrid(); });//remove .ingrid
        self.Visible = ko.computed(function() { return !self.hidden(); });
    }

    function BuildRaw(width) {
        var columns = width;
        var self = this;

        self.visible = ko.observable(true);
        self.items = ko.observableArray();
        self.hidden = ko.observable(false);
        self.isVisible = ko.computed(function() { return !self.hidden(); });
        for (var i = 0; i < width; i++) {
            var item = new BuildItem();
            self.items().push(item);
        }
    }

    function BuildTab(group, label) {
        var self = this;
        
        self.group = ko.observable(group);
        self.items = ko.observableArray();
        self.label = ko.observable(label);
        self.hotkey = ko.observable('');
        self.active = ko.observable(false);
        self.visible = ko.observable(true);
    }
    
    function BuildSet(params) {
        var units = params.units;
        var buildLists = params.buildLists;
        var grid = params.grid;
        var specTag = params.specTag;
        var self = this;
        self.hidden = ko.observable(true);
        self.activeColumns = ko.observable(0);
        self.visible = ko.observable(true);

        // Maps a spec in the current selection to a build list
        self.selectedSpecs = ko.observable({});
        // Maps a build item spec id to a BuildItem
        self.buildItems = ko.observable({});
        // Maintains the tab list
        self.tabs = ko.observableArray();

        var height=0;
        var width=0;
        _.forIn(grid, function(tabInfo, spec) {
            var unit = units[spec + specTag];
            if (!unit)
                return;
            height = Math.max(height, unit.buildRaw);
            width = Math.max(width, unit.buildColumn);
        });
        height++;
        width++;
        self.raws = ko.observableArray();
        for (var i = 0; i < height; i++) {
            var raw = new BuildRaw(width);
            self.raws().push(raw);
        }

        _.forIn(grid, function(tabInfo, spec) {
            var unit = units[spec + specTag];
            if (!unit)
                return;
            var item = new BuildItem(unit);
            item.ingrid(true);
            self.raws()[height-1-item.buildRaw].items()[item.buildColumn]=item;
        });

        self.parseSelection = function(selection) {
            //hide all items
            for (var gid in grid) {
                self.raws()[height-1-units[gid].buildRaw].items()[units[gid].buildColumn].build(false);
                self.raws()[height-1-units[gid].buildRaw].items()[units[gid].buildColumn].count(0);
            }
            //unhide buildable items
            for (var sid in selection.spec_ids) {
                if (buildLists[sid]) {
                    for (var bid in buildLists[sid]) {
                        if (grid[bid]) {
                            self.raws()[height-1-units[bid].buildRaw].items()[units[bid].buildColumn].build(true);
                        }
                    }
                }
            }
            //hide empty raws
            var all_hidden = true;
            _.forIn(self.raws(), function(raw) {
                var raw_hidden = true;
                for (i in raw.items()) {
                    if (raw.items()[i].build()) {
                        all_hidden = false;
                        raw_hidden = false;
                        break;
                    }
                }
                raw.hidden(raw_hidden);
            });
            self.hidden(all_hidden);
            self.activeColumns(0);
            if(!all_hidden){
            //TODO: check if all raws are hidden and skip column hiding
            //hide empty columns
                for(var w = 0; w < width; w++) {
                    column_hidden = true;
                    for(var h = 0; h < height; h++) {
                        if (self.raws()[h].items()[w].build()) {
                            column_hidden = false;
                            break;
                        }
                    }
                    if(!column_hidden){
                        self.activeColumns(self.activeColumns()+1);
                    }
                    for(var h = 0; h < height; h++) {
                        self.raws()[h].items()[w].hidden(column_hidden);
                    }
                }
            }
            _.forIn(selection.build_orders, function(count, id) {
                if (grid[id]){
                    self.raws()[height-1-units[id].buildRaw].items()[units[id].buildColumn].count(count);
                }
            });
        };
        self.hasTab = function(group) {
        };
    }

    function BuildBarViewModel() {
        var self = this;

        self.unitSpecs = $.Deferred();
        self.getSpecTag = api.game.getUnitSpecTag().then(function(tag) { self.specTag = tag; });

        self.buildSet = ko.observable();

        self.buildHotkeyModel = new BuildHotkeyModel();

        self.showBuildBar = ko.computed(function() {
            return self.buildSet() && !self.buildSet().hidden();
        });

        self.activeBuildGroup = ko.observable('');
        self.activeBuildGroupLocked = ko.observable(false);

        self.activeTab = ko.computed(function() {
            return;
        });
        self.activeBuildList = ko.computed(function() {
            return;
        });

        self.activeBuildId = ko.observable();
        
        self.executeStartBuild = function (event, item) {
            api.Panel.message(api.Panel.parentId, "build_bar.build", {
                item: item.id,
                batch: event.shiftKey,
                cancel: event.button === 2,
                urgent: event.ctrlKey,
                more: item.count > 0
            });
        };
        
        self.selectBuildGroup = function(group) {
            api.Panel.message(api.Panel.parentId, "build_bar.select_group", group);
        };
        
        self.setBuildHover = function(id) {
            api.Panel.message(api.Panel.parentId, 'build_bar.set_hover', id);
        };
        self.clearBuildHover = function(id) {
            self.setBuildHover('');
        };
        
        self.clearBuildSequence = function () {
        };
        
        self.startBuildSequence = function(params) {
            return;
        };

        self.buildItem = function (index) {
            return;
        };

        self.parseSelection = function(payload) {
            var buildSet = self.buildSet();

            buildSet.parseSelection(payload);

            api.Panel.onBodyResize();
            _.delay(api.Panel.onBodyResize);
        };

        self.unitSpecs.then(function(payload) {
            // Fix up cross-unit references
            function crossRef(units) {
                for (var id in units) {
                    var unit = units[id];
                    unit.id = id;
                    if (unit.build) {
                        for (var b = 0; b < unit.build.length; ++b) {
                            var ref = units[unit.build[b]];
                            if (!ref) {
                                ref = { id: unit.build[b] };
                                units[ref.id] = ref;
                            }
                            unit.build[b] = ref;
                        }
                    }
                    if (unit.projectiles) {
                        for (var p = 0; p < unit.projectiles.length; ++p) {
                            var ref = units[unit.projectiles[p]];
                            if (!ref) {
                                ref = { id: unit.projectiles[p] };
                                units[ref.id] = ref;
                            }
                            unit.projectiles[p] = ref;
                        }
                    }
                }
            }
            crossRef(payload);

            var misc_unit_count = 0;

            function getBaseFileName(unit) {
                var filenameMatch = /([^\/]*)\.json[^\/]*$/;
                return (filenameMatch.exec(unit.id) || [])[1];
            };
            function addBuildInfo(unit, id) {
                unit.buildIcon = 'img/build_bar/units/' + getBaseFileName(unit) + '.png'

                var strip = /.*\.json/.exec(id);
                if (strip)
                    id = strip.pop();
                var target = self.buildHotkeyModel.SpecIdToGridMap()[id];
                if (!target) {
                    target = ['misc', misc_unit_count, 0];
                    misc_unit_count++;
                }

                unit.buildGroup = target[0];
                unit.buildIndex = target[1];
                unit.buildColumn = target[2];
                unit.buildRaw = target[3];
            };
            for (var id in payload) {
                addBuildInfo(payload[id], id);
            }

            function makeBuildLists(units) {
                var result = {};
                for (var id in units) {
                    var unit = units[id];
                    if (!unit.build && !unit.projectiles)
                        continue;

                    var buildList = {};

                    _.forEach(['build', 'projectiles'], function (element) {
                        if (unit[element]) {
                            for (var b = 0; b < unit[element].length; ++b) {
                                var target = unit[element][b];
                                if (typeof (target) === 'string')
                                    continue;

                                buildList[target.id] = true;
                            }
                        }
                    });

                    result[id] = buildList;
                }
                return result;
            }
            var buildLists = makeBuildLists(payload);

            self.buildSet(new BuildSet({
                units: payload,
                buildLists: buildLists,
                grid: self.buildHotkeyModel.SpecIdToGridMap(),
                specTag: self.specTag
            }));
        });

        self.active = ko.observable(true);

        self.setup = function () {
            $(window).focus(function() { self.active(true); });
            $(window).blur(function () { self.active(false); });


            /* prevent the build bar from scrolling. */
            function sqelch (e) {
                e.preventDefault(e);
            }

            if (window.addEventListener)
                window.addEventListener('DOMMouseScroll', sqelch, false);
            window.onmousewheel = document.onmousewheel = sqelch;
        };

        self.screenWidth = ko.observable(1000);
        self.bodyWidth = ko.computed(function() {
            if (!self.buildSet())
                return;
            var finalWidth;
            var itemsWidth = self.buildSet().activeColumns()*ICON_SIZE;
            /*if (itemsWidth < 520)
                itemsWidth = 520;*/
            if (self.screenWidth()-550 > itemsWidth) {
                finalWidth = itemsWidth+71;
            } else {
                finalWidth = self.screenWidth()-550+71;
            }
            return finalWidth.toString() + 'px';
        });
        self.resized = function(width) {
            self.screenWidth(width);
        };
    }
    model = new BuildBarViewModel();

    handlers.selection = function(payload) {
        $.when(
            model.unitSpecs,
            model.getSpecTag
        ).then(function() {
            model.parseSelection(payload);
        });
    };

    handlers.unit_specs = function (payload) {
        delete payload.message_type;
        model.unitSpecs.resolve(payload);
    };

    handlers.clear_build_sequence = model.clearBuildSequence;
    handlers.start_build_sequence = model.startBuildSequence;
    handlers.build_item = model.buildItem;
    handlers.active_build_id = model.activeBuildId;

    api.Panel.query(api.Panel.parentId, 'panel.invoke', ['screenWidth']).then(model.resized);
    handlers.screen_width = model.resized;

    // inject per scene mods
    if (scene_mod_list['live_game_build_bar'])
        loadMods(scene_mod_list['live_game_build_bar']);

    // setup send/recv messages and signals
    app.registerWithCoherent(model, handlers);

    // Activates knockout.js
    ko.applyBindings(model);

    // run start up logic
    model.setup();
});
