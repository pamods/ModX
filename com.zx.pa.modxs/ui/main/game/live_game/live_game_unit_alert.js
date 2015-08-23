var model;
var handlers = {};

$(document).ready(function () {

    function parentQuery() {
        return api.Panel.query(api.Panel.parentId, 'panel.invoke', Array.prototype.slice.call(arguments, 0));
    }

    function UnitAlertModel() {
        var self = this;
        var timeout = 10000;

        self.builtEachBasicFactoryCredit = ko.observable(false).extend({ local: 'built_each_basic_factory_credit' });
        self.builtEachBuildingCredit = ko.observable(false).extend({ local: 'built_each_building_credit' });
        self.builtEachUnitCredit = ko.observable(false).extend({ local: 'built_each_unit_credit' });
        self.lastBuildCreditAwardedTime = ko.observable(0).extend({ local: 'last_build_credit_awarded_time' });
        self.endOfTimeInSeconds = ko.observable(0);
        self.endOfTimeInSeconds.subscribe(function (value) {
            if (value < self.lastBuildCreditAwardedTime()) {
                self.builtEachBasicFactoryCredit(false);
                self.builtEachBuildingCredit(false);
                self.builtEachUnitCredit(false);
            }
        });

        self.armyNames = ko.observableArray([]);
        self.armyColors = ko.observableArray([]);
        self.armyIds = ko.observableArray([]);

        self.processPlayerData = function (payload) {
            self.armyColors(payload.colors);
            self.armyNames(payload.names);
            self.armyIds(payload.ids);
        };

        self.armyIdToColorMap = ko.computed(function () {
            return _.zipObject(self.armyIds(), self.armyColors());
        });

        self.state = ko.observable({});
        self.isSpectator = ko.computed(function() { return !!self.state().spectator; });
        self.autoPip = ko.computed(function() { return !!self.state().autoPip; });
        
        self.map = {}; /* unit alert map */
        self.signalRecalculate = ko.observable();
        self.dirty = false;
        self.focusId = ko.observable(-1);

        self.lastCustomId = ko.observable(0);

        self.combatMap = {};
        self.acknowledgedCombatIds = {};

        self.builtSpecSet = ko.observable({});

        var buildEachBasicFactoryRule = ko.computed(function () {

            if (self.builtEachBasicFactoryCredit() || self.isSpectator())
                return;

            var set = self.builtSpecSet();
            var match = _.every([
                '/pa/units/air/Afac11/Afac11.json',
                '/pa/units/air/Afac21/Afac21.json',
                '/pa/units/land/Bfac11/Bfac11.json',
                '/pa/units/land/Bfac21/Bfac21.json',
                '/pa/units/land/Vfac11/Vfac11.json',
                '/pa/units/land/Vfac21/Vfac21.json',
                '/pa/units/sea/Nfac11/Nfac11.json',
                '/pa/units/orbital/OfaclA0/OfaclA0.json',
            ], function (element) {
                return set[element];
            });

            if (!match)
                return;

            self.builtEachBasicFactoryCredit(true);
            self.lastBuildCreditAwardedTime(self.endOfTimeInSeconds());
            api.tally.incStatInt('game_build_all_basic_factories');
        });

        var buildEachBuildingRule = ko.computed(function () {

            if (self.builtEachBuildingCredit() || self.isSpectator())
                return;

            var set = self.builtSpecSet();
            var match = _.every([
                '/pa/units/air/Afac11/Afac11.json',
                '/pa/units/air/Afac12/Afac12.json',
                '/pa/units/air/Afac13/Afac13.json',
                '/pa/units/air/Afac21/Afac21.json',
                '/pa/units/air/Afac22/Afac22.json',
                '/pa/units/air/Afac23/Afac23.json',
                '/pa/units/land/Bfac11/Bfac11.json',
                '/pa/units/land/Bfac12/Bfac12.json',
                '/pa/units/land/Bfac13/Bfac13.json',
                '/pa/units/land/Bfac21/Bfac21.json',
                '/pa/units/land/Bfac22/Bfac22.json',
                '/pa/units/land/Bfac23/Bfac23.json',
                '/pa/units/land/Vfac11/Vfac11.json',
                '/pa/units/land/Vfac12/Vfac12.json',
                '/pa/units/land/Vfac13/Vfac13.json',
                '/pa/units/land/Vfac21/Vfac21.json',
                '/pa/units/land/Vfac22/Vfac22.json',
                '/pa/units/land/Vfac23/Vfac23.json',
                '/pa/units/sea/Nfac11/Nfac11.json',
                '/pa/units/sea/Nfac12/Nfac12.json',
                '/pa/units/sea/Nfac13/Nfac13.json',
                '/pa/units/land/SdaaA1/SdaaA1.json',
                '/pa/units/land/SdaaA2/SdaaA2.json',
                '/pa/units/land/Sdal11/Sdal11.json',
                '/pa/units/land/Sdal12/Sdal12.json',
                '/pa/units/land/Sdal13/Sdal13.json',
                '/pa/units/land/Sdal21/Sdal21.json',
                '/pa/units/land/Sdal22/Sdal22.json',
                '/pa/units/land/Sdal23/Sdal23.json',
                '/pa/units/land/Sdart11/Sdart11.json',
                '/pa/units/land/Sdart12/Sdart12.json',
                '/pa/units/land/Sdart13/Sdart13.json',
                '/pa/units/land/Sdart21/Sdart21.json',
                '/pa/units/land/Sdart23/Sdart23.json',
                '/pa/units/land/SdmineA0/SdmineA0.json',
                '/pa/units/land/Sdtml22/Sdtml22.json',
                '/pa/units/land/SdwallA0/SdwallA0.json',
                '/pa/units/land/SfucA0/SfucA0.json',
                '/pa/units/land/SradarA1/SradarA1.json',
                '/pa/units/land/SradarA2/SradarA2.json',
                '/pa/units/land/SradarA3/SradarA3.json',
                '/pa/units/land/SrepA1/SrepA1.json',
                '/pa/units/land/SrepA3/SrepA3.json',
                '/pa/units/land/SresA1/SresA1.json',
                '/pa/units/land/SrmpA1/SrmpA1.json',
                '/pa/units/land/SrmpA3/SrmpA3.json',
                '/pa/units/land/SrmsA1/SrmsA1.json',
                '/pa/units/land/SsndA0/SsndA0.json',
                '/pa/units/land/SsnlA0/SsnlA0.json',
                '/pa/units/land/SstpA0/SstpA0.json',
                '/pa/units/orbital/OdefsatA0/OdefsatA0.json',
                '/pa/units/orbital/OfacA0/OfacA0.json',
                '/pa/units/orbital/OfaclA0/OfaclA0.json',
                '/pa/units/orbital/OrepA0/OrepA0.json',
                '/pa/units/orbital/OrmpA0/OrmpA0.json',
                '/pa/units/orbital/SdaoA1/SdaoA1.json',
                '/pa/units/orbital/SdaoA3/SdaoA3.json',
                '/pa/units/orbital/SoradarA1/SoradarA1.json',
                '/pa/units/orbital/SoradarA3/SoradarA3.json',
                '/pa/units/orbital/SscmA0/SscmA0.json',
                '/pa/units/orbital/SspeA0/SspeA0.json',
                '/pa/units/sea/NdanA1/NdanA1.json',
                '/pa/units/sea/NdanA2/NdanA2.json',
                '/pa/units/sea/NsonarA1/NsonarA1.json',
                '/pa/units/sea/Ntorpedo11/Ntorpedo11.json',
                '/pa/units/sea/Ntorpedo12/Ntorpedo12.json',
                '/pa/units/land/Xmb1/Xmb1.json',
                '/pa/units/land/Xmb2/Xmb2.json',
                '/pa/units/air/Xmb3/Xmb3.json',
                '/pa/units/land/Xmb4b/Xmb4b.json',
            ], function (element) {
                return set[element];
            });

            if (!match)
                return;

            self.builtEachBuildingCredit(true);
            self.lastBuildCreditAwardedTime(self.endOfTimeInSeconds());
            api.tally.incStatInt('game_build_all_buildings');
        });

        var buildEachUnitRule = ko.computed(function () {

            if (self.builtEachUnitCredit() || self.isSpectator())
                return;

            var set = self.builtSpecSet();
            var match = _.every([
                '/pa/units/air/Afab11/Afab11.json',
                '/pa/units/air/Afab12/Afab12.json',
                '/pa/units/air/Afab13/Afab13.json',
                '/pa/units/air/Afab21/Afab21.json',
                '/pa/units/air/Afab22/Afab22.json',
                '/pa/units/air/Afab23/Afab23.json',
                '/pa/units/land/Bfab11/Bfab11.json',
                '/pa/units/land/Bfab12/Bfab12.json',
                '/pa/units/land/Bfab13/Bfab13.json',
                '/pa/units/land/Bfab21/Bfab21.json',
                '/pa/units/land/Bfab22/Bfab22.json',
                '/pa/units/land/Bfab23/Bfab23.json',
                '/pa/units/land/Vfab11/Vfab11.json',
                '/pa/units/land/Vfab12/Vfab12.json',
                '/pa/units/land/Vfab13/Vfab13.json',
                '/pa/units/land/Vfab21/Vfab21.json',
                '/pa/units/land/Vfab22/Vfab22.json',
                '/pa/units/land/Vfab23/Vfab23.json',
                '/pa/units/sea/Nfab11/Nfab11.json',
                '/pa/units/sea/Nfab12/Nfab12.json',
                '/pa/units/sea/Nfab13/Nfab13.json',
                '/pa/units/orbital/Ofab11/Ofab11.json',
                '/pa/units/air/Abomber13/Abomber13.json',
                '/pa/units/air/Abomber21/Abomber21.json',
                '/pa/units/air/Abomber22/Abomber22.json',
                '/pa/units/air/Abomber23/Abomber23.json',
                '/pa/units/air/Afighter11/Afighter11.json',
                '/pa/units/air/Afighter12/Afighter12.json',
                '/pa/units/air/Afighter21/Afighter21.json',
                '/pa/units/air/Afighter22/Afighter22.json',
                '/pa/units/land/Afighter23/Afighter23.json',
                '/pa/units/land/Agunship11/Agunship11.json',
                '/pa/units/land/Ascout12/Ascout12.json',
                '/pa/units/land/Ascout21/Ascout21.json',
                '/pa/units/land/AtransportA2/AtransportA2.json',
                '/pa/units/land/Baa21/Baa21.json',
                '/pa/units/land/Baa23/Baa23.json',
                '/pa/units/land/Baa31/Baa31.json',
                '/pa/units/land/Baa32/Baa32.json',
                '/pa/units/land/Bao32/Bao32.json',
                '/pa/units/land/Bassault11/Bassault11.json',
                '/pa/units/land/Bassault12/Bassault12.json',
                '/pa/units/land/Bassault13/Bassault13.json',
                '/pa/units/land/Bassault21/Bassault21.json',
                '/pa/units/land/Bassault22/Bassault22.json',
                '/pa/units/land/Bassault23/Bassault23.json',
                '/pa/units/land/Bbomb31/Bbomb31.json',
                '/pa/units/land/Bflame21/Bflame21.json',
                '/pa/units/land/Bmortar21/Bmortar21.json',
                '/pa/units/land/Bscout31/Bscout31.json',
                '/pa/units/land/Bscout33/Bscout33.json',
                '/pa/units/land/Bsniper23/Bsniper23.json',
                '/pa/units/land/Bsupport22/Bsupport22.json',
                '/pa/units/land/Btactical13/Btactical13.json',
                '/pa/units/land/Vaa11/Vaa11.json',
                '/pa/units/land/Vaa13/Vaa13.json',
                '/pa/units/land/Vaa21/Vaa21.json',
                '/pa/units/land/Vaa22/Vaa22.json',
                '/pa/units/land/Vao13/Vao13.json',
                '/pa/units/land/Vartillery13/Vartillery13.json',
                '/pa/units/land/Vartillery23/Vartillery23.json',
                '/pa/units/land/Vassault11/Vassault11.json',
                '/pa/units/land/Vassault12/Vassault12.json',
                '/pa/units/land/Vassault13/Vassault13.json',
                '/pa/units/land/Vassault21/Vassault21.json',
                '/pa/units/land/Vassault22/Vassault22.json',
                '/pa/units/land/Vmortar12/Vmortar12.json',
                '/pa/units/land/Vpd22/Vpd22.json',
                '/pa/units/land/Vradar21/Vradar21.json',
                '/pa/units/land/Vscout11/Vscout11.json',
                '/pa/units/land/Vscout23/Vscout23.json',
                '/pa/units/land/Vsupport11/Vsupport11.json',
                '/pa/units/orbital/Vsupport21/Vsupport21.json',
                '/pa/units/orbital/Vsupport22/Vsupport22.json',
                '/pa/units/orbital/OartyA0/OartyA0.json',
                '/pa/units/orbital/ObombA0/ObombA0.json',
                '/pa/units/orbital/ObuzzerA0/ObuzzerA0.json',
                '/pa/units/orbital/OcapA0/OcapA0.json',
                '/pa/units/orbital/OdestrA0/OdestrA0.json',
                '/pa/units/orbital/OfabA0/OfabA0.json',
                '/pa/units/orbital/OfighterA0/OfighterA0.json',
                '/pa/units/orbital/OlaserA0/OlaserA0.json',
                '/pa/units/orbital/OradarA1/OradarA1.json',
                '/pa/units/orbital/OradarA2/OradarA2.json',
                '/pa/units/orbital/OtranspA0/OtranspA0.json',
                '/pa/units/sea/Naa11/Naa11.json',
                '/pa/units/sea/Naa13/Naa13.json',
                '/pa/units/sea/Nassault11/Nassault11.json',
                '/pa/units/sea/Nassault12/Nassault12.json',
                '/pa/units/sea/Nassault13/Nassault13.json',
                '/pa/units/sea/Nscout11/Nscout11.json',
                '/pa/units/sea/Ntactical13/Ntactical13.json',
                '/pa/units/sea/Ntorpedo11/Ntorpedo11.json',
                '/pa/units/sea/Ntorpedo12/Ntorpedo12.json',
            ], function (element) {
                return set[element];
            });

            if (!match)
                return;

            self.builtEachUnitCredit(true);
            self.lastBuildCreditAwardedTime(self.endOfTimeInSeconds());
            api.tally.incStatInt('game_build_all_units');
        });

        self.clean = function () {
            var current_time = _.now();
            var dirty = false;
            var id;

            for (id in self.map) {
                var alert = self.map[id];

                if (!alert.special && current_time - alert.time > timeout) {
                    dirty = true;
                    delete self.map[id];
                }
            }

            if (dirty)
                self.signalRecalculate.notifySubscribers();

            self.hidePreview();
        }

        self.isMisc = function (watch_type) {
            if (self.isSpectator()) /* force all spectator alerts to render in white to avoid conflicts with army color. */
                return true;

            return watch_type === constants.watch_type.ping
                    || watch_type === constants.watch_type.sight
                    || watch_type === constants.watch_type.projectile
                    || watch_type === constants.watch_type.first_contact
                    || watch_type === constants.watch_type.target_destroyed
                    || watch_type === constants.watch_type.allied_death
                    || watch_type === constants.watch_type.idle
                    || watch_type === constants.watch_type.arrival;
        }

        self.alerts = ko.computed(function () {
            self.signalRecalculate(); /* force dependency */
            var sorted = _.sortBy(_.values(self.map), function (v) {
                return -v.time;
            });
            var result = _.reject(sorted, function (element) {
                return element.special;
            });
            return result;
        });

        self.specialWeaponAlerts = ko.observableArray([]);

        self.showLabel = function (id, index) {
            if (id === self.focusId())
                return true;
            return self.focusId() === -1 && index === 0;
        }

        self.setFocus = function (id) {
            if (self.focusId() !== id)
                self.focusId(id);
        }

        self.clearFocus = function () {
            if (self.focusId() !== -1)
                self.focusId(-1);
        }

        self.close = function (id) {
            delete self.map[id];
            if (self.focusId() === id)
                self.focusId(-1);
            self.signalRecalculate.notifySubscribers();
            self.hidePreview();
        }

        self.acknowledge = function (id) {

            var alert = self.map[id];
            if (alert) {
                var target = {
                    location: alert.location,
                    planet_id: alert.planet_id
                };

                alert.cb && alert.cb.resolve(self);
                if (!alert.custom) {
                    engine.call('camera.lookAt', JSON.stringify(target));
                }
            }

            self.close(id);
        }

        self.activeSpecialWeapon = function (data) {
            self.acknowledge(data.alert.id);
            self.specialWeaponAlerts(_.reject(self.specialWeaponAlerts(), function (element) {
                return data === element;
            }));
        };

        self.dismissSpecialWeapon = function (data) {
            self.close(data.alert.id);
            self.specialWeaponAlerts(_.reject(self.specialWeaponAlerts(), function (element) {
                return data === element;
            }));
        };

        self.processSpecialWeaponLost = function (data) {
            var matched = _.filter(self.specialWeaponAlerts(), function (element) {
                return (element.index === data.index)
                        && (element.lazer === data.lazer)
                        && (element.thrust === data.thrust);
            });

            _.forEach(matched, self.dismissSpecialWeapon);
        };

        self.recordPlayerContact = function(alert) {
            var contactInfo = { 
                army: alert.army_id, 
                location: alert.location, 
                planet_id: alert.planet_id 
            };
            api.Panel.message(api.Panel.parentId, 'unit_alert.player_contact', JSON.stringify(contactInfo));
        };
        
        self.fixAlertSpec = function(alert) {
            // The alert system doesn't support spec tags.
            if (_.has(alert, 'full_spec'))
                return;
            alert.full_spec = alert.spec_id;
            var strip = /.*\.json/.exec(alert.full_spec);
            if (strip)
                alert.spec_id = strip.pop();
        };
        
        self.getAlertText = function(alert) {
            var result = alert.name;
            var append = function(text) {
                if (result)
                    result = result + ' ';
                result += text;
            };
            if (alert.watch_type === constants.watch_type.allied_death)
                result = loc('!LOC(live_game_unit_alert:allied.message):Allied') + ' ' + result;

            switch (alert.watch_type) {
                case constants.watch_type.damage:
                    append(loc('!LOC(live_game_unit_alert:under_attack.message):under attack.'));
                    break;
                case constants.watch_type.ready:
                    append(loc('!LOC(live_game_unit_alert:ready.message):ready.'));
                    break;
                case constants.watch_type.death: /* fallthrough */
                case constants.watch_type.allied_death:
                    append(loc('!LOC(live_game_unit_alert:lost.message):lost.'));
                    break;
                case constants.watch_type.sight:
                    append(loc('!LOC(live_game_unit_alert:located.message):located.'));
                    break;
                case constants.watch_type.ping:
                    if (!alert.custom)
                        append(loc('!LOC(live_game_unit_alert:ping.message):Ping!'));
                    break;
                case constants.watch_type.projectile:
                    append(loc('!LOC(live_game_unit_alert:launched.message):launched!'));
                    break;
                case constants.watch_type.first_contact:
                    append(loc('!LOC(live_game_unit_alert:enemy_contact.message):Enemy Contact!'));
                    break;
                case constants.watch_type.target_destroyed:
                    append(loc('!LOC(live_game_unit_alert:destroyed.message):destroyed.'));
                    break;

                case constants.watch_type.idle:
                    append('idle.');
                    break;
                case constants.watch_type.arrival:
                    append('arrived.');
                    break;
            }
            return result;
        };
        
        self.getAlertSummary = function(alert) {
            self.fixAlertSpec(alert);
            
            var result = $.Deferred();

            switch (alert.watch_type) {
                case constants.watch_type.damage: alert.color = 'red'; break;
                case constants.watch_type.ready: alert.color = 'green'; break;
                case constants.watch_type.death: alert.color = 'black'; break;
                default: alert.color = 'white'; break;
            }
            if (alert.watch_type === constants.watch_type.ping || alert.watch_type === constants.watch_type.first_contact) {
                alert.name = alert.name || '';
                alert.sicon = 'coui://ui/main/atlas/icon_atlas/img/strategic_icons/icon_si_ping.png';
                result.resolve(alert);
            }         
            else {
                api.Panel.query(api.Panel.parentId, 'query.item_details', { id: alert.full_spec, aka: alert.spec_id })
                    .then(function(itemDetails) {
                        if (itemDetails) {
                            alert.name = itemDetails.name;
                            alert.sicon = 'coui://ui/main/atlas/icon_atlas/img/strategic_icons/icon_si_' + itemDetails.sicon + '.png';
                        }
                        result.resolve(alert);
                    });
            }

            return $.when(result).then(function() {
                alert.text = self.getAlertText(alert);
                alert.army_color = self.armyIdToColorMap()[alert.army_id];
                return alert;
            });
        };

        self.processSpecialWeapon = function (payload) {
            self.specialWeaponAlerts.push(payload);
        };

        self.processAlert = function (alert, ready) {
            if (!self.map[alert.id])
                self.dirty = true;

            if (_.isUndefined(alert.id)) {
                alert.id = '.' + self.lastCustomId();
                self.lastCustomId(self.lastCustomId() + 1);
            }

            self.map[alert.id] = alert;
            alert.time = _.now();
            alert.cb = alert.cb || $.Deferred();
            
            self.fixAlertSpec(alert);
            api.Panel.message(api.Panel.parentId, 'panel.invoke', ['processExternalUnitEvent', alert.watch_type, alert]);

            var getDetails = self.getAlertSummary(alert);
            
            $.when(getDetails).then(function (alert) {

                if (alert.watch_type === constants.watch_type.damage)
                    if (eventSystem.isType(constants.unit_type.Commander, alert.unit_types))
                        triggerModel.testEvent(constants.event_type.commander_under_attack, alert.magnitude);              

                if (alert.watch_type === constants.watch_type.death) {
                    if (eventSystem.isType(constants.unit_type.Commander, alert.unit_types))
                        api.Panel.message(api.Panel.parentId, 'panel.invoke', ['processExternalUnitEvent', constants.event_type.commander_destroyed]);
                }

                if (alert.watch_type === constants.watch_type.sight) {
                    if (eventSystem.isType(constants.unit_type.Commander, alert.unit_types)){
                        api.Panel.message(api.Panel.parentId, 'panel.invoke', ['processExternalUnitEvent', constants.event_type.enemy_commander_sighted]);
                        self.recordPlayerContact(alert);
                    }
                }

                if (alert.watch_type === constants.watch_type.first_contact) {
                    api.Panel.message(api.Panel.parentId, 'panel.invoke', ['processExternalUnitEvent', constants.event_type.new_enemy_contact]);
                    self.recordPlayerContact(alert);
                }

                if (alert.watch_type === constants.watch_type.target_destroyed) {
                    if (eventSystem.isType(constants.unit_type.Commander, alert.unit_types))
                        api.Panel.message(api.Panel.parentId, 'panel.invoke', ['processExternalUnitEvent', constants.event_type.enemy_commander_destroyed]);
                }

                if (alert.watch_type === constants.watch_type.allied_death) {
                    if (eventSystem.isType(constants.unit_type.Commander, alert.unit_types))
                        api.Panel.message(api.Panel.parentId, 'panel.invoke', ['processExternalUnitEvent', constants.event_type.allied_commander_destroyed]);
                }
                
                if (ready)
                    ready.resolve(alert);
            });
            
            if (self.autoPip())
                self.showPreview(alert.id, 'pips[0]');
            
            return alert.cb.promise();
        }

        self.processList = function (array) {
            self.dirty = false;
            var readyAlert = function(alert) { 
                var ready = $.Deferred(); 
                self.processAlert(alert, ready); 
                return ready.promise(); 
            };
            var ready = _.map(array, readyAlert);
            $.when.apply($, ready).then(function() {
                /* trigger update only if there was a new alert */
                if (self.dirty)
                    self.signalRecalculate.notifySubscribers();

                setTimeout(self.clean, timeout + 1);
            });
        };

        self.processCustomAlert = function (payload) {
            self.dirty = false;

            if (payload.lost) {
                self.processSpecialWeaponLost(payload);
                return;
            }
            var ready = $.Deferred();
            var result = self.processAlert({
                watch_type: constants.watch_type.ping,
                name: payload.name || '',
                custom: true,
                special: payload.special_weapon
            }, ready);

            ready.promise().then(function (alert) {
                if (payload.special_weapon) {
                    payload.alert = alert;
                    self.processSpecialWeapon(payload);
                }
            });

            /* trigger update only if there was a new alert */
            if (self.dirty)
                self.signalRecalculate.notifySubscribers();

            setTimeout(self.clean, timeout + 1);
            return result;
        };
        
        self.acknowledgeCombat = function () {

            var list = _.flatten(_.values(model.combatMap));

            /* remove previously used alerts */
            list = _.filter(list, function (element) {
                return !self.acknowledgedCombatIds[element.combat_id];
            });

            /* if we filtered all combats, clear the ids and retry */
            if (!list.length && !_.isEmpty(self.acknowledgedCombatIds)) {
                self.acknowledgedCombatIds = {};
                self.acknowledgeCombat();
                return;
            }

           _.sortBy(list, 'last_event_time');

            var combat = _.last(list);

            if (!combat)
                return;

            self.acknowledgedCombatIds[combat.combat_id] = true;

            var target = {
                location: combat.last_location,
                planet_id: combat.planet_id
            };

            engine.call('camera.lookAt', JSON.stringify(target));   
        };

        self.acknowledgeAlert = function () {
            var alert = self.alerts()[0];
            if (alert)
                self.acknowledge(alert.id);
            else
                self.acknowledgeCombat();
        };

        self.showPreview = function (id, holodeck) {
            var alert = self.map[id];

            if (!alert)
                return;

            var target = {
                location: alert.location,
                planet_id: alert.planet_id,
                zoom: 'air',
                holodeck: holodeck
            };

            api.Panel.message(api.Panel.parentId, 'unit_alert.show_preview', target);
        };

        self.hidePreview = function () {
            api.Panel.message(api.Panel.parentId, 'unit_alert.hide_preview');
        };
        
        self.active = ko.observable(true);
        
        self.setup = function() {
            $(window).focus(function() { self.active(true); });
            $(window).blur(function() { self.active(false); });
            
            parentQuery('unitAlertState').then(self.state);
            parentQuery('playerData').then(self.processPlayerData);
        };
    }

    model = new UnitAlertModel();

    handlers.watch_list = function (payload) {
        if (model.active())
            model.processList(payload.list);
    };
    
    handlers.custom_alert = function (payload) {

        var name = payload.name;
        var special_weapon = payload.special_weapon;
        var thrust = payload.thrust;
        var lazer = payload.lazer;

        return model.processCustomAlert(payload);
    };
    
    handlers.combat_list = function (payload) {
        model.combatMap = payload;
    };

    handlers.built_spec_list = function (payload) {
        var set = {};
        
        _.forEach(payload.list, function (element) {
            set[element] = true;
        });

        model.builtSpecSet(set);
    };

    handlers.time = function (payload) {
        model.endOfTimeInSeconds(Math.floor(payload.end_time));
    };

    handlers.acknowledge_alert = model.acknowledgeAlert;

    handlers.acknowledge_combat = model.acknowledgeCombat;

    handlers.state = function (payload) {
        model.state(payload);
    };

    handlers.player_data = model.processPlayerData;

    handlers['panel.invoke'] = function(params) {
        var fn = params[0];
        var args = params.slice(1);
        return model[fn] && model[fn].apply(model, args);
    };

    // inject per scene mods
    if (scene_mod_list['live_game_unit_alert'])
        loadMods(scene_mod_list['live_game_unit_alert']);

    // setup send/recv messages and signals
    app.registerWithCoherent(model, handlers);

    // Activates knockout.js
    ko.applyBindings(model);

    // run start up logic
    model.setup();
});
