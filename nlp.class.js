// 'use strict'
// const promise = require('bluebird');
const util = require('util');

const Lexem = function (id, neg, NLP) {
	this.NLP = NLP;
	this.id = id;
	const negmask = NLP.tags[4*(NLP.data[this.id*2+0]>>21)+3]>>2;
	this.neg = negmask==2||(negmask==3 && neg);
}

Lexem.prototype.toString = function () {
	let offset = this.NLP.data[this.id*2+0]&0x1FFFFF;
	let suff = this.NLP.data[this.id*2+1]&0xFF;
	let length = (this.NLP.data[this.id*2+1]>>8)&0x1F;
	const result = (
		this.neg
			? "nie"
			: "") 
	+ this.NLP.toString(this.NLP.text, offset, length) 
	+ (	suff == 255
			? "" 
			: this.NLP.toString(this.NLP.suffix[suff])
	);
	return result; 
}

Lexem.prototype.getBase = function () {
	return this.NLP.data[this.id*2+1]>>13;
}

Lexem.prototype.getPOS = function () {
	return (this.NLP.data[this.id*2+1]>>13) > 0
		? 'ADJECTIVE'
		: 'NOUN';
}

Lexem.prototype.isCompatibleWith = function(lexem){
	var tag1 = 4*(this.NLP.data[this.id*2+0]>>21);
	var tag2 = 4*(this.NLP.data[lexem.id*2+0]>>21);
	return (
		((this.NLP.tags[tag1+0] & this.NLP.tags[tag2+0]) == this.NLP.tags[tag2+0]) &&
		((this.NLP.tags[tag1+1] & this.NLP.tags[tag2+1]) == this.NLP.tags[tag2+1]) &&
		((this.NLP.tags[tag1+2] & this.NLP.tags[tag2+2]) == this.NLP.tags[tag2+2]) &&
		(((this.NLP.tags[tag1+3] & this.NLP.tags[tag2+3])&0x03) == (this.NLP.tags[tag2+3]&0x03))
	);
}


class NLP {
	constructor() {
		this.charToByte = new Uint8Array(256*256);
		this.byteToChar = [];
		this.text = []; 
		this.suffix = []; 
		this.data = []; 
		this.tags = []; 
		this.indexValues = []; 
		this.indexKeys = [];

		for(var i=0; i<256; i++)
		this.byteToChar.push(String.fromCharCode(i));
		
		this.byteToChar['1'.charCodeAt(0)] = 'ą';
		this.byteToChar['-'.charCodeAt(0)] = '-';
		this.byteToChar['2'.charCodeAt(0)] = 'ć';
		this.byteToChar['3'.charCodeAt(0)] = 'ę';
		this.byteToChar['4'.charCodeAt(0)] = 'ł';
		this.byteToChar['5'.charCodeAt(0)] = 'ń';
		this.byteToChar['6'.charCodeAt(0)] = 'ó';
		this.byteToChar['7'.charCodeAt(0)] = 'ś';
		this.byteToChar['8'.charCodeAt(0)] = 'ź';
		this.byteToChar['9'.charCodeAt(0)] = 'ż';
		for(var i='a'.charCodeAt(0); i<='z'.charCodeAt(0); i++){
			this.charToByte[i] = i;
			this.charToByte[i-'a'.charCodeAt(0)+'A'.charCodeAt(0)] = i;
		}
		this.charToByte['-'.charCodeAt(0)] = '-'.charCodeAt(0);
		this.charToByte['ą'.charCodeAt(0)] = '1'.charCodeAt(0);
		this.charToByte['ć'.charCodeAt(0)] = '2'.charCodeAt(0);
		this.charToByte['ę'.charCodeAt(0)] = '3'.charCodeAt(0);
		this.charToByte['ł'.charCodeAt(0)] = '4'.charCodeAt(0);
		this.charToByte['ń'.charCodeAt(0)] = '5'.charCodeAt(0);
		this.charToByte['ó'.charCodeAt(0)] = '6'.charCodeAt(0);
		this.charToByte['ś'.charCodeAt(0)] = '7'.charCodeAt(0);
		this.charToByte['ź'.charCodeAt(0)] = '8'.charCodeAt(0);
		this.charToByte['ż'.charCodeAt(0)] = '9'.charCodeAt(0);
		this.charToByte['Ą'.charCodeAt(0)] = '1'.charCodeAt(0);
		this.charToByte['Ę'.charCodeAt(0)] = '2'.charCodeAt(0);
		this.charToByte['Ć'.charCodeAt(0)] = '3'.charCodeAt(0);
		this.charToByte['Ł'.charCodeAt(0)] = '4'.charCodeAt(0);
		this.charToByte['Ń'.charCodeAt(0)] = '5'.charCodeAt(0);
		this.charToByte['Ó'.charCodeAt(0)] = '6'.charCodeAt(0);
		this.charToByte['Ś'.charCodeAt(0)] = '7'.charCodeAt(0);
		this.charToByte['Ź'.charCodeAt(0)] = '8'.charCodeAt(0);
		this.charToByte['Ż'.charCodeAt(0)] = '9'.charCodeAt(0);
	}
	
	toByte(s,offset,length) {
		offset = offset || 0;
		length = length || s.length;
		let a = new Uint8Array(length);
		for (let i=0; i<a.length; i++) {
			let b = this.charToByte[s.charCodeAt(offset+i)];
			if (b==0)
				return null;
			a[i] = b;
		}
		return a;
	}
	
	toString(b,offset,length) {
		offset = offset || 0;
		length = length || b.length;
		a = [];
		for (var i=0; i<length; i++)
			a.push(this.byteToChar[b[offset+i]]);
		return a.join('');
	}
	
	async load(buff, cb) {
		let sizebuff = await new Uint32Array(buff);
		let offset = 0;
		
		let size = sizebuff[offset/4];
		offset += 4;
		this.text = await new Uint8Array(buff, offset, size);
		offset += size;
		
		size = sizebuff[offset/4];
		offset += 4;

		const suffix = await new util.TextDecoder('utf-8')
			.decode(new Uint8Array(buff, offset, size))
		// const suffix = await String.fromCharCode.apply(
		// 	null,
		// 	new Uint8Array(buff,offset,size)
		// )
		
		this.suffix = await suffix.split("\0").map(function (a) {
			return new Uint8Array(
				a.split("").map(function (a) {
					return a.charCodeAt(0)
				})
			);
		});
		offset += size;
		
		size = sizebuff[offset/4];
		offset += 4;
		this.data = await new Uint32Array(buff, offset, size>>2);
		offset += size;
		
		size = sizebuff[offset/4];
		offset += 4;
		this.tags = await new Uint32Array(buff, offset, size>>2);
		offset += size;
		
		size = sizebuff[offset/4];
		offset += 4;
		this.indexValues = await new Uint32Array(buff, offset, size>>2);
		offset += size;
		
		size = sizebuff[offset/4];
		offset += 4;
		this.indexKeys = await new Uint32Array(buff, offset, size>>2);

		await cb();
	}
	
	compare(k, b) {
		let offset = this.data[k*2+0]&0x1FFFFF;
		let suff = this.data[k*2+1]&0xFF;
		let size = (this.data[k*2+1]>>8)&0x1F;
		if (size > b.length) {
			for (let i=0; i<b.length; i++) {
				if (this.text[offset+i] > b[i])
					return 1;
				if (this.text[offset+i] < b[i])
					return -1;
			}
			return 1;
		}
		for (let i=0; i<size; i++){
			if (this.text[offset+i] > b[i])
				return 1;
			if (this.text[offset+i] < b[i])
				return -1;
		}
		if (suff == 255){
			if(size == b.length)
				return 0;
			return -1;
		}
		let suffb = this.suffix[suff];
		let l = Math.min(suffb.length, b.length-size);
		for (let i=0; i<l; i++) {
			if (suffb[i] > b[size+i])
				return 1;
			if (suffb[i] < b[size+i])
				return -1;
		}
		if (size+suffb.length > b.length)
			return 1;
		if (size+suffb.length < b.length)
			return -1;
		return 0;
	}
	
	getLexem(s) {
		let b = null;
		let neg = false;
		if (		s.length > 3 &&
				(s[0]=='n' || s[0]=='N') &&
				(s[1]=='i' || s[1]=='I') &&
				(s[2]=='e' || s[2]=='E')
		) {
			b = this.toByte(s,3, s.length-3);
			neg = true;
		} else {
			b = this.toByte(s);
		}
		if (b == null) return null;
		
		let lo = 0;
		let hi = this.data.length - 1;
	
		while (lo <= hi) {
			let mid = lo + ((hi - lo) >> 1);
			if (this.compare(mid, b) > 0) {
				hi = mid - 1;
			} else if (this.compare(mid, b) < 0) {
				lo = mid + 1;
			} else {
				let lexem = new Lexem(mid, neg, this);
				if (lexem.neg != neg)
					return null;
				return lexem;
			}
		}
		return null;
	}
	
	getAllFormsOf(l) {
		let base = l.getBase();
		let start = this.indexKeys[base];
		let o = [];
		let n = (
			(base == this.indexKeys.length-1) 
				? this.indexValues.length
				: this.indexKeys[base+1]
		) - start;
		
		for (var i=0; i<n; i++) {
			let lexem = new Lexem(this.indexValues[start+i], l.neg, this);
			if(lexem.neg == l.neg)
				o.push(lexem);
		}
		return o;
	}
};


module.exports = NLP;