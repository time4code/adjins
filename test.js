const fs = require('fs');
const path = require('path');
const lzma = require("lzma");
const NLP = require('./nlp.class');

////////////////////////model-file-read
const modelname = path.join(__dirname, 'dict.lzma');
fs.readFile(modelname, function(err, buffer) {
	if (err) throw err;

    console.log(' - [ node ] model file loaded', buffer.constructor.name);
    lzmaDecompress(buffer);
});

	// NLP.load(lzmaOutStream.data.buffer);
	// const word = 'pies'
	// const lexem = NLP.getLexem(word);
	// lexem.getPOS()


////////////////////lzma-decompress
const lzmaDecompress = buffer => {
	lzma.decompress(new Uint8Array(buffer), (result, err) => {
		if (err) throw err;
		console.log(' - [ lzma ] finish', result.constructor.name);
		

		const nlp = new NLP();
		
		nlp.load(toArrayBuffer(result), () => {
			console.log(' - [ nlp ] model loaded');
			const words = [
				'przyjaciela',
				'ciągu',
				'narodził',
				'już',
				'1832',
				'Według',
				'informował',
				'długi',
				'trudny'
			];
			console.log(' - ----------------------------- -');
			for (let i=0; i<words.length; i++) {
				const lexem = nlp.getLexem(words[i]);
				if (lexem)
					console.log(` - [ lexem ] ${words[i]}`, lexem.getPOS());
				else 
					console.log(` - [ lexem ] ${words[i]}`, lexem);
			}
		});
	}, percent => {
		console.log(` - [ lzma ] loading  ${Math.round(percent * 100 * 10) / 10}%`);
	});
}

const toArrayBuffer = function(buf) {
    const ab = new ArrayBuffer(buf.length);
    const view = new Uint8Array(ab);
    for (var i = 0; i < buf.length; ++i) {
        view[i] = buf[i];
    }
    return ab;
}
// if (lexem == null || lexem.getPOS() != 'ADJECTIVE')
// 	er.push(list[i]);
// else
// 	ok.push.apply(ok,NLP.getAllFormsOf(lexem));
