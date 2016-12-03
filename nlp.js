var NLP = {};

NLP.byteToChar = [];
for(var i=0; i<256; i++)
	NLP.byteToChar.push(String.fromCharCode(i));

NLP.byteToChar['-'.charCodeAt(0)] = '-';
NLP.byteToChar['1'.charCodeAt(0)] = 'ą';
NLP.byteToChar['2'.charCodeAt(0)] = 'ć';
NLP.byteToChar['3'.charCodeAt(0)] = 'ę';
NLP.byteToChar['4'.charCodeAt(0)] = 'ł';
NLP.byteToChar['5'.charCodeAt(0)] = 'ń';
NLP.byteToChar['6'.charCodeAt(0)] = 'ó';
NLP.byteToChar['7'.charCodeAt(0)] = 'ś';
NLP.byteToChar['8'.charCodeAt(0)] = 'ź';
NLP.byteToChar['9'.charCodeAt(0)] = 'ż';

NLP.charToByte = new Uint8Array(256*256);
for(var i='a'.charCodeAt(0); i<='z'.charCodeAt(0); i++){
	NLP.charToByte[i] = i;
	NLP.charToByte[i-'a'.charCodeAt(0)+'A'.charCodeAt(0)] = i;
}

NLP.charToByte['-'.charCodeAt(0)] = '-'.charCodeAt(0);
NLP.charToByte['ą'.charCodeAt(0)] = '1'.charCodeAt(0);
NLP.charToByte['ć'.charCodeAt(0)] = '2'.charCodeAt(0);
NLP.charToByte['ę'.charCodeAt(0)] = '3'.charCodeAt(0);
NLP.charToByte['ł'.charCodeAt(0)] = '4'.charCodeAt(0);
NLP.charToByte['ń'.charCodeAt(0)] = '5'.charCodeAt(0);
NLP.charToByte['ó'.charCodeAt(0)] = '6'.charCodeAt(0);
NLP.charToByte['ś'.charCodeAt(0)] = '7'.charCodeAt(0);
NLP.charToByte['ź'.charCodeAt(0)] = '8'.charCodeAt(0);
NLP.charToByte['ż'.charCodeAt(0)] = '9'.charCodeAt(0);
NLP.charToByte['Ą'.charCodeAt(0)] = '1'.charCodeAt(0);
NLP.charToByte['Ę'.charCodeAt(0)] = '2'.charCodeAt(0);
NLP.charToByte['Ć'.charCodeAt(0)] = '3'.charCodeAt(0);
NLP.charToByte['Ł'.charCodeAt(0)] = '4'.charCodeAt(0);
NLP.charToByte['Ń'.charCodeAt(0)] = '5'.charCodeAt(0);
NLP.charToByte['Ó'.charCodeAt(0)] = '6'.charCodeAt(0);
NLP.charToByte['Ś'.charCodeAt(0)] = '7'.charCodeAt(0);
NLP.charToByte['Ź'.charCodeAt(0)] = '8'.charCodeAt(0);
NLP.charToByte['Ż'.charCodeAt(0)] = '9'.charCodeAt(0);

NLP.toByte = function(s,offset,length){
	offset = offset || 0;
	length = length || s.length;
	var a = new Uint8Array(length);
	for(var i=0; i<a.length; i++){
		var b = this.charToByte[s.charCodeAt(offset+i)];
		if(b==0)
			return null;
		a[i] = b;
	}
	return a;
}

NLP.toString = function(b,offset,length){
	offset = offset || 0;
	length = length || b.length;
	a = [];
	for(var i=0; i<length; i++)
		a.push(this.byteToChar[b[offset+i]]);
	return a.join('');
}

NLP.load = function(buff){
	var sizebuff = new Uint32Array(buff);
	var offset = 0;
	
	var size = sizebuff[offset/4];
	offset += 4;
	this.text = new Uint8Array(buff,offset,size);
	offset += size;
	
	size = sizebuff[offset/4];
	offset += 4;
	this.suffix = String.fromCharCode.apply(null,new Uint8Array(buff,offset,size)).split("\0").map(function(a){return new Uint8Array(a.split("").map(function(a){return a.charCodeAt(0)}))});
	offset += size;
	
	size = sizebuff[offset/4];
	offset += 4;
	this.data = new Uint32Array(buff,offset,size>>2);
	offset += size;
	
	size = sizebuff[offset/4];
	offset += 4;
	this.tags = new Uint32Array(buff,offset,size>>2);
	offset += size;
	
	size = sizebuff[offset/4];
	offset += 4;
	this.indexValues = new Uint32Array(buff,offset,size>>2);
	offset += size;
	
	size = sizebuff[offset/4];
	offset += 4;
	this.indexKeys = new Uint32Array(buff,offset,size>>2);
};

NLP.compare = function(k,b){
	var offset = NLP.data[k*2+0]&0x1FFFFF;
	var suff = NLP.data[k*2+1]&0xFF;
	var size = (NLP.data[k*2+1]>>8)&0x1F;
	if(size > b.length){
		for(var i=0; i<b.length; i++){
			if(NLP.text[offset+i] > b[i])
				return 1;
			if(NLP.text[offset+i] < b[i])
				return -1;
		}
		return 1;
	}
	for(var i=0; i<size; i++){
		if(NLP.text[offset+i] > b[i])
			return 1;
		if(NLP.text[offset+i] < b[i])
			return -1;
	}
	if(suff == 255){
		if(size == b.length)
			return 0;
		return -1;
	}
	var suffb = NLP.suffix[suff];
	var l = Math.min(suffb.length, b.length-size);
	for(var i=0; i<l; i++){
		if(suffb[i] > b[size+i])
			return 1;
		if(suffb[i] < b[size+i])
			return -1;
	}
	if(size+suffb.length > b.length)
		return 1;
	if(size+suffb.length < b.length)
		return -1;
	return 0;
}

NLP.getLexem = function(s){
	var b = null;
	var neg = false;
	if(		s.length > 3 &&
			(s[0]=='n' || s[0]=='N') &&
			(s[1]=='i' || s[1]=='I') &&
			(s[2]=='e' || s[2]=='E')
	){
		b = NLP.toByte(s,3,s.length-3);
		neg = true;
	}else{
		b = NLP.toByte(s);
	}
	if(b == null)
		return null;
	var lo = 0;
	var hi = NLP.data.length - 1;
	while (lo <= hi) {
		var mid = lo + ((hi - lo) >> 1);
		if(NLP.compare(mid,b) > 0){
			hi = mid - 1;
		}else if(NLP.compare(mid,b) < 0){
			lo = mid + 1;
		}else{
			var lexem = new NLP.Lexem(mid,neg);
			if(lexem.neg != neg)
				return null;
			return lexem;
		}
	}
	return null;
}

NLP.getAllFormsOf = function(l){
	var base = l.getBase();
	var start = NLP.indexKeys[base];
	var n = ((base==NLP.indexKeys.length-1)?NLP.indexValues.length:NLP.indexKeys[base+1])-start;
	var o = [];
	for(var i=0; i<n; i++)
		o.push(new NLP.Lexem(NLP.indexValues[start+i],l.neg));
	return o;
}

NLP.getAdjectiveForNoun = function(list,noun){
	var n = 0;
	for(var i=0; i<list.length; i++){
		if(list[i].isCompatibleWith(noun)){
			var t = list[i];
			list[i] = list[n];
			list[n] = t;
			n += 1;
		}
	}
	if(n == 0)
		return null;
	return list[Math.floor(Math.random()*n)].toString();
}

NLP.Lexem = function(id,neg){
	this.id = id;
	var negmask = NLP.tags[4*(NLP.data[this.id*2+0]>>21)+3]>>2;
	this.neg = negmask==2||(negmask==3 && neg);
}

NLP.Lexem.prototype.toString = function(){
	var offset = NLP.data[this.id*2+0]&0x1FFFFF;
	var suff = NLP.data[this.id*2+1]&0xFF;
	var length = (NLP.data[this.id*2+1]>>8)&0x1F;
	return (this.neg?"nie":"")+NLP.toString(NLP.text,offset,length)+(suff==255?"":NLP.toString(NLP.suffix[suff]));
}

NLP.Lexem.prototype.getBase = function(){
	return NLP.data[this.id*2+1]>>13;
}

NLP.Lexem.prototype.getPOS = function(){
	return (NLP.data[this.id*2+1]>>13)>0?'ADJECTIVE':'NOUN';
}

NLP.Lexem.prototype.isCompatibleWith = function(lexem){
	var tag1 = 4*(NLP.data[this.id*2+0]>>21);
	var tag2 = 4*(NLP.data[lexem.id*2+0]>>21);
	return (
		((NLP.tags[tag1+0] & NLP.tags[tag2+0]) == NLP.tags[tag2+0]) &&
		((NLP.tags[tag1+1] & NLP.tags[tag2+1]) == NLP.tags[tag2+1]) &&
		((NLP.tags[tag1+2] & NLP.tags[tag2+2]) == NLP.tags[tag2+2]) &&
		(((NLP.tags[tag1+3] & NLP.tags[tag2+3])&0x03) == (NLP.tags[tag2+3]&0x03))
	);
}
