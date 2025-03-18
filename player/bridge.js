print = printT = console.log;

math = Math;
math.rad = function(degrees) {
	return degrees * (Math.PI / 180);
};
math.deg = function(radians) {
	return radians / (Math.PI / 180);
};

var fatalError = false;
function assert(bool, message) {
	if (bool) return;
	fatalError = true;
	throw new Error(message);
}
function idx(index) {
	if (Number.isInteger(index)) return index-1;
	return index;
}

function isString(value) {
	return typeof value==='string'
}
function isTable(value) {
	return typeof value==='object'
}
function isNumber(value) {
	return typeof value==='number'
}
function LuaTrue(bool) {
	if (typeof bool==='undefined' || bool===false || bool==null) return false;	
	return true;
}

function push(list,value) {
	list.push(value);
}
function pop(list) {
	return list.pop();
}
function copy(listOrHash) {
	var copy;
	if (Array.isArray(listOrHash)) {
		var len = listOrHash.length;
		copy = Array(len);
		for (var i=0; i<len; i++) {
			copy[i] = listOrHash[i];
		}
	}
	else {
		var keys = Object.keys(listOrHash);
		copy = {};
		for (var i=0; i<keys.length; i++) {
			var key = keys[i];
			copy[key] = listOrHash[key];
		}
	}
	return copy;
}

function LuaFloatToString(n) {
	if (n!=Math.floor(n)) {
		var s = n<0 ? -1 : 1;
		n = Math.abs(n).toFixed(8);
		n = Number(n.substring(0,8)) * s;
		if (n==Math.floor(n)) n = n.toFixed(1);
	}
	return n;
}
function join(list,glue) {
	// return list.join(glue);
	var str = '';
	var arr = [];
	for (var i=0; i<list.length; i++) {
		if (i) arr.push(glue);
		var item = list[i];
		if (typeof item=='number') {
			item = LuaFloatToString(item);
		}
		arr.push(item);
	}
	return arr.join('');
}
function substring(str,start,fin) {
	return str.substring(start-1,fin);
}
function split(str,delim) {
	return str.split(delim)
}
function match(str,pattern) {
	return str.match(new RegExp(pattern.replace('%s','\\s'))) ? true : false;
}
function ascii(str,pos) {
	return str.charCodeAt(pos-1);
}
function fromAscii(i) {
	return String.fromCharCode(i);
}
function random(min,max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getDatetime() {
	var now = new Date;
	var epoch = new Date('January 1, 2000 00:00:00 GMT+00:00');
	return {
		year : now.getFullYear(), // 1000-9999 (NOTE: different from Lua's 1900-10000)
		month : now.getMonth()+1, // 1-12
		day : now.getDate(), // 1-31
		weekday : now.getDay(), // 0-6
		hour : now.getHours(), // 0-23
		minute : now.getMinutes(), // 0-59
		second : now.getSeconds(), // 0-59
		millisecond : now.getMilliseconds(), // 0-999
		timestamp: Math.floor((now.getTime() - epoch.getTime()) / 1000), 
	};
}

function lpad(str,n,c) {
	return String(str).padStart(n,c);
}
function rpad(str,n,c) {
	return String(str).padEnd(n,c);
}

function fatal(message) {
	fatalError = true;
	throw new Error('Fatal: '+message+' ('+errorSource+':'+errorLine+')');
}
function warn(message) {
	print('Warning: '+message+' ('+errorSource+':'+errorLine+')')
}

var Color = {
	White:0,
	Black:1,
	Clear:2,
};

// --------------------------------------------------------
// not part of bridge but required to support drawing functions

var Renderer = {
	image: null,
	bitmap: null,
	canvas: null,
	context: null,
	imagedata: null,
	clip: null,
	stack:[],
};

function Bitmap(width, height, color) {
	this.width = width;
	this.height = height;
	this.color = Color.Black;
	this.backgroundColor = color;

	var data = new Uint8Array(width * height);
	this.data = data;
	
	this.clear = function() {
		for (var i=0; i<data.length; i++) {
			data[i] = this.backgroundColor;
		}
	};

    this.drawPixel = function(x, y) {
		let cx,cy,cw,ch;
		let clip = Renderer.clip;
		if (clip) {
			cx = clip.x;
			cy = clip.y;
			cw = clip.width;
			ch = clip.height;
		}
		else cx = cy = cw = ch = 0;

        if (cw && ch && (x < cx || x >= cx + cw || y < cy || y >= cy + ch)) {
            return;
        }
        data[y * this.width + x] = this.color;
    }
	
	this.fillRect = function(x,y,width,height) {
		let cx,cy,cw,ch;
		let clip = Renderer.clip;
		if (clip) {
			cx = clip.x;
			cy = clip.y;
			cw = clip.width;
			ch = clip.height;
		}
		else cx = cy = cw = ch = 0;
		
		var w = this.width;
		var c = this.color;
		for (var oy=0; oy<height; oy++) {
			for (var ox=0; ox<width; ox++) {
				if (cw && ch && (x+ox<cx || x+ox>=cx+cw || y+oy<cy || y+oy>=cy+ch)) continue; // clipped
				
				var i = (y + oy) * w + (x + ox);
				data[i] = c;
			}
		}
	};
	
	this.drawBitmap = function(bitmap,x,y) {
		let src = bitmap;
		let dst = Renderer.bitmap;
	
		let sx = 0;
		let sy = 0;
		let sp = src.width
		let sw = src.width;
		let sh = src.height;
	
		let dx = x|0;
		let dy = y|0;
		let dp = dst.width;
		
		let cx,cy,cw,ch;
		let clip = Renderer.clip;
		if (clip) {
			cx = clip.x;
			cy = clip.y;
			cw = clip.width;
			ch = clip.height;
		}
		else cx = cy = cw = ch = 0;
		
		for (var oy=0; oy<sh; oy++) {
			for (var ox=0; ox<sw; ox++) {
				if (cw && ch && (dx+ox<cx || dx+ox>=cx+cw || dy+oy<cy || dy+oy>=cy+ch)) continue; // clipped
				
				var di = (dy + oy) * dp + (dx + ox);
				var si = (sy + oy) * sp + (sx + ox);
				var c = src.data[si];
				if (c==Color.Clear) continue;
				dst.data[di] = c;
			}
		}
	};
	
	this.tileBitmap = function(bitmap,x,y,width,height) {
		x |= 0;
		y |= 0;

		var w = bitmap.width;
		var h = bitmap.height;
		var cols = Math.ceil(width / w);
		var rows = Math.ceil(height / h);
		var dst = Renderer.bitmap;
		var src = bitmap;
		for (var oy=0; oy<rows; oy++) {
			for (var ox=0; ox<cols; ox++) {
				dst.drawBitmap(src,x+ox*w,y+oy*h);
			}
		}
	};

	this.clear();
}

function setupContext(id) {
	var roomWidth = roomTilesWide * tileWidth;
	var roomHeight = roomTilesHigh * tileHeight;
	
	var container = document.getElementById(id);
	var wrapper = document.createElement('i');
	var backing = document.createElement('b');
	var image = document.createElement('img');
	var scale = 2;
	image.width = roomWidth * scale;
	image.height = roomHeight * scale;
	container.appendChild(wrapper);
	wrapper.appendChild(backing);
	backing.appendChild(image);
	
	var canvas = document.createElement('canvas');
	canvas.width = roomWidth;
	canvas.height = roomHeight;
	var context = canvas.getContext('2d');
	var imagedata = context.getImageData(0,0,canvas.width,canvas.height);
	
	Renderer.image = image;
	Renderer.bitmap = Renderer.stack[0] = new Bitmap(roomWidth,roomHeight,Color.Black);
	Renderer.canvas = canvas;
	Renderer.context = context;
	Renderer.imagedata = imagedata;
	
}
function renderContext() {
	let width = Renderer.bitmap.width;
	let height = Renderer.bitmap.height;
	let src = Renderer.bitmap.data;
	let dst = Renderer.imagedata.data;
	
	for (var y=0; y<height; y++) {
		for (var x=0; x<width; x++) {
			var i = y * width + x;
			var j = i * 4;
			switch (src[i]) {
				case Color.White:
					dst[j + 0] = 255;
					dst[j + 1] = 255;
					dst[j + 2] = 255;
					dst[j + 3] = 255;
					break;
				case Color.Black:
					dst[j + 0] = 0;
					dst[j + 1] = 0;
					dst[j + 2] = 0;
					dst[j + 3] = 255;
					break;
				case Color.Clear:
					dst[j + 0] = 0;
					dst[j + 1] = 0;
					dst[j + 2] = 0;
					dst[j + 3] = 0;
					break;
			}
		}
	}
	Renderer.context.putImageData(Renderer.imagedata,0,0);
	Renderer.image.src = Renderer.canvas.toDataURL('image/png');
}

// --------------------------------------------------------

function pushContext(bitmap) {
	Renderer.stack.push(bitmap);
	Renderer.bitmap = bitmap;
}
function popContext() {
	Renderer.stack.pop();
	Renderer.bitmap = Renderer.stack[Renderer.stack.length-1];
}
function clearContext() {
	Renderer.bitmap.clear();
}
function setColor(color) {
	Renderer.bitmap.color = color;
}
function setBackgroundColor(color) {
	Renderer.bitmap.backgroundColor = color;
}
function drawPixel(x,y) {
    Renderer.bitmap.drawPixel(x, y);
}
function newBitmap(width,height,color) {
	return new Bitmap(width|0,height|0,color);
}
function drawBitmap(bitmap,x,y) {
	Renderer.bitmap.drawBitmap(bitmap,x|0,y|0);
}
function tileBitmap(bitmap,x,y,width,height) {
	Renderer.bitmap.tileBitmap(bitmap,x|0,y|0,width|0,height|0);
}
function clearBitmap(bitmap) {
	bitmap.clear();
}
function fillRect(x,y,width,height) {
	Renderer.bitmap.fillRect(x|0,y|0,width|0,height|0);
}

function setClipRect(x,y,width,height) {
	Renderer.clip = {x:x|0,y:y|0,width:width|0,height:height|0};
}
function clearClipRect() {
	Renderer.clip = null;
}

function invert(flag) {
	if (flag) Renderer.image.parentNode.classList.add('invert');
	else Renderer.image.parentNode.classList.remove('invert');
}
function offset(ox,oy) {
	Renderer.image.style.top = (oy|0)+'px';
	Renderer.image.style.left = (ox|0)+'px';
}

// --------------------------------------------------------

function newVoice(type,a,d,s,r,v) {
	return new Voice(type, {
		attack: a,
		decay: d,
		sustain: s,
		release: r,
		volume: v,
	});
}
function setEnvelope(voice, a,d,s,r,v) {
	voice.envelope.attack = a;
	voice.envelope.decay = d;
	voice.envelope.sustain = s;
	voice.envelope.release = r;
	voice.envelope.volume = v;
}
function setVolume(voice,v) {
	voice.setVolume(v);
}
function playNote(voice,pitch,dur,when) {
	// var now = audioTime();
	// var offset = now - when;
	// if (offset>0) warn(`Missed playNote() time (${Math.floor(when*1000)}ms) by ${Math.floor(offset*1000)}ms. Try reducing your bpm.`);
	voice.playNote(pitch, dur, when);
}
function stopNote(voice) {
	voice.stop();
}
function audioTime() {
	return Playhead.getCurrentTime()
}
function resetTime() {
	Playhead.resetTime()
}

// --------------------------------------------------------

function getFile(path) {
	// TODO: unused for now
}
function putFile(path, text) {
	Local.put(path, text, null);
}
function putJson(path, table) {
	putFile(path, JSON.stringify(table));
}
function deleteFile(path) {
	Local.delete(path, null);
}

function loadStore() {
	var s = window.localStorage.getItem('store-'+currentGameId);
	store = s ? JSON.parse(s) : {};
}
function saveStore() {
	if (modifiedStore) {
		window.localStorage.setItem('store-'+currentGameId, JSON.stringify(store)); 
		modifiedStore = false;
	}
}

// --------------------------------------------------------
var crankAbsolute = 0;
var crankRelative = 0;
var crankDocked = true;
function crank() {
	return {
		absolute: crankAbsolute,
		relative: crankRelative,
		docked: crankDocked,
	};
}
var motionX = 0.0;
var motionY = 1.0;
var motionZ = 0.0;
function motion() {
	return {
		x: motionX,
		y: motionY,
		z: motionZ,
	};
}

function startAccelerometer(){}
function stopAccelerometer(){}

// --------------------------------------------------------
function applyOverrides() { // called after runtime.js is loaded
	function LuaAdd(a,b) {
		if (typeof a==='string' || typeof b==='string') {
			fatal("PulpScript does not support string concatenation");
		}
		return a + b;
	}
	Action.add = function(args) {
		var varname = args[idx(2)];
		setVarValue(varname, LuaAdd(getVarValue(varname), doValue(args[idx(3)])))
	}
}