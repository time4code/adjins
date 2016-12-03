//f*** JS Math.random()
//https://en.wikipedia.org/wiki/Xorshift

function XORShiftPlus(a,b,c,d){
	if(typeof a === 'undefined')
		a = Math.floor(Math.random()*0x1FFFFFFFFFFFFF);
	if(typeof b === 'undefined')
		b = Math.floor(Math.random()*0x1FFFFFFFFFFFFF);
	if(typeof c === 'undefined')
		c = Math.floor(Math.random()*0x1FFFFFFFFFFFFF);
	if(typeof d === 'undefined')
		d = Math.floor(Math.random()*0x1FFFFFFFFFFFFF);
	this.seed0 = a;
	this.seed1 = b;
	this.seed2 = c;
	this.seed3 = d;
}

XORShiftPlus.prototype.rand = function(a,b){
	a = a || 0;
	b = b || 0x1FFFFFFFFFFFFF; //2^53-1 ('couse double)
	var x0 = this.seed0;
	var x1 = this.seed1;
	var y0 = this.seed2;
	var y1 = this.seed3;
	this.seed0 = y0;
	this.seed1 = y1;
	x0 ^= (x0&0x1FF) << 23;
	x1 ^= (x0 >> 9) | ((x1&0x1FF) << 23);
	this.seed2 = x0 ^ y1 ^ ((x0 >> 17) | ((x1&0x7FFF) << 15)) ^ ((y0 >> 26) | ((y1&0x3FFFFFF) << 6));
	this.seed3 = x0 ^ y1 ^ (x1 >> 17) ^ (y1 >> 26);
	x0 = this.seed2 + y0;
	x1 = this.seed3 + y1 + (x0 > 0xFFFFFFFF?1:0);
	x0 &= 0xFFFFFFFF;
	return (((x0&0xFFFFFFFF)+((x1&0x1FFFFF)*0x100000000))%b)+a;
}