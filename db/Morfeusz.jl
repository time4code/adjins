module Morfeusz
	import Base.isless
	using Tagset
	using JLD
	macro in(x,V...) foldr((a,b)->:($x == $a || $b),:($x == $(V[end])),V[1:end-1]) end
	
	immutable Entry
		base::UInt32
		word::UInt32
		tag::CompactTag
	end
	
	immutable WordInfo
		rhyme::UInt32
		sylab::UInt8
		gender::UInt8
	end
	
	immutable DataBase
		words::UTF8String
		map::Array{SubString{UTF8String},1}
		data::Array{Entry,1}
		info::Array{WordInfo,1}
		prep::Array{UInt32,1}
	end
	
	function bulidgenders(map,data)
		genders = zeros(UInt8,length(map))
		for x in data
			if @in(getclass(x.tag),subst,depr,ger) && genders[x.base] == 0
				genders[x.base] = getgender(x.tag)
			end
		end
		return genders
	end
	
	function wordstat(w)
		r = matchall(r"[ąęaeioóuy]+"i,w)
		s = length(r)
		if s == 0
			return s,utf8("-")
		elseif length(w) < 3
			return s,lowercase(w)
		elseif s == 1
			return s,lowercase(w[r[1].offset+1:end])
		else
			return s,lowercase(w[r[end-1].offset+1:end])
		end
	end
	
	function buildinfo(map,data)
		genders = bulidgenders(map,data)
		pos = 1
		dict = Dict{UTF8String,UInt32}()
		info = Array(WordInfo,length(map))
		for i in 1:length(map)
			s,r = wordstat(map[i])
			k = get!(dict,r,pos)
			k == pos && (pos += 1)
			info[i] = WordInfo(k,s,genders[i])
		end
		return info
	end
	
	isless(a::Entry,b::Entry) = a.base < b.base || (a.base==b.base && a.tag.bitmask < b.tag.bitmask)
	isless(a::Int,b::Entry) = a < b.base
	isless(a::Entry,b::Int) = a.base < b
	
	const defaulttab = "polimorf-20160501.tab"
	cache = Void
	
	preptab(data) = sort(unique([x.base for x in filter(x->getclass(x.tag)==prep,data)]))
	
	function buildmap(path)
		print("building string map...")
		words::Array{SubString{UTF8String},1} = []
		data = split(readall(path),'\n')
		for line in data
			cols = split(line,'\t')
			if length(cols) > 2
				push!(words,cols[1])
				push!(words,cols[2])
			end
		end
		println(" done.")
		print("indexing...")
		sort!(words)
		buff = IOBuffer()
		print(buff,words[1])
		for i in 2:length(words)
			if words[i] != words[i-1]
				print(buff,'|',words[i])
			end
		end
		println(" done.")
		return takebuf_string(buff)
	end
		
	function build(path)
		words = buildmap(path)
		map = split(words,'|')
		data::Array{Entry,1} = []
		file = open(path,"r")
		print("building lexems...")
		for line in eachline(file)
			str = split(utf8(line),'\t')
			str[3] == "num:comp" && continue
			word = searchsortedfirst(map,str[1])
			base = searchsortedfirst(map,str[2])
			tags = extendedtag(str[3])
			for tag in tags
				push!(data,Entry(tag.class==ppron12||tag.class==ppron3?0:base,word,CompactTag(tag)))
			end
		end
		close(file)
		println(" done.")
		print("indexing...")
		sort!(data)
		println(" done.")
		print("building rhyme index...")
		info = buildinfo(map,data)
		println(" done.")
		db = DataBase(words,map,data,info,preptab(data))
		save(db,path)
		return db
	end
	
	function buildmap(db::DataBase,usage::AbstractArray)
		buff = IOBuffer()
		for i in 1:length(usage)
			if usage[i] > 0
				buff.size == 0 || print(buff,'|')
				print(buff,db.map[i])
			end
		end
		return takebuf_string(buff)
	end
	
	function build(db::DataBase,usage::AbstractArray)
		words = buildmap(db,usage)
		wordmap = split(words,'|')
		data::Array{Entry,1} = []
		cnt = 1
		for i in 1:length(usage)
			if usage[i] == 1
				append!(data,getforms(db,i))
			end
			usage[i] == 0 || (usage[i]=cnt; cnt += 1)
		end
		map!(x->Entry(usage[x.base],usage[x.word],x.tag),data)
		return DataBase(words,wordmap,data,preptab(data))
	end
	
	function load(path=defaulttab)
		print("reading $(path).jld...")
		local words, data, info, prep
		jldopen("$(path).jld", "r") do file
			words = read(file, "words")
			data = read(file, "data")
			info = read(file, "info")
			prep = read(file, "prep")
		end
		map = split(words,'|')
		println(" done.")
		return DataBase(words,map,data,info,prep)
	end
	
	function save(db::DataBase,path)
		print("writeing $(path).jld...")
		jldopen("$(path).jld", "w") do file
			write(file, "words", db.words)
			write(file, "data", db.data)
			write(file, "info", db.info)
			write(file, "prep", db.prep)
		end
		println(" done.")
	end
	
	function lazyload(path=defaulttab)
		global cache
		local db::DataBase
		if cache==Void
			db = load(path)
			cache = db
		else
			db = cache
		end
		return db
	end
	
	function lookup(db,str::AbstractString)
		a = searchsorted(db.map,str)
		a.start == a.stop || return 0
		return a.start
	end
	
	lookupprep(db,p) = searchsortedfirst(db.prep,p)
	
	getforms(db,str::AbstractString) = getforms(db,lookup(db,str))
	getforms(db,id) = sub(db.data,searchsorted(db.data,id))
	
	export getforms, lookup, lookupprep, load
end
