/**
 * Components
 * Created by CreaturePhil - https://github.com/CreaturePhil
 *
 * These are custom commands for the server. This is put in a seperate file
 * from commands.js and config/commands.js to not interfere with them.
 * In addition, it is easier to manage when put in a seperate file.
 * Most of these commands depend on core.js.
 *
 * Command categories: General, Staff, Server Management
 *
 * @license MIT license
 */

var fs = require("fs");
    path = require("path"),
    http = require("http"),
    request = require('request');

var components = exports.components = {

	/********************************************************************
	* Shop Commands
	********************************************************************/

	money: 'atm',
    pd: 'atm',
    atm: function (target, room, user, connection) {
        if (!this.canBroadcast()) return;
        if (target.length >= 19) return this.sendReply('Usernames must be less than 19 characters long.');

        var targetUser = this.targetUserOrSelf(target);

        if (!targetUser) {
            var userId = toId(target);
            var money = Core.atm.money(userId);

            return this.sendReplyBox(Core.atm.name(false, target) + Core.atm.display('money', money) + '<br clear="all">');
        }

        var money = Core.atm.money(targetUser.userid);

        return this.sendReplyBox(Core.atm.name(true, targetUser) + Core.atm.display('money', money) + '<br clear="all">');
    },

	shopp: 'shop',
    shop: function (target, room, user) {
        if (!this.canBroadcast()) return;
        return this.sendReply('|html|' + Core.shop(true));
    },

    helpshop: function () {
        if (!this.canBroadcast()) return;
        this.sendReplyBox(
            "<ul>" +
                "<li>/pd: consult your PokeDolares.</li>" +
                "<li>/shop: review items from the shop.</li>" +
                "<li>/buy: purchase an item from the shop.</li>" +
                "<li>/transferbuck [user], [money]: PD gives someone.  </li>" +
                "<li>/tc: check your trainer card or someone else.</li>" +
            "</ul>"
        );
    },

    buy: function (target, room, user) {
        if (!target) this.parse('/help buy');
        var userMoney = Number(Core.stdin('money', user.userid));
        var shop = Core.shop(false);
        var len = shop.length;
        while (len--) {
            if (target.toLowerCase() === shop[len][0].toLowerCase()) {
                var price = shop[len][2];
                if (price > userMoney) return this.sendReply('No tienes suficiente PD para comprar esto. Necesitas ' + (price - userMoney) + 'para comprar ' + target + '.');
                Core.stdout('money', user.userid, (userMoney - price));
                if (target.toLowerCase() === 'symbol') {
                    user.canCustomSymbol = true;
                    this.sendReply('You bought a custom symbol. Youll have your symbol after closed session for more than an hour. Now you can use /customsymbol.');
                    this.sendReply('If you no longer want your symbol, you can use /resetsymbol to return to your old symbol.');
                } else {
                    this.sendReply('Has purchased ' + target + '. Contact an administrator for receive ' + target + '.');
                }
                room.add(user.name + ' Has purchased a item ' + target + ' in the shop.');
            }
        }
    },

	transferbuck: 'transfermoney',
    transferbucks: 'transfermoney',
    transfermoney: function (target, room, user) {
        if (!target) return this.parse('/help transfermoney');
        if (!this.canTalk()) return;

        if (target.indexOf(',') >= 0) {
            var parts = target.split(',');
            parts[0] = this.splitTarget(parts[0]);
            var targetUser = this.targetUser;
        }

        if (!targetUser) return this.sendReply('Username ' + this.targetUsername + ' is offline.');
        if (targetUser.userid === user.userid) return this.sendReply('You can not transfer you money yourself.');
        if (isNaN(parts[1])) return this.sendReply('Use a real number.');
        if (parts[1] < 1) return this.sendReply('You may not transfer under a PD at a time.');
        if (String(parts[1]).indexOf('.') >= 0) return this.sendReply('You can not transfer PD with decimals.');

        var userMoney = Core.stdin('money', user.userid);
        var targetMoney = Core.stdin('money', targetUser.userid);

        if (parts[1] > Number(userMoney)) return this.sendReply('You can not transfer more PD than you have.');

        var b = 'PokeDolares';
        var cleanedUp = parts[1].trim();
        var transferMoney = Number(cleanedUp);
        if (transferMoney === 1) b = 'PokeDolar';

        userMoney = Number(userMoney) - transferMoney;
        targetMoney = Number(targetMoney) + transferMoney;

        Core.stdout('money', user.userid, userMoney, function () {
            Core.stdout('money', targetUser.userid, targetMoney);
        });

        this.sendReply(' You have successfully transferred' + transferMoney + ' ' + b + ' a ' + targetUser.name + '.  now you have' + userMoney + ' PD.');
        targetUser.send(user.name + ' ha transferido ' + transferMoney + ' ' + b + ' a tu cuenta. Ahora tienes ' + targetMoney + ' PD.');

		fs.appendFile('logs/transactions.log','\n'+Date()+': '+user.name+' transferred '+transferMoney+' '+b+' for ' + targetUser.name + '. ' +  user.name +' now have ' + userMoney + ' ' + b + ' y ' + targetUser.name + '  now have ' + targetMoney + ' ' + b +'.');
    },

	givebuck: 'givemoney',
    givebucks: 'givemoney',
    givemoney: function (target, room, user) {
        if (!user.can('givemoney')) return;
        if (!target) return this.parse('/help givemoney');

        if (target.indexOf(',') >= 0) {
            var parts = target.split(',');
            parts[0] = this.splitTarget(parts[0]);
            var targetUser = this.targetUser;
        }

        if (!targetUser) return this.sendReply('Username ' + this.targetUsername + ' is offline.');
        if (isNaN(parts[1])) return this.sendReply('Use a real number.');
        if (parts[1] < 1) return this.sendReply('You can not give less money.');
        if (String(parts[1]).indexOf('.') >= 0) return this.sendReply('You can not give PD with decimals.');

        var b = 'PokeDolares';
        var cleanedUp = parts[1].trim();
        var giveMoney = Number(cleanedUp);
        if (giveMoney === 1) b = 'PokeDolar';

        var money = Core.stdin('money', targetUser.userid);
        var total = Number(money) + Number(giveMoney);

        Core.stdout('money', targetUser.userid, total);

        this.sendReply(targetUser.name + ' He has obtained ' + giveMoney + ' ' + b + '. Now this user has ' + total + ' PD.');
        targetUser.send(user.name + ' has given you ' + giveMoney + ' ' + b + '. You have now ' + total + ' PD.');

                fs.appendFile('logs/transactions.log', '\n' + Date() + ': ' + targetUser.name + ' gano ' + giveMoney + ' ' + b + ' de ' + user.name + '. ' + 'Ahora el tiene ' + total + ' ' + b + '.');
    },

    takebuck: 'takemoney',
    takebucks: 'takemoney',
    takemoney: function (target, room, user) {
        if (!user.can('takemoney')) return;
        if (!target) return this.parse('/help takemoney');

        if (target.indexOf(',') >= 0) {
            var parts = target.split(',');
            parts[0] = this.splitTarget(parts[0]);
            var targetUser = this.targetUser;
        }

        if (!targetUser) return this.sendReply('Username ' + this.targetUsername + ' is offline.');
        if (isNaN(parts[1])) return this.sendReply('Use a real number.');
        if (parts[1] < 1) return this.sendReply('You can not take less than a PD at a time.');
        if (String(parts[1]).indexOf('.') >= 0) return this.sendReply('You can not take money with decimals.');

        var b = 'PokeDolares';
        var cleanedUp = parts[1].trim();
        var takeMoney = Number(cleanedUp);
        if (takeMoney === 1) b = 'PokeDolar';

        var money = Core.stdin('money', targetUser.userid);
        var total = Number(money) - Number(takeMoney);

        Core.stdout('money', targetUser.userid, total);

        this.sendReply(targetUser.name + ' He has lost' + takeMoney + ' ' + b + '. Now this user have ' + total + ' PD.');
        targetUser.send(user.name + ' Ha tomado ' + takeMoney + ' ' + b + ' de tu cuenta. Ahora tienes ' + total + ' PD.');

		fs.appendFile('logs/transactions.log', '\n' + Date() + ': ' + user.name + ' Quito ' + takeMoney + ' ' + b + ' de ' + targetUser.name + '. ' + 'Ahora el tiene ' + total + ' ' + b + '.');
    },

	pdlog: 'moneylog',
	moneylog: function(target, room, user, connection) {
		if (!this.can('lock')) return false;
		try {
			var log = fs.readFileSync('logs/transactions.log','utf8');
            return user.send('|popup|'+log);
		} catch (e) {
			return user.send('|popup|You have not set made a transactions.log in the logs folder yet.\n\n ' + e.stack);
		}
	},

	simbolo: 'customsymbol',
	customsymbol: function (target, room, user) {
        if (!user.canCustomSymbol) return this.sendReply('You need to buy this command in the Shop for use.');
        if (!target || target.length > 1) return this.parse('/help customsymbol');
        if (target.match(/[A-Za-z\d]+/g) || '?!+%@\u2605&~#'.indexOf(target) >= 0) return this.sendReply('Sorry, but you can not change the symbol you have chosen for security / stability.');
        user.getIdentity = function (roomid) {
            if (!roomid) roomid = 'lobby';
            var name = this.name;
            if (this.locked) {
                return '?' + name;
            }
            if (this.mutedRooms[roomid]) {
                return '!' + name;
            }
            var room = Rooms.rooms[roomid];
            if (room.auth) {
                if (room.auth[this.userid]) {
                    return room.auth[this.userid] + name;
                }
                if (room.isPrivate) return ' ' + name;
            }
            return target + name;
        };
        user.updateIdentity();
        user.canCustomSymbol = false;
        user.hasCustomSymbol = true;
    },

    resetsymbol: function (target, room, user) {
        if (!user.hasCustomSymbol) return this.sendReply('You dont have a customsymbol.');
        user.getIdentity = function (roomid) {
            if (!roomid) roomid = 'lobby';
            var name = this.name;
            if (this.locked) {
                return '?' + name;
            }
            if (this.mutedRooms[roomid]) {
                return '!' + name;
            }
            var room = Rooms.rooms[roomid];
            if (room.auth) {
                if (room.auth[this.userid]) {
                    return room.auth[this.userid] + name;
                }
                if (room.isPrivate) return ' ' + name;
            }
            return this.group + name;
        };
        user.hasCustomSymbol = false;
        user.updateIdentity();
        this.sendReply('Tu simbolo se ha restablecido.');
    },

	/********************************************************************
	* Other Commands
	********************************************************************/

	eating: 'away',
	gaming: 'away',
	sleep: 'away',
	work: 'away',
	working: 'away',
	sleeping: 'away',
	busy: 'away',
	afk: 'away',
	away: function (target, room, user, connection, cmd) {
		if (!this.can('away')) return false;
		// unicode away message idea by Siiilver
		var t = 'Away';
		var t2 = 'Away';
		switch (cmd) {
			case 'busy':
			t = 'Busy';
			t2 = 'Busy';
			break;
			case 'sleeping':
			t = 'Sleeping';
			t2 = 'Sleeping';
			break;
			case 'sleep':
			t = 'Sleep';
			t2 = 'Sleeping';
			break;
			case 'gaming':
			t = 'Gaming';
			t2 = 'Gaming';
			break;
			case 'working':
			t = 'Working';
			t2 = 'Working';
			break;
			case 'work':
			t = 'Work';
			t2 = 'Working';
			break;
			case 'cri':
			t = 'Crying';
			t2 = 'Crying';
			break;
			case 'cry':
			t = 'Cry';
			t2 = 'Crying';
			break;
			case 'eating':
			t = 'Eating';
			t2 = 'Eating';
			break;
			default:
			t = 'Away'
			t2 = 'Away';
			break;
		}

		if (user.name.length > 18) return this.sendReply('Your username exceeds the length limit.');

		if (!user.isAway) {
			user.originalName = user.name;
			var awayName = user.name + ' - '+t;
			//delete the user object with the new name in case it exists - if it does it can cause issues with forceRename
			delete Users.get(awayName);
			user.forceRename(awayName, undefined, true);

			if (user.isStaff) this.add('|raw|-- <b><font color="#088cc7">' + user.originalName +'</font color></b> is now '+t2.toLowerCase()+'. '+ (target ? " (" + escapeHTML(target) + ")" : ""));

			user.isAway = true;
		}
		else {
			return this.sendReply('You are already set as a form of away, type /back if you are now back.');
		}

		user.updateIdentity();
	},

	back: function (target, room, user, connection) {
		if (!this.can('away')) return false;

		if (user.isAway) {
			if (user.name === user.originalName) {
				user.isAway = false;
				return this.sendReply('Your name has been left unaltered and no longer marked as away.');
			}

			var newName = user.originalName;

			//delete the user object with the new name in case it exists - if it does it can cause issues with forceRename
			delete Users.get(newName);

			user.forceRename(newName, undefined, true);

			//user will be authenticated
			user.authenticated = true;

			if (user.isStaff) this.add('|raw|-- <b><font color="#088cc7">' + newName + '</font color></b> is no longer away.');

			user.originalName = '';
			user.isAway = false;
		}
		else {
			return this.sendReply('You are not set as away.');
		}

		user.updateIdentity();
	},

    regdate: function (target, room, user, connection) {
        if (!this.canBroadcast()) return;
        if (!target || target == "." || target == "," || target == "'") return this.parse('/help regdate');
        var username = target;
        target = target.replace(/\s+/g, '');

        var options = {
            host: "www.pokemonshowdown.com",
            port: 80,
            path: "/forum/~" + target
        };

        var content = "";
        var self = this;
        var req = http.request(options, function (res) {

            res.setEncoding("utf8");
            res.on("data", function (chunk) {
                content += chunk;
            });
            res.on("end", function () {
                content = content.split("<em");
                if (content[1]) {
                    content = content[1].split("</p>");
                    if (content[0]) {
                        content = content[0].split("</em>");
                        if (content[1]) {
                            regdate = content[1];
                            data = username + ' has registered' + regdate + '.';
                        }
                    }
                } else {
                    data = username + ' isnt registered.';
                }
                self.sendReplyBox(data);
                room.update();
            });
        });
        req.end();
    },

	img: 'image',
        image: function(target, room, user) {
                if (!user.can('declare', null, room)) return false;
                if (!target) return this.sendReply('/image [url], [tamaño]');
                var targets = target.split(',');
                var url = targets[0];
                var width = targets[1];
                if (!url || !width) return this.sendReply('/image [url], [width percentile]');
                if (url.indexOf('.png') === -1 && url.indexOf('.jpg') === -1 && url.indexOf('.gif') === -1) {
                        return this.sendReply('The URL must end in .png, .jpg o .gif');
                }
                if (isNaN(width)) return this.sendReply('The size must be a number.');
                if (width < 1 || width > 100) return this.sendReply('The size must be greater than 0 and less than 100.');
                this.add('|raw|<center><img width="'+width+'%" src="'+url+'"></center>');
        },

    u: 'urbandefine',
    ud: 'urbandefine',
    urbandefine: function (target, room, user) {
        if (!this.canBroadcast()) return;
        if (!target) return this.parse('/help urbandefine')
        if (target > 50) return this.sendReply('The phrase can not contain more than 50 characters.');

        var self = this;
        var options = {
            url: 'http://www.urbandictionary.com/iphone/search/define',
            term: target,
            headers: {
                'Referer': 'http://m.urbandictionary.com'
            },
            qs: {
                'term': target
            }
        };

        function callback(error, response, body) {
            if (!error && response.statusCode == 200) {
                var page = JSON.parse(body);
                var definitions = page['list'];
                if (page['result_type'] == 'no_results') {
                    self.sendReplyBox('No results for <b>"' + Tools.escapeHTML(target) + '"</b>.');
                    return room.update();
                } else {
                    if (!definitions[0]['word'] || !definitions[0]['definition']) {
                        self.sendReplyBox('No results for <b>"' + Tools.escapeHTML(target) + '"</b>.');
                        return room.update();
                    }
                    var output = '<b>' + Tools.escapeHTML(definitions[0]['word']) + ':</b> ' + Tools.escapeHTML(definitions[0]['definition']).replace(/\r\n/g, '<br />').replace(/\n/g, ' ');
                    if (output.length > 400) output = output.slice(0, 400) + '...';
                    self.sendReplyBox(output);
                    return room.update();
                }
            }
        }
        request(options, callback);
    },

    def: 'define',
    define: function (target, room, user) {
        if (!this.canBroadcast()) return;
        if (!target) return this.parse('/help define');
        target = toId(target);
        if (target > 50) return this.sendReply('The word can not be more than 50 characters.');

        var self = this;
        var options = {
            url: 'http://api.wordnik.com:80/v4/word.json/' + target + '/definitions?limit=3&sourceDictionaries=all' +
                '&useCanonical=false&includeTags=false&api_key=a2a73e7b926c924fad7001ca3111acd55af2ffabf50eb4ae5',
        };

        function callback(error, response, body) {
            if (!error && response.statusCode == 200) {
                var page = JSON.parse(body);
                var output = '<b>Definiciones para ' + target + ':</b><br />';
                if (!page[0]) {
                    self.sendReplyBox('No results for <b>"' + target + '"</b>.');
                    return room.update();
                } else {
                    var count = 1;
                    for (var u in page) {
                        if (count > 3) break;
                        output += '(' + count + ') ' + page[u]['text'] + '<br />';
                        count++;
                    }
                    self.sendReplyBox(output);
                    return room.update();
                }
            }
        }
        request(options, callback);
    },

    masspm: 'pmall',
    pmall: function (target, room, user) {
        if (!this.can('pmall')) return;
        if (!target) return this.parse('/help pmall');

        var pmName = '~Johto PM';

        for (var i in Users.users) {
            var message = '|pm|' + pmName + '|' + Users.users[i].getIdentity() + '|' + target;
            Users.users[i].send(message);
        }
    },
    
	
earnmoney: 'earnbucks',
	earnbucks: function(target, room, user) {
		if (!this.canBroadcast()) return false;

		return this.sendReplyBox('' +
		'Follow <a href="https://github.com/LegitButton"><u><b>LegitButton</b></u></a> on Github for 5 bucks. Once you done so pm an admin. If you don\'t have a Github account' +
		' you can make on <a href="https://github.com/join"><b><u>here</b></u></a>.');
	},	
	
 emoticons: 'emoticon',
    emoticon: function (target, room, user) {
        if (!this.canBroadcast()) return;
        var name = Object.keys(Core.emoticons),
            emoticons = [];
        var len = name.length;
        while (len--) {
            emoticons.push((Core.processEmoticons(name[(name.length-1)-len]) + '&nbsp;' + name[(name.length-1)-len]));
        }
        this.sendReplyBox('<b><u>List of emoticons:</b></u> <br/><br/>' + emoticons.join(' ').toString());
    },
	
model: 'sprite',
sprite: function(target, room, user) {
        if (!this.canBroadcast()) return;
		var targets = target.split(',');
			target = targets[0];
				target1 = targets[1];
if (target.toLowerCase().indexOf(' ') !== -1) {
target.toLowerCase().replace(/ /g,'-');
}
        if (target.toLowerCase().length < 4) {
        return this.sendReply('Model not found.');
        }
		var numbers = ['1','2','3','4','5','6','7','8','9','0'];
		for (var i = 0; i < numbers.length; i++) {
		if (target.toLowerCase().indexOf(numbers) == -1 && target.toLowerCase() !== 'porygon2' && !target1) {
        
        
		
		if (target && !target1) {
        return this.sendReply('|html|<img src = "http://www.pkparaiso.com/imagenes/xy/sprites/animados/'+target.toLowerCase().trim().replace(/ /g,'-')+'.gif">');
        }
	if (toId(target1) == 'back' || toId(target1) == 'shiny' || toId(target1) == 'front') {
		if (target && toId(target1) == 'back') {
        return this.sendReply('|html|<img src = "http://play.pokemonshowdown.com/sprites/xyani-back/'+target.toLowerCase().trim().replace(/ /g,'-')+'.gif">');
		}
		if (target && toId(target1) == 'shiny') {
        return this.sendReply('|html|<img src = "http://play.pokemonshowdown.com/sprites/xyani-shiny/'+target.toLowerCase().trim().replace(/ /g,'-')+'.gif">');
		}
		if (target && toId(target1) == 'front') {
        return this.sendReply('|html|<img src = "http://www.pkparaiso.com/imagenes/xy/sprites/animados/'+target.toLowerCase().trim().replace(/ /g,'-')+'.gif">');
	}
	}
	} else {
	return this.sendReply('Model not found.');
	}
	}
	},	
	
	
	
	
    badges: 'badges',
	badges: function (target, room, user) {
		if (!this.canBroadcast()) return;
		if (!target) target = user.userid;
		target = target.toLowerCase();
		target = target.trim();
		var matched = false;
		var admin = '<img src="http://i.imgur.com/lfPYzFG.png" title="Administrator">';
		var dev = '<img src="http://i.imgur.com/oyv3aga.png" title="Developer ">';
		var owner = '<img src="http://www.smogon.com/media/forums/images/badges/sitestaff.png.v.W3Bw1cia4qYxYu9_y90uyw" title="Hoster">';
		var leader = '<img src="http://i.imgur.com/5Dy544w.png" title="Leader">';
		var mod = '<img src="http://i.imgur.com/z3W1EAh.png" title="Moderator">';
		var driver = '<img src="http://i.imgur.com/oeKdHgW.png" title="Driver">';
		var voice = '<img src="http://i.imgur.com/yPAXWE9.png" title="Voice">';
		var artista = '<img src="http://www.smogon.com/forums/styles/default/xenforo/badges/artist.png" title="Artist">';
		if (target === 'list' || target === 'help') {
			matched = true;
			this.sendReplyBox('<center><b><font size="3">List of medals obtainable:</font></b>  ' + dev + '  ' + leader + '  ' + mod + '  ' + driver + ' ' + voice + '  ' + artista + '<hr>Al pasar el cursor por encima de la medalla revela lo que indica.</center>');
		}
		if (target === 'legitbutton' || target === 'neon') {
			matched = true;
			this.sendReplyBox('<center><b><font size="3">Legit Button:</font></b>  ' + owner + '  ' + admin + '  ' + dev + '</center>')
		}
		if (!matched) {
			this.sendReplyBox('<center><font color="grey"><font size="1">This user <i>' + target + '</i> have no badges.</font></font><hr><b><font size="3">List of medals obtainable:</font></b>  ' + dev + '  ' + leader + '  ' + mod + '  ' + driver + ' ' + voice + '  ' + artista + '<hr>Hovering above the medals reveals indicating.</center>');
		}
	},
	
	rankingtour: 'rankingtour',
    rankingtour: function (target, room, user) {
        if (!this.canBroadcast()) return;

        if (!target) target = 10;
        if (!/[0-9]/.test(target) && target.toLowerCase() !== 'all') target = -1;

        var ladder = Core.ladder(Number(target));
        if (ladder === 0) return this.sendReply('No one is free');

        return this.sendReply('|raw|<center>' + ladder + 'For the full ranking use /rankingtour <em>more</em> or to see a certain amount of users using /rankingtorneos <em>Número</em></center>');

},

    clearall: function (target, room, user) {
        if (!this.can('makeroom')) return this.sendReply('/clearall - Access denied.');
        var len = room.log.length,
            users = [];
        while (len--) {
            room.log[len] = '';
        }
        for (var user in room.users) {
            users.push(user);
            Users.get(user).leaveRoom(room, Users.get(user).connections[0]);
        }
        len = users.length;
        setTimeout(function() {
            while (len--) {
                Users.get(users[len]).joinRoom(room, Users.get(users[len]).connections[0]);
            }
        }, 1000);
    },

freebuck: function(target, room, user) {
		if (!this.canBroadcast()) return;
	  	if (!this.canTalk()) return;
	  	
	  	
	  	if (room.id !== 'casino') return this.sendReplyBox('This command can only be used in <button name="send" value="/join casino" target="_blank">The Casino</button>.');
		if (Users.get(''+user.name+'').money === 0) {
			return this.add('|c|~JohtoBucks|.custom /tb '+user.name+',1');		}
		if (Users.get(''+user.name+'').money >= 1) {
			return this.sendReply('You can only get a buck if you don\'t have any, ya nub.');
		}
		if (Users.get(''+user.name+'').money <= -1) {
			return this.sendReply('I\'m sorry, I cannot help you if you have negitive bucks. :I');
		}
		
	},	
	
	
requestroom: 'request',
		room: 'request',
		request: function(target, room, user) {
				if (!target) return this.sendReply('The proper syntax is /request [room name], [reason]');
				if (user.requested == true) {
				return this.sendReply('You have already requested a room to be created. Please wait till an admin sees the request');
				}
				if (target.indexOf(',') == -1) return this.sendReply('The proper syntax is /request [room name], [reason]');
				var targets = target.split(',');
			target = targets[1];
				target1 = targets[0];
				if (!target) {
						return this.sendReply('You need to specify the reason you want the room.');
				}
				if (!target1) {
						return this.sendReply('You need to specify the name of the room you want.');
				}

				if (Users.get('Legit Button')) {
				Users.get('Legit Button').send('|pm|~Johto Bot|~Legit Button|'+user.name+' has requested room \''+target1+'\' to be created. Purpose: '+target);
				}
				else if (Users.get('HoeenKid')) {
				Users.get('HoeenKid').send('|pm|~Johto Bot|~HoeenKid|'+user.name+' has requested room \''+target1+'\' to be created. Purpose: '+target);
				}
				else if (Users.get('Pradham')) {
				Users.get('Pradham').send('|pm|~Johto Bot|~Pradham|'+user.name+' has requested room \''+target1+'\' to be created. Purpose: '+target);
				}
				Rooms.get('staff').add(user.name+' has requested room \''+target1+'\' to be created. Purpose: '+target);
				user.requested = true;
				},	
	

legitbot: function(target, room, user) {
		if (!this.canBroadcast()) return;
		target = toId(target);
		var buffer = '';
		var matched = false;
		if (target === 'about') {
			matched = true;
			buffer += '|c|~Legit Bot|Legit Bot is a bot created by user Legit Button for the purpose displaying random data and data of Old Gen pokemon due to having a bot being hilariously failtastic';
		}
		if (target === 'quotecool') {
			matched = true;
			buffer += '|c|~Legit Bot|"[14:31:13] ~Legit Button: man Legit Bot is so cool" MAN I FUCKING LOVE THIS GUY';
		}
		if (target === 'quoteinspiration') {
			matched = true;
			buffer += '|c|~Legit Bot|"[15:01]&V4: if cant find - [15:01] &V4: make a way"- greatest quote, so inspirational .cry';
		}
		if (!matched) {
			buffer += '|c|~Legit Bot|The Legt Bot entry "'+target+'" was not found.';
		}
		this.sendReply(buffer);
	},


suspect: function(target, room, user) {
		if (!this.canBroadcast()) return;
		target = toId(target);
		var buffer = '';
		var matched = false;
		if (!target || target === 'all') {
			matched = true;
			buffer += '|c|~Legit Bot|Suspects and stuff';
		}
		if (target === 'gen4ou') {
			matched = true;
			buffer += '|c|~Legit Bot|Our current Gen 4 (DPPt) OU Suspects are the **retesting of Latias and Salamence from the gen 4 overused tier**';
		}
		if (target === 'gen4nu') {
			matched = true;
			buffer += '|c|~Legit Bot|Our current Gen 4 (DPPt) NU Suspects are the **banning of Espeon and Entei from the gen 4 Neverused tier**';
		}
		if (target === 'gen2uu') {
			matched = true;
			buffer += '|c|~Legit Bot|Our current Gen 2 (GSC) UU Suspects are the **Moving of Venusaur and Smeargle into BL-Borderline tier- from the gen 2 Underused tier**';
		}
		this.sendReply(buffer);
	},

	

rbysprite: function(target, room, user) {
		if (!this.canBroadcast()) return;
		this.sendReplyBox('<img src="https://play.pokemonshowdown.com/sprites/rby/'+target+'.png">');
	},

	xyicon: function(target, room, user) {
		if (!this.canBroadcast()) return;
		this.sendReply('|raw| <img src="http://www.serebii.net/pokedex-xy/icon/'+target+'.png">');
	},



	
	
	
	
	roomlist: function (target, room, user) {
    if (!this.can('roomlist')) return;

    var rooms = Object.keys(Rooms.rooms),
        len = rooms.length,
        official = ['<b><font color="#1a5e00" size="2">Official rooms:</font></b><br><br>'],
        nonOfficial = ['<hr><b><font color="#000b5e" size="2">Chat rooms:</font></b><br><br>'],
        privateRoom = ['<hr><b><font color="#5e0019" size="2">Private rooms:</font></b><br><br>'];

    while (len--) {
        var _room = Rooms.rooms[rooms[(rooms.length - len) - 1]];
        if (_room.type === 'chat') {

            if (_room.isOfficial) {
                official.push(('<a href="/' + _room.title + '" class="ilink">' + _room.title + '</a> |'));
                continue;
            }
            if (_room.isPrivate) {
                privateRoom.push(('<a href="/' + _room.title + '" class="ilink">' + _room.title + '</a> |'));
                continue;
            }
            nonOfficial.push(('<a href="/' + _room.title + '" class="ilink">' + _room.title + '</a> |'));

        }
    }

    this.sendReplyBox(official.join(' ') + nonOfficial.join(' ') + privateRoom.join(' '));
},


};

Object.merge(CommandParser.commands, components);
