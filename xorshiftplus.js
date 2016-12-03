//f*** JS Math.random()
//https://en.wikipedia.org/wiki/Xorshift

//OMG WHO WROTE THE SPECYFICATION FOT BIT OPERATIONS IN JAVASCRIPT?
//F**K HIM

function XORShiftPlus(a,b,c,d){
	if(typeof a === 'undefined')
		a = Math.floor(Math.random()*0xFFFFFFFF);
	if(typeof b === 'undefined')
		b = Math.floor(Math.random()*0xFFFFFFFF);
	if(typeof c === 'undefined')
		c = Math.floor(Math.random()*0xFFFFFFFF);
	if(typeof d === 'undefined')
		d = Math.floor(Math.random()*0xFFFFFFFF);
	this.seed0 = a&0x7FFFFF;
	this.seed1 = (a>>>23) | ((b&0x3FFF)<<9);
	this.seed2 = b>>>14;
	this.seed3 = c&0x7FFFFF;
	this.seed4 = (c>>>23) | ((d&0x3FFF)<<9);
	this.seed5 = d>>>14;
}

XORShiftPlus.prototype.rand = function(a,b){
	a = a || 0;
	var x0 = this.seed0; //23bit
	var x1 = this.seed1; //23bit
	var x2 = this.seed2; //18bit
	var y0 = this.seed3; //23bit
	var y1 = this.seed4; //23bit
	var y2 = this.seed5; //18bit
	this.seed0 = y0;
	this.seed1 = y1;
	this.seed2 = y2;
	x1 ^= x0;	
	this.seed3 = x0 ^ y0 ^ ((x0>>17)|((x1&0x1FFFF)<<6)) ^ ((y1>>3)|((y2&0x7)<<20));
	this.seed4 = x1 ^ y1 ^ ((x1>>17)|((x2&0x1FFFF)<<6)) ^ (y2>>3);
	this.seed5 = x2 ^ y2 ^ (x2>>17);
	x0 = this.seed3+y0;
	x1 = this.seed4+y1+(x0>0x7FFFFF?1:0);
	x2 = this.seed5+y2+(x1>0x7FFFFF?1:0);
	var r = (x0&0x7FFFFF) + (x1&0x7FFFFF)*0x800000 + (x2&0x7F)*0x400000000000;
	return b?(r%b)+a:r;
}