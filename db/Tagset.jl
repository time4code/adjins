module Tagset
	import Base.show
	import Base.string
	import Base.convert
	
	unwrap(s::Expr) = symbol(string(s)[2:end])
	unwrap(s::Symbol) = symbol(string(s)[2:end])
	
	macro genconsts(name, V...)
		dict1 = Dict{ASCIIString,Int}([((string(V[i]),i)) for i=1:length(V)])
		dict2 = Dict{Int,ASCIIString}([(i,(string(V[i]))) for i=1:length(V)])
		esc(quote
			$([:(const $(V[i]) = $i) for i=1:length(V)]...)
			export $([:($(V[i])) for i=1:length(V)]...)
			const $name = $(dict1)
			const $(symbol(string(name)*"_r")) = $(dict2)
		end)
	end
		
	macro fill(V...) 
		e = [ 
			if typeof(eval(V[i])) == Symbol 
				:(if $(i+1) > length(t) return x; else; x.$(unwrap(V[i])) = $(unwrap(V[i]))[t[$(i+1)]]; end)
			else
				:(x.$(V[i]) = $(V[i])[t[$(i+1)]])
			end
		for i=1:length(V) ]
		quote $(e...) end
	end
	
	@genconsts class subst depr num numcol adj adja adjp adjc adv ppron12 ppron3 siebie fin bedzie aglt praet impt imps inf pcon pant ger pact ppas winien pred prep conj comp qub brev burk interj interp xxx ign #6
	@genconsts number sg pl #1
	@genconsts case nom gen dat acc inst loc voc #3
	@genconsts gender m1 m2 m3 f n n1 n2 p1 p2 p3 #4
	@genconsts person pri sec ter #2
	@genconsts degree pos com sup #2
	@genconsts aspect imperf perf #1
	@genconsts negation aff neg #1
	@genconsts accentability akc nakc #1
	@genconsts postprep praep npraep #1
	@genconsts accom congr rec #1
	#@genconsts agglt nagl agl #1
	@genconsts vocalicity wok nwok #1
	@genconsts fullstop pun npun #0

	type Tag
		class::Int
		number::Int
		case::Int
		gender::Int
		person::Int
		degree::Int
		aspect::Int
		negation::Int
		accentability::Int
		postprep::Int
		accom::Int
		#agglt::Int
		vocalicity::Int
		fullstop::Int		
		Tag() = new(0,0,0,0,0,0,0,0,0,0,0,0,0)
		Tag(c::Int) = new(c,0,0,0,0,0,0,0,0,0,0,0,0)
		Tag(a,b,c,d,e,f,g,h,i,j,k,l,m) = new(a,b,c,d,e,f,g,h,i,j,k,l,m)
	end
	
	immutable CompactTag
		bitmask::UInt32
	end
		
	Tag(str::AbstractString) = Tag(split(str,':'))
	
	function Tag(t::AbstractArray)
		x = Tag(class[t[1]])
		if     x.class == subst @fill(number,case,gender)
		elseif x.class == depr @fill(number,case,gender)
		elseif x.class == num @fill(number,case,gender,accom)
		elseif x.class == numcol @fill(number,case,gender,accom)
		elseif x.class == adj @fill(number,case,gender,degree)
		elseif x.class == adv @fill(:degree)
		elseif x.class == ppron12 @fill(number,case,gender,person,:accentability)
		elseif x.class == ppron3 @fill(number,case,gender,person,:accentability,:postprep)
		elseif x.class == siebie @fill(case)
		elseif x.class == fin @fill(number,person,aspect)
		elseif x.class == bedzie @fill(number,person,aspect)
		elseif x.class == aglt @fill(number,person,aspect,vocalicity)
		elseif x.class == praet @fill(number,gender,aspect)#,:agglt)
		elseif x.class == impt @fill(number,person,aspect)
		elseif x.class == imps @fill(aspect)
		elseif x.class == inf @fill(aspect)
		elseif x.class == pcon @fill(aspect)
		elseif x.class == pant @fill(aspect)
		elseif x.class == ger @fill(number,case,gender,aspect,negation)
		elseif x.class == pact @fill(number,case,gender,aspect,negation)
		elseif x.class == ppas @fill(number,case,gender,aspect,negation)
		elseif x.class == winien @fill(number,gender,aspect)
		elseif x.class == prep @fill(case,:vocalicity)
		elseif x.class == brev @fill(fullstop)
		elseif x.class == qub @fill(:vocalicity) end
		return x
	end
	
	function r(n::Int,T,S,O)
		while length(T[n]) == 1 && n < length(T)
			n += 1
		end
		a = T[n]
		if n == length(T)
			for x in a
				S[n] = x
				push!(O,Tag(S))
			end
		else
			for x in a
				S[n] = x
				r(n+1,T,S,O)
			end
		end
	end
	
	function extendedtag(str::AbstractString)
		in('.',str) || return [Tag(str)]
		S = split(str,':')
		T = [split(S[i],'.') for i in 1:length(S)]
		O = Array(Tag,0)
		r(1,T,S,O)
		return O
	end
	
	getclass(tag::CompactTag) = (tag.bitmask>>0)&63
	getnumber(tag::CompactTag) = (tag.bitmask>>6)&3
	getcase(tag::CompactTag) = (tag.bitmask>>8)&7
	getgender(tag::CompactTag) = (tag.bitmask>>11)&15
	getperson(tag::CompactTag) = (tag.bitmask>>15)&3
	getdegree(tag::CompactTag) = (tag.bitmask>>17)&3
	getaspect(tag::CompactTag) = (tag.bitmask>>19)&3
	getnegation(tag::CompactTag) = (tag.bitmask>>21)&3
	getaccentability(tag::CompactTag) = (tag.bitmask>>23)&3
	getpostprep(tag::CompactTag) = (tag.bitmask>>25)&3
	getaccom(tag::CompactTag) = (tag.bitmask>>27)&3
	getvocalicity(tag::CompactTag) = (tag.bitmask>>29)&3
	
	CompactTag(tag::Tag) = CompactTag(
		(tag.class<<0) | #6
		(tag.number<<6) | #2
		(tag.case<<8) | #3
		(tag.gender<<11) | #4
		(tag.person<<15) | #2
		(tag.degree<<17) | #2
		(tag.aspect<<19) | #2
		(tag.negation<<21) | #2
		(tag.accentability<<23) | #2
		(tag.postprep<<25) | #2
		(tag.accom<<27) | #2
		(tag.vocalicity<<29) #2
	)
	
	Tag(tag::CompactTag) = Tag(
		(tag.bitmask>>0)&63, #6
		(tag.bitmask>>6)&3, #2
		(tag.bitmask>>8)&7, #3
		(tag.bitmask>>11)&15, #4
		(tag.bitmask>>15)&3, #2
		(tag.bitmask>>17)&3, #2
		(tag.bitmask>>19)&3, #2
		(tag.bitmask>>21)&3, #2
		(tag.bitmask>>23)&3, #2
		(tag.bitmask>>25)&3, #2
		(tag.bitmask>>27)&3, #2
		(tag.bitmask>>29)&3, #2
		0
	)
	
	convert(::Type{CompactTag}, tag::Tag) = CompactTag(tag)
	convert(::Type{Tag}, tag::CompactTag) = Tag(tag)
	
	CompactTag(str::AbstractString) = CompactTag(Tag(str))
	
	macro tagstring(V...) quote $([:(if t.$(V[i]) > 0 str *= ":"*$(symbol(string(V[i])*"_r"))[t.$(V[i])] end) for i=1:length(V)]...) end end
	function string(t::Tag)
		str = t.class>0?class_r[t.class]:"?"
		@tagstring number case gender person degree aspect negation accentability postprep accom vocalicity fullstop
		return str
	end
	
	Base.show(io::IO, m::Tag) = print(io,"Tagset.Tag($(string(m)))")
	Base.show(io::IO, m::CompactTag) = print(io,"Tagset.CompactTag($(string(Tag(m))))")
	
	export CompactTag, Tag, extendedtag
	export getclass,getnumber,getcase,getgender,getperson,getdegree,getaspect,getnegation,getaccentability,getpostprep,getaccom,getvocalicity
end