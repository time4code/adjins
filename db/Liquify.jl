module Liquify
	using Tagset
	import Morfeusz
	import Base.isless
	
	import Base.isless
	
	immutable Entry
		word::UInt32
		base::UInt32
		tag::UInt128
		pos::UInt8
	end
	
	immutable SEntry
		word::ASCIIString
		base::ASCIIString
		tag::UInt128
		neg::UInt8
		pos::UInt8
	end
	
	isless(a::SEntry,b::SEntry) = isless(a.word,b.word)
	isless(a::AbstractString,b::SEntry) = isless(a,b.word)
	isless(a::SEntry,b::AbstractString) = isless(a.word,b)

	immutable S2Entry
		word::ASCIIString
		base::ASCIIString
		tag::UInt128
		sufix::Int32
		offset::Int32
		neg::UInt8
		pos::UInt8
	end
	
	S2Entry(a::SEntry,su::Int,of::Int) = S2Entry(a.word,a.base,a.tag,su,of,a.neg,a.pos)
	S2Entry(a::S2Entry,su::Int) = S2Entry(a.word,a.base,a.tag,su,a.offset,a.neg,a.pos)
	
	immutable S3Entry
		offset::UInt
		length::UInt
		sufix::UInt
		base::UInt
		tag::UInt128
		neg::UInt
		pos::UInt
	end
	
	macro in(x,V...) foldr((a,b)->:($x == $a || $b),:($x == $(V[end])),V[1:end-1]) end
	
	isnoun(x) = @in(x,subst,depr,ger)
	isadj(x) = @in(x,adj,pact,ppas)
		
	#const gendertab = [m1,m2,m3,f,n,n1,n2,p1,p2,p3]
	const gendertab = [1,2,3,4,5,5,5,6,7,7]
	
	function maketag(tag)
		g = gendertab[getgender(tag)]-1
		n = getnumber(tag)-1
		c = getcase(tag)-1
		d = getdegree(tag)-1
		return (UInt128(1<<g) << ((c*2+n)*7)) | (UInt128(1<<d) << (14*7))
	end
	
	function getpos(t)
		c = getclass(t)
		if isnoun(c) return 1
		elseif isadj(c) return 2
		else return 3 end
	end
		
	recodetab = zeros(UInt8,256*256)
	for i in UInt8('a'):UInt8('z') recodetab[i] = i end
	for i in UInt8('A'):UInt8('Z') recodetab[i] = i end
	for x in Dict('ą'=>'1','ć'=>'2','ę'=>'3','ł'=>'4','ń'=>'5','ó'=>'6','ś'=>'7','ź'=>'8','ż'=>'9') recodetab[UInt16(x.first)] = UInt8(x.second) end
	
	function toascii(a::AbstractString)
		b = Array(UInt8,length(a))
		p = 1
		for c in a
			b[p] = recodetab[Int(c)]
			b[p] == 0 && return ""
			p += 1
		end
		return ASCIIString(b)
	end
	
	function test2(data)
		tags = Array(UInt128,0)
		tag::UInt128 = 0
		last = 1
		for e in data
			getpos(e.tag)==3 && continue
			if last != e.word
				if tag > 0
					push!(tags,tag)
					tag = 0
				end
				last = e.word
			end
			g = gendertab[getgender(e.tag)]-1
			n = getnumber(e.tag)-1
			c = getcase(e.tag)-1
			tag |= UInt128(1<<g) << ((c*2+n)*7)
		end
		return tags
	end
	
	function frompolimorf(morf)	
		println("sorting lexems...")
		data = sort(morf.data,by=x->x.word,alg=MergeSort)
		tab = Array(Entry,length(morf.map))
		fill!(tab,Entry(0,0,0,0))
		println("selecting lexems...")
		last = 1
		tag::UInt128 = 0
		pos = 0
		base = 0
		for e in data
			if last != e.word
				tab[last] = Entry(last,base==0?1:base,tag,pos)
				tag = 0
				base = 0
				pos = 0
				last = e.word
			end
			newpos = getpos(e.tag)
			if pos == 0 || pos == newpos || newpos == 2
				if pos != newpos
					tag = 0
				end
				pos = newpos
				if pos != 3
					tag |= maketag(e.tag)
				end
				if base == 0 || @in(getclass(e.tag),adj,subst)
					base = e.base
				end
			elseif pos == 1
				pos = 3
			end
		end
		println("creating strings...")
		return filter(x-> 29 > length(x.word) > 1 && length(x.base) > 0,
			map(x->SEntry(lowercase(toascii(morf.map[x.word])),toascii(lowercase(morf.map[x.base])),x.tag,0,x.pos),
			filter(x-> x.pos > 0 && length(morf.map[x.word]) > 1 && islower(morf.map[x.word][nextind(morf.map[x.word],1):end]),tab)))
	end
	
	function makeunique(intab)
		println("uppercase filter")
		tab = sort(intab,by=x->x.word)
		for i in 2:length(tab)
			if tab[i].word == tab[i-1].word
				#print(tab[i].word," ")
				word = tab[i].word
				if tab[i].pos == tab[i-1].pos
					tab[i] = SEntry(word,tab[i].base,tab[i].tag|tab[i-1].tag,tab[i].neg|tab[i-1].neg,tab[i].pos)
					tab[i-1] = SEntry(word,"",0,0,3)
				elseif tab[i].pos == 2
					tab[i-1] = SEntry(word,"",0,0,3)
				elseif tab[i-1].pos == 2
					tab[i] = SEntry(word,"",0,0,3)
				else
					tab[i-1] = SEntry(word,"",0,0,3)
					tab[i] = SEntry(word,"",0,0,3)
				end
			end
		end
		filter!(x->x.pos!=3,tab)
		sort!(tab,by=x->x.word)
		return tab
	end
		
	function nofilter(tab)
		println("filtring 'nie'...")
		for i in 1:length(tab)
			e = tab[i]
			if length(e.word) > 3 && e.word[1:3] == "nie"
				a = searchsorted(tab,e.word[4:end])
				if length(a) > 0
					o = tab[a.start]
					tab[a.start] = SEntry(o.word,o.base,o.tag,o.neg|2,o.pos)
					tab[i] = SEntry(e.word,e.base,0,0,0)
				else
					tab[i] = SEntry(e.word,e.base,e.tag,e.neg|2,e.pos)
				end
			else
				tab[i] = SEntry(e.word,e.base,e.tag,e.neg|1,e.pos)
			end
		end
		println("appling filter...")
		newtab = filter(x->x.pos>0,tab)
		for i in 1:length(newtab)
			e = newtab[i]
			if length(e.word) > 3 && e.word[1:3] == "nie"
				if length(e.base) > 3 && e.base[1:3] == "nie"
					newtab[i] = SEntry(e.word[4:end],e.base[4:end],e.tag,e.neg,e.pos)
				else
					newtab[i] = SEntry(e.word[4:end],e.base,e.tag,e.neg,e.pos)
				end
			end
		end
		sort!(newtab,by=x->x.word)
		return newtab
	end
		
	function assignpf(tab,err=1)
		local base
		dict = Dict{ASCIIString,Int}()
		hist = zeros(Int,0)
		arr = zeros(Int,length(tab))
		println("building suffix dict")
		newtab = Array(S2Entry,length(tab))	
		for i in 1:length(tab)
			e = tab[i]
			offset = 0
			if e.pos == 1 && (e.tag&((1<<(m1-1))|(1<<(m2-1))|(1<<(m3-1))))>0
				base = e.base
			else
				offset = 1
				base = e.base[1:end-1]
			end
			postfix = -1
			for _ in 1:err
				word = e.word
				if length(word) == length(base) && word[1:length(base)] == base
					postfix = 0
				elseif length(word) > length(base) && word[1:length(base)] == base
					s = word[length(base)+1:end]
					postfix = get!(dict,s,length(hist)+1)
					if postfix == length(hist)+1
						push!(hist,1)
					else
						hist[postfix] += 1
					end
				else
					offset += 1
					base = base[1:end-1]
					length(base) <= 1 && break
					continue
				end
				break
			end
			arr[i] = postfix
			newtab[i] = S2Entry(e,postfix,postfix>0?offset:0)
		end
		println("sorting dict...")
		rdict = Array(ASCIIString,length(dict))
		for e in dict rdict[e.second]=e.first; end
		p = reverse(sortperm(hist))
		rdict = rdict[p]
		hist = hist[p]
		invp = sortperm(p)
		println("applying...")
		for i in 1:length(arr)
			if arr[i] > 0
				newtab[i] = S2Entry(newtab[i],invp[arr[i]])
				#arr[i] = invp[arr[i]]
			end
		end
		c = 0
		s = sum(hist)
		for i in 1:length(hist)
			c += hist[i]
			if c/s > 0.9
				println("90% at $i; $(round(s*100/length(tab),2))% of words")
				break
			end
		end
		return newtab,rdict
	end
		
	prefixlt(a::SubString, b::SubString) = ccall(:memcmp, Int8, (Ptr{UInt8}, Ptr{UInt8}, UInt),Base.unsafe_convert(Ptr{UInt8},a.string.data)+a.offset,Base.unsafe_convert(Ptr{UInt8},b.string.data)+b.offset,min(a.endof,b.endof)) < 0
	prefixeq(a::SubString, b::SubString) = ccall(:memcmp, Int8, (Ptr{UInt16}, Ptr{UInt8}, UInt),Base.unsafe_convert(Ptr{UInt8},a.string.data)+a.offset,Base.unsafe_convert(Ptr{UInt8},b.string.data)+b.offset,min(a.endof,b.endof)) == 0 && a.endof <= b.endof
		
	function magic(tab,rdict,limit)
		println("starting compresor")
		words = unique(map(x->limit>x.sufix>0?SubString(x.word,1,length(x.word)-length(rdict[x.sufix])):SubString(x.word,1,40),tab))
		sort!(words,alg=MergeSort)
		println("before: ",sum(map(x->length(x),words)))
		R = zeros(UInt32,2,length(words))
		p = length(words)/1000
		n = foldl((a,b)->max(a,length(b)),0,words)
		tmp = copy(words)
		p = Array(1:length(words))
		for i in 1:n
			print("start $i")
			for j in 1:length(words)
				R[1,j] > 0 && continue
				last = searchsortedlast(tmp,words[j],lt=prefixlt)
				if last > 0 && j != p[last] && prefixeq(words[j],tmp[last])
					R[1,j] = p[last]
					R[2,j] = i
				end
			end
			print(" search ok")
			map!(x->SubString(x.string,x.offset+2,x.offset+x.endof),tmp)
			print(" map ok")
			p1 = sortperm(tmp,alg=MergeSort)
			tmp = tmp[p1]
			p = p[p1]
			print(" sort ok")
			println(" done")
			s = 0
			for j in 1:length(words)
				if R[1,j] == 0
					s += length(words[j])
				end
			end
			println("after: ",s)
		end
		return R,words
	end
	
	function combine(tab,rdict,R,words,limit)
		println("combinig data")
		wordsidx = zeros(Int,length(words))
		buff = IOBuffer()
		p = 0
		basedict = Dict{ASCIIString,Int}()
		for i in 1:length(words)
			if R[1,i] == 0
				wordsidx[i] = p
				p += length(words[i])
				write(buff,words[i])
			end
		end
		out = Array(S3Entry,length(tab))
		for i in 1:length(tab)
			word = limit>tab[i].sufix>0?SubString(tab[i].word,1,length(tab[i].word)-length(rdict[tab[i].sufix])):SubString(tab[i].word,1,40)
			r = searchsorted(words,word)
			if length(r) == 0
				println(word," ",tab[i].word," error!")
				return 0
			end
			idx = r.start
			off = 1
			while R[1,idx] != 0
				idx,off2 = R[:,idx]
				off += off2-1
			end
			out[i] = S3Entry(
				wordsidx[idx]+off-1,
				length(word),
				limit>tab[i].sufix>0?tab[i].sufix:0,
				get!(basedict,tab[i].base,length(basedict)),
				tab[i].tag,
				tab[i].neg,
				tab[i].pos
			)	
		end
		return out,takebuf_string(buff)
	end
	
	function compile(tab,str,rdict,fname)
		println("writing file")
		word = Array(UInt64,length(tab))
		open(fname,"w") do file
			padding = 4-length(str)%4
			write(file,UInt32(length(str)+padding),str,zeros(UInt8,padding))
			rdictstr = join(rdict[1:1+maximum(map(x->x.sufix,tab))],'\0')
			padding = 4-length(rdictstr)%4
			write(file,UInt32(length(rdictstr)+padding),rdictstr,zeros(UInt8,padding))
			basedict = Dict{UInt,UInt}()
			tagdict = Dict{UInt128,UInt}()
			for i in 1:length(tab)
				b = 0
				if tab[i].pos == 2
					k = (tab[i].base<<4) | ((tab[i].tag >> (14*7)))
					b = get!(basedict,k,length(basedict))
				end
				tag = get!(tagdict,(tab[i].tag&0x00000003ffffffffffffffffffffffff) | (UInt128(tab[i].neg)<<(7*14)),length(tagdict))
				if !(ceil(log2(tab[i].offset)) <= 21 && ceil(log2(tag)) <= 11 && ceil(log2(b)) <= 18 && ceil(log2(length(tagdict))) <= 11)
					println(length(tagdict)," bit error")
					return
				end
				word[i] = tab[i].offset | (tag<<21) | (((tab[i].sufix>0?tab[i].sufix-1:255) | (tab[i].length<<8) | (b<<13))<<32)
			end
			baseindex = Array(Tuple{UInt32,UInt32},0)
			for i in 1:length(tab)
				if tab[i].pos == 2
					push!(baseindex,(i-1,get(basedict,(tab[i].base<<4) | ((tab[i].tag >> (14*7))),-1)))
				end
			end
			aa = copy(baseindex)
			sort!(baseindex,by=x->x[2])
			baseindexkeys = Array(UInt32,length(basedict))
			s = 0
			for i in 1:length(baseindex)
				if length(baseindex)<i+1 || baseindex[i][2] != baseindex[i+1][2]
					baseindexkeys[baseindex[i][2]+1] = s
					s = i
				end
			end
			baseindexvaules = map(x->x[1],baseindex)
			rdict2 = Array(UInt128,length(tagdict))
			for e in tagdict rdict2[e.second+1]=e.first; end
			println("tag count: ",length(rdict2))
			write(file,UInt32(length(word)*8),word)
			write(file,UInt32(length(rdict2)*16),rdict2)
			write(file,UInt32(length(baseindexvaules)*4),baseindexvaules)
			write(file,UInt32(length(baseindexkeys)*4),baseindexkeys)
			return rdict2
		end
	end
	
	function build(fin,fout)
		morf = Morfeusz.lazyload(fin)
		tab = frompolimorf(morf)
		tab2 = makeunique(tab)
		tab3 = nofilter(tab2)
		tab4,rdict = assignpf(tab3,10)
		R,words = magic(tab4,rdict,256)
		out,str = combine(tab4,rdict,R,words,256)
		compile(out,str,rdict,fout)
		return tab,tab2,tab3,tab4
	end
	
end