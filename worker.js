importScripts('lzma.min.js');
importScripts('nlp.js');

var debug = false;

function outStream(size){
	this.data = new Uint8Array(size);
	this.offset = 0;
	this.writeByte = function(value){
		this.data[this.offset++] = value;
	}
}

function inStream(data){
	this.offset = 0;
	this.cnt = Math.floor(data.length/100);
	this.readByte = function(value){
		if(--this.cnt == 0){
			this.cnt = Math.round(Math.floor(data.length/100),data.length-this.offset);
			postMessage(['lzma-progress',this.offset,data.length]);
		}
		return data[this.offset++];
	}
	this.getSize = function(){
		var size = data[5];
		size |= data[6] << 8;
		size |= data[7] << 16;
		size |= data[8] << 24;
		return size;
	}
}

var lzmaoutput = null;
var lzmainput = null;
var nlp = null;
var adjset = null;

function ajaxload(){
	var req = new XMLHttpRequest();
	req.open("GET", debug?"dict.db":"dict.lzma", true);
	req.responseType = "arraybuffer";
	req.addEventListener("progress", function(e){
		if(!e.lengthComputable)
			return;
		postMessage(['ajax-progress',e.loaded,e.total]);
	});
	req.addEventListener("load", function(e){
		if(this.status != 200){
			postMessage(['ajax-error']);
			return;
		}
		if(!debug){
			lzmainput = new inStream(new Uint8Array(this.response));
		}else{
			lzmaoutput = {'data':new Uint8Array(this.response)};
		}
		postMessage(['ajax-complete']);
	});
	req.addEventListener("error", function(e){
		postMessage(['ajax-error']);
	});
	req.addEventListener("abort", function(e){
		postMessage(['ajax-error']);
	});
	req.send();
}

function buildlist(list){
	list = list || "";
	list = list.split(/[\s,]+/);
	var cnt = list.length/100;
	var er = [];
	var ok = [];
	for(var i=0; i<list.length; i++){
		if(!list[i])
			continue;
		if(--cnt == 0){
			cnt = Math.round(Math.floor(list.length/100),list.length-i);
			postMessage(['mklist-progress',i,list.length]);
		}
		var lexem = NLP.getLexem(list[i]);
		if(lexem == null || lexem.getPOS() != 'ADJECTIVE')
			er.push(list[i]);
		else{
			ok.push.apply(ok,NLP.getAllFormsOf(lexem));
		}
	}
	postMessage(['mklist-complete',er]);
	return ok;
}

function parse(text,set){
	text = text || "";
	var re = /[^\s,.?!'"„”()]+|[,.?!]+/g;
	var lastEnd = 0;
	var isFirstWord = true;
	var lastPOS = 'UNKNOWN';
	var buff = "";
	var progress = 0;
	while(true){
		var m = re.exec(text);
		if(m == null)
			break;
		var s = m.index;
		var e = re.lastIndex;
		var p = Math.floor(100*s/text.length);
		if(p != progress){
			postMessage(['parse-progress',s,text.length]);
			progress = p;
		}
		var str = m[0];
		if(str.charAt(0)=='.' || str.charAt(0)=='!' || str.charAt(0)=='?'){
			lastPOS = 'UNKNOWN';
			isFirstWord = true;
		}else{
			var lexem = NLP.getLexem(str);
			if(lexem != null){
				if(s > lastEnd)
					buff += text.slice(lastEnd,s);
				lastEnd = e;
				if(lexem.getPOS() == 'ADJECTIVE'){
					buff += '<span class="adj">'+str+'</span>';
				}else if(lexem.getPOS() == 'NOUN'){
					if(lastPOS != 'ADJECTIVE'){
						var adj = NLP.getAdjectiveForNoun(set,lexem);
						if(adj != null){
							if(str[0].toUpperCase() == str[0] && isFirstWord){
								buff += '<span class="adj inserted">'+adj[0].toUpperCase()+adj.slice(1)+'</span> ';
								str = str[0].toLowerCase()+str.slice(1);
							}else{
								buff += '<span class="adj inserted">'+adj+'</span> ';
							}
						}
					}
					buff += '<span class="noun">'+str+'</span>';
				}
				lastPOS = lexem.getPOS();
			}else{
				lastPOS = 'UNKNOWN';
			}
			isFirstWord = false;
		}
	}
	if(lastEnd < text.length)
		buff += text.slice(lastEnd);
	postMessage(['parse-complete',buff]);
}

onmessage = function(e){
	switch(e.data[0]){
		case 'ajax-start':
			ajaxload();
			break;
		case 'lzma-start':
			if(!debug){
				lzmaoutput = new outStream(lzmainput.getSize());
				try{
					LZMA.decompressFile(lzmainput,lzmaoutput);
					lzmainput = null;
				}catch(e){
					postMessage(['lzma-error',e.toString()]);
					break;
				}
			}
			NLP.load(lzmaoutput.data.buffer);
			postMessage(['lzma-complete']);
			break;
		case 'mklist-start':
			adjset = buildlist(e.data[1]);
			break;
		case 'parse-start':
			parse(e.data[1],adjset);
			break;
	}
}